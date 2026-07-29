import type { BenchmarkSummary } from './summary';

function escapeJsonForScript(value: unknown) {
	return JSON.stringify(value).replaceAll('<', '\\u003c');
}

export function renderBenchmarkReport(summary: BenchmarkSummary) {
	const data = escapeJsonForScript(summary);
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Node MCP evaluation</title>
<style>
:root{color-scheme:light dark;font-family:Inter,system-ui,sans-serif;--bg:#0f172a;--card:#1e293b;--muted:#94a3b8;--line:#334155;--good:#22c55e;--bad:#ef4444;--accent:#38bdf8}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:#e2e8f0}main{max-width:1440px;margin:auto;padding:24px}h1,h2{margin:0 0 16px}.sub{color:var(--muted);margin-bottom:24px}.filters,.cards{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px}.filter,.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px}.filter label{display:block;color:var(--muted);font-size:12px;margin-bottom:5px}.filter select{min-width:190px}.card{min-width:160px;flex:1}.card .value{font-size:28px;font-weight:700}.card .label{color:var(--muted);font-size:12px}section{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:18px;margin-bottom:18px;overflow:auto}table{border-collapse:collapse;width:100%;font-size:13px}th,td{text-align:left;padding:9px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--muted);position:sticky;top:0;background:var(--card)}.metric{font-variant-numeric:tabular-nums}.bar{height:10px;background:#334155;border-radius:5px;overflow:hidden;min-width:120px}.bar>i{display:block;height:100%;background:var(--accent)}.success{color:var(--good)}.failure{color:var(--bad)}details pre{white-space:pre-wrap;max-width:800px;color:#cbd5e1}.warning{border-left:4px solid #f59e0b;padding-left:12px;color:#fcd34d}.empty{color:var(--muted);padding:20px;text-align:center}
</style>
</head>
<body><main>
<h1>Node MCP evaluation</h1>
<div class="sub">Correctness-first comparison by model, MCP implementation, and task category.</div>
<div class="warning">Pilot results use few repetitions. Treat differences as calibration signals, not rankings.</div>
<div class="filters">
 <div class="filter"><label for="model">Model</label><select id="model"></select></div>
 <div class="filter"><label for="flavor">Flavor</label><select id="flavor"></select></div>
 <div class="filter"><label for="evaluation">Evaluation</label><select id="evaluation"></select></div>
 <div class="filter"><label for="category">Category</label><select id="category"></select></div>
 <div class="filter"><label for="status">Outcome</label><select id="status"><option value="">All</option><option value="success">Success</option><option value="failure">Failure</option></select></div>
</div>
<div id="cards" class="cards"></div>
<section><h2>Results by flavor</h2><div id="flavors"></div></section>
<section><h2>Evaluation × model × flavor</h2><div id="arms"></div></section>
<section><h2>Results by category</h2><div id="categories"></div></section>
<section><h2>Tool-call funnel</h2><div id="funnel"></div></section>
<section><h2>Individual runs</h2><div id="runs"></div></section>
</main>
<script>
const source=${data};
const taskById=new Map(source.tasks.map(task=>[task.id,task]));
const variantById=new Map(source.variants.map(variant=>[variant.id,variant]));
const selects={model:document.querySelector('#model'),flavor:document.querySelector('#flavor'),evaluation:document.querySelector('#evaluation'),category:document.querySelector('#category'),status:document.querySelector('#status')};
function fill(select,values){select.innerHTML='<option value="">All</option>'+[...values].sort().map(value=>'<option>'+escapeHtml(value)+'</option>').join('')}
function fillFlavors(select,flavors){select.innerHTML='<option value="">All</option>'+[...flavors].map(flavor=>'<option value="'+escapeHtml(flavor)+'">'+escapeHtml(flavorName(flavor))+'</option>').join('')}
function fillEvaluations(select,tasks){select.innerHTML='<option value="">All</option>'+tasks.map(task=>'<option value="'+escapeHtml(task.id)+'">'+escapeHtml(task.title)+'</option>').join('')}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}
function flavorName(value){return source.variants.find(variant=>variant.flavor===value)?.name||value}
fill(selects.model,new Set(source.runs.map(run=>run.model)));
fillFlavors(selects.flavor,new Set(source.variants.map(variant=>variant.flavor)));
fillEvaluations(selects.evaluation,source.tasks.filter(task=>source.runs.some(run=>run.taskId===task.id)));
fill(selects.category,new Set(source.tasks.flatMap(task=>task.categories)));
Object.values(selects).forEach(select=>select.addEventListener('change',render));
function percentile(values,fraction){if(!values.length)return 0;const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*fraction)-1)]}
function aggregate(runs){const calls=runs.flatMap(run=>run.toolCalls);const invalid=calls.filter(call=>['protocol_invalid','semantic_invalid'].includes(call.outcome)).length;return{runs:runs.length,success:runs.length?runs.filter(run=>run.success).length/runs.length:0,duration:percentile(runs.map(run=>run.durationMs),.5),p95:percentile(runs.map(run=>run.durationMs),.95),calls:percentile(runs.map(run=>run.toolCalls.length),.5),invalid:calls.length?invalid/calls.length:0,tokens:percentile(runs.map(run=>run.usage?.totalTokens||0),.5),cost:percentile(runs.map(run=>run.usage?.cost||0),.5)}}
function filtered(){return source.runs.filter(run=>(!selects.model.value||run.model===selects.model.value)&&(!selects.flavor.value||variantById.get(run.variant)?.flavor===selects.flavor.value)&&(!selects.evaluation.value||run.taskId===selects.evaluation.value)&&(!selects.category.value||taskById.get(run.taskId)?.categories.includes(selects.category.value))&&(!selects.status.value||(selects.status.value==='success')===run.success))}
function pct(value){return (value*100).toFixed(1)+'%'} function ms(value){return (value/1000).toFixed(2)+'s'} function usd(value){return '$'+value.toFixed(4)}
function card(label,value){return '<div class="card"><div class="value">'+value+'</div><div class="label">'+label+'</div></div>'}
function render(){
 const runs=filtered(),all=aggregate(runs);
 document.querySelector('#cards').innerHTML=card('Runs',all.runs)+card('Task success',pct(all.success))+card('Median latency',ms(all.duration))+card('Median calls',all.calls)+card('Invalid calls',pct(all.invalid))+card('Median tokens',all.tokens)+card('Median cost',usd(all.cost));
 const flavorNames=[...new Set(source.variants.map(variant=>variant.flavor))];
 document.querySelector('#flavors').innerHTML='<table><thead><tr><th>Flavor</th><th>Runs</th><th>Success</th><th>Median / p95 latency</th><th>Calls</th><th>Invalid</th><th>Tokens</th><th>Cost</th></tr></thead><tbody>'+flavorNames.map(flavor=>{const a=aggregate(runs.filter(run=>variantById.get(run.variant)?.flavor===flavor));return '<tr><td>'+escapeHtml(flavorName(flavor))+'</td><td>'+a.runs+'</td><td>'+pct(a.success)+'</td><td>'+ms(a.duration)+' / '+ms(a.p95)+'</td><td>'+a.calls+'</td><td>'+pct(a.invalid)+'</td><td>'+a.tokens+'</td><td>'+usd(a.cost)+'</td></tr>'}).join('')+'</tbody></table>';
 const armKeys=[...new Set(runs.map(run=>run.taskId+'\\0'+run.model+'\\0'+run.variant))];
 document.querySelector('#arms').innerHTML=armKeys.length?'<table><thead><tr><th>Evaluation</th><th>Model</th><th>Flavor</th><th>Success</th><th>Median / p95 latency</th><th>Calls</th><th>Invalid</th><th>Tokens</th><th>Cost</th></tr></thead><tbody>'+armKeys.map(key=>{const [taskId,model,variant]=key.split('\\0'),definition=variantById.get(variant),a=aggregate(runs.filter(run=>run.taskId===taskId&&run.model===model&&run.variant===variant));return '<tr><td>'+escapeHtml(taskById.get(taskId)?.title||taskId)+'</td><td>'+escapeHtml(model)+'</td><td>'+escapeHtml(flavorName(definition?.flavor||'unknown'))+'</td><td><div class="bar"><i style="width:'+pct(a.success)+'"></i></div>'+pct(a.success)+'</td><td>'+ms(a.duration)+' / '+ms(a.p95)+'</td><td>'+a.calls+'</td><td>'+pct(a.invalid)+'</td><td>'+a.tokens+'</td><td>'+usd(a.cost)+'</td></tr>'}).join('')+'</tbody></table>':'<div class="empty">No matching runs</div>';
 const categoryNames=[...new Set(source.tasks.flatMap(task=>task.categories))];
 document.querySelector('#categories').innerHTML='<table><thead><tr><th>Category</th><th>Runs</th><th>Success</th><th>Latency</th><th>Calls</th><th>Invalid</th></tr></thead><tbody>'+categoryNames.map(category=>{const a=aggregate(runs.filter(run=>taskById.get(run.taskId)?.categories.includes(category)));return '<tr><td>'+escapeHtml(category)+'</td><td>'+a.runs+'</td><td>'+pct(a.success)+'</td><td>'+ms(a.duration)+'</td><td>'+a.calls+'</td><td>'+pct(a.invalid)+'</td></tr>'}).join('')+'</tbody></table>';
 const calls=runs.flatMap(run=>run.toolCalls),counts={discovery:0,contract:0,resolution:0,execution:0,succeeded:0,protocol_invalid:0,semantic_invalid:0,execution_error:0};calls.forEach(call=>{counts[call.category]=(counts[call.category]||0)+1;counts[call.outcome]=(counts[call.outcome]||0)+1});document.querySelector('#funnel').innerHTML='<table><tbody>'+Object.entries(counts).map(([key,value])=>'<tr><th>'+escapeHtml(key.replaceAll('_',' '))+'</th><td>'+value+'</td></tr>').join('')+'</tbody></table>';
 document.querySelector('#runs').innerHTML=runs.length?'<table><thead><tr><th>Outcome</th><th>Evaluation</th><th>Model</th><th>Flavor</th><th>Time</th><th>Calls</th><th>Tokens</th><th>Details</th></tr></thead><tbody>'+runs.map(run=>{const definition=variantById.get(run.variant);return '<tr><td class="'+(run.success?'success':'failure')+'">'+(run.success?'PASS':'FAIL')+'</td><td>'+escapeHtml(taskById.get(run.taskId)?.title||run.taskId)+'</td><td>'+escapeHtml(run.model)+'</td><td>'+escapeHtml(flavorName(definition?.flavor||'unknown'))+'</td><td>'+ms(run.durationMs)+'</td><td>'+run.toolCalls.length+'</td><td>'+(run.usage?.totalTokens||0)+'</td><td><details><summary>Trace</summary><p>'+escapeHtml(run.verdictReasons.join(' '))+'</p><pre>'+escapeHtml(JSON.stringify(run.toolCalls,null,2))+'</pre><h3>Final answer</h3><pre>'+escapeHtml(run.finalAnswer)+'</pre></details></td></tr>'}).join('')+'</tbody></table>':'<div class="empty">No matching runs</div>';
}
render();
</script></body></html>`;
}
