import fs from 'fs';
import path from 'path';
import type {
	Run,
	InstanceAiResult,
	PromptConfig,
	ChatMessage,
	ChatToolCall,
	ChatEntry,
} from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
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

// ---------------------------------------------------------------------------
// Backfill complexity and tags from prompt config into results
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Tags rendering
// ---------------------------------------------------------------------------

function renderTags(tags: string[] | undefined): string {
	if (!tags || tags.length === 0) return '';
	return tags.map((tag) => `<span class="badge badge-tag">${escapeHtml(tag)}</span>`).join(' ');
}

// ---------------------------------------------------------------------------
// Chat conversation rendering (from rich messages endpoint)
// ---------------------------------------------------------------------------

const WORKFLOW_TOOL_NAMES = new Set([
	'build-workflow',
	'submit-workflow',
	'patch-workflow',
	'build-workflow-with-agent',
]);

function getWorkflowIdFromResult(result: unknown): string | undefined {
	if (typeof result === 'object' && result !== null) {
		const rec = result as Record<string, unknown>;
		if (typeof rec.workflowId === 'string') return rec.workflowId;
		if (typeof rec.id === 'string') return rec.id;
	}
	return undefined;
}

function renderChatToolCall(
	tc: ChatToolCall,
	idx: number,
	workflowJsonMap: Map<string, Record<string, unknown>>,
): string {
	const statusBadge = tc.error
		? '<span class="badge badge-failed">ERROR</span>'
		: '<span class="badge badge-completed">OK</span>';

	let argsHtml = '';
	if (Object.keys(tc.args).length > 0) {
		argsHtml = `<pre class="tool-json"><code>${escapeHtml(JSON.stringify(tc.args, null, 2))}</code></pre>`;
	}

	let resultHtml = '';
	if (tc.result !== undefined) {
		const resultStr =
			typeof tc.result === 'string' ? tc.result : JSON.stringify(tc.result, null, 2);
		const truncated =
			resultStr.length > 2000 ? resultStr.slice(0, 2000) + '\n... (truncated)' : resultStr;
		resultHtml = `<details class="tool-result-details"><summary>Output</summary><pre class="tool-json"><code>${escapeHtml(truncated)}</code></pre></details>`;
	}
	if (tc.error) {
		resultHtml += `<div class="tool-error">${escapeHtml(tc.error)}</div>`;
	}

	// Workflow preview for build-workflow tool calls
	let previewHtml = '';
	if (WORKFLOW_TOOL_NAMES.has(tc.toolName) && tc.result) {
		const wfId = getWorkflowIdFromResult(tc.result);
		const wfJson = wfId ? workflowJsonMap.get(wfId) : undefined;
		if (wfJson) {
			const wfJsonStr = JSON.stringify(wfJson);
			previewHtml = `<div class="tool-section"><n8n-demo tidyup="true" workflow='${escapeHtml(wfJsonStr)}'></n8n-demo></div>`;
		}
	}

	return `<details class="tool-call-detail" id="chat-tc-${String(idx)}">
		<summary>${escapeHtml(tc.toolName)} ${statusBadge}</summary>
		<div class="tool-call-body">
			${argsHtml ? `<div class="tool-section"><div class="tool-section-label">Input</div>${argsHtml}</div>` : ''}
			${resultHtml ? `<div class="tool-section">${resultHtml}</div>` : ''}
			${previewHtml}
		</div>
	</details>`;
}

function renderChatEntry(
	entry: ChatEntry,
	tcIdx: number,
	workflowJsonMap: Map<string, Record<string, unknown>>,
): string {
	if (entry.type === 'text') {
		return `<div style="margin:8px 0;padding:8px;background:#161b22;border:1px solid #30363d;border-radius:4px;font-size:12px;color:#c9d1d9;white-space:pre-wrap">${escapeHtml(entry.content)}</div>`;
	}
	return renderChatToolCall(entry.toolCall, tcIdx, workflowJsonMap);
}

function buildWorkflowJsonMap(result: InstanceAiResult): Map<string, Record<string, unknown>> {
	const map = new Map<string, Record<string, unknown>>();
	for (const wfJson of result.outcome.workflowJsons) {
		if (typeof wfJson.id === 'string') {
			map.set(wfJson.id, wfJson);
		}
	}
	return map;
}

function renderChatMessagesSection(
	messages: ChatMessage[] | undefined,
	result: InstanceAiResult,
): string {
	if (!messages || messages.length === 0) return '';

	const workflowJsonMap = buildWorkflowJsonMap(result);
	let html = '<div class="detail-section"><h4>Chat Conversation</h4>';
	let tcIdx = 0;

	for (const msg of messages) {
		if (msg.role === 'user') {
			continue; // User message is already shown as the prompt
		}

		for (const entry of msg.entries) {
			html += renderChatEntry(entry, tcIdx++, workflowJsonMap);
		}
	}

	html += '</div>';
	return html;
}

// ---------------------------------------------------------------------------
// Workflow summary rendering
// ---------------------------------------------------------------------------

function renderWorkflowsSection(result: InstanceAiResult): string {
	if (result.outcome.workflowsCreated.length === 0) return '';

	let html = `<div class="detail-section"><h4>Created Workflows (${String(result.outcome.workflowsCreated.length)})</h4>`;

	for (let i = 0; i < result.outcome.workflowsCreated.length; i++) {
		const wf = result.outcome.workflowsCreated[i];
		const wfJson = result.outcome.workflowJsons[i];

		html += `<div style="margin:8px 0;padding:8px;background:#161b22;border:1px solid #30363d;border-radius:4px;font-size:12px">
			<strong>${escapeHtml(wf.name)}</strong> (ID: ${escapeHtml(wf.id)})
			<span style="color:#8b949e;margin-left:8px">${String(wf.nodeCount)} nodes, active: ${String(wf.active)}</span>
		</div>`;

		// n8n-demo interactive preview
		if (wfJson) {
			const wfJsonStr = JSON.stringify(wfJson);
			html += `<n8n-demo tidyup="true" workflow='${escapeHtml(wfJsonStr)}'></n8n-demo>`;

			// Collapsible raw JSON
			html += `<details style="margin-bottom:12px"><summary style="cursor:pointer;color:#8b949e;font-size:12px;margin-top:4px">Workflow JSON</summary>`;
			html += `<pre><code>${escapeHtml(JSON.stringify(wfJson, null, 2))}</code></pre></details>`;
		}
	}

	html += '</div>';
	return html;
}

// ---------------------------------------------------------------------------
// Execution summary rendering
// ---------------------------------------------------------------------------

function renderExecutionsSection(result: InstanceAiResult, n8nBaseUrl: string): string {
	if (result.outcome.executionsRun.length === 0) return '';

	const items = result.outcome.executionsRun
		.map((exec) => {
			const statusBadge =
				exec.status === 'success'
					? '<span class="badge badge-completed">success</span>'
					: exec.status === 'error' || exec.status === 'failed'
						? '<span class="badge badge-failed">failed</span>'
						: exec.status === 'skipped'
							? '<span class="badge badge-tag">skipped</span>'
							: `<span class="badge badge-tag">${escapeHtml(exec.status)}</span>`;

			const evalBadge = exec.triggeredByEval
				? ' <span class="badge badge-tool">eval-triggered</span>'
				: '';

			const errorLine = exec.error
				? `<div class="tool-error" style="margin-top:4px">${escapeHtml(exec.error)}</div>`
				: '';

			const failedNodeLine = exec.failedNode
				? `<div style="margin-top:4px;font-size:11px;color:#8b949e">Last node: <code>${escapeHtml(exec.failedNode)}</code></div>`
				: '';

			// Link to open execution in n8n (new tab)
			const hasPreview = exec.id && exec.id !== '' && exec.workflowId && exec.workflowId !== '';
			const previewUrl = hasPreview
				? `${n8nBaseUrl}/workflow/${exec.workflowId}/executions/${exec.id}`
				: '';
			const previewHtml = hasPreview
				? `<a href="${escapeHtml(previewUrl)}" target="_blank" rel="noopener" class="exec-preview-link">Open in n8n &rarr;</a>`
				: '';

			return `<div style="margin:8px 0;padding:8px;background:#161b22;border:1px solid #30363d;border-radius:4px;font-size:12px">
				<div>Execution ${escapeHtml(exec.id || '(eval-triggered)')} (workflow: ${escapeHtml(exec.workflowId)}) ${statusBadge}${evalBadge}</div>
				${errorLine}${failedNodeLine}${previewHtml}
			</div>`;
		})
		.join('');

	return `<div class="detail-section"><h4>Execution Results (${String(result.outcome.executionsRun.length)})</h4>${items}</div>`;
}

// ---------------------------------------------------------------------------
// Result row rendering
// ---------------------------------------------------------------------------

function renderResultRow(result: InstanceAiResult, index: number, n8nBaseUrl: string): string {
	const passedCount = result.checklistResults.filter((r) => r.pass).length;
	const totalCount = result.checklist.length;
	const scoreClass =
		result.checklistScore >= 0.8 ? 'good' : result.checklistScore >= 0.5 ? 'ok' : 'bad';
	const successClass = result.success ? 'good' : 'bad';

	const execPassedCount = (result.executionChecklistResults ?? []).filter((r) => r.pass).length;
	const execTotalCount = (result.executionChecklist ?? []).length;
	const execScoreClass =
		execTotalCount === 0
			? ''
			: result.executionChecklistScore >= 0.8
				? 'good'
				: result.executionChecklistScore >= 0.5
					? 'ok'
					: 'bad';
	const execScoreText =
		execTotalCount > 0
			? `${execPassedCount}/${execTotalCount} (${formatScore(result.executionChecklistScore)})`
			: '-';

	const promptHash = simpleHash(result.prompt);
	const { metrics } = result;

	return `
		<tr class="result-row" data-complexity="${result.complexity ?? 'medium'}" data-tags="${escapeHtml((result.tags ?? []).join(','))}" data-prompt-hash="${promptHash}" onclick="toggleDetail('detail-${index}', '${promptHash}')">
			<td><span class="badge badge-complexity-${result.complexity ?? 'medium'}">${(result.complexity ?? 'medium').toUpperCase()}</span></td>
			<td class="prompt-cell" title="${escapeHtml(result.prompt)}">${escapeHtml(result.prompt.slice(0, 80))}${result.prompt.length > 80 ? '...' : ''}</td>
			<td class="tags-cell">${renderTags(result.tags)}</td>
			<td class="${successClass}">${result.success ? 'PASS' : 'FAIL'}</td>
			<td class="${scoreClass}">${passedCount}/${totalCount} (${formatScore(result.checklistScore)})</td>
			<td class="${execScoreClass}">${execScoreText}</td>
			<td>${String(metrics.totalToolCalls)}</td>
			<td>${String(metrics.subAgentsSpawned)}</td>
			<td>${formatDuration(metrics.totalTimeMs)}</td>
			<td>${metrics.timeToFirstTextMs > 0 ? formatDuration(metrics.timeToFirstTextMs) : '-'}</td>
		</tr>
		<tr id="detail-${index}" class="detail-row" data-complexity="${result.complexity ?? 'medium'}" data-prompt-hash="${promptHash}" style="display:none">
			<td colspan="10">
				<div class="detail-content">
					<div class="detail-section">
						<h4>Prompt</h4>
						<p class="prompt-full">${escapeHtml(result.prompt)}</p>
						<a href="${escapeHtml(n8nBaseUrl)}/instance-ai/${escapeHtml(result.threadId)}" target="_blank" rel="noopener" class="chat-link">Open chat &rarr;</a>
					</div>
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
					${
						(result.executionChecklist ?? []).length > 0
							? `<div class="detail-section">
						<h4>Execution Checklist (${execPassedCount}/${execTotalCount})</h4>
						<ul class="checklist">
							${(result.executionChecklist ?? [])
								.map((item) => {
									const verification = (result.executionChecklistResults ?? []).find(
										(r) => r.id === item.id,
									);
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
					</div>`
							: ''
					}
					${renderChatMessagesSection(result.chatMessages, result)}
					${renderWorkflowsSection(result)}
					${renderExecutionsSection(result, n8nBaseUrl)}
					${
						result.error
							? `<div class="detail-section">
						<h4>Error</h4>
						<div class="tool-error">${escapeHtml(result.error)}</div>
					</div>`
							: ''
					}
				</div>
			</td>
		</tr>`;
}

// ---------------------------------------------------------------------------
// Run section rendering
// ---------------------------------------------------------------------------

function renderRunSection(run: Run, runIndex: number): string {
	backfillFromPrompts(run);
	const avgScore =
		run.results.length > 0
			? run.results.reduce((sum, r) => sum + r.checklistScore, 0) / run.results.length
			: 0;
	const avgTime =
		run.results.length > 0
			? run.results.reduce((sum, r) => sum + r.metrics.totalTimeMs, 0) / run.results.length
			: 0;

	return `
		<div class="run-section">
			<div class="run-header" onclick="toggleRun('run-${runIndex}')">
				<h3>
					Run
					<span class="run-date">${run.id.slice(0, 8)} — ${new Date(run.createdAt).toLocaleString()}</span>
					<span class="badge badge-${run.status}">${run.status}</span>
				</h3>
				<div class="run-summary">
					<span>${String(run.results.length)} results</span>
					<span>Avg Score: ${formatScore(avgScore)}</span>
					<span>Avg Time: ${formatDuration(avgTime)}</span>
					<span>${String(run.config.prompts.length)} prompts</span>
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
							<th>Build Score</th>
							<th>Exec Score</th>
							<th>Tool Calls</th>
							<th>Sub-Agents</th>
							<th>Time</th>
							<th>1st Text</th>
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
							.map((r, i) => renderResultRow(r, runIndex * 1000 + i, run.config.n8nBaseUrl))
							.join('')}
					</tbody>
				</table>
			</div>
		</div>`;
}

// ---------------------------------------------------------------------------
// Summary card helpers
// ---------------------------------------------------------------------------

function computeAvgToolCalls(runs: Run[]): string {
	const allResults = runs.flatMap((r) => r.results);
	if (allResults.length === 0) return '-';
	const avg = allResults.reduce((sum, r) => sum + r.metrics.totalToolCalls, 0) / allResults.length;
	return avg.toFixed(1);
}

function computeAvgSubAgents(runs: Run[]): string {
	const allResults = runs.flatMap((r) => r.results);
	if (allResults.length === 0) return '-';
	const avg =
		allResults.reduce((sum, r) => sum + r.metrics.subAgentsSpawned, 0) / allResults.length;
	return avg.toFixed(1);
}

function computeAvgTime(runs: Run[]): string {
	const allResults = runs.flatMap((r) => r.results);
	if (allResults.length === 0) return '-';
	const avg = allResults.reduce((sum, r) => sum + r.metrics.totalTimeMs, 0) / allResults.length;
	return formatDuration(avg);
}

// ---------------------------------------------------------------------------
// Report generation
// ---------------------------------------------------------------------------

export function generateReport(runs: Run[]): string {
	const totalResults = runs.reduce((s, r) => s + r.results.length, 0);
	const avgScore =
		totalResults > 0
			? runs.reduce((s, r) => s + r.results.reduce((ss, rr) => ss + rr.checklistScore, 0), 0) /
				totalResults
			: 0;
	const successRate =
		totalResults > 0
			? runs.reduce((s, r) => s + r.results.filter((rr) => rr.success).length, 0) / totalResults
			: 0;
	const execResults = runs.flatMap((r) =>
		r.results.filter((rr) => (rr.executionChecklist ?? []).length > 0),
	);
	const avgExecScore =
		execResults.length > 0
			? execResults.reduce((s, rr) => s + rr.executionChecklistScore, 0) / execResults.length
			: 0;

	const allTags = [
		...new Set(runs.flatMap((r) => r.results.flatMap((res) => res.tags ?? []))),
	].sort();

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Instance AI — Checklist Evaluation Report</title>
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
	.summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
	.summary-card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; }
	.summary-card .label { color: #8b949e; font-size: 13px; }
	.summary-card .value { color: #f0f6fc; font-size: 24px; font-weight: 600; margin-top: 4px; }
	.prompt-full { color: #c9d1d9; font-size: 13px; line-height: 1.6; white-space: pre-wrap; background: #161b22; padding: 10px 14px; border-radius: 6px; border: 1px solid #30363d; }
	.badge-complexity-simple { background: #23863633; color: #3fb950; }
	.badge-complexity-medium { background: #d2992233; color: #d29922; }
	.badge-complexity-complex { background: #da363333; color: #f85149; }
	.badge-tag { background: #30363d; color: #c9d1d9; font-size: 11px; padding: 1px 6px; margin: 1px; display: inline-block; }
	.tags-cell { max-width: 180px; }
	.badge-tool { background: #1f6feb33; color: #58a6ff; font-size: 11px; padding: 1px 6px; margin: 1px; display: inline-block; font-family: monospace; }
	.result-row.sibling-highlight { border-left: 3px solid; }
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
	.tool-error { color: #f85149; font-size: 12px; padding: 4px 8px; background: #da363322; border-radius: 4px; margin-top: 4px; }
	.tool-result-details { margin-top: 4px; }
	.tool-result-details > summary { cursor: pointer; color: #8b949e; font-size: 12px; }
	.no-tools { color: #8b949e; font-size: 12px; padding: 4px; }
	n8n-demo { display: block; margin: 8px 0; min-height: 200px; }
	.exec-preview-link { display: inline-block; margin-top: 6px; color: #58a6ff; font-size: 12px; text-decoration: none; }
	.exec-preview-link:hover { text-decoration: underline; }
	.chat-link { display: inline-block; margin-top: 8px; color: #58a6ff; font-size: 13px; text-decoration: none; }
	.chat-link:hover { text-decoration: underline; }
</style>
<script src="https://cdn.jsdelivr.net/npm/@webcomponents/webcomponentsjs/webcomponents-loader.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/lit/polyfill-support.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/@n8n_io/n8n-demo-component/n8n-demo.bundled.js"></script>
</head>
<body>
<h1>Instance AI — Checklist Evaluation Report</h1>
<p class="subtitle">Generated ${new Date().toLocaleString()} — ${String(runs.length)} run(s)</p>

<div class="summary-grid">
	<div class="summary-card">
		<div class="label">Total Runs</div>
		<div class="value">${String(runs.length)}</div>
	</div>
	<div class="summary-card">
		<div class="label">Avg Build Score</div>
		<div class="value">${formatScore(avgScore)}</div>
	</div>
	<div class="summary-card">
		<div class="label">Avg Exec Score</div>
		<div class="value">${execResults.length > 0 ? formatScore(avgExecScore) : '-'}</div>
	</div>
	<div class="summary-card">
		<div class="label">Success Rate</div>
		<div class="value">${formatScore(successRate)}</div>
	</div>
	<div class="summary-card">
		<div class="label">Avg Time</div>
		<div class="value">${computeAvgTime(runs)}</div>
	</div>
	<div class="summary-card">
		<div class="label">Avg Tool Calls</div>
		<div class="value">${computeAvgToolCalls(runs)}</div>
	</div>
	<div class="summary-card">
		<div class="label">Avg Sub-Agents</div>
		<div class="value">${computeAvgSubAgents(runs)}</div>
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
		${allTags
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
	document.querySelectorAll('.detail-row').forEach(function(d) { d.style.display = 'none'; });
	document.querySelectorAll('.result-row.sibling-highlight').forEach(function(r) {
		r.classList.remove('sibling-highlight');
		r.style.borderLeftColor = '';
		r.style.background = '';
	});
	if (wasOpen) return;
	el.style.display = 'table-row';
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
	var el = document.getElementById(id);
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

// ---------------------------------------------------------------------------
// Write report to disk
// ---------------------------------------------------------------------------

export function writeReport(runs: Run[]): void {
	const reportDir = path.join(__dirname, '..', '.data');
	if (!fs.existsSync(reportDir)) {
		fs.mkdirSync(reportDir, { recursive: true });
	}
	const html = generateReport(runs);
	fs.writeFileSync(path.join(reportDir, 'instance-ai-report.html'), html);
}
