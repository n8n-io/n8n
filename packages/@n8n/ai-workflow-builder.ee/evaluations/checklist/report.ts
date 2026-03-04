import fs from 'fs';
import path from 'path';
import type { Run, AgentResult, PromptConfig, ToolCallDetail } from './types';

/** Backfill complexity and tags for old results that don't have them stored */
function backfillFromPrompts(run: Run): void {
	const complexityMap = new Map<string, PromptConfig['complexity']>();
	const tagsMap = new Map<string, string[]>();
	for (const p of run.config.prompts) {
		complexityMap.set(p.text, p.complexity);
		if (p.tags) tagsMap.set(p.text, p.tags);
	}
	for (const result of run.results) {
		if (!result.complexity) {
			result.complexity = complexityMap.get(result.prompt) ?? 'medium';
		}
		if (!result.tags) {
			result.tags = tagsMap.get(result.prompt);
		}
	}
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function simpleHash(str: string): string {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
	}
	return Math.abs(hash).toString(36);
}

function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
	return `${(ms / 60000).toFixed(1)}m`;
}

function formatScore(score: number): string {
	return `${(score * 100).toFixed(0)}%`;
}

function renderToolCallDetail(tc: ToolCallDetail, idx: number, parentId: string): string {
	const statusBadge =
		tc.status === 'error'
			? '<span class="badge badge-failed">ERROR</span>'
			: '<span class="badge badge-completed">OK</span>';

	const isEditTool = tc.name === 'str_replace_based_edit_tool' || tc.name === 'batch_str_replace';

	let argsHtml = '';
	if (tc.args) {
		if (isEditTool && tc.args.command === 'str_replace' && tc.args.old_str && tc.args.new_str) {
			argsHtml = `<div class="diff-view">
				<div class="diff-old"><div class="diff-label">old_str</div><pre><code>${escapeHtml(String(tc.args.old_str))}</code></pre></div>
				<div class="diff-new"><div class="diff-label">new_str</div><pre><code>${escapeHtml(String(tc.args.new_str))}</code></pre></div>
			</div>`;
		} else if (isEditTool && tc.args.replacements) {
			const replacements = tc.args.replacements as Array<Record<string, unknown>>;
			argsHtml = replacements
				.map(
					(r, ri) =>
						`<div class="diff-view"><div class="diff-label">Replacement ${ri + 1}</div>
					<div class="diff-old"><div class="diff-label">old_str</div><pre><code>${escapeHtml(String(r.old_str ?? ''))}</code></pre></div>
					<div class="diff-new"><div class="diff-label">new_str</div><pre><code>${escapeHtml(String(r.new_str ?? ''))}</code></pre></div>
				</div>`,
				)
				.join('');
		} else {
			argsHtml = `<pre class="tool-json"><code>${escapeHtml(JSON.stringify(tc.args, null, 2))}</code></pre>`;
		}
	}

	let resultHtml = '';
	if (tc.result) {
		resultHtml = `<details class="tool-result-details"><summary>Output</summary><pre class="tool-json"><code>${escapeHtml(tc.result)}</code></pre></details>`;
	}
	if (tc.error) {
		resultHtml += `<div class="tool-error">${escapeHtml(tc.error)}</div>`;
	}

	return `<details class="tool-call-detail" id="${parentId}-tc-${idx}">
		<summary>${escapeHtml(tc.name)} ${statusBadge}</summary>
		<div class="tool-call-body">
			${argsHtml ? `<div class="tool-section"><div class="tool-section-label">Input</div>${argsHtml}</div>` : ''}
			${resultHtml ? `<div class="tool-section">${resultHtml}</div>` : ''}
		</div>
	</details>`;
}

function renderTags(tags: string[] | undefined): string {
	if (!tags || tags.length === 0) return '';
	return tags.map((tag) => `<span class="badge badge-tag">${escapeHtml(tag)}</span>`).join(' ');
}

function renderResultRow(result: AgentResult, index: number): string {
	const passedCount = result.checklistResults.filter((r) => r.pass).length;
	const totalCount = result.checklist.length;
	const scoreClass =
		result.checklistScore >= 0.8 ? 'good' : result.checklistScore >= 0.5 ? 'ok' : 'bad';
	const successClass = result.success ? 'good' : 'bad';

	const promptHash = simpleHash(result.prompt);

	// Collect all tool calls across iterations
	const allToolCalls = result.iterations.flatMap((iter) => iter.toolCalls);
	const toolCallSummary = allToolCalls
		.map((tc) => `<span class="badge badge-tool">${escapeHtml(tc.name)}</span>`)
		.join(' ');

	return `
		<tr class="result-row" data-complexity="${result.complexity ?? 'medium'}" data-tags="${escapeHtml((result.tags ?? []).join(','))}" data-prompt-hash="${promptHash}" onclick="toggleDetail('detail-${index}', '${promptHash}')">
			<td><span class="badge badge-complexity-${result.complexity ?? 'medium'}">${(result.complexity ?? 'medium').toUpperCase()}</span></td>
			<td class="prompt-cell" title="${escapeHtml(result.prompt)}">${escapeHtml(result.prompt.slice(0, 80))}${result.prompt.length > 80 ? '...' : ''}</td>
			<td class="tags-cell">${renderTags(result.tags)}</td>
			<td class="${successClass}">${result.success ? 'PASS' : 'FAIL'}</td>
			<td class="${scoreClass}">${passedCount}/${totalCount} (${formatScore(result.checklistScore)})</td>
			<td>${result.iterations.length}</td>
			<td class="tool-calls-cell">${toolCallSummary || '<span class="no-tools">-</span>'}</td>
			<td>${formatDuration(result.totalTimeMs)}</td>
			<td>${result.totalInputTokens.toLocaleString()}</td>
			<td>${result.totalOutputTokens.toLocaleString()}</td>
			<td>${result.linesOfCode}</td>
		</tr>
		<tr id="detail-${index}" class="detail-row" data-complexity="${result.complexity ?? 'medium'}" data-prompt-hash="${promptHash}" style="display:none">
			<td colspan="11">
				<div class="detail-content">
					<div class="detail-section">
						<h4>Prompt</h4>
						<p class="prompt-full">${escapeHtml(result.prompt)}</p>
					</div>
					${
						result.workflowJson
							? `<div class="detail-section">
						<h4>Workflow Preview</h4>
						<n8n-demo workflow='${escapeHtml(result.workflowJson)}'></n8n-demo>
					</div>`
							: ''
					}
					<div class="detail-section">
						<h4>Checklist (${passedCount}/${totalCount})</h4>
						<ul class="checklist">
							${result.checklist
								.map((item) => {
									const verification = result.checklistResults.find((r) => r.id === item.id);
									const passed = verification?.pass ?? false;
									return `<li class="${passed ? 'pass' : 'fail'}">
										<span class="check">${passed ? '\u2713' : '\u2717'}</span>
										<span class="category">[${item.category}]</span>
										${escapeHtml(item.item)}
										${verification ? `<div class="reasoning">${escapeHtml(verification.reasoning)}</div>` : ''}
									</li>`;
								})
								.join('')}
						</ul>
					</div>
					<div class="detail-section">
						<h4>Generated Code (${result.linesOfCode} lines)</h4>
						<pre><code>${escapeHtml(result.generatedCode)}</code></pre>
					</div>
					<div class="detail-section">
						<h4>Iterations (${result.iterations.length})</h4>
						${result.iterations
							.map(
								(iter) => `
							<details class="iteration-detail">
								<summary>
									<span class="iter-num">#${iter.iterationNumber}</span>
									<span class="iter-meta">
										${iter.durationMs > 0 ? formatDuration(iter.durationMs) : '-'}
										&middot; ${iter.inputTokens.toLocaleString()} in
										&middot; ${iter.outputTokens.toLocaleString()} out
										&middot; ${iter.thinkingTokens.toLocaleString()} thinking
										&middot; ${iter.toolCalls.length} tool call${iter.toolCalls.length !== 1 ? 's' : ''}
									</span>
								</summary>
								<div class="iteration-tools">
									${iter.toolCalls.length > 0 ? iter.toolCalls.map((tc, tci) => renderToolCallDetail(tc, tci, `detail-${index}-iter-${iter.iterationNumber}`)).join('') : '<div class="no-tools">No tool calls</div>'}
								</div>
							</details>`,
							)
							.join('')}
					</div>
					${
						result.workflowJson
							? `<details class="detail-section">
						<summary><h4 style="display:inline;cursor:pointer">Workflow JSON</h4></summary>
						<pre style="margin-top:8px;white-space:pre-wrap"><code>${escapeHtml(result.workflowJson)}</code></pre>
					</details>`
							: ''
					}
				</div>
			</td>
		</tr>`;
}

function renderRunSection(run: Run, runIndex: number): string {
	backfillFromPrompts(run);
	const avgScore =
		run.results.length > 0
			? run.results.reduce((sum, r) => sum + r.checklistScore, 0) / run.results.length
			: 0;
	const avgTime =
		run.results.length > 0
			? run.results.reduce((sum, r) => sum + r.totalTimeMs, 0) / run.results.length
			: 0;

	return `
		<div class="run-section">
			<div class="run-header" onclick="toggleRun('run-${runIndex}')">
				<h3>
					${escapeHtml(run.config.model)}
					<span class="run-date">${run.id.slice(0, 8)} — ${new Date(run.createdAt).toLocaleString()}</span>
					<span class="badge badge-${run.status}">${run.status}</span>
				</h3>
				<div class="run-summary">
					<span>${run.results.length} results</span>
					<span>Avg Score: ${formatScore(avgScore)}</span>
					<span>Avg Time: ${formatDuration(avgTime)}</span>
					<span>${run.config.prompts.length} prompts</span>
				</div>
			</div>
			<div id="run-${runIndex}" class="run-detail" style="display:none">
				<table class="results-table">
					<thead>
						<tr>
							<th>Complexity</th>
							<th>Prompt</th>
							<th>Tags</th>
							<th>Success</th>
							<th>Score</th>
							<th>Iterations</th>
							<th>Tool Calls</th>
							<th>Time</th>
							<th>In Tokens</th>
							<th>Out Tokens</th>
							<th>Lines of Code</th>
						</tr>
					</thead>
					<tbody>
						${[...run.results]
							.sort((a, b) => {
								const complexityOrder = { simple: 0, medium: 1, complex: 2 };
								return (
									(complexityOrder[a.complexity ?? 'medium'] ?? 1) -
										(complexityOrder[b.complexity ?? 'medium'] ?? 1) ||
									a.prompt.localeCompare(b.prompt)
								);
							})
							.map((r, i) => renderResultRow(r, runIndex * 1000 + i))
							.join('')}
					</tbody>
				</table>
			</div>
		</div>`;
}

export function generateReport(runs: Run[]): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>n8n Code Builder — Checklist Eval Report</title>
<script src="https://cdn.jsdelivr.net/npm/@webcomponents/webcomponentsjs@2.0.0/webcomponents-loader.js"></script>
<script src="https://www.unpkg.com/lit@2.0.0-rc.2/polyfill-support.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/@n8n_io/n8n-demo-component/n8n-demo.bundled.js"></script>
<style>
	* { margin: 0; padding: 0; box-sizing: border-box; }
	body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0d1117; color: #c9d1d9; padding: 24px; }
	h1 { color: #f0f6fc; margin-bottom: 8px; }
	.subtitle { color: #8b949e; margin-bottom: 24px; }
	.filters { margin-bottom: 16px; display: flex; gap: 12px; flex-wrap: wrap; }
	.filters select, .filters input { background: #161b22; color: #c9d1d9; border: 1px solid #30363d; padding: 6px 12px; border-radius: 6px; }
	.run-section { background: #161b22; border: 1px solid #30363d; border-radius: 8px; margin-bottom: 16px; overflow: hidden; }
	.run-header { padding: 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
	.run-header:hover { background: #1c2129; }
	.run-header h3 { display: flex; align-items: center; gap: 12px; }
	.run-date { color: #8b949e; font-size: 14px; font-weight: normal; }
	.run-summary { display: flex; gap: 16px; color: #8b949e; font-size: 13px; }
	.badge { padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; }
	.badge-running { background: #d29922; color: #f0c000; }
	.badge-completed { background: #238636; color: #3fb950; }
	.badge-failed { background: #da3633; color: #f85149; }
	.results-table { width: 100%; border-collapse: collapse; font-size: 13px; }
	.results-table th { background: #0d1117; padding: 8px 12px; text-align: left; color: #8b949e; border-bottom: 1px solid #30363d; }
	.results-table td { padding: 8px 12px; border-bottom: 1px solid #21262d; }
	.result-row { cursor: pointer; }
	.result-row:hover { background: #1c2129; }
	.prompt-cell { max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.good { color: #3fb950; }
	.ok { color: #d29922; }
	.bad { color: #f85149; }
	.detail-content { padding: 16px; background: #0d1117; }
	.detail-section { margin-bottom: 16px; }
	.detail-section h4 { color: #f0f6fc; margin-bottom: 8px; }
	.checklist { list-style: none; }
	.checklist li { padding: 4px 0; display: flex; gap: 8px; align-items: flex-start; }
	.checklist .check { font-weight: bold; min-width: 16px; }
	.checklist .pass .check { color: #3fb950; }
	.checklist .fail .check { color: #f85149; }
	.checklist .category { color: #8b949e; font-size: 12px; }
	.checklist .reasoning { color: #8b949e; font-size: 12px; margin-top: 2px; margin-left: 24px; }
	pre { background: #161b22; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 12px; line-height: 1.5; max-height: 400px; overflow-y: auto; }
	code { color: #c9d1d9; }
	.iterations-table { width: 100%; border-collapse: collapse; font-size: 12px; }
	.iterations-table th, .iterations-table td { padding: 4px 8px; border: 1px solid #30363d; }
	.iterations-table th { background: #161b22; }
	.summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
	.summary-card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; }
	.summary-card .label { color: #8b949e; font-size: 13px; }
	.summary-card .value { color: #f0f6fc; font-size: 24px; font-weight: 600; margin-top: 4px; }
	.prompt-full { color: #c9d1d9; font-size: 13px; line-height: 1.6; white-space: pre-wrap; background: #161b22; padding: 10px 14px; border-radius: 6px; border: 1px solid #30363d; }
	.badge-complexity-simple { background: #23863633; color: #3fb950; }
	.badge-complexity-medium { background: #d2992233; color: #d29922; }
	.badge-complexity-complex { background: #da363333; color: #f85149; }
	.badge-tag { background: #30363d; color: #c9d1d9; font-size: 11px; padding: 1px 6px; margin: 1px; display: inline-block; }
	.tags-cell { max-width: 180px; }
	.tool-calls-cell { max-width: 250px; line-height: 1.6; }
	.badge-tool { background: #1f6feb33; color: #58a6ff; font-size: 11px; padding: 1px 6px; margin: 1px; display: inline-block; font-family: monospace; }
	.result-row.sibling-highlight { border-left: 3px solid; }
	n8n-demo { display: block; margin: 8px 0; min-height: 200px; }
	.iteration-detail { margin-bottom: 4px; border: 1px solid #30363d; border-radius: 6px; }
	.iteration-detail > summary { padding: 8px 12px; cursor: pointer; display: flex; align-items: center; gap: 12px; font-size: 13px; }
	.iteration-detail > summary:hover { background: #1c2129; }
	.iteration-detail[open] > summary { border-bottom: 1px solid #30363d; }
	.iter-num { font-weight: 600; color: #f0f6fc; min-width: 24px; }
	.iter-meta { color: #8b949e; }
	.iteration-tools { padding: 8px; }
	.tool-call-detail { margin: 4px 0; border: 1px solid #21262d; border-radius: 4px; }
	.tool-call-detail > summary { padding: 6px 10px; cursor: pointer; font-size: 12px; font-family: monospace; display: flex; align-items: center; gap: 8px; }
	.tool-call-detail > summary:hover { background: #161b22; }
	.tool-call-detail[open] > summary { border-bottom: 1px solid #21262d; }
	.tool-call-body { padding: 8px 10px; }
	.tool-section { margin-bottom: 8px; }
	.tool-section-label { color: #8b949e; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
	.tool-json { font-size: 11px; max-height: 200px; overflow-y: auto; margin: 0; padding: 8px; }
	.tool-error { color: #f85149; font-size: 12px; padding: 4px 8px; background: #da363322; border-radius: 4px; }
	.tool-result-details { margin-top: 4px; }
	.tool-result-details > summary { cursor: pointer; color: #8b949e; font-size: 12px; }
	.diff-view { margin: 4px 0; }
	.diff-label { font-size: 11px; color: #8b949e; padding: 2px 8px; }
	.diff-old { border-left: 3px solid #f85149; margin-bottom: 4px; }
	.diff-old pre { background: #da363311; margin: 0; }
	.diff-new { border-left: 3px solid #3fb950; }
	.diff-new pre { background: #23863611; margin: 0; }
	.no-tools { color: #8b949e; font-size: 12px; padding: 4px; }
</style>
</head>
<body>
<h1>n8n Code Builder — Checklist Eval Report</h1>
<p class="subtitle">Generated ${new Date().toLocaleString()} — ${runs.length} run(s)</p>

<div class="summary-grid">
	<div class="summary-card">
		<div class="label">Total Runs</div>
		<div class="value">${runs.length}</div>
	</div>
	<div class="summary-card">
		<div class="label">Total Results</div>
		<div class="value">${runs.reduce((s, r) => s + r.results.length, 0)}</div>
	</div>
	<div class="summary-card">
		<div class="label">Avg Checklist Score</div>
		<div class="value">${formatScore(
			runs.length > 0
				? runs.reduce((s, r) => s + r.results.reduce((ss, rr) => ss + rr.checklistScore, 0), 0) /
						Math.max(
							1,
							runs.reduce((s, r) => s + r.results.length, 0),
						)
				: 0,
		)}</div>
	</div>
	<div class="summary-card">
		<div class="label">Success Rate</div>
		<div class="value">${formatScore(
			runs.length > 0
				? runs.reduce((s, r) => s + r.results.filter((rr) => rr.success).length, 0) /
						Math.max(
							1,
							runs.reduce((s, r) => s + r.results.length, 0),
						)
				: 0,
		)}</div>
	</div>
</div>

<div class="filters">
	<select id="filter-complexity" onchange="filterResults()">
		<option value="">All Complexity</option>
		<option value="simple">Simple</option>
		<option value="medium">Medium</option>
		<option value="complex">Complex</option>
	</select>
	<select id="filter-tag" onchange="filterResults()">
		<option value="">All Tags</option>
		${[...new Set(runs.flatMap((r) => r.results.flatMap((res) => res.tags ?? [])))]
			.sort()
			.map((tag) => `<option value="${escapeHtml(tag)}">${escapeHtml(tag)}</option>`)
			.join('')}
	</select>
</div>

${runs.map((run, i) => renderRunSection(run, i)).join('')}

<script>
var HIGHLIGHT_COLORS = [
	'#1f6feb', '#8957e5', '#bf4b8a', '#d29922', '#238636',
	'#da3633', '#3fb950', '#58a6ff', '#d2a8ff', '#f0883e',
];
var _promptColorMap = {};
var _nextColorIdx = 0;
function getPromptColor(hash) {
	if (!_promptColorMap[hash]) {
		_promptColorMap[hash] = HIGHLIGHT_COLORS[_nextColorIdx % HIGHLIGHT_COLORS.length];
		_nextColorIdx++;
	}
	return _promptColorMap[hash];
}
function toggleDetail(id, promptHash) {
	var el = document.getElementById(id);
	if (!el) return;
	var wasOpen = el.style.display !== 'none';
	// Close all open details and remove all highlights
	document.querySelectorAll('.detail-row').forEach(function(d) { d.style.display = 'none'; });
	document.querySelectorAll('.result-row.sibling-highlight').forEach(function(r) {
		r.classList.remove('sibling-highlight');
		r.style.borderLeftColor = '';
		r.style.background = '';
	});
	if (wasOpen) return;
	el.style.display = 'table-row';
	// Highlight sibling rows with the same prompt
	var clickedRow = el.previousElementSibling;
	var color = getPromptColor(promptHash);
	document.querySelectorAll('.result-row[data-prompt-hash="' + promptHash + '"]').forEach(function(r) {
		if (r !== clickedRow) {
			r.classList.add('sibling-highlight');
			r.style.borderLeftColor = color;
			r.style.background = color + '1a';
		}
	});
}
function toggleRun(id) {
	const el = document.getElementById(id);
	if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}
function filterResults() {
	var complexity = document.getElementById('filter-complexity').value;
	var tag = document.getElementById('filter-tag').value;
	var rows = document.querySelectorAll('.result-row');
	rows.forEach(function(row) {
		var show = true;
		if (complexity && row.getAttribute('data-complexity') !== complexity) show = false;
		if (tag) {
			var tags = (row.getAttribute('data-tags') || '').split(',');
			if (tags.indexOf(tag) === -1) show = false;
		}
		row.style.display = show ? '' : 'none';
		// Also hide the corresponding detail row
		var detailId = row.getAttribute('onclick').match(/detail-(\\d+)/);
		if (detailId) {
			var detail = document.getElementById('detail-' + detailId[1]);
			if (detail) detail.style.display = 'none';
		}
	});
}
</script>
</body>
</html>`;
}

export function writeReport(runs: Run[]): void {
	const reportDir = path.join(__dirname, '..', '.data');
	if (!fs.existsSync(reportDir)) {
		fs.mkdirSync(reportDir, { recursive: true });
	}
	const html = generateReport(runs);
	fs.writeFileSync(path.join(reportDir, 'checklist-report.html'), html);
}
