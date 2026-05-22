/**
 * HTML report generator for workflow test case evaluations.
 *
 * Produces a self-contained HTML file optimized for three tasks:
 * 1. Triage — which scenarios failed? (seconds)
 * 2. Diagnose — why did they fail? (minutes)
 * 3. Compare — what changed between runs? (cross-report)
 */

import fs from 'fs';
import path from 'path';

import type {
	ConversationMetrics,
	ExecutionScenarioResult,
	ToolInteraction,
	TranscriptTurn,
	TurnCounter,
	WorkflowTestCaseResult,
} from '../types';

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

function renderScenario(sr: ExecutionScenarioResult, index: number): string {
	const icon = sr.success ? '&#10003;' : '&#10007;';
	const statusClass = sr.success ? 'pass' : 'fail';

	// Passing scenarios: compact one-liner with collapsible detail
	if (sr.success) {
		const summary = sr.reasoning ? sr.reasoning.slice(0, 150) : 'All checks passed';
		return `<div class="scenario ${statusClass}">
			<div class="scenario-header" onclick="this.parentElement.classList.toggle('expanded')">
				<span class="scenario-icon ${statusClass}">${icon}</span>
				<span class="scenario-name">${escapeHtml(sr.scenario.name)}</span>
				<span class="scenario-summary-inline">${escapeHtml(summary)}${sr.reasoning && sr.reasoning.length > 150 ? '...' : ''}</span>
			</div>
			<div class="scenario-detail" id="scenario-${String(index)}">
				${renderScenarioDetail(sr)}
			</div>
		</div>`;
	}

	// Failing scenarios: show error prominently, detail expanded by default
	return `<div class="scenario ${statusClass} expanded">
		<div class="scenario-header" onclick="this.parentElement.classList.toggle('expanded')">
			<span class="scenario-icon ${statusClass}">${icon}</span>
			<span class="scenario-name">${escapeHtml(sr.scenario.name)}</span>
			<span class="scenario-desc">${escapeHtml(sr.scenario.description)}</span>
		</div>
		<div class="scenario-detail" id="scenario-${String(index)}">
			${renderScenarioDetail(sr)}
		</div>
	</div>`;
}

function renderScenarioDetail(sr: ExecutionScenarioResult): string {
	let html = '';

	if (!sr.evalResult) {
		if (sr.reasoning) {
			html += `<div class="diagnosis">${escapeHtml(sr.reasoning)}</div>`;
		}
		return html;
	}

	// Failure category badge
	if (!sr.success && sr.failureCategory) {
		const catClass =
			sr.failureCategory === 'builder_issue'
				? 'warn'
				: sr.failureCategory === 'mock_issue'
					? 'fail'
					: 'info';
		html += `<div class="category-badge category-${catClass}">${escapeHtml(sr.failureCategory)}${sr.rootCause ? ': ' + escapeHtml(sr.rootCause) : ''}</div>`;
	}

	// 1. Error — what broke
	if (sr.evalResult.errors.length > 0) {
		html += `<div class="error-box">${escapeHtml(sr.evalResult.errors.join('; '))}</div>`;
	}

	// Phase 1 warnings
	const warnings = sr.evalResult.hints?.warnings ?? [];
	if (warnings.length > 0) {
		html += `<div class="warning-box">${escapeHtml(warnings.join('; '))}</div>`;
	}

	// 2. Diagnosis — verifier's reasoning
	if (sr.reasoning) {
		html += '<details class="section" open><summary>Diagnosis</summary>';
		html += `<div class="diagnosis">${escapeHtml(sr.reasoning)}</div>`;
		html += '</details>';
	}

	// 3. Mock data plan — Phase 1 hints
	if (sr.evalResult.hints) {
		html += '<details class="section"><summary>Mock data plan</summary>';
		const { globalContext, triggerContent, nodeHints } = sr.evalResult.hints;

		if (globalContext) {
			html += '<div class="subsection-label">Global context</div>';
			html += `<div class="hint-text">${escapeHtml(globalContext)}</div>`;
		}

		if (Object.keys(triggerContent ?? {}).length > 0) {
			html += '<div class="subsection-label">Trigger content</div>';
			html += `<pre class="json-block"><code>${escapeHtml(JSON.stringify(triggerContent, null, 2))}</code></pre>`;
		} else {
			html +=
				'<div class="warning-inline">No trigger content generated \u2014 start node has no input data</div>';
		}

		if (nodeHints && Object.keys(nodeHints).length > 0) {
			html += '<div class="subsection-label">Per-node hints</div>';
			for (const [nodeName, hint] of Object.entries(nodeHints)) {
				html += `<details class="node-hint"><summary>${escapeHtml(nodeName)}</summary>`;
				html += `<div class="hint-text">${escapeHtml(hint)}</div>`;
				html += '</details>';
			}
		}
		html += '</details>';
	}

	// 4. Execution trace — per-node results
	const nodeEntries = Object.entries(sr.evalResult.nodeResults);
	if (nodeEntries.length > 0) {
		html += '<details class="section"><summary>Execution trace</summary>';
		html +=
			'<div class="trace-legend"><span class="node-mode-mocked">mocked</span> <span class="node-mode-pinned">pinned</span> <span class="node-mode-real">real</span></div>';

		for (const [nodeName, nr] of nodeEntries) {
			const modeClass = `node-mode-${nr.executionMode}`;
			const hasError = nr.configIssues && Object.keys(nr.configIssues).length > 0;
			const configWarning = hasError
				? `<span class="build-issue">Build issue: ${escapeHtml(Object.values(nr.configIssues!).flat().join('; '))}</span>`
				: '';

			html += '<div class="trace-node">';
			html += '<div class="trace-node-header">';
			html += `<span class="${modeClass}">[${nr.executionMode}]</span> <strong>${escapeHtml(nodeName)}</strong>`;
			if (nr.interceptedRequests.length > 0) {
				html += ` <span class="request-count">${String(nr.interceptedRequests.length)} request(s)</span>`;
			}
			html += '</div>';
			if (configWarning) html += configWarning;

			// Intercepted requests
			for (const req of nr.interceptedRequests) {
				html += '<div class="request-pair">';
				html += '<div class="request-header">Request sent</div>';
				html += `<div class="request-method">${escapeHtml(req.method)} ${escapeHtml(req.url)}</div>`;
				if (req.requestBody) {
					html += `<pre class="json-block json-sm"><code>${escapeHtml(JSON.stringify(req.requestBody, null, 2))}</code></pre>`;
				}
				html += '<div class="response-header">Mock returned</div>';
				if (req.mockResponse) {
					html += `<pre class="json-block json-sm"><code>${escapeHtml(JSON.stringify(req.mockResponse, null, 2))}</code></pre>`;
				} else {
					html += '<div class="muted">no mock response</div>';
				}
				html += '</div>';
			}

			const outputEntries = Object.entries(nr.outputs);
			const hasOutput = outputEntries.some(([, branches]) => branches.length > 0);
			if (hasOutput) {
				html += '<details class="node-output-toggle"><summary>Node output</summary>';
				for (const [connType, branches] of outputEntries) {
					for (let i = 0; i < branches.length; i++) {
						const label =
							branches.length > 1 || connType !== 'main'
								? `${connType} branch ${String(i)} (${String(branches[i].length)} items)`
								: `${connType} (${String(branches[i].length)} items)`;
						html += `<div class="node-output-branch"><strong>${escapeHtml(label)}</strong>`;
						html += `<pre class="json-block"><code>${escapeHtml(JSON.stringify(branches[i], null, 2))}</code></pre></div>`;
					}
				}
				if (nr.truncated) {
					html += `<div class="muted">truncated; full count: ${String(nr.outputCount)}</div>`;
				}
				html += '</details>';
			} else {
				html += '<div class="muted">no output</div>';
			}

			html += '</div>';
		}
		html += '</details>';
	}

	return html;
}

// ---------------------------------------------------------------------------
// Conversation metrics (per-turn deterministic counters)
// ---------------------------------------------------------------------------

function renderConversationMetrics(metrics: ConversationMetrics | undefined): string {
	if (!metrics || metrics.perTurn.length === 0) return '';

	const turnRows = metrics.perTurn.map((turn) => renderTurnRow(turn)).join('');
	const finishBadge = metrics.reachedRunFinishCleanly
		? '<span class="badge badge-pass">finished cleanly</span>'
		: '<span class="badge badge-fail">incomplete</span>';

	const byKindBits = Object.entries(metrics.confirmationAskedByKind)
		.map(([kind, count]) => `${escapeHtml(kind)}×${String(count)}`)
		.join(' · ');

	const summary = [
		`<strong>${String(metrics.turnCount)}</strong> turn${metrics.turnCount === 1 ? '' : 's'}`,
		`<strong>${String(metrics.confirmationAskedTotal)}</strong> confirmation${metrics.confirmationAskedTotal === 1 ? '' : 's'} asked${byKindBits ? ` (${byKindBits})` : ''}`,
		finishBadge,
	].join(' · ');

	return `<details class="section"><summary>Conversation metrics</summary>
		<div class="conv-summary">${summary}</div>
		<table class="conv-table">
			<thead><tr>
				<th>Turn</th><th>Tool calls</th><th>Tool errors</th><th>Confirmations</th>
				<th>Replan after error</th><th>Repeat questions</th><th>Finish status</th>
			</tr></thead>
			<tbody>${turnRows}</tbody>
		</table>
	</details>`;
}

function renderTurnRow(turn: TurnCounter): string {
	const status = turn.runFinishStatus ?? '—';
	const statusClass =
		turn.runFinishStatus === 'completed'
			? 'turn-status-ok'
			: turn.runFinishStatus === undefined
				? 'turn-status-pending'
				: 'turn-status-fail';
	const confByKind = Object.entries(turn.confirmationAskedByKind)
		.map(([kind, count]) => `${escapeHtml(kind)}×${String(count)}`)
		.join(', ');
	const confDetail = confByKind ? ` <span class="muted">(${confByKind})</span>` : '';
	return `<tr>
		<td>#${String(turn.turn)}</td>
		<td>${String(turn.toolCallCount)}</td>
		<td>${String(turn.toolErrorCount)}</td>
		<td>${String(turn.confirmationAskedTotal)}${confDetail}</td>
		<td>${String(turn.replanAfterErrorCount)}</td>
		<td>${String(turn.repeatQuestionCount)}</td>
		<td class="${statusClass}">${escapeHtml(status)}</td>
	</tr>`;
}

// ---------------------------------------------------------------------------
// Conversation transcript — chat-style view built from the captured event stream
// ---------------------------------------------------------------------------

function renderConversationTranscript(transcript: TranscriptTurn[] | undefined): string {
	if (!transcript || transcript.length === 0) return '';
	const turnsHtml = transcript.map((turn, i) => renderTranscriptTurn(turn, i + 1)).join('');
	return `<details class="section" open><summary>Conversation transcript</summary>
		<div class="transcript">${turnsHtml}</div>
	</details>`;
}

function renderTranscriptTurn(turn: TranscriptTurn, turnNum: number): string {
	const parts: string[] = [`<div class="transcript-turn-header">Turn ${String(turnNum)}</div>`];
	if (turn.userMessage) {
		parts.push(
			`<div class="transcript-line transcript-user"><span class="transcript-icon">👤</span><span class="transcript-text">${escapeHtml(turn.userMessage)}</span></div>`,
		);
	}
	if (turn.agentText) {
		parts.push(
			`<div class="transcript-line transcript-assistant"><span class="transcript-icon">🤖</span><span class="transcript-text">${escapeHtml(turn.agentText)}</span></div>`,
		);
	}

	const toolNames: string[] = [];
	for (const interaction of turn.toolInteractions) {
		const block = renderInteraction(interaction);
		if (block) parts.push(block);
		if (interaction.kind === 'tool-call') toolNames.push(interaction.toolName);
	}

	if (toolNames.length > 0) {
		parts.push(
			`<div class="transcript-tools">🔧 ${toolNames.map((t) => escapeHtml(t)).join(', ')}</div>`,
		);
	}
	return `<div class="transcript-turn">${parts.join('')}</div>`;
}

function renderInteraction(interaction: ToolInteraction): string | null {
	switch (interaction.kind) {
		case 'plan': {
			if (interaction.tasks.length === 0) return null;
			const lines = interaction.tasks
				.map((t, i) => {
					const title = t.title ?? `Task ${String(i + 1)}`;
					const desc = t.description ? `: ${escapeHtml(t.description)}` : '';
					return `<li><strong>${escapeHtml(title)}</strong>${desc}</li>`;
				})
				.join('');
			const word = interaction.tasks.length === 1 ? 'task' : 'tasks';
			return `<details class="transcript-aside" open><summary>📋 plan (${String(interaction.tasks.length)} ${word})</summary><ul class="transcript-plan">${lines}</ul></details>`;
		}
		case 'ask-user': {
			if (interaction.questions.length === 0) return null;
			const answerByQId = new Map<string, string>();
			for (const a of interaction.answers ?? []) {
				const selected = a.selectedOptions.join(', ');
				const text = [selected, a.customText].filter(Boolean).join(' — ');
				if (text) answerByQId.set(a.questionId, text);
			}
			const lines = interaction.questions
				.map((q) => {
					const opts =
						q.options && q.options.length > 0
							? ` <em>(${q.options.map((o) => escapeHtml(o)).join(' / ')})</em>`
							: '';
					const answer = answerByQId.get(q.id);
					const answerHtml = answer
						? `<div class="transcript-answer">👤 ${escapeHtml(answer)}</div>`
						: '';
					return `<li>${escapeHtml(q.question)}${opts}${answerHtml}</li>`;
				})
				.join('');
			const summary =
				answerByQId.size > 0
					? '❓ ask-user (with answers)'
					: `❓ ask-user (${String(interaction.questions.length)} question${interaction.questions.length === 1 ? '' : 's'})`;
			return `<details class="transcript-aside" open><summary>${summary}</summary><ul class="transcript-questions">${lines}</ul></details>`;
		}
		case 'setup-wizard': {
			const skipped = interaction.skippedNodes;
			const needCreds = skipped.filter((s) => Boolean(s.credentialType)).length;
			const needParams = skipped.length - needCreds;
			const breakdown: string[] = [];
			if (needCreds > 0) breakdown.push(`${String(needCreds)} need credentials`);
			if (needParams > 0) breakdown.push(`${String(needParams)} need parameters`);
			const headerParts: string[] = [];
			if (interaction.completedNodes.length > 0) {
				headerParts.push(`${String(interaction.completedNodes.length)} configured`);
			}
			if (skipped.length > 0) {
				headerParts.push(
					`${String(skipped.length)} skipped${breakdown.length > 0 ? ` (${breakdown.join(', ')})` : ''}`,
				);
			}
			const header = headerParts.length > 0 ? headerParts.join(', ') : 'nothing to apply';

			const sections: string[] = [];
			if (interaction.completedNodes.length > 0) {
				const items = interaction.completedNodes
					.map((c) => {
						const params = c.parametersSet ? c.parametersSet.join(', ') : '';
						return `<li>${escapeHtml(c.nodeName)}${params ? ` — params: ${escapeHtml(params)}` : ''}</li>`;
					})
					.join('');
				sections.push(
					`<div class="transcript-section-label">configured (${String(interaction.completedNodes.length)})</div><ul class="transcript-plan">${items}</ul>`,
				);
			}
			if (skipped.length > 0) {
				const items = skipped
					.map(
						(s) =>
							`<li>${escapeHtml(s.nodeName)}${s.credentialType ? ` — needs <code>${escapeHtml(s.credentialType)}</code> credential` : ' — needs parameters'}</li>`,
					)
					.join('');
				sections.push(
					`<div class="transcript-section-label">skipped (${String(skipped.length)})</div><ul class="transcript-plan">${items}</ul>`,
				);
			}
			return `<details class="transcript-aside" open><summary>🛠 setup wizard — ${escapeHtml(header)}</summary>${sections.join('')}</details>`;
		}
		case 'confirmation': {
			const decisionTag =
				typeof interaction.approved === 'boolean'
					? ` <em>(${interaction.approved ? 'approved' : 'rejected'})</em>`
					: '';
			return `<div class="transcript-resume">↪ resume <code>${escapeHtml(interaction.toolName)}</code>: ${escapeHtml(interaction.resumeReason)}${decisionTag}</div>`;
		}
		case 'tool-call':
			return null; // surfaced in the aggregate tool-names line at the bottom
	}
}

// ---------------------------------------------------------------------------
// Workflow summary
// ---------------------------------------------------------------------------

function renderWorkflowSummary(result: WorkflowTestCaseResult): string {
	const firstEval = result.executionScenarioResults[0]?.evalResult;

	let nodesHtml = '';
	if (firstEval) {
		const nodes = Object.entries(firstEval.nodeResults);
		if (nodes.length > 0) {
			const nodeList = nodes
				.map(([name, nr]) => {
					const mode = nr.executionMode;
					const requests = nr.interceptedRequests.length;
					const issues = nr.configIssues ? Object.values(nr.configIssues).flat().join('; ') : '';
					let line = `<span class="node-mode-${mode}">[${mode}]</span> ${escapeHtml(name)}`;
					if (requests > 0) line += ` <span class="muted">(${String(requests)} req)</span>`;
					if (issues)
						line += ` <span class="build-issue">Build issue: ${escapeHtml(issues)}</span>`;
					return `<li>${line}</li>`;
				})
				.join('');
			nodesHtml = `<details class="section"><summary>Built workflow (${String(nodes.length)} nodes)</summary><ul class="node-list">${nodeList}</ul></details>`;
		}
	}

	let jsonHtml = '';
	if (result.workflowJson) {
		const raw = JSON.stringify(result.workflowJson, null, 2);
		jsonHtml = `<details class="section"><summary>Agent output (raw JSON)</summary><pre class="json-block"><code>${escapeHtml(raw)}</code></pre></details>`;
	}

	return nodesHtml + jsonHtml;
}

// ---------------------------------------------------------------------------
// Test case rendering
// ---------------------------------------------------------------------------

function renderTestCase(result: WorkflowTestCaseResult, tcIndex: number): string {
	const passCount = result.executionScenarioResults.filter((sr) => sr.success).length;
	const totalCount = result.executionScenarioResults.length;
	const allPass = passCount === totalCount && totalCount > 0;
	const statusClass = result.workflowBuildSuccess ? (allPass ? 'pass' : 'mixed') : 'fail';

	const buildBadge = result.workflowBuildSuccess
		? '<span class="badge badge-pass">BUILT</span>'
		: '<span class="badge badge-fail">BUILD FAILED</span>';

	const scoreBadge =
		totalCount > 0
			? `<span class="badge badge-${allPass ? 'pass' : 'fail'}">${String(passCount)}/${String(totalCount)}</span>`
			: '';

	const prompt = result.testCase.conversation[0].text;
	const truncatedPrompt = prompt.length > 100 ? prompt.slice(0, 100) + '...' : prompt;

	// Inline scenario indicators for quick triage without expanding
	const scenarioIndicators = result.executionScenarioResults
		.map(
			(sr) =>
				`<span class="scenario-indicator ${sr.success ? 'pass' : 'fail'}" title="${escapeHtml(sr.scenario.name)}">${sr.success ? '✓' : '✗'} ${escapeHtml(sr.scenario.name)}</span>`,
		)
		.join(' ');

	let scenariosHtml = '';
	if (result.executionScenarioResults.length > 0) {
		scenariosHtml = result.executionScenarioResults
			.map((sr, i) => renderScenario(sr, tcIndex * 100 + i))
			.join('');
	} else if (!result.workflowBuildSuccess) {
		const errorDetail = result.buildError
			? `<div class="error-box">${escapeHtml(result.buildError)}</div>`
			: '';
		scenariosHtml = `<div class="muted">Workflow failed to build — no scenarios executed</div>${errorDetail}`;
	}

	return `<div class="test-case ${statusClass}">
		<div class="test-case-header" onclick="this.parentElement.classList.toggle('expanded')">
			<div class="test-case-title">
				${buildBadge} ${scoreBadge}
				<span class="test-case-prompt">${escapeHtml(truncatedPrompt)}</span>
			</div>
			<div class="test-case-meta">
				<span class="badge badge-tag">${escapeHtml(result.testCase.complexity)}</span>
				${result.workflowId ? `<span class="workflow-id">${escapeHtml(result.workflowId)}</span>` : ''}
			</div>
			<div class="scenario-indicators">${scenarioIndicators}</div>
		</div>
		<div class="test-case-detail">
			<details class="section"><summary>Prompt</summary><div class="prompt-text">${escapeHtml(prompt)}</div></details>
			${renderConversationMetrics(result.conversationMetrics)}
			${renderConversationTranscript(result.transcript)}
			${renderWorkflowSummary(result)}
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
	const allScenarios = results.flatMap((r) => r.executionScenarioResults);
	const passCount = allScenarios.filter((sr) => sr.success).length;
	const failCount = allScenarios.length - passCount;
	const totalScenarios = allScenarios.length;
	const passRate = totalScenarios > 0 ? Math.round((passCount / totalScenarios) * 100) : 0;

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Workflow evaluation report</title>
<style>
	:root {
		--bg-primary: #0d1117;
		--bg-secondary: #161b22;
		--bg-tertiary: #1c2129;
		--border: #30363d;
		--border-light: #21262d;
		--text-primary: #f0f6fc;
		--text-secondary: #c9d1d9;
		--text-muted: #8b949e;
		--color-pass: #3fb950;
		--color-fail: #f85149;
		--color-warn: #d29922;
		--color-info: #58a6ff;
		--color-purple: #bc8cff;
		--color-pass-bg: #23863622;
		--color-fail-bg: #da363322;
		--color-warn-bg: #d2992222;
	}

	* { margin: 0; padding: 0; box-sizing: border-box; }
	body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg-primary); color: var(--text-secondary); padding: 24px; max-width: 1400px; margin: 0 auto; font-size: 14px; line-height: 1.5; }

	/* Header */
	h1 { color: var(--text-primary); font-size: 20px; margin-bottom: 2px; }
	.subtitle { color: var(--text-muted); font-size: 13px; margin-bottom: 20px; }

	/* Dashboard */
	.dashboard { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; align-items: stretch; }
	.stat-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; padding: 14px 20px; min-width: 120px; }
	.stat-card .label { color: var(--text-muted); font-size: 12px; }
	.stat-card .value { color: var(--text-primary); font-size: 26px; font-weight: 700; margin-top: 2px; }
	.stat-card .value.pass { color: var(--color-pass); }
	.stat-card .value.fail { color: var(--color-fail); }
	.stat-card .value.mixed { color: var(--color-warn); }

	/* Toolbar */
	.toolbar { display: flex; gap: 8px; margin-bottom: 16px; }
	.toolbar button { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 6px; color: var(--text-secondary); padding: 6px 12px; font-size: 12px; cursor: pointer; }
	.toolbar button:hover { background: var(--bg-tertiary); color: var(--text-primary); }
	.toolbar button.active { border-color: var(--color-info); color: var(--color-info); }

	/* Badges */
	.badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; margin-right: 4px; }
	.badge-pass { background: var(--color-pass-bg); color: var(--color-pass); }
	.badge-fail { background: var(--color-fail-bg); color: var(--color-fail); }
	.badge-tag { background: var(--border); color: var(--text-muted); }

	/* Test case cards */
	.test-case { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 10px; overflow: hidden; }
	.test-case.pass { border-left: 3px solid var(--color-pass); }
	.test-case.fail { border-left: 3px solid var(--color-fail); }
	.test-case.mixed { border-left: 3px solid var(--color-warn); }
	.test-case-header { padding: 12px 16px; cursor: pointer; }
	.test-case-header:hover { background: var(--bg-tertiary); }
	.test-case-title { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
	.test-case-prompt { color: var(--text-primary); font-weight: 500; font-size: 13px; }
	.test-case-meta { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
	.workflow-id { color: var(--text-muted); font-size: 11px; font-family: monospace; }
	.scenario-indicators { display: flex; gap: 8px; flex-wrap: wrap; }
	.scenario-indicator { font-size: 11px; font-family: monospace; }
	.scenario-indicator.pass { color: var(--color-pass); }
	.scenario-indicator.fail { color: var(--color-fail); }
	.test-case-detail { display: none; padding: 0 16px 16px; }
	.test-case.expanded .test-case-detail { display: block; }

	/* Sections (collapsible) */
	.section { margin: 8px 0; }
	.section > summary { cursor: pointer; color: var(--color-info); font-size: 12px; font-weight: 600; padding: 4px 0; }
	.section > summary:hover { text-decoration: underline; }

	/* Scenarios */
	.scenario { border: 1px solid var(--border-light); border-radius: 6px; margin-bottom: 6px; overflow: hidden; }
	.scenario-header { padding: 8px 12px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 13px; }
	.scenario-header:hover { background: var(--bg-tertiary); }
	.scenario-icon { font-weight: bold; font-size: 14px; min-width: 16px; }
	.scenario-icon.pass { color: var(--color-pass); }
	.scenario-icon.fail { color: var(--color-fail); }
	.scenario-name { color: var(--text-primary); font-weight: 600; }
	.scenario-desc { color: var(--text-muted); font-size: 12px; }
	.scenario-summary-inline { color: var(--text-muted); font-size: 12px; flex: 1; }
	.scenario-detail { display: none; padding: 10px 12px; border-top: 1px solid var(--border-light); background: var(--bg-primary); }
	.scenario.expanded .scenario-detail { display: block; }

	/* Error and warning boxes */
	.error-box { color: var(--color-fail); font-size: 12px; padding: 6px 10px; background: var(--color-fail-bg); border-radius: 4px; margin-bottom: 8px; border-left: 3px solid var(--color-fail); }
	.warning-box { color: var(--color-warn); font-size: 12px; padding: 6px 10px; background: var(--color-warn-bg); border-radius: 4px; margin-bottom: 8px; border-left: 3px solid var(--color-warn); }
	.warning-inline { color: var(--color-warn); font-size: 11px; margin: 4px 0; }
	.build-issue { color: var(--color-warn); font-size: 11px; display: block; margin-top: 2px; }

	/* Diagnosis */
	.diagnosis { color: var(--text-secondary); font-size: 12px; line-height: 1.6; padding: 6px 0; }

	/* Prompt */
	.prompt-text { color: var(--text-secondary); font-size: 13px; line-height: 1.6; padding: 10px; background: var(--bg-primary); border: 1px solid var(--border); border-radius: 6px; white-space: pre-wrap; }

	/* Execution trace */
	.trace-legend { font-size: 11px; margin-bottom: 8px; display: flex; gap: 12px; }
	.trace-node { border: 1px solid var(--border-light); border-radius: 4px; margin-bottom: 6px; padding: 8px; }
	.trace-node-header { font-size: 12px; font-family: monospace; margin-bottom: 4px; }
	.request-count { color: var(--text-muted); font-size: 11px; }

	/* Request/response pairs */
	.request-pair { border: 1px solid var(--border-light); border-radius: 4px; margin: 6px 0; overflow: hidden; }
	.request-header { background: #1c3a5e; color: var(--color-info); font-size: 10px; font-weight: 700; padding: 3px 8px; letter-spacing: 0.5px; }
	.response-header { background: #2a1f3e; color: var(--color-purple); font-size: 10px; font-weight: 700; padding: 3px 8px; letter-spacing: 0.5px; }
	.request-method { font-size: 11px; color: var(--text-primary); padding: 4px 8px; font-family: monospace; font-weight: 600; background: var(--bg-primary); }

	/* JSON blocks */
	.json-block { font-size: 11px; margin: 4px 0; padding: 8px; background: var(--bg-secondary); border: 1px solid var(--border-light); border-radius: 4px; overflow-x: auto; }
	.json-sm { font-size: 10px; }
	pre { overflow-x: auto; margin: 0; }
	code { color: var(--text-secondary); }

	/* Node list */
	.node-list { list-style: none; padding: 4px 0; font-size: 12px; font-family: monospace; }
	.node-list li { padding: 3px 0; }
	.node-mode-mocked { color: var(--color-info); font-weight: 600; }
	.node-mode-pinned { color: var(--color-warn); font-weight: 600; }
	.node-mode-real { color: var(--color-pass); font-weight: 600; }

	/* Node output toggle */
	.node-output-toggle { margin: 4px 0; }
	.node-output-toggle > summary { cursor: pointer; color: var(--text-muted); font-size: 11px; }

	/* Node hint */
	.node-hint { margin: 2px 0; }
	.node-hint > summary { cursor: pointer; color: var(--text-secondary); font-size: 11px; font-family: monospace; }
	.hint-text { color: var(--text-muted); font-size: 11px; padding: 4px 0; line-height: 1.5; }
	.subsection-label { color: var(--text-primary); font-size: 11px; font-weight: 600; margin-top: 8px; margin-bottom: 2px; }

	/* Category badges */
	.category-badge { font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 4px; margin-bottom: 8px; }
	.category-warn { background: var(--color-warn-bg); color: var(--color-warn); border-left: 3px solid var(--color-warn); }
	.category-fail { background: var(--color-fail-bg); color: var(--color-fail); border-left: 3px solid var(--color-fail); }
	.category-info { background: #1c3a5e33; color: var(--color-info); border-left: 3px solid var(--color-info); }

	/* Utilities */
	.muted { color: var(--text-muted); font-size: 12px; }

	/* Conversation metrics */
	.conv-summary { color: var(--text-secondary); font-size: 12px; padding: 6px 0; }
	.conv-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 6px; }
	.conv-table th, .conv-table td { text-align: left; padding: 4px 8px; border-bottom: 1px solid var(--border-light); }
	.conv-table th { color: var(--text-muted); font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
	.conv-table td { font-family: monospace; }
	.turn-status-ok { color: var(--color-pass); }
	.turn-status-fail { color: var(--color-fail); }
	.turn-status-pending { color: var(--text-muted); }

	/* Conversation transcript */
	.transcript { padding: 4px 0; }
	.transcript-turn { padding: 8px 0; border-bottom: 1px dashed var(--border-light); }
	.transcript-turn:last-child { border-bottom: none; }
	.transcript-turn-header { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 6px; }
	.transcript-line { display: flex; gap: 8px; padding: 4px 0; align-items: flex-start; font-size: 13px; line-height: 1.5; }
	.transcript-icon { width: 18px; text-align: center; flex-shrink: 0; }
	.transcript-text { color: var(--text-primary); white-space: pre-wrap; }
	.transcript-user .transcript-text { color: var(--text-primary); }
	.transcript-assistant .transcript-text { color: var(--text-secondary); }
	.transcript-internal > summary { cursor: pointer; padding: 4px 0; font-size: 12px; color: var(--text-muted); display: flex; gap: 8px; align-items: flex-start; }
	.transcript-internal > summary:hover { color: var(--text-secondary); }
	.transcript-internal .transcript-text { color: var(--text-muted); font-style: italic; }
	.transcript-aside { margin: 4px 0 4px 26px; }
	.transcript-aside > summary { cursor: pointer; color: var(--text-muted); font-size: 11px; padding: 2px 0; }
	.transcript-reasoning { color: var(--text-muted); font-size: 12px; line-height: 1.5; padding: 6px 8px; background: var(--bg-primary); border-left: 2px solid var(--border); border-radius: 2px; white-space: pre-wrap; margin-top: 4px; }
	.transcript-tools { color: var(--text-muted); font-size: 11px; font-family: monospace; padding: 4px 0 0 26px; }
	.transcript-plan, .transcript-questions { margin: 4px 0 4px 18px; padding: 0; font-size: 12px; line-height: 1.5; color: var(--text-primary); }
	.transcript-plan li, .transcript-questions li { margin: 4px 0; }
	.transcript-answer { color: var(--text-secondary); font-size: 12px; margin: 2px 0 6px 16px; padding: 2px 0; }
	.transcript-resume { font-size: 11px; font-family: monospace; color: var(--text-muted); padding: 2px 0 2px 26px; }
	.transcript-resume code { background: var(--bg-tertiary); padding: 0 4px; border-radius: 2px; }
	.transcript-section-label { font-size: 11px; color: var(--text-muted); margin: 6px 0 2px 18px; text-transform: uppercase; letter-spacing: 0.04em; }
	.transcript-empty { font-size: 12px; color: var(--text-muted); font-style: italic; margin: 4px 0 4px 18px; }
</style>
</head>
<body>

<h1>Workflow evaluation report</h1>
<p class="subtitle">Generated ${new Date().toLocaleString()} &mdash; ${String(totalScenarios)} scenarios across ${String(totalTestCases)} test cases</p>

<div class="dashboard">
	<div class="stat-card">
		<div class="label">Pass rate</div>
		<div class="value${passRate >= 80 ? ' pass' : passRate >= 50 ? ' mixed' : ' fail'}">${String(passRate)}%</div>
	</div>
	<div class="stat-card">
		<div class="label">Passed</div>
		<div class="value pass">${String(passCount)}</div>
	</div>
	<div class="stat-card">
		<div class="label">Failed</div>
		<div class="value${failCount > 0 ? ' fail' : ''}">${String(failCount)}</div>
	</div>
	<div class="stat-card">
		<div class="label">Built</div>
		<div class="value${builtCount === totalTestCases ? ' pass' : ' mixed'}">${String(builtCount)}/${String(totalTestCases)}</div>
	</div>
</div>

<div class="toolbar">
	<button onclick="document.querySelectorAll('.test-case').forEach(e => e.classList.add('expanded'))">Expand all</button>
	<button onclick="document.querySelectorAll('.test-case').forEach(e => e.classList.remove('expanded'))">Collapse all</button>
	<button onclick="document.querySelectorAll('.test-case').forEach(e => { e.style.display = e.classList.contains('pass') ? 'none' : '' }); this.classList.toggle('active')">Show failures only</button>
</div>

${results.map((r, i) => renderTestCase(r, i)).join('')}

</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Write report to disk
// ---------------------------------------------------------------------------

export function writeWorkflowReport(results: WorkflowTestCaseResult[]): string {
	const reportDir = path.join(__dirname, '..', '..', '.data');
	if (!fs.existsSync(reportDir)) {
		fs.mkdirSync(reportDir, { recursive: true });
	}
	const html = generateWorkflowReport(results);
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
	const reportPath = path.join(reportDir, `workflow-eval-${timestamp}.html`);
	fs.writeFileSync(reportPath, html);

	// Also write to the stable filename for quick access
	fs.writeFileSync(path.join(reportDir, 'workflow-eval-report.html'), html);

	return reportPath;
}
