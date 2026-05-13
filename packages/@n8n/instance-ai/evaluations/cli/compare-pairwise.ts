// ---------------------------------------------------------------------------
// Side-by-side comparison report for two pairwise eval runs
// (typically: ai-workflow-builder.ee vs instance-ai).
//
// Usage:
//   pnpm tsx evaluations/cli/compare-pairwise.ts \
//     --ee-dir   ../ai-workflow-builder.ee/evaluations/.output/pairwise/<ts> \
//     --ia-dir   .output/pairwise/<ts> \
//     --out      .output/pairwise/comparison.html
//
// Both directories must contain a `summary.json`. Per-example data layouts
// differ between the builders, so the loaders below normalize into a shared
// `BuilderRecord` shape, joined by prompt text.
// ---------------------------------------------------------------------------

import { jsonParse } from 'n8n-workflow';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { scrubSecretsInText } from '../../src/utils/scrub-secrets';
import { redactSecrets } from '../harness/redact';

// ---------------------------------------------------------------------------
// Shared shape after normalization
// ---------------------------------------------------------------------------

export interface FeedbackEntry {
	metric: string;
	score: number;
	kind?: string;
	comment?: string;
}

export interface BuilderRecord {
	prompt: string;
	/** Stable id for the example. For IA, the LangSmith dataset example id;
	 * for EE, the example directory name (e.g. `example-000-ab12cd`). */
	exampleId?: string;
	dos?: string;
	donts?: string;
	workflow: unknown;
	durationMs: number;
	success: boolean;
	errorClass?: string;
	errorMessage?: string;
	feedback: FeedbackEntry[];
	tokenInput?: number;
	tokenOutput?: number;
	/** Number of `submit-workflow` calls during the build. IA-only — EE
	 *  doesn't capture a tool-call timeline in the comparable shape. */
	submitCalls?: number;
	/** Number of tool calls that errored or returned a failed result. */
	toolCallErrors?: number;
	/** Total tool calls observed, used as the error-rate denominator. */
	toolCallsTotal?: number;
	/** Raw tool-call trace. IA-only — populated by `loadInstanceAiRun`. */
	toolCalls?: IAToolCallTrace[];
}

interface BuilderSummary {
	label: string;
	dataset?: string;
	judgeModel?: string;
	numJudges?: number;
	startedAt?: string;
	finishedAt?: string;
	totals: {
		examples: number;
		buildSuccess: number;
		buildFailures: Record<string, number>;
		primaryPassRate: number;
		avgDiagnostic: number;
		avgDurationMs: number;
		/** Total `submit-workflow` calls aggregated across IA records. Undefined
		 *  for EE (which doesn't capture a comparable tool-call timeline). */
		submitCallsTotal?: number;
		/** Mean `submit-workflow` calls per record (IA only). */
		avgSubmitCalls?: number;
		/** Total tool calls observed across IA records. */
		toolCallsTotal?: number;
		/** Total errored tool calls observed across IA records. */
		toolCallErrors?: number;
		/** `toolCallErrors / toolCallsTotal` micro-averaged. IA-only. */
		toolCallErrorRate?: number;
	};
}

interface BuilderRun {
	summary: BuilderSummary;
	records: BuilderRecord[];
}

// ---------------------------------------------------------------------------
// Instance AI loader (writes results.jsonl + workflows/<id>.json + summary.json)
// ---------------------------------------------------------------------------

interface IAToolCallTrace {
	step: number;
	toolCallId: string;
	toolName: string;
	args?: unknown;
	result?: unknown;
	error?: string;
	elapsedMs?: number;
}

interface IAResultRecord {
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
		tokenUsage?: { input?: number; output?: number };
	};
	feedback: Array<{ metric: string; score: number; kind?: string; comment?: string }>;
	toolCalls?: IAToolCallTrace[];
}

/**
 * Whether a tool call should count toward the "tool error rate" metric.
 * Mirrors `isErroredToolCall` in `pairwise.ts`.
 */
function isErroredIAToolCall(trace: IAToolCallTrace): boolean {
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

interface IASummary {
	builder: string;
	dataset: string;
	judgeModel: string;
	numJudges: number;
	startedAt: string;
	finishedAt: string;
	totals: {
		examples: number;
		buildSuccess: number;
		buildFailures: Record<string, number>;
		primaryPassRate: number;
		avgDiagnostic: number;
	};
}

async function loadInstanceAiRun(dir: string): Promise<BuilderRun> {
	const summaryPath = path.join(dir, 'summary.json');
	const resultsPath = path.join(dir, 'results.jsonl');
	const [summaryRaw, resultsRaw] = await Promise.all([
		fs.readFile(summaryPath, 'utf8'),
		fs.readFile(resultsPath, 'utf8'),
	]);
	const summary = jsonParse<IASummary>(summaryRaw, {
		errorMessage: `Failed to parse ${summaryPath}`,
	});
	const records = resultsRaw
		.split('\n')
		.filter((line) => line.trim().length > 0)
		.map((line) =>
			jsonParse<IAResultRecord>(line, {
				errorMessage: `Failed to parse a line in ${resultsPath}`,
			}),
		)
		// Use only iteration 1 for a fair 1:1 comparison.
		.filter((r) => r.iteration === 1);

	const normalized: BuilderRecord[] = records.map((r) => {
		const tcs = r.toolCalls ?? [];
		return {
			prompt: r.prompt,
			exampleId: r.exampleId,
			dos: r.dos,
			donts: r.donts,
			workflow: r.workflow,
			durationMs: r.build.durationMs,
			success: r.build.success,
			errorClass: r.build.errorClass,
			errorMessage: r.build.errorMessage,
			feedback: r.feedback,
			tokenInput: r.build.tokenUsage?.input,
			tokenOutput: r.build.tokenUsage?.output,
			submitCalls: tcs.filter((tc) => tc.toolName === 'submit-workflow').length,
			toolCallErrors: tcs.filter(isErroredIAToolCall).length,
			toolCallsTotal: tcs.length,
			toolCalls: tcs,
		};
	});

	const avgDuration =
		normalized.length === 0
			? 0
			: normalized.reduce((sum, r) => sum + r.durationMs, 0) / normalized.length;

	// Recompute totals from the filtered set so the comparison summary stays
	// consistent with the rendered records (1:1 across builders, iter 1 only).
	const buildSuccess = normalized.filter((r) => r.success).length;
	const buildFailures: Record<string, number> = {};
	for (const r of normalized) {
		if (r.success) continue;
		const key = r.errorClass ?? 'error';
		buildFailures[key] = (buildFailures[key] ?? 0) + 1;
	}
	const primaryPasses = normalized.filter(
		(r) => findScore(r.feedback, 'pairwise_primary') === 1,
	).length;
	const primaryPassRate = normalized.length === 0 ? 0 : primaryPasses / normalized.length;
	const diagnosticScores = normalized
		.map((r) => findScore(r.feedback, 'pairwise_diagnostic'))
		.filter((v): v is number => v !== undefined && Number.isFinite(v));
	const avgDiagnostic =
		diagnosticScores.length === 0
			? 0
			: diagnosticScores.reduce((a, b) => a + b, 0) / diagnosticScores.length;

	const submitCallsTotal = normalized.reduce((s, r) => s + (r.submitCalls ?? 0), 0);
	const toolCallsTotal = normalized.reduce((s, r) => s + (r.toolCallsTotal ?? 0), 0);
	const toolCallErrors = normalized.reduce((s, r) => s + (r.toolCallErrors ?? 0), 0);

	return {
		summary: {
			label: `${summary.builder} (instance-ai)`,
			dataset: summary.dataset,
			judgeModel: summary.judgeModel,
			numJudges: summary.numJudges,
			startedAt: summary.startedAt,
			finishedAt: summary.finishedAt,
			totals: {
				examples: normalized.length,
				buildSuccess,
				buildFailures,
				primaryPassRate,
				avgDiagnostic,
				avgDurationMs: avgDuration,
				submitCallsTotal,
				avgSubmitCalls: normalized.length ? submitCallsTotal / normalized.length : 0,
				toolCallsTotal,
				toolCallErrors,
				toolCallErrorRate: toolCallsTotal ? toolCallErrors / toolCallsTotal : 0,
			},
		},
		records: normalized,
	};
}

// ---------------------------------------------------------------------------
// EE loader (writes example-NNN-HASH/{prompt.txt, workflow.json, feedback.json}
// + summary.json with an aggregate `evaluatorAverages`).
// ---------------------------------------------------------------------------

interface EEFeedbackJson {
	index: number;
	status: string;
	durationMs: number;
	generationDurationMs?: number;
	generationInputTokens?: number;
	generationOutputTokens?: number;
	score?: number;
	evaluators?: Array<{
		name: string;
		feedback: Array<{
			key: string;
			metric: string;
			score: number;
			kind?: string;
			comment?: string;
		}>;
		averageScore?: number;
	}>;
	allFeedback?: Array<{
		evaluator: string;
		metric: string;
		score: number;
		kind?: string;
		comment?: string;
	}>;
}

interface EESummaryJson {
	timestamp?: string;
	totalExamples: number;
	passed: number;
	failed: number;
	errors: number;
	passRate: number;
	averageScore?: number;
	evaluatorAverages?: Record<string, number>;
	totalDurationMs?: number;
}

async function loadEERun(dir: string): Promise<BuilderRun> {
	const summaryPath = path.join(dir, 'summary.json');
	const summaryRaw = await readOptional(summaryPath);
	const summary = summaryRaw
		? jsonParse<EESummaryJson>(summaryRaw, { errorMessage: `Failed to parse ${summaryPath}` })
		: null;

	const entries = await fs.readdir(dir, { withFileTypes: true });
	const exampleDirs = entries
		.filter((e) => e.isDirectory() && e.name.startsWith('example-'))
		.map((e) => path.join(dir, e.name));

	const records: BuilderRecord[] = [];
	for (const exampleDir of exampleDirs) {
		const promptPath = path.join(exampleDir, 'prompt.txt');
		const workflowPath = path.join(exampleDir, 'workflow.json');
		const feedbackPath = path.join(exampleDir, 'feedback.json');
		const errorPath = path.join(exampleDir, 'error.txt');

		const prompt = await readOptional(promptPath);
		if (!prompt) continue;

		const [workflowRaw, feedbackRaw, errorRaw] = await Promise.all([
			readOptional(workflowPath),
			readOptional(feedbackPath),
			readOptional(errorPath),
		]);

		const workflow = workflowRaw
			? jsonParse<unknown>(workflowRaw, { errorMessage: `Failed to parse ${workflowPath}` })
			: null;
		const feedbackJson = feedbackRaw
			? jsonParse<EEFeedbackJson>(feedbackRaw, {
					errorMessage: `Failed to parse ${feedbackPath}`,
				})
			: null;
		const exampleId = path.basename(exampleDir);

		const feedback: FeedbackEntry[] = [];
		// Prefer `allFeedback` (flat list, matches IA shape), fall back to nested evaluators.
		if (feedbackJson?.allFeedback) {
			for (const f of feedbackJson.allFeedback) {
				feedback.push({ metric: f.metric, score: f.score, kind: f.kind, comment: f.comment });
			}
		} else if (feedbackJson?.evaluators) {
			for (const ev of feedbackJson.evaluators) {
				for (const f of ev.feedback) {
					feedback.push({ metric: f.metric, score: f.score, kind: f.kind, comment: f.comment });
				}
			}
		}

		// EE status: 'pass' | 'fail' | 'error'. Only 'error' means the workflow
		// was never built — 'fail' means it was built but the eval marked it
		// non-passing. We separate those: `success` = workflow exists.
		const status = feedbackJson?.status ?? 'unknown';
		const success = status !== 'error' && workflow !== null;
		const errorClass = status === 'error' ? 'error' : success ? undefined : status;

		records.push({
			prompt,
			exampleId,
			dos: extractDosFromPrompt(prompt) ?? undefined,
			donts: extractDontsFromPrompt(prompt) ?? undefined,
			workflow,
			durationMs: feedbackJson?.durationMs ?? 0,
			success,
			errorClass,
			errorMessage: errorRaw ?? undefined,
			feedback,
			tokenInput: feedbackJson?.generationInputTokens,
			tokenOutput: feedbackJson?.generationOutputTokens,
		});
	}

	const avgDuration =
		records.length === 0 ? 0 : records.reduce((sum, r) => sum + r.durationMs, 0) / records.length;
	const primaryPassCount = records.filter(
		(r) => findScore(r.feedback, 'pairwise_primary') === 1,
	).length;
	const diagnosticScores = records
		.map((r) => findScore(r.feedback, 'pairwise_diagnostic'))
		.filter((v): v is number => v !== undefined && Number.isFinite(v));
	const avgDiagnostic =
		diagnosticScores.length === 0
			? 0
			: diagnosticScores.reduce((a, b) => a + b, 0) / diagnosticScores.length;

	const buildFailures: Record<string, number> = {};
	for (const r of records) {
		if (!r.success) {
			const key = r.errorClass ?? 'error';
			buildFailures[key] = (buildFailures[key] ?? 0) + 1;
		}
	}

	const errorCount = records.filter((r) => !r.success).length;
	const buildSuccessCount = records.length - errorCount;

	return {
		summary: {
			label: 'Code Builder',
			startedAt: summary?.timestamp,
			totals: {
				examples: summary?.totalExamples ?? records.length,
				buildSuccess: summary ? summary.totalExamples - summary.errors : buildSuccessCount,
				buildFailures,
				primaryPassRate: records.length === 0 ? 0 : primaryPassCount / records.length,
				avgDiagnostic,
				avgDurationMs: avgDuration,
			},
		},
		records,
	};
}

async function readOptional(filePath: string): Promise<string | null> {
	try {
		return await fs.readFile(filePath, 'utf8');
	} catch {
		return null;
	}
}

// EE prompts in `notion-pairwise-workflows` don't carry dos/donts text — those
// are LangSmith inputs, not in prompt.txt. Return undefined so the IA criteria
// (which we have) drive the rendering. These stubs are placeholders in case we
// later hand-encode criteria into prompt.txt.
function extractDosFromPrompt(_prompt: string): string | null {
	return null;
}
function extractDontsFromPrompt(_prompt: string): string | null {
	return null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findScore(feedback: FeedbackEntry[], metric: string): number | undefined {
	return feedback.find((f) => f.metric === metric)?.score;
}

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

function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
	const minutes = Math.floor(ms / 60_000);
	const seconds = Math.floor((ms % 60_000) / 1000);
	return `${minutes}m${seconds.toString().padStart(2, '0')}s`;
}

function pct(n: number): string {
	return `${(n * 100).toFixed(1)}%`;
}

// ---------------------------------------------------------------------------
// Pairing
// ---------------------------------------------------------------------------

export interface ComparisonRow {
	prompt: string;
	dos?: string;
	donts?: string;
	ee?: BuilderRecord;
	ia?: BuilderRecord;
	verdict: 'both-pass' | 'both-fail' | 'ee-only' | 'ia-only' | 'neither';
}

/**
 * Normalize prompt text used as the join key. EE and IA generate dirs/IDs
 * via different schemes, so we have to match by prompt. Trim + collapse
 * whitespace so trivial drift (CRLF, trailing space, indented blocks)
 * doesn't silently un-pair otherwise-identical examples.
 */
export function promptJoinKey(prompt: string): string {
	return prompt.replace(/\s+/g, ' ').trim();
}

export function pairRecords(ee: BuilderRecord[], ia: BuilderRecord[]): ComparisonRow[] {
	const byKey = new Map<string, ComparisonRow>();
	const ensure = (prompt: string): ComparisonRow => {
		const key = promptJoinKey(prompt);
		const existing = byKey.get(key);
		if (existing) return existing;
		const created: ComparisonRow = { prompt, verdict: 'neither' };
		byKey.set(key, created);
		return created;
	};

	for (const r of ee) {
		const row = ensure(r.prompt);
		row.ee = r;
	}
	for (const r of ia) {
		const row = ensure(r.prompt);
		row.ia = r;
		// IA carries the dos/donts text, prefer it as the source of truth.
		if (r.dos) row.dos = r.dos;
		if (r.donts) row.donts = r.donts;
	}

	// Compute verdict for each row.
	for (const row of byKey.values()) {
		const eePass = row.ee && row.ee.success && findScore(row.ee.feedback, 'pairwise_primary') === 1;
		const iaPass = row.ia && row.ia.success && findScore(row.ia.feedback, 'pairwise_primary') === 1;
		row.verdict =
			eePass && iaPass ? 'both-pass' : eePass ? 'ee-only' : iaPass ? 'ia-only' : 'both-fail';
	}

	const order: Record<ComparisonRow['verdict'], number> = {
		'ee-only': 0,
		'ia-only': 1,
		'both-fail': 2,
		'both-pass': 3,
		neither: 4,
	};
	return [...byKey.values()].sort((a, b) => {
		const ord = order[a.verdict] - order[b.verdict];
		if (ord !== 0) return ord;
		return a.prompt.localeCompare(b.prompt);
	});
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

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

function renderWorkflow(workflow: unknown): string {
	if (!workflow) {
		return '<div class="no-workflow">No workflow built.</div>';
	}
	const json = JSON.stringify(workflow);
	return `<n8n-demo workflow="${escapeAttr(json)}" frame="true" clicktointeract="true" collapseformobile="true"></n8n-demo>`;
}

function renderJudgeRows(feedback: FeedbackEntry[]): string {
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

interface BuilderHeadline {
	statusBadge: string;
	statusKind: 'pass' | 'fail' | 'missing';
	metaText: string; // duration · diagnostic · token info
}

function buildHeadline(record: BuilderRecord | undefined): BuilderHeadline {
	if (!record) {
		return {
			statusBadge: '<span class="status status-missing">N/A</span>',
			statusKind: 'missing',
			metaText: '—',
		};
	}
	const primary = findScore(record.feedback, 'pairwise_primary');
	const diagnostic = findScore(record.feedback, 'pairwise_diagnostic');

	const statusBadge = !record.success
		? `<span class="status status-fail">BUILD ${escapeHtml(record.errorClass ?? 'error').toUpperCase()}</span>`
		: primary === 1
			? '<span class="status status-pass">PASS</span>'
			: '<span class="status status-fail">FAIL</span>';
	const statusKind: BuilderHeadline['statusKind'] = !record.success
		? 'fail'
		: primary === 1
			? 'pass'
			: 'fail';

	const metaParts: string[] = [formatDuration(record.durationMs)];
	if (diagnostic !== undefined) metaParts.push(`diag ${diagnostic.toFixed(2)}`);
	return { statusBadge, statusKind, metaText: metaParts.join(' · ') };
}

function renderBuilderColumn(label: string, record: BuilderRecord | undefined): string {
	if (!record) {
		return `<div class="builder-col missing"><div class="builder-label">${escapeHtml(label)}</div><div class="missing-msg">No record for this prompt.</div></div>`;
	}

	const primary = findScore(record.feedback, 'pairwise_primary');
	const diagnostic = findScore(record.feedback, 'pairwise_diagnostic');
	const totalPasses = findScore(record.feedback, 'pairwise_total_passes');
	const totalViolations = findScore(record.feedback, 'pairwise_total_violations');

	const statusBadge = !record.success
		? `<span class="status status-fail">BUILD ${escapeHtml(record.errorClass ?? 'error').toUpperCase()}</span>`
		: primary === 1
			? '<span class="status status-pass">PASS</span>'
			: '<span class="status status-fail">FAIL</span>';

	const metaParts: string[] = [`<span>${formatDuration(record.durationMs)}</span>`];
	if (diagnostic !== undefined) {
		metaParts.push(`<span>diag ${diagnostic.toFixed(2)}</span>`);
	}
	if (totalPasses !== undefined && totalViolations !== undefined) {
		metaParts.push(`<span>${totalPasses}p / ${totalViolations}v</span>`);
	}
	if (record.tokenInput !== undefined && record.tokenOutput !== undefined) {
		metaParts.push(`<span>${record.tokenInput}+${record.tokenOutput} tok</span>`);
	}
	if (record.submitCalls !== undefined && record.submitCalls > 0) {
		metaParts.push(`<span>submit ×${record.submitCalls}</span>`);
	}
	if (record.toolCallErrors !== undefined && record.toolCallErrors > 0) {
		metaParts.push(`<span>err ×${record.toolCallErrors}</span>`);
	}

	const errorBlock = record.errorMessage
		? `<div class="error">${escapeHtml(scrubSecretsInText(record.errorMessage))}</div>`
		: '';

	const idLine = record.exampleId
		? `<div class="builder-id" title="${escapeAttr(record.exampleId)}">${escapeHtml(record.exampleId)}</div>`
		: '';

	return `<div class="builder-col">
  <div class="builder-header">
    <div class="builder-label">${escapeHtml(label)}</div>
    ${statusBadge}
  </div>
  ${idLine}
  <div class="builder-meta">${metaParts.join(' · ')}</div>
  ${errorBlock}
  <div class="workflow-wrap">${renderWorkflow(record.workflow)}</div>
  ${renderJudgeRows(record.feedback)}
</div>`;
}

interface SideLabels {
	ee: string;
	ia: string;
}

function summarizeToolCallArgs(toolName: string, args: unknown): string {
	if (!args || typeof args !== 'object') return '';
	// Redact secret-shaped keys (password / token / api_key / …) and scrub the
	// extracted free-form strings for known credential patterns. The same
	// summarized text is used as a data-attribute on the row, so any leaked
	// secret would persist in the HTML and be searchable via filter input.
	const a = redactSecrets(args) as Record<string, unknown>;
	const str = (v: unknown): string => (typeof v === 'string' ? scrubSecretsInText(v) : '');
	const trunc = (s: string, n = 160): string => (s.length > n ? s.slice(0, n) + '…' : s);
	switch (toolName) {
		case 'mastra_workspace_execute_command':
			return trunc(str(a.command));
		case 'mastra_workspace_edit_file':
			return trunc(str(a.path));
		case 'mastra_workspace_write_file': {
			const p = str(a.path);
			const len = typeof a.content === 'string' ? a.content.length : 0;
			return `${p}${len ? ` (${len} chars)` : ''}`;
		}
		case 'mastra_workspace_read_file': {
			const p = str(a.path);
			const off = typeof a.offset === 'number' ? a.offset : undefined;
			const lim = typeof a.limit === 'number' ? a.limit : undefined;
			const range = off !== undefined || lim !== undefined ? ` @${off ?? 0}+${lim ?? '∞'}` : '';
			return trunc(`${p}${range}`);
		}
		case 'mastra_workspace_grep':
			return trunc(`${str(a.pattern)}${a.path ? ` in ${str(a.path)}` : ''}`);
		case 'mastra_workspace_lsp_inspect': {
			const line = typeof a.line === 'number' ? String(a.line) : '?';
			return trunc(`${str(a.path)}:${line} ${str(a.match)}`);
		}
		case 'mastra_workspace_mkdir':
			return trunc(str(a.path));
		case 'submit-workflow':
			return trunc(`${str(a.name)} ${str(a.filePath)}`);
		case 'verify-built-workflow':
			return trunc(str(a.workflowId) || str(a.workItemId));
		case 'credentials':
		case 'data-tables':
		case 'nodes':
		case 'workflows':
			return trunc(str(a.action));
		default:
			return trunc(scrubSecretsInText(JSON.stringify(a)), 120);
	}
}

function renderToolCallRows(traces: IAToolCallTrace[]): string {
	return traces
		.map((tc) => {
			const errored = isErroredIAToolCall(tc);
			const elapsed = tc.elapsedMs !== undefined ? formatDuration(tc.elapsedMs) : '—';
			const cls = errored ? 'tc-err' : '';
			const argSummary = summarizeToolCallArgs(tc.toolName, tc.args);
			const argCell = argSummary ? `<code class="tc-args">${escapeHtml(argSummary)}</code>` : '';
			const detail = errored && tc.error ? escapeHtml(scrubSecretsInText(tc.error)) : '';
			return `<tr class="${cls}"><td>${tc.step}</td><td>${escapeHtml(tc.toolName)}</td><td>${argCell}</td><td>${elapsed}</td><td>${detail}</td></tr>`;
		})
		.join('');
}

function renderToolCallsColumn(label: string, record: BuilderRecord | undefined): string {
	if (!record) {
		return `<div class="tc-col missing"><div class="tc-col-label">${escapeHtml(label)}</div><div class="missing-msg">No record.</div></div>`;
	}
	const traces = record.toolCalls ?? [];
	if (traces.length === 0) {
		return `<div class="tc-col"><div class="tc-col-label">${escapeHtml(label)} <span class="tc-summary">(0 calls)</span></div><div class="missing-msg">No tool calls captured.</div></div>`;
	}
	const errCount = traces.filter(isErroredIAToolCall).length;
	const errBadge = errCount > 0 ? ` · <span class="tc-err-badge">${errCount} err</span>` : '';
	return `<div class="tc-col">
  <div class="tc-col-label">${escapeHtml(label)} <span class="tc-summary">(${traces.length} call${traces.length === 1 ? '' : 's'}${errBadge})</span></div>
  <table class="tool-calls">
    <thead><tr><th>#</th><th>Tool</th><th>Args</th><th>Time</th><th>Error</th></tr></thead>
    <tbody>${renderToolCallRows(traces)}</tbody>
  </table>
</div>`;
}

function renderToolCallsSection(row: ComparisonRow, labels: SideLabels): string {
	const anyTraces = (row.ee?.toolCalls?.length ?? 0) > 0 || (row.ia?.toolCalls?.length ?? 0) > 0;
	if (!anyTraces) return '';
	return `<details class="tool-calls-section">
  <summary>Tool calls</summary>
  <div class="tc-grid">
    ${renderToolCallsColumn(labels.ee, row.ee)}
    ${renderToolCallsColumn(labels.ia, row.ia)}
  </div>
</details>`;
}

function renderRow(row: ComparisonRow, index: number, labels: SideLabels): string {
	const verdictLabel: Record<ComparisonRow['verdict'], string> = {
		'both-pass': 'BOTH PASS',
		'both-fail': 'BOTH FAIL',
		'ee-only': `${labels.ee.toUpperCase()} ONLY`,
		'ia-only': `${labels.ia.toUpperCase()} ONLY`,
		neither: '—',
	};
	const verdictCls: Record<ComparisonRow['verdict'], string> = {
		'both-pass': 'verdict-both-pass',
		'both-fail': 'verdict-both-fail',
		'ee-only': 'verdict-ee-only',
		'ia-only': 'verdict-ia-only',
		neither: 'verdict-neither',
	};

	const eeHead = buildHeadline(row.ee);
	const iaHead = buildHeadline(row.ia);
	const promptPreview = row.prompt.slice(0, 110) + (row.prompt.length > 110 ? '…' : '');

	const builderChip = (label: string, head: BuilderHeadline): string =>
		`<span class="builder-chip chip-${head.statusKind}">
      <span class="chip-label">${escapeHtml(label)}</span>
      ${head.statusBadge}
      <span class="chip-meta">${escapeHtml(head.metaText)}</span>
    </span>`;

	const ids: string[] = [];
	if (row.ia?.exampleId) ids.push(row.ia.exampleId);
	if (row.ee?.exampleId && row.ee.exampleId !== row.ia?.exampleId) ids.push(row.ee.exampleId);
	const idText = ids.join(' / ');
	const idChip = `<span class="example-id" title="${escapeAttr(idText)}">${escapeHtml(idText)}</span>`;

	// Heavy content (workflow previews + judge tables) is wrapped in a <template>
	// so the n8n-demo web component is NOT instantiated until the user expands
	// the row. The lazy loader script in the document head does the swap.
	const usedTools = new Set<string>();
	const toolArgsCorpus: string[] = [];
	for (const tc of row.ee?.toolCalls ?? []) {
		usedTools.add(tc.toolName);
		const summary = summarizeToolCallArgs(tc.toolName, tc.args);
		if (summary) toolArgsCorpus.push(summary);
	}
	for (const tc of row.ia?.toolCalls ?? []) {
		usedTools.add(tc.toolName);
		const summary = summarizeToolCallArgs(tc.toolName, tc.args);
		if (summary) toolArgsCorpus.push(summary);
	}
	const dataAttrs = [
		`data-verdict="${row.verdict}"`,
		`data-prompt="${escapeAttr(row.prompt.toLowerCase())}"`,
		`data-id="${escapeAttr(idText.toLowerCase())}"`,
		`data-tools="${escapeAttr([...usedTools].join(' '))}"`,
		`data-tool-args="${escapeAttr(toolArgsCorpus.join(' ␟ ').toLowerCase())}"`,
	].join(' ');
	return `<details class="row ${verdictCls[row.verdict]}" id="row-${index}" ${dataAttrs}>
  <summary>
    <span class="verdict">${verdictLabel[row.verdict]}</span>
    ${idChip}
    <span class="prompt-preview">${escapeHtml(promptPreview)}</span>
    <span class="builder-chips">
      ${builderChip(labels.ee, eeHead)}
      ${builderChip(labels.ia, iaHead)}
    </span>
  </summary>
  <div class="body">
    <section class="prompt-block">
      <h3>Prompt</h3>
      <pre>${escapeHtml(row.prompt)}</pre>
    </section>
    <section class="criteria-row">
      ${renderCriteriaList(row.dos, 'do')}
      ${renderCriteriaList(row.donts, 'dont')}
    </section>
    <div class="lazy-slot" data-loaded="false">
      <template>
        <div class="builder-grid">
          ${renderBuilderColumn(labels.ee, row.ee)}
          ${renderBuilderColumn(labels.ia, row.ia)}
        </div>
      </template>
      <div class="lazy-placeholder">Click to load workflow previews and judge details…</div>
    </div>
    ${renderToolCallsSection(row, labels)}
  </div>
</details>`;
}

function renderSummaryCard(
	label: string,
	summary: BuilderSummary,
	totalRecords: number,
	records: BuilderRecord[],
): string {
	const failureBits = Object.entries(summary.totals.buildFailures)
		.map(([k, v]) => `${k}: ${v}`)
		.join(', ');
	const primaryPasses = records.filter(
		(r) => findScore(r.feedback, 'pairwise_primary') === 1,
	).length;
	const overallPassRate = totalRecords === 0 ? 0 : primaryPasses / totalRecords;
	return `<div class="summary-card">
  <h2>${escapeHtml(label)}</h2>
  ${summary.dataset ? `<div class="meta-row">Dataset: <code>${escapeHtml(summary.dataset)}</code></div>` : ''}
  ${summary.judgeModel ? `<div class="meta-row">Judge: ${escapeHtml(summary.judgeModel)} × ${summary.numJudges ?? 1}</div>` : ''}
  ${summary.startedAt ? `<div class="meta-row">Started: ${escapeHtml(summary.startedAt)}</div>` : ''}
  <div class="metric"><strong>${pct(overallPassRate)}</strong><span>primary pass</span></div>
  <div class="metric"><strong>${summary.totals.avgDiagnostic.toFixed(2)}</strong><span>avg diagnostic</span></div>
  <div class="metric"><strong>${formatDuration(summary.totals.avgDurationMs)}</strong><span>avg build time</span></div>
  <div class="metric"><strong>${summary.totals.buildSuccess}/${totalRecords}</strong><span>built ok</span></div>
  ${
		summary.totals.toolCallErrorRate !== undefined
			? `<div class="metric"><strong>${pct(summary.totals.toolCallErrorRate)}</strong><span>tool error rate (${summary.totals.toolCallErrors ?? 0}/${summary.totals.toolCallsTotal ?? 0})</span></div>`
			: ''
	}
  ${
		summary.totals.avgSubmitCalls !== undefined
			? `<div class="metric"><strong>${summary.totals.avgSubmitCalls.toFixed(2)}</strong><span>avg submit calls</span></div>`
			: ''
	}
  ${failureBits ? `<div class="meta-row failures">Failures: ${escapeHtml(failureBits)}</div>` : ''}
</div>`;
}

function renderMetricsNote(): string {
	return `<aside class="metrics-note">
  <strong>Metric definitions:</strong>
  <span><b>Primary pass</b> — workflow passes only if a majority of LLM judges (2 of 3) find zero "don't" violations. Computed over all prompt attempts; build failures count as fail.</span>
  <span><b>Average diagnostic</b> — mean fraction of criteria (dos + don'ts) satisfied across the dataset, averaged across judges. Range 0–1; gives partial credit.</span>
  <span><b>Average build time</b> — averaged across all attempts including failures, so build timeouts (20-min cap) inflate this number.</span>
  <span><b>Tool error rate</b> — fraction of tool calls that errored or returned a failed result (e.g. <code>tsc</code> non-zero exit, <code>submit-workflow</code> rejection). Captures build-path roughness even on builds that eventually succeeded. <i>IA-only.</i></span>
  <span><b>Avg submit calls</b> — mean <code>submit-workflow</code> invocations per build. 1.0 = clean first-try submit. <i>IA-only.</i></span>
  <span><b>Verdicts</b> compare per-prompt primary pass between the two builders.</span>
</aside>`;
}

function renderVerdictTotals(rows: ComparisonRow[], labels: SideLabels): string {
	const counts: Record<ComparisonRow['verdict'], number> = {
		'both-pass': 0,
		'both-fail': 0,
		'ee-only': 0,
		'ia-only': 0,
		neither: 0,
	};
	for (const r of rows) counts[r.verdict]++;

	const total = rows.length;
	const card = (label: string, n: number, cls: string): string =>
		`<div class="verdict-card ${cls}"><strong>${n}</strong><span>${escapeHtml(label)}</span><em>${total === 0 ? '0%' : pct(n / total)}</em></div>`;

	return `<div class="verdict-grid">
  ${card('Both pass', counts['both-pass'], 'verdict-both-pass')}
  ${card(`${labels.ee} only passes`, counts['ee-only'], 'verdict-ee-only')}
  ${card(`${labels.ia} only passes`, counts['ia-only'], 'verdict-ia-only')}
  ${card('Both fail', counts['both-fail'], 'verdict-both-fail')}
</div>`;
}

function renderDocument(
	ee: BuilderRun,
	ia: BuilderRun,
	rows: ComparisonRow[],
	labels: SideLabels,
): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Pairwise Eval Comparison — ${escapeHtml(labels.ee)} vs ${escapeHtml(labels.ia)}</title>
<script defer src="https://cdn.jsdelivr.net/npm/@webcomponents/webcomponentsjs@2.0.0/webcomponents-loader.js"></script>
<script defer src="https://www.unpkg.com/lit@2.0.0-rc.2/polyfill-support.js"></script>
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
    --fail: #f85149;
    --partial: #d29922;
    --accent: #7c8cff;
    --ee: #818cf8;
    --ia: #2dd4bf;
  }
  body { margin: 0; background: var(--bg); color: var(--fg); }
  header.top { padding: 16px 20px; background: var(--card); border-bottom: 1px solid var(--border); }
  header.top h1 { margin: 0 0 6px 0; font-size: 18px; }
  header.top .subhead { color: var(--muted); font-size: 13px; }
  main { padding: 20px; max-width: 1600px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; }
  .summary-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .summary-card { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 6px; }
  .summary-card h2 { margin: 0 0 4px 0; font-size: 15px; }
  .summary-card .meta-row { font-size: 12px; color: var(--muted); }
  .summary-card .meta-row code { font-family: ui-monospace, monospace; font-size: 11px; background: var(--subtle); padding: 1px 4px; border-radius: 3px; }
  .summary-card .metric { display: flex; justify-content: space-between; align-items: baseline; margin-top: 4px; font-size: 13px; }
  .summary-card .metric strong { font-size: 18px; color: var(--accent); }
  .summary-card .metric span { color: var(--muted); }
  .summary-card .meta-row.failures { color: var(--fail); margin-top: 6px; }
  .verdict-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .metrics-note {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px 16px;
    font-size: 12px;
    color: var(--muted);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .metrics-note strong { color: var(--fg); font-size: 12px; }
  .metrics-note b { color: var(--fg); font-weight: 600; }
  .verdict-card { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 14px 16px; display: flex; flex-direction: column; gap: 4px; align-items: flex-start; }
  .verdict-card strong { font-size: 26px; font-weight: 700; }
  .verdict-card span { color: var(--muted); font-size: 12px; }
  .verdict-card em { color: var(--muted); font-size: 11px; font-style: normal; }
  .verdict-both-pass strong { color: var(--pass); }
  .verdict-both-fail strong { color: var(--fail); }
  .verdict-ee-only strong { color: var(--ee); }
  .verdict-ia-only strong { color: var(--ia); }
  .rows { background: var(--card); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
  details.row { border-bottom: 1px solid var(--border); }
  details.row:last-child { border-bottom: none; }
  details.row > summary {
    list-style: none;
    cursor: pointer;
    padding: 10px 16px;
    display: grid;
    grid-template-columns: 110px minmax(0, auto) minmax(0, 1fr) auto;
    gap: 16px;
    align-items: center;
    font-size: 13px;
  }
  details.row > summary > .example-id {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 220px;
  }
  details.row > summary:hover { background: var(--subtle); }
  details.row[open] > summary { background: var(--subtle); border-bottom: 1px solid var(--border); }
  details.row > summary::-webkit-details-marker { display: none; }
  details.row > summary .verdict {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    padding: 3px 8px;
    border-radius: 3px;
    text-align: center;
  }
  details.row.verdict-both-pass > summary .verdict { background: rgba(63,185,80,0.18); color: var(--pass); }
  details.row.verdict-both-fail > summary .verdict { background: rgba(248,81,73,0.18); color: var(--fail); }
  details.row.verdict-ee-only > summary .verdict { background: rgba(129,140,248,0.2); color: var(--ee); }
  details.row.verdict-ia-only > summary .verdict { background: rgba(45,212,191,0.18); color: var(--ia); }
  details.row > summary .prompt-preview { color: var(--fg); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  details.row > summary .builder-chips { display: flex; gap: 8px; white-space: nowrap; }
  .builder-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 11px;
    border: 1px solid var(--border);
    background: var(--card);
  }
  .builder-chip.chip-pass { border-color: rgba(63,185,80,0.4); background: rgba(63,185,80,0.08); }
  .builder-chip.chip-fail { border-color: rgba(248,81,73,0.35); background: rgba(248,81,73,0.08); }
  .builder-chip.chip-missing { border-color: var(--border); background: var(--subtle); }
  .builder-chip .chip-label { font-weight: 700; color: var(--muted); letter-spacing: 0.04em; }
  .builder-chip .chip-meta { color: var(--muted); }
  .lazy-slot { margin-top: 14px; }
  .lazy-placeholder { padding: 18px; text-align: center; color: var(--muted); font-size: 12px; border: 1px dashed var(--border); border-radius: 4px; background: var(--subtle); }
  details.row > .body { padding: 16px; background: var(--subtle); border-top: 1px solid var(--border); }
  details.row > .body h3 { margin: 0 0 6px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
  details.row pre { background: var(--bg); border: 1px solid var(--border); border-radius: 4px; padding: 8px 12px; font-size: 12px; white-space: pre-wrap; max-height: 200px; overflow-y: auto; color: var(--fg); }
  .criteria-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
  .criteria { border: 1px solid var(--border); border-radius: 4px; padding: 8px 12px; background: var(--card); }
  .criteria h4 { margin: 0 0 4px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
  .criteria.do h4 { color: var(--pass); }
  .criteria.dont h4 { color: var(--fail); }
  .criteria ul { margin: 0; padding-left: 18px; font-size: 12px; }
  .builder-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }
  .builder-col { background: var(--card); border: 1px solid var(--border); border-radius: 6px; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
  .builder-col.missing { background: var(--subtle); }
  .builder-col .missing-msg { color: var(--muted); font-style: italic; font-size: 12px; }
  .builder-header { display: flex; justify-content: space-between; align-items: center; }
  .builder-label { font-weight: 600; font-size: 13px; }
  .status { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 3px; letter-spacing: 0.04em; }
  .status-pass { background: rgba(63,185,80,0.2); color: var(--pass); }
  .status-fail { background: rgba(248,81,73,0.2); color: var(--fail); }
  .builder-meta { font-size: 11px; color: var(--muted); display: flex; gap: 8px; flex-wrap: wrap; }
  .builder-id { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .error { padding: 8px 10px; background: rgba(248,81,73,0.12); color: var(--fail); border-radius: 4px; font-size: 11px; white-space: pre-wrap; max-height: 120px; overflow-y: auto; }
  .workflow-wrap { display: flex; }
  n8n-demo { display: block; width: 100%; height: 320px; border: 1px solid var(--border); border-radius: 4px; background: #fff; color-scheme: light; }
  .no-workflow { padding: 30px; text-align: center; color: var(--muted); font-size: 12px; border: 1px dashed var(--border); border-radius: 4px; flex: 1; }
  table.judges { width: 100%; border-collapse: collapse; font-size: 11px; background: var(--card); border: 1px solid var(--border); border-radius: 4px; overflow: hidden; }
  table.judges th, table.judges td { padding: 5px 8px; text-align: left; border-bottom: 1px solid var(--border); vertical-align: top; }
  table.judges tr:last-child td { border-bottom: none; }
  table.judges td.judge-pass { color: var(--pass); font-weight: 600; }
  table.judges td.judge-fail { color: var(--fail); font-weight: 600; }
  .tool-calls-section { margin-top: 14px; border-top: 1px solid var(--border); padding-top: 10px; }
  .tool-calls-section > summary { cursor: pointer; font-size: 13px; font-weight: 600; color: var(--fg); padding: 4px 0; user-select: none; }
  .tool-calls-section > summary:hover { color: var(--accent, #58a6ff); }
  .tc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px; }
  .tc-col { background: var(--card); border: 1px solid var(--border); border-radius: 6px; padding: 10px; min-width: 0; }
  .tc-col.missing { background: var(--subtle); }
  .tc-col-label { font-weight: 600; font-size: 12px; margin-bottom: 6px; }
  .tc-summary { color: var(--muted); font-weight: 400; }
  .tc-err-badge { color: var(--fail); font-weight: 600; }
  table.tool-calls { width: 100%; border-collapse: collapse; font-size: 11px; }
  table.tool-calls th, table.tool-calls td { padding: 4px 6px; text-align: left; border-bottom: 1px solid var(--border); vertical-align: top; }
  table.tool-calls th { color: var(--muted); font-weight: 500; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
  table.tool-calls td:nth-child(1) { color: var(--muted); width: 28px; font-variant-numeric: tabular-nums; }
  table.tool-calls td:nth-child(2) { white-space: nowrap; }
  table.tool-calls td:nth-child(3) { color: var(--muted); }
  table.tool-calls td:nth-child(4) { color: var(--muted); width: 60px; font-variant-numeric: tabular-nums; white-space: nowrap; }
  table.tool-calls tr:last-child td { border-bottom: none; }
  table.tool-calls tr.tc-err td { color: var(--fail); }
  table.tool-calls tr.tc-err td:nth-child(5) { white-space: pre-wrap; word-break: break-word; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; }
  code.tc-args { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; color: var(--fg); white-space: pre-wrap; word-break: break-all; display: inline-block; max-height: 60px; overflow-y: auto; }
  .filter-bar { display: flex; gap: 10px; align-items: center; padding: 12px 16px; background: var(--card); border: 1px solid var(--border); border-radius: 6px; margin-bottom: 14px; flex-wrap: wrap; position: sticky; top: 0; z-index: 10; }
  .filter-bar #filter-text { flex: 1 1 280px; min-width: 240px; padding: 6px 10px; background: var(--bg); color: var(--fg); border: 1px solid var(--border); border-radius: 4px; font-size: 13px; }
  .filter-bar #filter-text:focus { outline: none; border-color: var(--accent, #58a6ff); }
  .filter-chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; background: var(--subtle); border: 1px solid var(--border); border-radius: 16px; font-size: 12px; cursor: pointer; user-select: none; }
  .filter-chip input { cursor: pointer; }
  .filter-count { font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; }
  .filter-reset { padding: 5px 12px; background: var(--subtle); color: var(--fg); border: 1px solid var(--border); border-radius: 4px; font-size: 12px; cursor: pointer; }
  .filter-reset:hover { background: var(--card); }
</style>
</head>
<body>
<header class="top">
  <h1>Pairwise Eval Comparison — ${escapeHtml(labels.ee)} vs ${escapeHtml(labels.ia)}</h1>
  <div class="subhead">${rows.length} prompt${rows.length === 1 ? '' : 's'} compared. Rows are ordered: ${escapeHtml(labels.ee)}-only wins, ${escapeHtml(labels.ia)}-only wins, both fail, both pass.</div>
</header>
<main>
  <section class="summary-row">
    ${renderSummaryCard(ee.summary.label || labels.ee, ee.summary, ee.records.length, ee.records)}
    ${renderSummaryCard(ia.summary.label || labels.ia, ia.summary, ia.records.length, ia.records)}
  </section>
  ${renderVerdictTotals(rows, labels)}
  ${renderMetricsNote()}
  <section class="filter-bar">
    <input type="search" id="filter-text" placeholder="Filter by prompt, example id, tool name, or tool args (e.g. paths, commands)…" autocomplete="off" />
    <label class="filter-chip"><input type="checkbox" data-verdict="both-pass" checked /> Both pass</label>
    <label class="filter-chip"><input type="checkbox" data-verdict="ee-only" checked /> ${escapeHtml(labels.ee)} only</label>
    <label class="filter-chip"><input type="checkbox" data-verdict="ia-only" checked /> ${escapeHtml(labels.ia)} only</label>
    <label class="filter-chip"><input type="checkbox" data-verdict="both-fail" checked /> Both fail</label>
    <span class="filter-count" id="filter-count">${rows.length} / ${rows.length}</span>
    <button type="button" id="filter-reset" class="filter-reset">Reset</button>
  </section>
  <section class="rows">
    ${rows.map((r, i) => renderRow(r, i, labels)).join('\n')}
  </section>
</main>
<script>
  // Filter bar — narrows visible rows by free-text query AND verdict checkboxes.
  (function() {
    const input = document.getElementById('filter-text');
    const checks = Array.from(document.querySelectorAll('.filter-bar input[type=checkbox]'));
    const rows = Array.from(document.querySelectorAll('details.row'));
    const counter = document.getElementById('filter-count');
    const resetBtn = document.getElementById('filter-reset');
    const total = rows.length;
    function apply() {
      const q = (input.value || '').trim().toLowerCase();
      const verdicts = new Set(checks.filter((c) => c.checked).map((c) => c.dataset.verdict));
      let visible = 0;
      for (const r of rows) {
        const v = r.dataset.verdict || '';
        const prompt = r.dataset.prompt || '';
        const id = r.dataset.id || '';
        const tools = r.dataset.tools || '';
        const toolArgs = r.dataset.toolArgs || '';
        const passesVerdict = verdicts.has(v);
        const passesText =
          !q ||
          prompt.includes(q) ||
          id.includes(q) ||
          tools.toLowerCase().includes(q) ||
          toolArgs.includes(q);
        const show = passesVerdict && passesText;
        r.style.display = show ? '' : 'none';
        if (show) visible++;
      }
      counter.textContent = visible + ' / ' + total;
    }
    input.addEventListener('input', apply);
    for (const c of checks) c.addEventListener('change', apply);
    resetBtn.addEventListener('click', () => {
      input.value = '';
      for (const c of checks) c.checked = true;
      apply();
    });
  })();

  // Lazy-load heavy preview content (n8n-demo + judge tables) on first expand.
  // Each row contains <template> with the workflow previews inside a
  // .lazy-slot[data-loaded="false"] div. On the first toggle-open we move the
  // template's content into the live DOM so the n8n-demo web component is
  // only constructed for rows the user actually reads.
  document.querySelectorAll('details.row').forEach((details) => {
    details.addEventListener('toggle', () => {
      if (!details.open) return;
      const slot = details.querySelector('.lazy-slot[data-loaded="false"]');
      if (!slot) return;
      const template = slot.querySelector('template');
      const placeholder = slot.querySelector('.lazy-placeholder');
      if (template) {
        slot.appendChild(template.content.cloneNode(true));
        template.remove();
      }
      if (placeholder) placeholder.remove();
      slot.dataset.loaded = 'true';
    }, { once: true });
  });
</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

interface CliArgs {
	eeDir: string;
	iaDir: string;
	out: string;
	eeAsIa: boolean;
	eeLabel?: string;
	iaLabel?: string;
}

function parseArgs(argv: string[]): CliArgs {
	const get = (flag: string): string | undefined => {
		const idx = argv.indexOf(flag);
		if (idx === -1) return undefined;
		const value = argv[idx + 1];
		return value && !value.startsWith('--') ? value : undefined;
	};
	const has = (flag: string): boolean => argv.includes(flag);
	const eeDir = get('--ee-dir');
	const iaDir = get('--ia-dir');
	if (!eeDir || !iaDir) {
		throw new Error(
			'Usage: tsx evaluations/cli/compare-pairwise.ts --ee-dir <path> --ia-dir <path> [--out <path>] [--ee-as-ia] [--ee-label <name>] [--ia-label <name>]',
		);
	}
	const defaultOut = path.join(path.dirname(path.resolve(iaDir)), 'comparison.html');
	const out = path.resolve(get('--out') ?? defaultOut);
	return {
		eeDir: path.resolve(eeDir),
		iaDir: path.resolve(iaDir),
		out,
		eeAsIa: has('--ee-as-ia'),
		eeLabel: get('--ee-label'),
		iaLabel: get('--ia-label'),
	};
}

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	const [ee, ia] = await Promise.all([
		args.eeAsIa ? loadInstanceAiRun(args.eeDir) : loadEERun(args.eeDir),
		loadInstanceAiRun(args.iaDir),
	]);
	if (args.eeLabel) ee.summary.label = args.eeLabel;
	if (args.iaLabel) ia.summary.label = args.iaLabel;

	console.log(
		`EE records: ${ee.records.length} (pass rate ${pct(ee.summary.totals.primaryPassRate)})`,
	);
	console.log(
		`IA records: ${ia.records.length} (pass rate ${pct(ia.summary.totals.primaryPassRate)})`,
	);

	const rows = pairRecords(ee.records, ia.records);
	const matched = rows.filter((r) => r.ee && r.ia).length;
	console.log(`Joined ${rows.length} prompts (${matched} matched on both sides)`);

	const labels: SideLabels = {
		ee: args.eeLabel ?? (args.eeAsIa ? 'A' : 'Code'),
		ia: args.iaLabel ?? (args.eeAsIa ? 'B' : 'IA'),
	};
	const html = renderDocument(ee, ia, rows, labels);
	await fs.writeFile(args.out, html, 'utf8');
	console.log(`Wrote comparison report to ${args.out}`);
}

if (require.main === module) {
	main().catch((error) => {
		console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
		process.exit(1);
	});
}
