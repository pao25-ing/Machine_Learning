"use strict";
const ROOT="../";
const el=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num=(v,d=2)=>Number(v).toFixed(d);
const layout={
 S0:[85,260],S1:[235,260],S2:[370,85],S3:[370,335],
 S4:[510,335],S5:[510,475],S6:[650,270],S7:[650,450],
 S8:[790,230],S9:[790,385],S10:[935,190],S11:[935,325],
 S12:[1070,80],S13:[1180,80],S14:[1070,440],
 S15:[1180,315],S16:[1180,195],S17:[1180,530]
};
let model,scenarios,comparison=[],predictions=[],pickedNode="S0",bfRoutes=[];
const nodeName=k=>model.estados[k]?.nombre||k;
function valid(t,values){
 const g=t.guarda;
 if(g.tipo==="siempre")return true;
 if(!Object.prototype.hasOwnProperty.call(values,g.campo)||values[g.campo]===null)return false;
 if(g.tipo==="igual")return values[g.campo]===g.valor;
 if(g.tipo==="en")return g.valores.includes(values[g.campo]);
 return false;
}
function next(state,values){return model.transiciones.filter(t=>t.origen===state&&valid(t,values))}
function bfs(start,goal,values){
 const q=[[start]],visited=new Set([start]),evaluated=[];
 while(q.length){
  const path=q.shift(),s=path.at(-1);evaluated.push(s);
  if(s===goal)return {route:path,evaluated};
  for(const t of next(s,values))if(!visited.has(t.destino)){visited.add(t.destino);q.push([...path,t.destino])}
 }
 return {route:null,evaluated};
}
function dfs(start,goal,values){
 const stack=[[start]],visited=new Set(),evaluated=[];
 while(stack.length){
  const path=stack.pop(),s=path.at(-1);
  if(visited.has(s))continue;
  visited.add(s);evaluated.push(s);
  if(s===goal)return {route:path,evaluated};
  const opts=next(s,values);
  for(let i=opts.length-1;i>=0;i--){const d=opts[i].destino;if(!visited.has(d)&&!path.includes(d))stack.push([...path,d]);}
 }
 return {route:null,evaluated};
}
function brute(start,values){
 const stack=[[start]],routes=[],pending=[],evaluated=[];
 while(stack.length){
  const path=stack.pop(),s=path.at(-1);evaluated.push(s);
  if(model.estados[s].terminal){routes.push(path);continue}
  const opts=next(s,values).filter(t=>!path.includes(t.destino));
  if(!opts.length){pending.push(path);continue}
  for(let i=opts.length-1;i>=0;i--)stack.push([...path,opts[i].destino]);
 }
 return {routes,pending,evaluated};
}
function describeState(id){
 pickedNode=id;el("detail-title").textContent=id+" · "+nodeName(id);
 let desc=model.estados[id].terminal?"Estado terminal: decisión ilustrativa del modelo.":"Estado de evaluación: la continuación depende de las reglas y variables del escenario.";
 if(id==="S0")desc="Estado inicial: se identifica la oportunidad antes de evaluar la evidencia.";
 if(id==="S16")desc="Recomendación experimental de inversión gradual exclusivamente en investigación y desarrollo (I+D).";
 if(id==="S15")desc="Recomendación experimental de ampliar investigación: no se confirma viabilidad.";
 if(id==="S17")desc="Recomendación experimental de postergar una inversión en este escenario.";
 el("detail-description").textContent=desc;
 document.querySelectorAll(".graph-node").forEach(n=>n.classList.toggle("selected",n.dataset.id===id));
}
function routeHTML(route){
 if(!route)return '<span class="small-muted">No existe ruta habilitada hacia ese objetivo.</span>';
 return route.map((s,i)=>'<span class="route-chip" title="'+esc(nodeName(s))+'">'+s+'</span>'+(i<route.length-1?'<span class="route-arrow" aria-hidden="true">→</span>':'')).join("");
}
function linePath(a,b){
 const [x,y]=layout[a],[x2,y2]=layout[b],dx=x2-x;
 const start=x+26,end=x2-26;
 if(dx>80)return "M"+start+","+y+" C"+(start+dx*.4)+","+y+" "+(end-dx*.4)+","+y2+" "+end+","+y2;
 return "M"+x+","+y+" Q"+(x+x2)/2+","+(Math.min(y,y2)-35)+" "+x2+","+y2;
}
function renderGraph(values,route){
 const pathEdges=new Set();
 if(route)for(let i=0;i<route.length-1;i++)pathEdges.add(route[i]+"-"+route[i+1]);
 const showDisabled=el("show-disabled").checked,svg=el("state-graph");
 let markup='<defs><marker id="arrow-normal" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6" fill="none" stroke="#5f9fba" stroke-width="1.1"/></marker><marker id="arrow-route" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6" fill="none" stroke="#71e0df" stroke-width="1.5"/></marker></defs>';
 const edges=model.transiciones.map(t=>({t,on:valid(t,values),isRoute:pathEdges.has(t.origen+"-"+t.destino)}));
 for(const edge of edges){
  if(!edge.on&&!showDisabled)continue;
  markup+='<path class="edge '+(edge.isRoute?"route":edge.on?"":"disabled")+'" d="'+linePath(edge.t.origen,edge.t.destino)+'" marker-end="url(#'+(edge.isRoute?"arrow-route":"arrow-normal")+')"><title>'+esc(edge.t.id+" · "+edge.t.operador+" · "+edge.t.precondicion)+'</title></path>';
 }
 for(const [id,meta] of Object.entries(model.estados)){
  const [x,y]=layout[id],inPath=route?.includes(id);
  markup+='<g class="graph-node '+(meta.terminal?"terminal ":"")+(inPath?"route-node ":"")+(id===pickedNode?"selected":"")+'" data-id="'+id+'" role="button" tabindex="0" aria-label="'+esc(id+": "+meta.nombre)+'"><rect x="'+(x-32)+'" y="'+(y-22)+'" width="64" height="44"></rect><text x="'+x+'" y="'+(y+5)+'" text-anchor="middle">'+id+'</text><title>'+esc(meta.nombre)+'</title></g>';
 }
 svg.innerHTML=markup;
 for(const n of svg.querySelectorAll(".graph-node")){
  n.addEventListener("click",()=>describeState(n.dataset.id));
  n.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();describeState(n.dataset.id)}});
 }
}
function updateExplorer(){
 const scenarioKey=el("scenario-select").value;
 const scenario=scenarios[scenarioKey],values=scenario.variables,algorithm=el("algorithm-select").value,goal=el("goal-select").value;
 const all=brute(model.estado_inicial,values);bfRoutes=[...all.routes,...all.pending];
 el("scenario-description").textContent=scenario.descripcion+" · Datos cualitativos sintéticos.";
 el("goal-field").classList.toggle("hidden",algorithm==="BF");
 el("route-field").classList.toggle("hidden",algorithm!=="BF");
 let result;
 if(algorithm==="BF"){
  const select=el("route-select"),old=Number(select.value);
  select.innerHTML=bfRoutes.map((r,i)=>'<option value="'+i+'">'+(i<all.routes.length?"Ruta terminal ":"Ruta pendiente ")+(i<all.routes.length?i+1:i-all.routes.length+1)+" · "+esc(nodeName(r.at(-1)))+'</option>').join("");
  if(bfRoutes.length)select.value=String(old>=0&&old<bfRoutes.length?old:0);
  result={route:bfRoutes[Number(select.value)]||null,evaluated:all.evaluated};
 }else result=algorithm==="BFS"?bfs(model.estado_inicial,goal,values):dfs(model.estado_inicial,goal,values);
 const path=result.route;
 el("stat-explored").textContent=result.evaluated.length;
 el("stat-edges").textContent=path?path.length-1:"—";
 el("stat-routes").textContent=all.routes.length;
 el("stat-pending").textContent=all.pending.length;
 el("route-chips").innerHTML=routeHTML(path);
 const outcome=path?nodeName(path.at(-1)):"No se alcanzó el objetivo seleccionado";
 el("route-message").textContent=path?outcome+(algorithm==="BF"&&!model.estados[path.at(-1)].terminal?" · Ruta pendiente; faltan variables.":" · Resultado experimental."):"No hay una ruta válida hasta el objetivo con las condiciones elegidas. No se debe inventar una decisión.";
 renderGraph(values,path);
 describeState(pickedNode);
}
function csv(text){
 const lines=text.trim().replace(/^\uFEFF/,"").split(/\r?\n/).filter(Boolean);
 const head=lines.shift().split(",");
 return lines.map(line=>{const values=line.split(",");const row={};head.forEach((h,i)=>row[h]=values[i]);return row});
}
function renderComparison(){
 if(!comparison.length)return;
 const metric=document.querySelector(".metric-tab.active")?.dataset.metric||"RMSE";
 const modelNames=["Regresión lineal","Regresión polinómica (grado 2)"],used=modelNames.map(name=>comparison.find(x=>x.Modelo===name)).filter(Boolean);
 const vals=used.map(m=>Number(m[metric])),maximum=Math.max(...vals)*1.07;
 const better=metric==="R2"?Math.max(...vals):Math.min(...vals);
 el("metric-bars").innerHTML=used.map(m=>{
 const value=Number(m[metric]);return '<div class="bar-line"><span class="bar-name">'+esc(m.Modelo)+'</span><div class="bar-track"><div class="bar-fill '+(value===better?"best":"")+'" style="width:'+Math.max(2,100*value/maximum)+'%"></div></div><span class="bar-value">'+num(value,metric==="R2"?4:2)+'</span></div>';
 }).join("");
 el("metric-explanation").textContent=metric==="R2"?"R²: cuanto más cerca de 1, mejor ajuste. Solo sobre datos sintéticos.":metric+" mide el error de predicción (millones de USD hipotéticos): menor es mejor.";
 el("model-table").innerHTML=comparison.map(m=>'<tr><td>'+esc(m.Modelo)+'</td><td>'+num(m.MAE)+'</td><td>'+num(m.RMSE)+'</td><td>'+num(m.R2,4)+'</td></tr>').join("");
}
function updateSample(){
 const item=predictions.find(d=>d.id_escenario===el("sample-select").value)||predictions[0];
 if(!item)return;
 const actual=Number(item.valor_sintetico),linear=Number(item.pred_lineal),poly=Number(item.pred_polinomica);
 el("actual-value").textContent=num(actual);
 el("linear-value").textContent=num(linear);
 el("poly-value").textContent=num(poly);
 el("linear-error").textContent=num(Math.abs(actual-linear));
 el("poly-error").textContent=num(Math.abs(actual-poly));
}
const galleries={
 "dispersión":["pipeline2_dispersion_sintetica.png","Distribución de los 240 escenarios sintéticos."],
 rmse:["pipeline2_comparacion_rmse.png","Comparación del RMSE entre modelos sobre datos sintéticos."],
 real:["pipeline2_real_vs_predicho.png","Valores sintéticos frente a predicciones de los modelos."],
 residuos:["pipeline2_residuos.png","Residuos de predicción del modelo seleccionado."],
 duracion:["pipeline2_curva_duracion.png","Predicción al variar la duración, con las demás variables fijas."]
};
function updateViz(key){
 const [file,desc]=galleries[key],url=ROOT+"images/"+file;
 el("viz-image").src=url;el("viz-image").alt=desc;el("viz-link").href=url;el("viz-caption").textContent=desc;
 document.querySelectorAll(".viz-tab").forEach(b=>b.classList.toggle("active",b.dataset.viz===key));
}
async function getJSON(path){const r=await fetch(ROOT+path);if(!r.ok)throw Error("No se pudo cargar "+path+" ("+r.status+")");return r.json()}
async function getCSV(path){const r=await fetch(ROOT+path);if(!r.ok)throw Error("No se pudo cargar "+path+" ("+r.status+")");return csv(await r.text())}
async function start(){
 try{
  const data=await Promise.all([getJSON("data/espacio_estados_condiciones.json"),getJSON("data/escenarios_asteroides.json"),getCSV("results/comparacion_regresion.csv"),getCSV("results/predicciones_prueba.csv")]);
  model=data[0];scenarios=data[1].escenarios;comparison=data[2];predictions=data[3];
  const select=el("sample-select");
  select.innerHTML=predictions.map(p=>'<option value="'+esc(p.id_escenario)+'">'+esc(p.id_escenario)+'</option>').join("");
  for(const id of ["scenario-select","algorithm-select","goal-select","route-select","show-disabled"])el(id).addEventListener("change",updateExplorer);
  select.addEventListener("change",updateSample);
  document.querySelectorAll(".metric-tab").forEach(b=>b.addEventListener("click",()=>{
   document.querySelectorAll(".metric-tab").forEach(tab=>{const on=tab===b;tab.classList.toggle("active",on);tab.setAttribute("aria-pressed",on)});
   renderComparison();
  }));
  document.querySelectorAll(".viz-tab").forEach(b=>b.addEventListener("click",()=>updateViz(b.dataset.viz)));
  updateExplorer();renderComparison();updateSample();
 }catch(error){
  console.error(error);
  el("scenario-description").textContent="No se pudieron cargar los datos. Abre la web desde GitHub Pages o un servidor local (no con file://).";
  el("metric-bars").textContent="No se pudieron cargar los CSV.";
  const toast=el("status-toast");toast.textContent="Error al cargar datos: "+error.message;toast.hidden=false;
 }
}
document.addEventListener("DOMContentLoaded",start);