/**
 * HTML report generator for LLM run/step debug captured during workflow evals.
 *
 * Mirrors the frontend InstanceAiLlmStepsModal layout: runs sidebar, steps
 * sidebar, and per-step input/output detail.
 */

import type {
	InstanceAiRunDebugResponse,
	InstanceAiRunDebugStep,
	InstanceAiRunDebugWorkflowCodeSnapshot,
	ReadableContentBlock,
	ReadableSegment,
} from '@n8n/api-types';
import {
	formatDebugJson,
	parseInputExtras,
	parseMessageBlocks,
	parseOutputDisplayBlocks,
	parseOutputExtras,
	parseStepSummary,
	parseSystemPromptForDisplay,
	parseUsageSummary,
} from '@n8n/api-types';
import fs from 'fs';
import path from 'path';

import { getTestCaseAnchorId } from './report-anchors';
import type { WorkflowTestCaseResult } from '../types';

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

function sanitizeAnchor(value: string): string {
	return value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
}

function getTestCaseLabel(result: WorkflowTestCaseResult): string {
	const prompt = result.testCase.conversation[0]?.text ?? '';
	const iterPrefix = /^\[iter \d+\/\d+\]\s*/.exec(prompt)?.[0] ?? '';
	const truncatedPrompt = prompt.length > 100 ? `${prompt.slice(0, 100)}...` : prompt;
	return iterPrefix + (result.fileSlug ?? result.testCase.description ?? truncatedPrompt);
}

function formatTimestamp(ms: number): string {
	try {
		return new Date(ms).toLocaleString();
	} catch {
		return String(ms);
	}
}

function renderJsonBlock(value: unknown, label?: string): string {
	const summary = label ? `<span class="json-label">${escapeHtml(label)}</span>` : '';
	return `<details class="json-panel"><summary>${summary || 'JSON'} ${escapeHtml(formatDebugJson(value).slice(0, 80))}…</summary><pre class="json-block"><code>${escapeHtml(formatDebugJson(value))}</code></pre></details>`;
}

function renderSegments(segments: ReadableSegment[]): string {
	return segments
		.map((segment) => {
			switch (segment.type) {
				case 'text':
					return `<p class="segment-text">${escapeHtml(segment.text)}</p>`;
				case 'reasoning':
					return `<div class="segment-block segment-reasoning"><div class="segment-kind">Reasoning</div><p class="segment-text">${escapeHtml(segment.text)}</p></div>`;
				case 'tool-call':
					return `<div class="segment-block segment-tool-call"><div class="segment-kind">Tool call · <code>${escapeHtml(segment.name)}</code></div>${segment.payload !== undefined ? renderJsonBlock(segment.payload, 'Input') : ''}${segment.metadata ? renderJsonBlock(segment.metadata, 'Metadata') : ''}</div>`;
				case 'tool-result':
					return `<div class="segment-block segment-tool-result"><div class="segment-kind">Tool result${segment.name ? ` · <code>${escapeHtml(segment.name)}</code>` : ''}</div>${segment.payload !== undefined ? renderJsonBlock(segment.payload, 'Output') : ''}${segment.metadata ? renderJsonBlock(segment.metadata, 'Metadata') : ''}</div>`;
				case 'json':
					return renderJsonBlock(segment.payload, segment.label);
			}
		})
		.join('');
}

function renderContentBlock(block: ReadableContentBlock): string {
	const roleClass = `role-${sanitizeAnchor(block.role.toLowerCase())}`;
	const segmentsHtml = block.segments?.length
		? renderSegments(block.segments)
		: `<p class="segment-text">${escapeHtml(block.content)}</p>`;
	const metadataHtml = block.metadata ? renderJsonBlock(block.metadata, 'Metadata') : '';

	return `<div class="content-block ${roleClass}"><div class="content-role">${escapeHtml(block.role)}</div>${segmentsHtml}${metadataHtml}</div>`;
}

function renderWorkflowCodeSnapshot(snapshot: InstanceAiRunDebugWorkflowCodeSnapshot): string {
	const status = snapshot.success
		? '<span class="badge badge-pass">ok</span>'
		: '<span class="badge badge-fail">failed</span>';
	const errors =
		snapshot.errors && snapshot.errors.length > 0
			? `<ul class="error-list">${snapshot.errors.map((e) => `<li>${escapeHtml(e)}</li>`).join('')}</ul>`
			: '';

	return `<div class="workflow-code-snapshot">
		<div class="workflow-code-header">${status} <code>${escapeHtml(snapshot.source)}</code>${snapshot.workflowId ? ` · ${escapeHtml(snapshot.workflowId)}` : ''}</div>
		<pre class="code-block"><code>${escapeHtml(snapshot.code)}</code></pre>
		${snapshot.patches ? renderJsonBlock(snapshot.patches, 'Patches') : ''}
		${errors}
	</div>`;
}

function renderStepDetail(
	step: InstanceAiRunDebugStep,
	workflowCode: InstanceAiRunDebugWorkflowCodeSnapshot[],
): string {
	const parsedSystem = parseSystemPromptForDisplay(step.input?.system);
	const messageBlocks = parseMessageBlocks(step.input?.messages);
	const inputExtras = parseInputExtras(step.input);
	const outputBlocks = parseOutputDisplayBlocks(step.output);
	const outputExtras = parseOutputExtras(step.output);
	const usage = parseUsageSummary(step.output?.usage);
	const finishReason =
		typeof step.output?.finishReason === 'string' ? step.output.finishReason : undefined;

	const systemHtml = [
		...parsedSystem.systemBlocks.map(renderContentBlock),
		parsedSystem.observations
			? `<div class="content-block role-observations"><div class="content-role">Observations</div><p class="segment-text">${escapeHtml(parsedSystem.observations)}</p></div>`
			: '',
	].join('');

	const workflowCodeHtml =
		workflowCode.length > 0
			? `<div class="detail-section"><div class="detail-section-title">Workflow code</div>${workflowCode.map(renderWorkflowCodeSnapshot).join('')}</div>`
			: '';

	return `<div class="step-detail-inner">
		<div class="detail-meta">${finishReason ? `<span class="meta-chip">finish: ${escapeHtml(finishReason)}</span>` : ''}${usage ? `<span class="meta-chip">${escapeHtml(usage.label)}</span>` : ''}</div>
		<div class="detail-section"><div class="detail-section-title">Input</div>
			${systemHtml ? `<div class="detail-subsection"><div class="detail-subsection-title">System</div>${systemHtml}</div>` : ''}
			${messageBlocks.length > 0 ? `<div class="detail-subsection"><div class="detail-subsection-title">Messages</div>${messageBlocks.map(renderContentBlock).join('')}</div>` : ''}
			${inputExtras ? renderJsonBlock(inputExtras, 'Input extras') : ''}
		</div>
		<div class="detail-section"><div class="detail-section-title">Output</div>
			${outputBlocks.length > 0 ? outputBlocks.map(renderContentBlock).join('') : '<div class="muted">No structured output</div>'}
			${usage ? renderJsonBlock(usage.metadata, 'Usage') : ''}
			${outputExtras ? renderJsonBlock(outputExtras, 'Output extras') : ''}
		</div>
		${workflowCodeHtml}
	</div>`;
}

function renderStepSummaryChips(summary: ReturnType<typeof parseStepSummary>): string {
	const chips: string[] = [];
	if (summary.finishReason) {
		chips.push(`<span class="chip">${escapeHtml(summary.finishReason)}</span>`);
	}
	for (const tool of summary.toolNames) {
		chips.push(`<span class="chip chip-tool">${escapeHtml(tool)}</span>`);
	}
	if (summary.usageLabel) {
		chips.push(`<span class="chip chip-muted">${escapeHtml(summary.usageLabel)}</span>`);
	}
	if (summary.messagePreview) {
		chips.push(`<span class="chip chip-preview">${escapeHtml(summary.messagePreview)}</span>`);
	}
	return chips.join('');
}

function renderRunPanel(
	run: InstanceAiRunDebugResponse,
	caseIndex: number,
	runIndex: number,
): string {
	const label = run.label;
	const displayLabel = label ?? `Run ${String(runIndex + 1)}`;

	const stepsList = run.steps
		.map((step, stepIndex) => {
			const summary = parseStepSummary(step.input, step.output);
			const active = stepIndex === 0 ? ' active' : '';
			return `<button type="button" class="step-btn${active}" data-step-index="${String(stepIndex)}" onclick="selectStep(${String(caseIndex)}, ${String(runIndex)}, ${String(stepIndex)})">
				<span class="step-num">#${String(step.stepNumber)}</span>
				<span class="step-chips">${renderStepSummaryChips(summary)}</span>
			</button>`;
		})
		.join('');

	const stepPanels = run.steps
		.map((step, stepIndex) => {
			const hidden = stepIndex === 0 ? '' : ' hidden';
			return `<div class="step-panel${hidden}" data-step-index="${String(stepIndex)}">${renderStepDetail(step, run.workflowCode)}</div>`;
		})
		.join('');

	const hidden = runIndex === 0 ? '' : ' hidden';

	return `<div class="run-panel${hidden}" data-run-index="${String(runIndex)}">
		<div class="steps-col">
			<div class="col-title">Steps (${String(run.steps.length)})</div>
			<div class="steps-list">${stepsList || '<div class="muted">No steps captured</div>'}</div>
		</div>
		<div class="detail-col">
			<div class="col-title">${escapeHtml(displayLabel)} · ${escapeHtml(formatTimestamp(run.startedAt))}</div>
			<div class="step-panels">${stepPanels || '<div class="muted">No step detail</div>'}</div>
		</div>
	</div>`;
}

function renderTestCaseDebug(result: WorkflowTestCaseResult, caseIndex: number): string {
	const runs = result.runDebug ?? [];
	const anchorId = getTestCaseAnchorId(result, caseIndex);
	const label = getTestCaseLabel(result);
	const totalSteps = runs.reduce((sum, run) => sum + run.steps.length, 0);

	const runTabs = runs
		.map((run, runIndex) => {
			const tabLabel = run.label ?? `Run ${String(runIndex + 1)}`;
			const active = runIndex === 0 ? ' active' : '';
			return `<button type="button" class="run-btn${active}" data-run-index="${String(runIndex)}" onclick="selectRun(${String(caseIndex)}, ${String(runIndex)})">
				<span class="run-label">${escapeHtml(tabLabel)}</span>
				<span class="run-meta">${String(run.steps.length)} steps · ${escapeHtml(formatTimestamp(run.startedAt))}</span>
			</button>`;
		})
		.join('');

	const runPanels = runs.map((run, runIndex) => renderRunPanel(run, caseIndex, runIndex)).join('');

	return `<section class="debug-case" id="${escapeHtml(anchorId)}" data-case-index="${String(caseIndex)}">
		<header class="debug-case-header">
			<h2>${escapeHtml(label)}</h2>
			<div class="debug-case-meta">
				<span class="meta-item">${String(runs.length)} run${runs.length === 1 ? '' : 's'}</span>
				<span class="meta-item">${String(totalSteps)} step${totalSteps === 1 ? '' : 's'}</span>
				${result.threadId ? `<span class="meta-item mono">thread ${escapeHtml(result.threadId)}</span>` : ''}
			</div>
		</header>
		<div class="debug-grid">
			<aside class="runs-col">
				<div class="col-title">Runs</div>
				<div class="runs-list">${runTabs}</div>
			</aside>
			<div class="debug-main" id="debug-main-${String(caseIndex)}">${runPanels}</div>
		</div>
	</section>`;
}

function countDebugStats(results: WorkflowTestCaseResult[]): {
	testCases: number;
	runs: number;
	steps: number;
} {
	const withDebug = results.filter((r) => (r.runDebug?.length ?? 0) > 0);
	return {
		testCases: withDebug.length,
		runs: withDebug.reduce((sum, r) => sum + (r.runDebug?.length ?? 0), 0),
		steps: withDebug.reduce(
			(sum, r) => sum + (r.runDebug?.reduce((s, run) => s + run.steps.length, 0) ?? 0),
			0,
		),
	};
}

// ---------------------------------------------------------------------------
// Full report
// ---------------------------------------------------------------------------

export function generateRunDebugReport(results: WorkflowTestCaseResult[]): string {
	const casesWithDebug = results.filter((r) => (r.runDebug?.length ?? 0) > 0);
	const stats = countDebugStats(results);

	const body =
		casesWithDebug.length > 0
			? casesWithDebug
					.map((result) => {
						const caseIndex = results.indexOf(result);
						return renderTestCaseDebug(result, caseIndex);
					})
					.join('\n')
			: '<div class="empty-state">No LLM run debug was captured for this eval. Set <code>N8N_INSTANCE_AI_RUN_DEBUG_ENABLED=true</code> on the target n8n instance, ensure it exposes <code>/instance-ai/debug/*</code> endpoints, and that builds completed with a thread id.</div>';

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Workflow eval — LLM debug</title>
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
		--color-info: #58a6ff;
		--color-pass-bg: #23863622;
		--color-fail-bg: #da363322;
	}

	* { margin: 0; padding: 0; box-sizing: border-box; }
	body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg-primary); color: var(--text-secondary); padding: 24px; max-width: 1600px; margin: 0 auto; font-size: 14px; line-height: 1.5; }
	h1 { color: var(--text-primary); font-size: 20px; margin-bottom: 2px; }
	.subtitle { color: var(--text-muted); font-size: 13px; margin-bottom: 20px; }
	.dashboard { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
	.stat-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; padding: 14px 20px; min-width: 120px; }
	.stat-card .label { color: var(--text-muted); font-size: 12px; }
	.stat-card .value { color: var(--text-primary); font-size: 26px; font-weight: 700; margin-top: 2px; }
	.badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
	.badge-pass { background: var(--color-pass-bg); color: var(--color-pass); }
	.badge-fail { background: var(--color-fail-bg); color: var(--color-fail); }
	.mono { font-family: monospace; font-size: 12px; }
	.muted { color: var(--text-muted); font-size: 12px; }
	.empty-state { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; padding: 24px; color: var(--text-muted); }

	.debug-case { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 16px; overflow: hidden; }
	.debug-case-header { padding: 14px 16px; border-bottom: 1px solid var(--border-light); }
	.debug-case-header h2 { color: var(--text-primary); font-size: 14px; font-weight: 600; margin-bottom: 4px; }
	.debug-case-meta { display: flex; gap: 10px; flex-wrap: wrap; font-size: 12px; color: var(--text-muted); }

	.debug-grid { display: grid; grid-template-columns: 220px 1fr; min-height: 420px; }
	.runs-col { border-right: 1px solid var(--border-light); background: var(--bg-primary); padding: 12px; }
	.debug-main { min-width: 0; }
	.run-panel { display: grid; grid-template-columns: 260px 1fr; min-height: 420px; }
	.run-panel.hidden { display: none; }
	.steps-col { border-right: 1px solid var(--border-light); background: var(--bg-secondary); padding: 12px; overflow: auto; max-height: 70vh; }
	.detail-col { padding: 12px; overflow: auto; max-height: 70vh; background: var(--bg-primary); }
	.col-title { color: var(--text-muted); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 8px; }

	.runs-list, .steps-list { display: flex; flex-direction: column; gap: 6px; }
	.run-btn, .step-btn { width: 100%; text-align: left; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 6px; color: var(--text-secondary); padding: 8px 10px; cursor: pointer; }
	.run-btn:hover, .step-btn:hover { border-color: var(--color-info); color: var(--text-primary); }
	.run-btn.active, .step-btn.active { border-color: var(--color-info); background: #0f1c2e; color: var(--text-primary); }
	.run-label, .step-num { display: block; color: var(--text-primary); font-size: 12px; font-weight: 600; }
	.run-meta { display: block; color: var(--text-muted); font-size: 11px; margin-top: 2px; }
	.step-chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
	.chip { display: inline-block; padding: 1px 6px; border-radius: 999px; background: var(--bg-tertiary); color: var(--text-secondary); font-size: 10px; }
	.chip-tool { color: var(--color-info); }
	.chip-muted { color: var(--text-muted); }
	.chip-preview { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

	.step-panel.hidden { display: none; }
	.detail-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
	.meta-chip { font-size: 11px; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--border); color: var(--text-muted); }
	.detail-section { margin-bottom: 14px; }
	.detail-section-title { color: var(--color-info); font-size: 12px; font-weight: 700; margin-bottom: 6px; }
	.detail-subsection { margin: 8px 0; }
	.detail-subsection-title { color: var(--text-muted); font-size: 11px; font-weight: 600; margin-bottom: 4px; }

	.content-block { border: 1px solid var(--border-light); border-radius: 6px; padding: 10px; margin-bottom: 8px; background: var(--bg-secondary); }
	.content-role { color: var(--text-muted); font-size: 10px; font-weight: 700; text-transform: uppercase; margin-bottom: 6px; }
	.segment-text { white-space: pre-wrap; color: var(--text-secondary); font-size: 12px; }
	.segment-block { margin-top: 6px; }
	.segment-kind { color: var(--text-muted); font-size: 11px; margin-bottom: 4px; }
	.segment-kind code { color: var(--color-info); }

	.json-panel { margin-top: 6px; }
	.json-panel summary { cursor: pointer; color: var(--text-muted); font-size: 11px; }
	.json-label { color: var(--color-info); font-weight: 600; margin-right: 6px; }
	.json-block, .code-block { background: var(--bg-tertiary); border: 1px solid var(--border-light); border-radius: 6px; padding: 10px; overflow: auto; max-height: 360px; font-size: 11px; line-height: 1.45; margin-top: 6px; }
	.json-block code, .code-block code { color: var(--text-secondary); white-space: pre-wrap; word-break: break-word; }

	.workflow-code-snapshot { border: 1px solid var(--border-light); border-radius: 6px; padding: 10px; margin-bottom: 8px; }
	.workflow-code-header { margin-bottom: 6px; font-size: 12px; }
	.error-list { margin: 6px 0 0 18px; color: var(--color-fail); font-size: 12px; }
</style>
</head>
<body>
	<h1>Workflow eval — LLM debug</h1>
	<p class="subtitle">Captured orchestrator LLM steps per test case (same data as the Instance AI debug modal)</p>
	<div class="dashboard">
		<div class="stat-card"><div class="label">Test cases</div><div class="value">${String(stats.testCases)}</div></div>
		<div class="stat-card"><div class="label">Runs</div><div class="value">${String(stats.runs)}</div></div>
		<div class="stat-card"><div class="label">Steps</div><div class="value">${String(stats.steps)}</div></div>
	</div>
	${body}
	<script>
	function getCaseRoot(caseIndex) {
		return document.querySelector('[data-case-index="' + caseIndex + '"]');
	}

	function selectRun(caseIndex, runIndex) {
		const root = getCaseRoot(caseIndex);
		if (!root) return;
		root.querySelectorAll('.run-btn').forEach((btn) => {
			btn.classList.toggle('active', btn.getAttribute('data-run-index') === String(runIndex));
		});
		root.querySelectorAll('.run-panel').forEach((panel) => {
			panel.classList.toggle('hidden', panel.getAttribute('data-run-index') !== String(runIndex));
		});
		selectStep(caseIndex, runIndex, 0);
	}

	function selectStep(caseIndex, runIndex, stepIndex) {
		const root = getCaseRoot(caseIndex);
		if (!root) return;
		const runPanel = root.querySelector('.run-panel[data-run-index="' + runIndex + '"]');
		if (!runPanel) return;
		runPanel.querySelectorAll('.step-btn').forEach((btn) => {
			btn.classList.toggle('active', btn.getAttribute('data-step-index') === String(stepIndex));
		});
		runPanel.querySelectorAll('.step-panel').forEach((panel) => {
			panel.classList.toggle('hidden', panel.getAttribute('data-step-index') !== String(stepIndex));
		});
	}
	</script>
</body>
</html>`;
}

export function writeRunDebugReport(results: WorkflowTestCaseResult[]): string {
	const reportDir = path.join(__dirname, '..', '..', '.data');
	if (!fs.existsSync(reportDir)) {
		fs.mkdirSync(reportDir, { recursive: true });
	}
	const html = generateRunDebugReport(results);
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
	const reportPath = path.join(reportDir, `workflow-eval-llm-debug-${timestamp}.html`);
	fs.writeFileSync(reportPath, html);
	fs.writeFileSync(path.join(reportDir, 'workflow-eval-llm-debug.html'), html);
	return reportPath;
}
