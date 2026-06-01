// ---------------------------------------------------------------------------
// Generate an HTML report from all saved pairwise eval runs.
//
// Walks `<output-root>/pairwise/*` (default `.output/pairwise/`), reads
// every run's `summary.json` + `results.jsonl`, and produces one HTML
// file with a run picker and per-example details. Each built workflow is
// embedded as an `<n8n-demo>` web component so reviewers can poke at the
// canvas inline.
//
// https://github.com/n8n-io/n8n-demo-webcomponent
// ---------------------------------------------------------------------------

import { jsonParse } from 'n8n-workflow';
import { promises as fs } from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SummaryJson {
	builder: string;
	dataset: string;
	judgeModel: string;
	numJudges: number;
	iterations: number;
	experimentName: string;
	startedAt: string;
	finishedAt: string;
	totals: {
		examples: number;
		runs: number;
		buildSuccess: number;
		buildFailures: Record<string, number>;
		primaryPassRate: number;
		avgDiagnostic: number;
		submitCallsTotal?: number;
		avgSubmitCalls?: number;
		toolCallsTotal?: number;
		toolCallErrors?: number;
		toolCallErrorRate?: number;
	};
	interactivity: {
		askUserCount: number;
		planToolCount: number;
		autoApprovedSuspensions: number;
		mockedCredentialTypes: string[];
	};
}

interface FeedbackEntry {
	evaluator: string;
	metric: string;
	score: number;
	kind?: string;
	comment?: string;
}

interface ToolCallSuspension {
	message?: string;
	questions?: unknown;
	severity?: string;
	autoApproved: boolean;
}

interface ToolCallTrace {
	step: number;
	toolCallId: string;
	toolName: string;
	args?: unknown;
	result?: unknown;
	error?: string;
	elapsedMs?: number;
	suspension?: ToolCallSuspension;
}

interface ResultRecord {
	exampleId: string;
	iteration: number;
	prompt: string;
	dos?: string;
	donts?: string;
	workflow: unknown;
	build: {
		success: boolean;
		errorClass?: string;
		errorMessage?: string;
		durationMs: number;
		extraWorkflowCount: number;
		interactivity: {
			askUserCount: number;
			planToolCount: number;
			autoApprovedSuspensions: number;
			mockedCredentialTypes: string[];
		};
	};
	/** Optional — older runs predate the field. */
	toolCalls?: ToolCallTrace[];
	feedback: FeedbackEntry[];
}

interface Run {
	dirName: string;
	summary: SummaryJson;
	results: ResultRecord[];
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

export async function loadRuns(rootDir: string): Promise<Run[]> {
	const entries = await fs.readdir(rootDir, { withFileTypes: true });
	const runs: Run[] = [];
	for (const entry of entries) {
		if (!entry.isDirectory()) continue;
		const dir = path.join(rootDir, entry.name);
		const summaryPath = path.join(dir, 'summary.json');
		const resultsPath = path.join(dir, 'results.jsonl');
		let summaryRaw: string;
		let resultsRaw: string;
		try {
			[summaryRaw, resultsRaw] = await Promise.all([
				fs.readFile(summaryPath, 'utf8'),
				fs.readFile(resultsPath, 'utf8'),
			]);
		} catch (error) {
			// Incomplete/aborted runs lack one of the two files — skip those
			// silently. Any other read failure (permissions, I/O) should surface.
			if (isMissingFileError(error)) continue;
			throw error;
		}
		const summary = jsonParse<SummaryJson>(summaryRaw, {
			errorMessage: `Failed to parse ${summaryPath}`,
		});
		const results = resultsRaw
			.split('\n')
			.filter((line) => line.trim().length > 0)
			.map((line) =>
				jsonParse<ResultRecord>(line, {
					errorMessage: `Failed to parse a line in ${resultsPath}`,
				}),
			);
		runs.push({ dirName: entry.name, summary, results });
	}
	runs.sort((a, b) => b.summary.startedAt.localeCompare(a.summary.startedAt));
	return runs;
}

function isMissingFileError(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		(error as { code: unknown }).code === 'ENOENT'
	);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function escapeHtml(input: string): string {
	return input
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function escapeAttr(input: string): string {
	return input.replace(/&/g, '&amp;').replace(/'/g, '&apos;').replace(/"/g, '&quot;');
}

/**
 * Whether a tool call should count toward the "tool error rate" metric.
 * Mirrors `isErroredToolCall` in `pairwise.ts` — kept in sync by hand
 * because the report walks pre-saved `results.jsonl` files written by
 * older runs of the eval too.
 */
function isErroredToolCall(trace: ToolCallTrace): boolean {
	if (trace.error !== undefined) return true;
	const r = trace.result;
	if (r === null || r === undefined) return false;
	if (typeof r === 'object' && !Array.isArray(r)) {
		const obj = r as Record<string, unknown>;
		if (obj.success === false) return true;
		if (typeof obj.error === 'string' && obj.error.length > 0) return true;
		if (Array.isArray(obj.errors) && obj.errors.length > 0) return true;
	}
	if (typeof r === 'string' && /\bExit code:\s*[1-9]\d*\b/.test(r)) return true;
	return false;
}

function countSubmitCalls(traces: ToolCallTrace[] | undefined): number {
	if (!traces) return 0;
	return traces.filter((t) => t.toolName === 'submit-workflow').length;
}

function countToolCallErrors(traces: ToolCallTrace[] | undefined): number {
	if (!traces) return 0;
	return traces.filter(isErroredToolCall).length;
}

function findScore(feedback: FeedbackEntry[], metric: string): number | undefined {
	return feedback.find((f) => f.metric === metric)?.score;
}

function renderCriteriaList(raw: string | undefined, kind: 'do' | 'dont'): string {
	if (!raw) return '';
	const lines = raw
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
	if (lines.length === 0) return '';
	const items = lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('');
	const label = kind === 'do' ? 'Do' : "Don't";
	return `<div class="criteria ${kind}"><h4>${label}</h4><ul>${items}</ul></div>`;
}

function renderFeedbackBadges(feedback: FeedbackEntry[]): string {
	const primary = findScore(feedback, 'pairwise_primary');
	const diagnostic = findScore(feedback, 'pairwise_diagnostic');
	const judgesPassed = findScore(feedback, 'pairwise_judges_passed');
	const totalPasses = findScore(feedback, 'pairwise_total_passes');
	const totalViolations = findScore(feedback, 'pairwise_total_violations');

	const badges: string[] = [];
	if (primary !== undefined) {
		const cls = primary === 1 ? 'badge-pass' : 'badge-fail';
		badges.push(`<span class="badge ${cls}">primary ${primary}</span>`);
	}
	if (diagnostic !== undefined) {
		badges.push(`<span class="badge badge-neutral">diagnostic ${diagnostic.toFixed(2)}</span>`);
	}
	if (judgesPassed !== undefined) {
		badges.push(`<span class="badge badge-neutral">${judgesPassed} judges pass</span>`);
	}
	if (totalPasses !== undefined && totalViolations !== undefined) {
		badges.push(
			`<span class="badge badge-neutral">${totalPasses} passes / ${totalViolations} violations</span>`,
		);
	}
	return badges.join('');
}

function renderJudgeComments(feedback: FeedbackEntry[]): string {
	const judges = feedback.filter((f) => /^judge\d+$/.test(f.metric));
	if (judges.length === 0) return '';
	const rows = judges
		.map((j) => {
			const cls = j.score === 1 ? 'judge-pass' : 'judge-fail';
			const comment = j.comment ? escapeHtml(j.comment) : '<em>no violations</em>';
			return `<tr><td class="${cls}">${escapeHtml(j.metric)}</td><td>${j.score}</td><td>${comment}</td></tr>`;
		})
		.join('');
	return `<table class="judges"><thead><tr><th>Judge</th><th>Pass</th><th>Notes</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function formatJson(value: unknown): string {
	if (value === undefined) return '';
	if (typeof value === 'string') return value;
	try {
		return JSON.stringify(value, null, 2);
	} catch {
		// Fallback when `value` is non-serialisable (e.g. has a circular ref).
		// `String(value)` may produce '[object Object]' but it's the only way
		// to surface *something* in the report instead of throwing.
		// eslint-disable-next-line @typescript-eslint/no-base-to-string
		return String(value);
	}
}

function renderToolCallTimeline(toolCalls: ToolCallTrace[] | undefined): string {
	if (!toolCalls || toolCalls.length === 0) {
		return '<div class="no-tools">No tool calls recorded.</div>';
	}
	const items = toolCalls
		.map((trace) => {
			const elapsed =
				typeof trace.elapsedMs === 'number' ? `${trace.elapsedMs}ms` : '<em>pending</em>';
			const stateBits: string[] = [];
			if (trace.error) stateBits.push('<span class="tool-state error">error</span>');
			else if (trace.result !== undefined) stateBits.push('<span class="tool-state ok">ok</span>');
			else stateBits.push('<span class="tool-state pending">pending</span>');
			if (trace.suspension) {
				stateBits.push(
					trace.suspension.autoApproved
						? '<span class="tool-state suspended auto">auto-approved</span>'
						: '<span class="tool-state suspended">suspended</span>',
				);
			}

			const blocks: string[] = [];
			if (trace.suspension) {
				const suspParts: string[] = [];
				if (trace.suspension.message) {
					suspParts.push(`<div class="tool-message">${escapeHtml(trace.suspension.message)}</div>`);
				}
				if (trace.suspension.questions) {
					suspParts.push(
						`<details class="tool-block tool-questions"><summary>Questions asked</summary><pre>${escapeHtml(formatJson(trace.suspension.questions))}</pre></details>`,
					);
				}
				blocks.push(`<div class="tool-suspension">${suspParts.join('')}</div>`);
			}
			if (trace.args !== undefined) {
				blocks.push(
					`<details class="tool-block tool-args"><summary>Input</summary><pre>${escapeHtml(formatJson(trace.args))}</pre></details>`,
				);
			}
			if (trace.error) {
				blocks.push(
					`<details class="tool-block tool-error" open><summary>Error</summary><pre>${escapeHtml(trace.error)}</pre></details>`,
				);
			} else if (trace.result !== undefined) {
				blocks.push(
					`<details class="tool-block tool-result"><summary>Output</summary><pre>${escapeHtml(formatJson(trace.result))}</pre></details>`,
				);
			}

			return `<li class="tool-call">
  <header class="tool-call-header">
    <span class="tool-step">#${trace.step}</span>
    <span class="tool-name">${escapeHtml(trace.toolName)}</span>
    <span class="tool-elapsed">${elapsed}</span>
    <span class="tool-states">${stateBits.join('')}</span>
  </header>
  ${blocks.join('')}
</li>`;
		})
		.join('');
	return `<ol class="tool-calls">${items}</ol>`;
}

function renderWorkflow(workflow: unknown): string {
	if (!workflow) {
		return '<div class="no-workflow">No workflow built.</div>';
	}
	const json = JSON.stringify(workflow);
	// Lazy mount: store the workflow on a placeholder and let the inline
	// script inject the <n8n-demo> element when the parent <details> is
	// expanded. Rendering all 77 demos upfront kills first-paint performance.
	return `<div class="workflow-mount" data-workflow="${escapeAttr(json)}"></div>`;
}

function renderExample(record: ResultRecord, idPrefix: string): string {
	const primary = findScore(record.feedback, 'pairwise_primary');
	const statusCls =
		record.build.success && primary === 1
			? 'ex-pass'
			: record.build.success
				? 'ex-partial'
				: 'ex-fail';
	const statusLabel = !record.build.success
		? `BUILD ${record.build.errorClass ?? 'FAILED'}`
		: primary === 1
			? 'PASS'
			: 'FAIL';
	const exampleId = `${idPrefix}-${record.exampleId}-${record.iteration}`;
	const interact = record.build.interactivity;
	const interactBits: string[] = [];
	if (interact.askUserCount > 0) interactBits.push(`ask-user ×${interact.askUserCount}`);
	if (interact.planToolCount > 0) interactBits.push(`plan ×${interact.planToolCount}`);
	if (interact.autoApprovedSuspensions > 0)
		interactBits.push(`suspend ×${interact.autoApprovedSuspensions}`);
	if (interact.mockedCredentialTypes.length > 0)
		interactBits.push(`mocked creds: ${interact.mockedCredentialTypes.join(', ')}`);

	// Per-record build-path stats. Surfaced inline in the summary line so a
	// reviewer can scan retries / errors without expanding each row. Numbers
	// match the columns added to `results.csv`.
	const submitCalls = countSubmitCalls(record.toolCalls);
	const toolErrors = countToolCallErrors(record.toolCalls);
	const buildStatBits: string[] = [];
	if (submitCalls > 0) buildStatBits.push(`submit ×${submitCalls}`);
	if (toolErrors > 0) buildStatBits.push(`err ×${toolErrors}`);

	const errorBlock = record.build.errorMessage
		? `<div class="error">${escapeHtml(record.build.errorMessage)}</div>`
		: '';

	const promptPreview = record.prompt.replace(/\s+/g, ' ').trim();

	return `
<details class="example ${statusCls}" id="${escapeAttr(exampleId)}">
  <summary>
    <span class="status">${statusLabel}</span>
    <div class="summary-text">
      <span class="prompt-preview" title="${escapeAttr(promptPreview)}">${escapeHtml(promptPreview)}</span>
      <span class="example-id">${escapeHtml(record.exampleId)}</span>
    </div>
    <span class="iteration">#${record.iteration}</span>
    <span class="duration">${record.build.durationMs}ms</span>
    ${buildStatBits.length > 0 ? `<span class="build-stats">${buildStatBits.map(escapeHtml).join(' · ')}</span>` : ''}
    <span class="badges">${renderFeedbackBadges(record.feedback)}</span>
  </summary>
  <div class="body">
    <section class="prompt">
      <h3>Prompt</h3>
      <pre>${escapeHtml(record.prompt)}</pre>
    </section>
    <section class="criteria-row">
      ${renderCriteriaList(record.dos, 'do')}
      ${renderCriteriaList(record.donts, 'dont')}
    </section>
    ${errorBlock}
    ${interactBits.length > 0 ? `<div class="interactivity">${interactBits.map(escapeHtml).join(' · ')}</div>` : ''}
    <section class="workflow-section">
      <h3>Built workflow</h3>
      ${renderWorkflow(record.workflow)}
    </section>
    <details class="tool-calls-section">
      <summary><h3>Tool calls${record.toolCalls && record.toolCalls.length > 0 ? ` (${record.toolCalls.length})` : ''}</h3></summary>
      ${renderToolCallTimeline(record.toolCalls)}
    </details>
    ${renderJudgeComments(record.feedback)}
  </div>
</details>`;
}

function renderRun(run: Run, index: number): string {
	const s = run.summary;
	const pct = (n: number): string => `${(n * 100).toFixed(1)}%`;
	const totalFailures = Object.values(s.totals.buildFailures).reduce((a, b) => a + b, 0);
	const failureDetail = Object.entries(s.totals.buildFailures)
		.map(([k, v]) => `${k}: ${v}`)
		.join(', ');

	const examples = run.results
		.sort((a, b) =>
			a.exampleId === b.exampleId
				? a.iteration - b.iteration
				: a.exampleId.localeCompare(b.exampleId),
		)
		.map((r) => renderExample(r, `run-${index}`))
		.join('\n');

	return `
<section class="run" id="run-${index}">
  <header class="run-header">
    <h2>${escapeHtml(s.experimentName)}</h2>
    <div class="run-meta">
      <span><strong>Builder:</strong> ${escapeHtml(s.builder)}</span>
      <span><strong>Dataset:</strong> ${escapeHtml(s.dataset)}</span>
      <span><strong>Judges:</strong> ${s.numJudges}</span>
      <span><strong>Judge model:</strong> ${escapeHtml(s.judgeModel)}</span>
      <span><strong>Iterations:</strong> ${s.iterations}</span>
      <span><strong>Started:</strong> ${escapeHtml(s.startedAt)}</span>
      <span><strong>Dir:</strong> <code>${escapeHtml(run.dirName)}</code></span>
    </div>
    <div class="run-totals">
      <span class="total"><strong>Examples:</strong> ${s.totals.examples}</span>
      <span class="total"><strong>Runs:</strong> ${s.totals.runs}</span>
      <span class="total success"><strong>Build ok:</strong> ${s.totals.buildSuccess}</span>
      <span class="total ${totalFailures > 0 ? 'fail' : ''}"><strong>Build fail:</strong> ${totalFailures}${failureDetail ? ` (${escapeHtml(failureDetail)})` : ''}</span>
      <span class="total"><strong>Primary pass rate:</strong> ${pct(s.totals.primaryPassRate)}</span>
      <span class="total"><strong>Avg diagnostic:</strong> ${s.totals.avgDiagnostic.toFixed(2)}</span>
      ${
				s.totals.toolCallErrorRate !== undefined
					? `<span class="total ${s.totals.toolCallErrorRate > 0.1 ? 'fail' : ''}"><strong>Tool error rate:</strong> ${pct(s.totals.toolCallErrorRate)}${s.totals.toolCallErrors !== undefined && s.totals.toolCallsTotal !== undefined ? ` (${s.totals.toolCallErrors}/${s.totals.toolCallsTotal})` : ''}</span>`
					: ''
			}
      ${
				s.totals.avgSubmitCalls !== undefined
					? `<span class="total"><strong>Submit calls:</strong> ${s.totals.submitCallsTotal ?? 0} total, ${s.totals.avgSubmitCalls.toFixed(2)} avg/build</span>`
					: ''
			}
    </div>
    ${
			s.interactivity.askUserCount > 0 ||
			s.interactivity.planToolCount > 0 ||
			s.interactivity.autoApprovedSuspensions > 0 ||
			s.interactivity.mockedCredentialTypes.length > 0
				? `<div class="run-interactivity">
          <strong>Interactivity:</strong>
          ask-user ×${s.interactivity.askUserCount} ·
          plan ×${s.interactivity.planToolCount} ·
          suspend ×${s.interactivity.autoApprovedSuspensions} ·
          mocked creds: ${s.interactivity.mockedCredentialTypes.map(escapeHtml).join(', ') || 'none'}
        </div>`
				: ''
		}
  </header>
  <div class="examples">${examples}</div>
</section>`;
}

export function renderDocument(runs: Run[]): string {
	const body = runs.map((run, i) => renderRun(run, i)).join('\n');

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Instance AI — Pairwise Eval Report</title>
<script src="https://cdn.jsdelivr.net/npm/@webcomponents/webcomponentsjs@2.0.0/webcomponents-loader.js"></script>
<script src="https://www.unpkg.com/lit@2.0.0-rc.2/polyfill-support.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/@n8n_io/n8n-demo-component/n8n-demo.bundled.js"></script>
<style>
  :root {
    font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
    color-scheme: dark;
    --bg: #0d1117;
    --fg: #e6edf3;
    --muted: #8b949e;
    --border: #30363d;
    --card: #161b22;
    --subtle: #1c2129;
    --pass: #3fb950;
    --partial: #d29922;
    --fail: #f85149;
    --accent: #7c8cff;
  }
  body { margin: 0; background: var(--bg); color: var(--fg); }
  header.top { position: sticky; top: 0; background: var(--card); border-bottom: 1px solid var(--border); padding: 12px 20px; z-index: 10; }
  header.top h1 { margin: 0; font-size: 18px; }
  main { padding: 20px; display: flex; flex-direction: column; gap: 32px; max-width: 1400px; margin: 0 auto; }
  section.run { background: var(--card); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
  section.run header.run-header { padding: 16px 20px; border-bottom: 1px solid var(--border); background: var(--subtle); }
  section.run header.run-header h2 { margin: 0 0 8px 0; font-size: 16px; }
  .run-meta, .run-totals, .run-interactivity { display: flex; flex-wrap: wrap; gap: 16px; font-size: 12px; color: var(--muted); }
  .run-totals { margin-top: 8px; font-size: 13px; color: var(--fg); }
  .run-totals .total.success strong { color: var(--pass); }
  .run-totals .total.fail strong { color: var(--fail); }
  .run-interactivity { margin-top: 8px; }
  .examples { display: flex; flex-direction: column; }
  details.example { border-bottom: 1px solid var(--border); }
  details.example:last-child { border-bottom: none; }
  details.example > summary {
    list-style: none;
    cursor: pointer;
    padding: 10px 20px;
    display: grid;
    grid-template-columns: 160px minmax(0, 1fr) 40px 80px auto;
    gap: 12px;
    align-items: center;
    font-size: 13px;
  }
  details.example > summary:hover { background: var(--subtle); }
  details.example > summary::-webkit-details-marker { display: none; }
  details.example > summary .status {
    font-weight: 700;
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 3px;
    letter-spacing: 0.03em;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  details.example > summary .summary-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  details.example > summary .prompt-preview { font-size: 13px; color: var(--fg); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  details.ex-pass > summary .status { background: rgba(63,185,80,0.18); color: var(--pass); }
  details.ex-partial > summary .status { background: rgba(210,153,34,0.18); color: var(--partial); }
  details.ex-fail > summary .status { background: rgba(248,81,73,0.18); color: var(--fail); }
  details.example > summary .example-id { font-family: ui-monospace, monospace; font-size: 11px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  details.example > summary .iteration { color: var(--muted); font-size: 11px; }
  details.example > summary .duration { color: var(--muted); font-size: 11px; text-align: right; }
  details.example > summary .build-stats { color: var(--muted); font-size: 11px; text-align: right; white-space: nowrap; }
  details.example > summary .badges { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
  .badge { font-size: 11px; padding: 2px 6px; border-radius: 3px; background: rgba(139,148,158,0.18); color: var(--fg); }
  .badge.badge-pass { background: rgba(63,185,80,0.2); color: var(--pass); }
  .badge.badge-fail { background: rgba(248,81,73,0.2); color: var(--fail); }
  details.example > .body { padding: 16px 20px 24px; background: var(--subtle); }
  details.example > .body h3 { margin: 16px 0 6px 0; font-size: 13px; text-transform: uppercase; color: var(--muted); letter-spacing: 0.05em; }
  details.example pre { background: var(--bg); border: 1px solid var(--border); border-radius: 4px; padding: 8px 12px; font-size: 12px; white-space: pre-wrap; color: var(--fg); }
  .criteria-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 8px; }
  .criteria { border: 1px solid var(--border); border-radius: 4px; padding: 8px 12px; background: var(--card); }
  .criteria h4 { margin: 0 0 4px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
  .criteria.do h4 { color: var(--pass); }
  .criteria.dont h4 { color: var(--fail); }
  .criteria ul { margin: 0; padding-left: 18px; font-size: 12px; }
  .error { margin-top: 8px; padding: 8px 12px; background: rgba(248,81,73,0.12); color: var(--fail); border-radius: 4px; font-size: 12px; white-space: pre-wrap; }
  .interactivity { margin-top: 8px; font-size: 11px; color: var(--muted); }
  .workflow-section { margin-top: 8px; }
  n8n-demo, .workflow-mount { display: block; height: 380px; border: 1px solid var(--border); border-radius: 4px; background: #fff; color-scheme: light; }
  .no-workflow { padding: 40px; text-align: center; color: var(--muted); font-size: 13px; border: 1px dashed var(--border); border-radius: 4px; }
  table.judges { margin-top: 12px; width: 100%; border-collapse: collapse; font-size: 12px; background: var(--card); border: 1px solid var(--border); border-radius: 4px; overflow: hidden; }
  table.judges th, table.judges td { padding: 6px 10px; text-align: left; border-bottom: 1px solid var(--border); }
  table.judges tr:last-child td { border-bottom: none; }
  table.judges td.judge-pass { color: var(--pass); font-weight: 600; }
  table.judges td.judge-fail { color: var(--fail); font-weight: 600; }
  .tool-calls-section { margin-top: 12px; }
  details.tool-calls-section > summary { cursor: pointer; list-style: none; }
  details.tool-calls-section > summary::-webkit-details-marker { display: none; }
  details.tool-calls-section > summary h3 { display: inline; }
  details.tool-calls-section > summary h3::before { content: '▸ '; color: var(--muted); }
  details.tool-calls-section[open] > summary h3::before { content: '▾ '; }
  .no-tools { color: var(--muted); font-size: 12px; padding: 8px 12px; background: var(--card); border: 1px dashed var(--border); border-radius: 4px; }
  ol.tool-calls { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
  li.tool-call { background: var(--card); border: 1px solid var(--border); border-radius: 4px; padding: 8px 12px; }
  .tool-call-header { display: grid; grid-template-columns: 36px minmax(0, 1fr) 80px auto; gap: 10px; align-items: center; font-size: 12px; }
  .tool-step { color: var(--muted); font-family: ui-monospace, monospace; }
  .tool-name { font-weight: 600; color: var(--fg); font-family: ui-monospace, monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tool-elapsed { color: var(--muted); font-size: 11px; text-align: right; }
  .tool-states { display: flex; gap: 4px; flex-wrap: wrap; justify-content: flex-end; }
  .tool-state { font-size: 10px; padding: 2px 6px; border-radius: 3px; letter-spacing: 0.03em; text-transform: uppercase; font-weight: 600; }
  .tool-state.ok { background: rgba(63,185,80,0.18); color: var(--pass); }
  .tool-state.error { background: rgba(248,81,73,0.18); color: var(--fail); }
  .tool-state.pending { background: rgba(139,148,158,0.18); color: var(--muted); }
  .tool-state.suspended { background: rgba(210,153,34,0.18); color: var(--partial); }
  .tool-state.suspended.auto { background: rgba(124,140,255,0.18); color: var(--accent); }
  .tool-suspension { margin-top: 6px; padding: 6px 10px; background: rgba(210,153,34,0.08); border-left: 2px solid var(--partial); border-radius: 2px; }
  .tool-message { font-size: 12px; color: var(--fg); white-space: pre-wrap; }
  .tool-block { margin-top: 6px; }
  .tool-block > summary { cursor: pointer; font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 0; }
  .tool-block > summary:hover { color: var(--accent); }
  .tool-block pre { background: var(--bg); border: 1px solid var(--border); border-radius: 4px; padding: 8px 12px; font-size: 11px; max-height: 320px; overflow: auto; white-space: pre-wrap; word-break: break-word; color: var(--fg); margin: 4px 0 0 0; font-family: ui-monospace, monospace; }
  .tool-block.tool-error pre { border-color: var(--fail); }
</style>
</head>
<body>
<header class="top">
  <h1>Instance AI — Pairwise Eval Report (${runs.length} run${runs.length === 1 ? '' : 's'})</h1>
</header>
<main>${body}</main>
<script>
  function mountWorkflows(scope) {
    scope.querySelectorAll('.workflow-mount[data-workflow]').forEach((mount) => {
      const json = mount.getAttribute('data-workflow');
      const demo = document.createElement('n8n-demo');
      demo.setAttribute('workflow', json);
      demo.setAttribute('frame', 'true');
      demo.setAttribute('clicktointeract', 'true');
      demo.setAttribute('collapseformobile', 'true');
      mount.replaceWith(demo);
    });
  }
  document.querySelectorAll('details.example').forEach((el) => {
    if (el.open) mountWorkflows(el);
    el.addEventListener('toggle', () => {
      if (el.open) mountWorkflows(el);
    });
  });
</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

interface ReportArgs {
	outputRoot: string;
	reportFile: string;
}

function parseArgs(argv: string[]): ReportArgs {
	const get = (flag: string): string | undefined => {
		const idx = argv.indexOf(flag);
		if (idx === -1) return undefined;
		const value = argv[idx + 1];
		return value && !value.startsWith('--') ? value : undefined;
	};

	const defaultRoot = path.resolve(process.cwd(), '.output', 'pairwise');
	const outputRoot = path.resolve(get('--output-root') ?? defaultRoot);
	const reportFile = path.resolve(get('--report-file') ?? path.join(outputRoot, 'report.html'));
	return { outputRoot, reportFile };
}

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	const runs = await loadRuns(args.outputRoot);
	if (runs.length === 0) {
		console.error(`No runs found under ${args.outputRoot}`);
		process.exit(1);
	}
	const html = renderDocument(runs);
	await fs.writeFile(args.reportFile, html, 'utf8');
	console.log(`Wrote ${runs.length} run(s) to ${args.reportFile}`);
}

if (require.main === module) {
	main().catch((error) => {
		console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
		process.exit(1);
	});
}
