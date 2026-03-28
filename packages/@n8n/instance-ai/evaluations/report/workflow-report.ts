/**
 * HTML report generator for workflow test case evaluations.
 *
 * Produces a self-contained HTML file with:
 * - Summary dashboard (test cases, scenarios, pass rate)
 * - Per-test-case cards with scenario breakdown
 * - Expandable scenario details (reasoning, node outputs, pin data)
 */

import fs from 'fs';
import path from 'path';

import type { WorkflowTestCaseResult, ScenarioResult } from '../types';

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

// ---------------------------------------------------------------------------
// Scenario rendering
// ---------------------------------------------------------------------------

function renderScenario(sr: ScenarioResult, index: number): string {
	const icon = sr.success ? '&#10003;' : '&#10007;';
	const statusClass = sr.success ? 'pass' : 'fail';

	let detailHtml = '';
	if (sr.reasoning) {
		detailHtml += `<div class="scenario-reasoning">${escapeHtml(sr.reasoning)}</div>`;
	}

	if (sr.evalResult) {
		const statusLabel = sr.evalResult.success ? 'success' : 'error';
		detailHtml += `<div class="scenario-exec-status">Execution: <span class="badge badge-${sr.evalResult.success ? 'pass' : 'fail'}">${escapeHtml(statusLabel)}</span></div>`;

		if (sr.evalResult.errors.length > 0) {
			detailHtml += `<div class="scenario-error">${escapeHtml(sr.evalResult.errors.join('; '))}</div>`;
		}

		// Show Phase 1 warnings prominently if present
		const warnings = sr.evalResult.hints?.warnings ?? [];
		if (warnings.length > 0) {
			detailHtml += `<div class="scenario-error" style="background:#d2992222;color:#d29922;">${escapeHtml(warnings.join('; '))}</div>`;
		}

		// Show Phase 1 hints (trigger content + global context)
		if (sr.evalResult.hints) {
			const triggerKeys = Object.keys(sr.evalResult.hints.triggerContent ?? {});
			const triggerLabel =
				triggerKeys.length > 0
					? `triggerContent: {${triggerKeys.join(', ')}}`
					: 'triggerContent: EMPTY';
			const globalLabel = sr.evalResult.hints.globalContext
				? `globalContext: "${sr.evalResult.hints.globalContext.slice(0, 120)}..."`
				: 'globalContext: EMPTY';
			detailHtml += `<details style="margin:6px 0;"><summary style="cursor:pointer;color:#58a6ff;font-size:12px;font-weight:600;">Phase 1 hints</summary>`;
			detailHtml += `<div style="font-size:11px;color:#8b949e;margin:4px 0;">${escapeHtml(triggerLabel)}</div>`;
			detailHtml += `<div style="font-size:11px;color:#8b949e;margin:4px 0;">${escapeHtml(globalLabel)}</div>`;
			const triggerJson = JSON.stringify(sr.evalResult.hints.triggerContent, null, 2);
			detailHtml += `<pre class="node-output-json" style="font-size:11px;"><code>${escapeHtml(triggerJson)}</code></pre>`;
			detailHtml += `</details>`;
		}

		const nodeEntries = Object.entries(sr.evalResult.nodeResults);
		if (nodeEntries.length > 0) {
			detailHtml += '<details class="node-outputs"><summary>Node results</summary>';
			for (const [nodeName, nr] of nodeEntries) {
				const modeLabel = `[${nr.executionMode}]`;
				const configWarning =
					nr.configIssues && Object.keys(nr.configIssues).length > 0
						? ` ⚠ missing: ${Object.values(nr.configIssues).flat().join('; ')}`
						: '';

				detailHtml += `<div class="node-output">
					<div class="node-output-name">${modeLabel} ${escapeHtml(nodeName)}${escapeHtml(configWarning)}</div>`;

				// Show intercepted requests and their mock responses
				if (nr.interceptedRequests.length > 0) {
					detailHtml += `<div class="intercepted-requests">`;
					for (const req of nr.interceptedRequests) {
						detailHtml += `<div class="request-pair">`;
						detailHtml += `<div class="request-label">REQUEST</div>`;
						detailHtml += `<div class="request-url">${escapeHtml(req.method)} ${escapeHtml(req.url)}</div>`;
						if (req.requestBody) {
							const bodyStr = JSON.stringify(req.requestBody, null, 2);
							const truncBody = bodyStr.length > 500 ? bodyStr.slice(0, 500) + '\n...' : bodyStr;
							detailHtml += `<pre class="node-output-json" style="font-size:10px;"><code>${escapeHtml(truncBody)}</code></pre>`;
						}
						detailHtml += `<div class="response-label">MOCK RESPONSE</div>`;
						if (req.mockResponse) {
							const mockStr = JSON.stringify(req.mockResponse, null, 2);
							const truncated = mockStr.length > 1000 ? mockStr.slice(0, 1000) + '\n...' : mockStr;
							detailHtml += `<pre class="node-output-json" style="font-size:10px;"><code>${escapeHtml(truncated)}</code></pre>`;
						} else {
							detailHtml += `<div style="color:#8b949e;font-size:11px;">no mock response</div>`;
						}
						detailHtml += `</div>`;
					}
					detailHtml += `</div>`;
				}

				// Show node output
				if (nr.output !== null && nr.output !== undefined) {
					const jsonStr = JSON.stringify(nr.output, null, 2);
					const truncated =
						jsonStr.length > 2000 ? jsonStr.slice(0, 2000) + '\n... (truncated)' : jsonStr;
					detailHtml += `<pre class="node-output-json"><code>${escapeHtml(truncated)}</code></pre>`;
				} else {
					detailHtml += `<div style="color:#8b949e;font-size:12px;">no output</div>`;
				}

				detailHtml += '</div>';
			}
			detailHtml += '</details>';
		}
	}

	return `<div class="scenario ${statusClass}">
		<div class="scenario-header" onclick="this.parentElement.classList.toggle('expanded')">
			<span class="scenario-icon ${statusClass}">${icon}</span>
			<span class="scenario-name">${escapeHtml(sr.scenario.name)}</span>
			<span class="scenario-desc">${escapeHtml(sr.scenario.description)}</span>
		</div>
		<div class="scenario-detail" id="scenario-${String(index)}">
			${detailHtml}
		</div>
	</div>`;
}

// ---------------------------------------------------------------------------
// Test case rendering
// ---------------------------------------------------------------------------

function renderTestCase(result: WorkflowTestCaseResult, tcIndex: number): string {
	const passCount = result.scenarioResults.filter((sr) => sr.success).length;
	const totalCount = result.scenarioResults.length;
	const allPass = passCount === totalCount && totalCount > 0;
	const statusClass = result.workflowBuildSuccess ? (allPass ? 'pass' : 'mixed') : 'fail';

	const buildBadge = result.workflowBuildSuccess
		? `<span class="badge badge-pass">BUILT</span>`
		: `<span class="badge badge-fail">BUILD FAILED</span>`;

	const scoreBadge =
		totalCount > 0
			? `<span class="badge badge-${allPass ? 'pass' : 'fail'}">${String(passCount)}/${String(totalCount)}</span>`
			: '';

	const prompt = result.testCase.prompt;
	const truncatedPrompt = prompt.length > 100 ? prompt.slice(0, 100) + '...' : prompt;

	let scenariosHtml = '';
	if (result.scenarioResults.length > 0) {
		scenariosHtml = result.scenarioResults
			.map((sr, i) => renderScenario(sr, tcIndex * 100 + i))
			.join('');
	} else if (!result.workflowBuildSuccess) {
		const errorDetail = result.buildError
			? `<div class="build-error"><strong>Error:</strong> ${escapeHtml(result.buildError.slice(0, 1000))}</div>`
			: '';
		scenariosHtml = `<div class="no-scenarios">Workflow failed to build — no scenarios executed</div>${errorDetail}`;
	}

	return `<div class="test-case ${statusClass}">
		<div class="test-case-header" onclick="this.parentElement.classList.toggle('expanded')">
			<div class="test-case-title">
				${buildBadge} ${scoreBadge}
				<span class="test-case-prompt">${escapeHtml(truncatedPrompt)}</span>
			</div>
			<div class="test-case-meta">
				<span class="badge badge-complexity-${result.testCase.complexity}">${result.testCase.complexity}</span>
				${result.testCase.tags.map((t) => `<span class="badge badge-tag">${escapeHtml(t)}</span>`).join(' ')}
				${result.workflowId ? `<span class="workflow-id">${escapeHtml(result.workflowId)}</span>` : ''}
			</div>
		</div>
		<div class="test-case-detail">
			<div class="test-case-full-prompt">${escapeHtml(prompt)}</div>
			${scenariosHtml}
		</div>
	</div>`;
}

// ---------------------------------------------------------------------------
// Full report
// ---------------------------------------------------------------------------

export function generateWorkflowReport(results: WorkflowTestCaseResult[]): string {
	const totalTestCases = results.length;
	const builtCount = results.filter((r) => r.workflowBuildSuccess).length;
	const allScenarios = results.flatMap((r) => r.scenarioResults);
	const passCount = allScenarios.filter((sr) => sr.success).length;
	const totalScenarios = allScenarios.length;
	const passRate = totalScenarios > 0 ? Math.round((passCount / totalScenarios) * 100) : 0;

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Workflow Evaluation Report</title>
<style>
	* { margin: 0; padding: 0; box-sizing: border-box; }
	body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0d1117; color: #c9d1d9; padding: 24px; max-width: 1200px; margin: 0 auto; }
	h1 { color: #f0f6fc; margin-bottom: 4px; }
	.subtitle { color: #8b949e; margin-bottom: 24px; }

	/* Summary */
	.summary { display: flex; gap: 16px; margin-bottom: 32px; flex-wrap: wrap; }
	.summary-card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px 24px; min-width: 140px; }
	.summary-card .label { color: #8b949e; font-size: 13px; }
	.summary-card .value { color: #f0f6fc; font-size: 28px; font-weight: 600; margin-top: 4px; }
	.summary-card .value.pass { color: #3fb950; }
	.summary-card .value.fail { color: #f85149; }
	.summary-card .value.mixed { color: #d29922; }

	/* Badges */
	.badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-right: 4px; }
	.badge-pass { background: #23863633; color: #3fb950; }
	.badge-fail { background: #da363333; color: #f85149; }
	.badge-tag { background: #30363d; color: #8b949e; font-size: 11px; }
	.badge-complexity-simple { background: #23863633; color: #3fb950; }
	.badge-complexity-medium { background: #d2992233; color: #d29922; }
	.badge-complexity-complex { background: #da363333; color: #f85149; }

	/* Test case cards */
	.test-case { background: #161b22; border: 1px solid #30363d; border-radius: 8px; margin-bottom: 12px; overflow: hidden; }
	.test-case.pass { border-left: 3px solid #3fb950; }
	.test-case.fail { border-left: 3px solid #f85149; }
	.test-case.mixed { border-left: 3px solid #d29922; }
	.test-case-header { padding: 16px; cursor: pointer; }
	.test-case-header:hover { background: #1c2129; }
	.test-case-title { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
	.test-case-prompt { color: #f0f6fc; font-weight: 500; }
	.test-case-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
	.workflow-id { color: #8b949e; font-size: 11px; font-family: monospace; }
	.test-case-detail { display: none; padding: 0 16px 16px; }
	.test-case.expanded .test-case-detail { display: block; }
	.test-case-full-prompt { color: #c9d1d9; font-size: 13px; line-height: 1.5; padding: 10px; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; margin-bottom: 12px; white-space: pre-wrap; }

	/* Scenarios */
	.scenario { border: 1px solid #21262d; border-radius: 6px; margin-bottom: 6px; overflow: hidden; }
	.scenario-header { padding: 10px 12px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 13px; }
	.scenario-header:hover { background: #1c2129; }
	.scenario-icon { font-weight: bold; font-size: 14px; min-width: 16px; }
	.scenario-icon.pass { color: #3fb950; }
	.scenario-icon.fail { color: #f85149; }
	.scenario-name { color: #f0f6fc; font-weight: 600; }
	.scenario-desc { color: #8b949e; font-size: 12px; }
	.scenario-detail { display: none; padding: 8px 12px; border-top: 1px solid #21262d; background: #0d1117; }
	.scenario.expanded .scenario-detail { display: block; }
	.scenario-reasoning { color: #c9d1d9; font-size: 12px; line-height: 1.5; margin-bottom: 8px; }
	.scenario-exec-status { font-size: 12px; margin-bottom: 6px; }
	.scenario-error { color: #f85149; font-size: 12px; padding: 4px 8px; background: #da363322; border-radius: 4px; margin-bottom: 6px; }
	.no-scenarios { color: #8b949e; font-size: 13px; padding: 8px; }
	.build-error { color: #f85149; font-size: 12px; padding: 8px 12px; background: #da363322; border-radius: 4px; margin-top: 8px; white-space: pre-wrap; line-height: 1.5; max-height: 300px; overflow-y: auto; }
	.skipped-scenarios { color: #8b949e; font-size: 12px; margin-top: 8px; font-style: italic; }

	/* Node outputs */
	.node-outputs { margin-top: 8px; }
	.node-outputs > summary { cursor: pointer; color: #58a6ff; font-size: 12px; font-weight: 600; }
	.node-output { margin: 6px 0; }
	.node-output-name { color: #f0f6fc; font-size: 12px; font-weight: 600; font-family: monospace; margin-bottom: 2px; }
	.node-output-json { font-size: 11px; max-height: 200px; overflow-y: auto; margin: 0; padding: 8px; background: #161b22; border: 1px solid #21262d; border-radius: 4px; }
	pre { overflow-x: auto; }
	code { color: #c9d1d9; }

	/* Intercepted requests */
	.intercepted-requests { margin: 6px 0; }
	.request-pair { border: 1px solid #21262d; border-radius: 4px; margin-bottom: 6px; overflow: hidden; }
	.request-label { background: #1c3a5e; color: #58a6ff; font-size: 10px; font-weight: 700; padding: 2px 8px; letter-spacing: 0.5px; }
	.response-label { background: #2a1f3e; color: #bc8cff; font-size: 10px; font-weight: 700; padding: 2px 8px; letter-spacing: 0.5px; }
	.request-url { font-size: 11px; color: #c9d1d9; padding: 4px 8px; font-family: monospace; background: #0d1117; }
</style>
</head>
<body>
<h1>Workflow Evaluation Report</h1>
<p class="subtitle">Generated ${new Date().toLocaleString()}</p>

<div class="summary">
	<div class="summary-card">
		<div class="label">Test Cases</div>
		<div class="value">${String(totalTestCases)}</div>
	</div>
	<div class="summary-card">
		<div class="label">Built</div>
		<div class="value${builtCount === totalTestCases ? ' pass' : ' mixed'}">${String(builtCount)}/${String(totalTestCases)}</div>
	</div>
	<div class="summary-card">
		<div class="label">Scenarios</div>
		<div class="value">${String(passCount)}/${String(totalScenarios)}</div>
	</div>
	<div class="summary-card">
		<div class="label">Pass Rate</div>
		<div class="value${passRate >= 80 ? ' pass' : passRate >= 50 ? ' mixed' : ' fail'}">${String(passRate)}%</div>
	</div>
</div>

${results.map((r, i) => renderTestCase(r, i)).join('')}

</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Write report to disk
// ---------------------------------------------------------------------------

export function writeWorkflowReport(results: WorkflowTestCaseResult[]): void {
	const reportDir = path.join(__dirname, '..', '..', '.data');
	if (!fs.existsSync(reportDir)) {
		fs.mkdirSync(reportDir, { recursive: true });
	}
	const html = generateWorkflowReport(results);
	const reportPath = path.join(reportDir, 'workflow-eval-report.html');
	fs.writeFileSync(reportPath, html);
}
