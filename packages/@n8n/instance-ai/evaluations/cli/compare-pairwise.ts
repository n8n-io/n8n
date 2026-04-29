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

import { promises as fs } from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Shared shape after normalization
// ---------------------------------------------------------------------------

interface FeedbackEntry {
	metric: string;
	score: number;
	kind?: string;
	comment?: string;
}

interface TemplateCall {
	toolCallId: string;
	args: unknown;
	result?: unknown;
	resultTruncated?: boolean;
}

interface BuilderRecord {
	prompt: string;
	dos?: string;
	donts?: string;
	workflow: unknown | null;
	durationMs: number;
	success: boolean;
	errorClass?: string;
	errorMessage?: string;
	feedback: FeedbackEntry[];
	tokenInput?: number;
	tokenOutput?: number;
	/** Per-tool invocation counts. Present only for instance-ai records. */
	toolCallCounts?: Record<string, number>;
	/** Detailed `templates` tool invocations. Present only for IA records. */
	templateCalls?: TemplateCall[];
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
	};
	/** Aggregated per-tool call counts across the run. Optional. */
	toolCallCounts?: Record<string, number>;
	/** Whether the builder had access to the templates tool. Optional. */
	templatesEnabled?: boolean;
}

interface BuilderRun {
	summary: BuilderSummary;
	records: BuilderRecord[];
}

// ---------------------------------------------------------------------------
// Instance AI loader (writes results.jsonl + workflows/<id>.json + summary.json)
// ---------------------------------------------------------------------------

interface IAResultRecord {
	exampleId: string;
	iteration: number;
	prompt: string;
	dos?: string;
	donts?: string;
	workflow: unknown | null;
	build: {
		success: boolean;
		errorClass?: string;
		errorMessage?: string;
		durationMs: number;
		tokenUsage?: { input?: number; output?: number };
		interactivity?: {
			toolCallCounts?: Record<string, number>;
			templateCalls?: TemplateCall[];
		};
	};
	feedback: Array<{ metric: string; score: number; kind?: string; comment?: string }>;
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
	interactivity?: { toolCallCounts?: Record<string, number> };
	tools?: { templates?: boolean };
}

async function loadInstanceAiRun(dir: string): Promise<BuilderRun> {
	const summaryPath = path.join(dir, 'summary.json');
	const resultsPath = path.join(dir, 'results.jsonl');
	const [summaryRaw, resultsRaw] = await Promise.all([
		fs.readFile(summaryPath, 'utf8'),
		fs.readFile(resultsPath, 'utf8'),
	]);
	const summary = JSON.parse(summaryRaw) as IASummary;
	const records = resultsRaw
		.split('\n')
		.filter((line) => line.trim().length > 0)
		.map((line) => JSON.parse(line) as IAResultRecord)
		// Use only iteration 1 for a fair 1:1 comparison.
		.filter((r) => r.iteration === 1);

	const normalized: BuilderRecord[] = records.map((r) => ({
		prompt: r.prompt,
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
		toolCallCounts: r.build.interactivity?.toolCallCounts,
		templateCalls: r.build.interactivity?.templateCalls,
	}));

	const avgDuration =
		normalized.length === 0
			? 0
			: normalized.reduce((sum, r) => sum + r.durationMs, 0) / normalized.length;

	return {
		summary: {
			label: `${summary.builder} (instance-ai)`,
			dataset: summary.dataset,
			judgeModel: summary.judgeModel,
			numJudges: summary.numJudges,
			startedAt: summary.startedAt,
			finishedAt: summary.finishedAt,
			totals: {
				examples: summary.totals.examples,
				buildSuccess: summary.totals.buildSuccess,
				buildFailures: summary.totals.buildFailures,
				primaryPassRate: summary.totals.primaryPassRate,
				avgDiagnostic: summary.totals.avgDiagnostic,
				avgDurationMs: avgDuration,
			},
			toolCallCounts: summary.interactivity?.toolCallCounts,
			templatesEnabled: summary.tools?.templates,
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
	const summary = summaryRaw ? (JSON.parse(summaryRaw) as EESummaryJson) : null;

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

		const workflow = workflowRaw ? (JSON.parse(workflowRaw) as unknown) : null;
		const feedbackJson = feedbackRaw ? (JSON.parse(feedbackRaw) as EEFeedbackJson) : null;

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

interface ComparisonRow {
	prompt: string;
	dos?: string;
	donts?: string;
	ee?: BuilderRecord;
	ia?: BuilderRecord;
	verdict: 'both-pass' | 'both-fail' | 'ee-only' | 'ia-only' | 'neither';
}

function pairRecords(ee: BuilderRecord[], ia: BuilderRecord[]): ComparisonRow[] {
	const byPrompt = new Map<string, ComparisonRow>();
	const ensure = (prompt: string): ComparisonRow => {
		const existing = byPrompt.get(prompt);
		if (existing) return existing;
		const created: ComparisonRow = { prompt, verdict: 'neither' };
		byPrompt.set(prompt, created);
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
	for (const row of byPrompt.values()) {
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
	return [...byPrompt.values()].sort((a, b) => {
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

function summarizeTemplateArgs(args: unknown): { action: string; detail: string } {
	if (!args || typeof args !== 'object') return { action: 'templates', detail: '' };
	const obj = args as Record<string, unknown>;
	const action = typeof obj.action === 'string' ? obj.action : 'templates';
	const detailParts: string[] = [];
	if (typeof obj.query === 'string' && obj.query.length > 0) {
		detailParts.push(`query="${obj.query}"`);
	}
	if (Array.isArray(obj.techniques) && obj.techniques.length > 0) {
		detailParts.push(`techniques=[${obj.techniques.join(', ')}]`);
	}
	return { action, detail: detailParts.join(' · ') };
}

function renderTemplateResult(call: TemplateCall): string {
	if (call.result === undefined) {
		return '<div class="tpl-result-missing">No result captured (tool errored or run aborted).</div>';
	}
	// Truncated results are stored as plain strings; full results are objects/arrays.
	const formatted =
		typeof call.result === 'string' ? call.result : JSON.stringify(call.result, null, 2);
	const truncatedNote = call.resultTruncated
		? '<div class="tpl-truncated">Result truncated to ~4 KB. Full payload is in the chunk log.</div>'
		: '';
	return `${truncatedNote}<pre class="tpl-result">${escapeHtml(formatted)}</pre>`;
}

function renderTemplateCalls(calls: TemplateCall[] | undefined): string {
	if (!calls || calls.length === 0) return '';
	const items = calls
		.map((call, i) => {
			const { action, detail } = summarizeTemplateArgs(call.args);
			const argsJson = JSON.stringify(call.args, null, 2);
			return `<details class="tpl-call">
  <summary>
    <span class="tpl-idx">#${i + 1}</span>
    <span class="tpl-action">${escapeHtml(action)}</span>
    ${detail ? `<span class="tpl-detail">${escapeHtml(detail)}</span>` : ''}
  </summary>
  <div class="tpl-body">
    <div class="tpl-section-label">Args</div>
    <pre class="tpl-args">${escapeHtml(argsJson)}</pre>
    <div class="tpl-section-label">Result</div>
    ${renderTemplateResult(call)}
  </div>
</details>`;
		})
		.join('');
	return `<div class="tpl-calls">
  <div class="tpl-calls-label">templates calls (${calls.length})</div>
  ${items}
</div>`;
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

	const errorBlock = record.errorMessage
		? `<div class="error">${escapeHtml(record.errorMessage)}</div>`
		: '';

	return `<div class="builder-col">
  <div class="builder-header">
    <div class="builder-label">${escapeHtml(label)}</div>
    ${statusBadge}
  </div>
  <div class="builder-meta">${metaParts.join(' · ')}</div>
  ${errorBlock}
  <div class="workflow-wrap">${renderWorkflow(record.workflow)}</div>
  ${renderJudgeRows(record.feedback)}
  ${renderTemplateCalls(record.templateCalls)}
</div>`;
}

function renderRow(
	row: ComparisonRow,
	index: number,
	labels: { aLabel: string; bLabel: string },
): string {
	const verdictLabel: Record<ComparisonRow['verdict'], string> = {
		'both-pass': 'BOTH PASS',
		'both-fail': 'BOTH FAIL',
		'ee-only': `${labels.aLabel.toUpperCase()} ONLY`,
		'ia-only': `${labels.bLabel.toUpperCase()} ONLY`,
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

	const toolCallChip = (rec: BuilderRecord | undefined): string => {
		const count = rec?.toolCallCounts?.templates ?? 0;
		if (count === 0) return '';
		return `<span class="tool-chip" title="templates tool invocations">tpl ×${count}</span>`;
	};

	// Heavy content (workflow previews + judge tables) is wrapped in a <template>
	// so the n8n-demo web component is NOT instantiated until the user expands
	// the row. The lazy loader script in the document head does the swap.
	return `<details class="row ${verdictCls[row.verdict]}" id="row-${index}">
  <summary>
    <span class="verdict">${verdictLabel[row.verdict]}</span>
    <span class="prompt-preview">${escapeHtml(promptPreview)}</span>
    <span class="builder-chips">
      ${builderChip(labels.aLabel, eeHead)}${toolCallChip(row.ee)}
      ${builderChip(labels.bLabel, iaHead)}${toolCallChip(row.ia)}
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
          ${renderBuilderColumn(labels.aLabel, row.ee)}
          ${renderBuilderColumn(labels.bLabel, row.ia)}
        </div>
      </template>
      <div class="lazy-placeholder">Click to load workflow previews and judge details…</div>
    </div>
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
  ${failureBits ? `<div class="meta-row failures">Failures: ${escapeHtml(failureBits)}</div>` : ''}
</div>`;
}

function renderMetricsNote(): string {
	return `<aside class="metrics-note">
  <strong>Metric definitions:</strong>
  <span><b>Primary pass</b> — workflow passes only if a majority of LLM judges (2 of 3) find zero "don't" violations. Computed over all prompt attempts; build failures count as fail.</span>
  <span><b>Average diagnostic</b> — mean fraction of criteria (dos + don'ts) satisfied across the dataset, averaged across judges. Range 0–1; gives partial credit.</span>
  <span><b>Average build time</b> — averaged across all attempts including failures, so build timeouts (20-min cap) inflate this number.</span>
  <span><b>Verdicts</b> compare per-prompt primary pass between the two builders.</span>
</aside>`;
}

function renderVerdictTotals(
	rows: ComparisonRow[],
	labels: { aLabel: string; bLabel: string },
): string {
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

	const flipped = counts['ee-only'] + counts['ia-only'];
	return `<div class="verdict-grid">
  ${card('Both pass', counts['both-pass'], 'verdict-both-pass')}
  ${card(`${labels.aLabel} only passes`, counts['ee-only'], 'verdict-ee-only')}
  ${card(`${labels.bLabel} only passes`, counts['ia-only'], 'verdict-ia-only')}
  ${card('Both fail', counts['both-fail'], 'verdict-both-fail')}
  ${card('Verdict flipped', flipped, 'verdict-flipped')}
</div>`;
}

function renderToolAnalytics(
	a: BuilderRun,
	b: BuilderRun,
	rows: ComparisonRow[],
	labels: { aLabel: string; bLabel: string },
): string {
	// Only render if at least one side carries per-tool counts. Skip silently
	// otherwise so EE-vs-IA reports don't show an empty section.
	const aCounts = a.summary.toolCallCounts;
	const bCounts = b.summary.toolCallCounts;
	if (!aCounts && !bCounts) return '';

	const aTpl = aCounts?.templates ?? 0;
	const bTpl = bCounts?.templates ?? 0;
	const aEnabled = a.summary.templatesEnabled;
	const bEnabled = b.summary.templatesEnabled;

	// Among prompts where templates was actually called on side A, how often did
	// side A pass? Compare to the overall pass rate on side A. Same for B.
	const aSidePass = (rec: BuilderRecord | undefined): boolean =>
		!!rec && rec.success && findScore(rec.feedback, 'pairwise_primary') === 1;

	const aTplCalled = rows.filter((r) => (r.ee?.toolCallCounts?.templates ?? 0) > 0);
	const bTplCalled = rows.filter((r) => (r.ia?.toolCallCounts?.templates ?? 0) > 0);
	const aTplPassRate =
		aTplCalled.length === 0
			? null
			: aTplCalled.filter((r) => aSidePass(r.ee)).length / aTplCalled.length;
	const bTplPassRate =
		bTplCalled.length === 0
			? null
			: bTplCalled.filter((r) => aSidePass(r.ia)).length / bTplCalled.length;

	const enabledLabel = (e: boolean | undefined): string =>
		e === true ? '<em>enabled</em>' : e === false ? '<em>disabled</em>' : '';

	const calloutAvg = (n: number, count: number): string =>
		count === 0 ? '0' : `${n} (avg ${(n / count).toFixed(2)}/run)`;

	const passRateCell = (rate: number | null, count: number): string =>
		rate === null
			? '<span class="muted">no calls</span>'
			: `${pct(rate)} <span class="muted">(${count} prompts)</span>`;

	return `<section class="tool-analytics">
  <h2>Tool-call analytics — <code>templates</code></h2>
  <div class="tool-grid">
    <div class="tool-card">
      <h3>${escapeHtml(labels.aLabel)} ${enabledLabel(aEnabled)}</h3>
      <div class="tool-metric"><strong>${calloutAvg(aTpl, a.records.length)}</strong><span>templates calls</span></div>
      <div class="tool-metric"><strong>${passRateCell(aTplPassRate, aTplCalled.length)}</strong><span>pass rate when called</span></div>
      <div class="tool-metric"><strong>${pct(a.summary.totals.primaryPassRate)}</strong><span>overall pass rate</span></div>
    </div>
    <div class="tool-card">
      <h3>${escapeHtml(labels.bLabel)} ${enabledLabel(bEnabled)}</h3>
      <div class="tool-metric"><strong>${calloutAvg(bTpl, b.records.length)}</strong><span>templates calls</span></div>
      <div class="tool-metric"><strong>${passRateCell(bTplPassRate, bTplCalled.length)}</strong><span>pass rate when called</span></div>
      <div class="tool-metric"><strong>${pct(b.summary.totals.primaryPassRate)}</strong><span>overall pass rate</span></div>
    </div>
  </div>
  <p class="tool-note">Per-prompt template-call counts appear as <code>tpl ×N</code> chips on each row above.</p>
</section>`;
}

function renderDocument(
	ee: BuilderRun,
	ia: BuilderRun,
	rows: ComparisonRow[],
	labels: { aLabel: string; bLabel: string },
): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Pairwise Eval Comparison — ${escapeHtml(labels.aLabel)} vs ${escapeHtml(labels.bLabel)}</title>
<script defer src="https://cdn.jsdelivr.net/npm/@webcomponents/webcomponentsjs@2.0.0/webcomponents-loader.js"></script>
<script defer src="https://www.unpkg.com/lit@2.0.0-rc.2/polyfill-support.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/@n8n_io/n8n-demo-component/n8n-demo.bundled.js"></script>
<style>
  :root {
    font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
    color-scheme: light;
    --bg: #f7f7f9;
    --fg: #222;
    --muted: #6b7280;
    --border: #e5e7eb;
    --card: #fff;
    --pass: #10b981;
    --fail: #ef4444;
    --partial: #f59e0b;
    --accent: #4f46e5;
    --ee: #6366f1;
    --ia: #14b8a6;
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
  .summary-card .meta-row code { font-family: ui-monospace, monospace; font-size: 11px; background: #f3f4f6; padding: 1px 4px; border-radius: 3px; }
  .summary-card .metric { display: flex; justify-content: space-between; align-items: baseline; margin-top: 4px; font-size: 13px; }
  .summary-card .metric strong { font-size: 18px; color: var(--accent); }
  .summary-card .metric span { color: var(--muted); }
  .summary-card .meta-row.failures { color: var(--fail); margin-top: 6px; }
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
  .verdict-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
  .verdict-card { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 14px 16px; display: flex; flex-direction: column; gap: 4px; align-items: flex-start; }
  .verdict-card strong { font-size: 26px; font-weight: 700; }
  .verdict-card span { color: var(--muted); font-size: 12px; }
  .verdict-card em { color: var(--muted); font-size: 11px; font-style: normal; }
  .verdict-both-pass strong { color: var(--pass); }
  .verdict-both-fail strong { color: var(--fail); }
  .verdict-ee-only strong { color: var(--ee); }
  .verdict-ia-only strong { color: var(--ia); }
  .verdict-flipped strong { color: var(--accent); }
  .tool-analytics { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; }
  .tool-analytics h2 { margin: 0; font-size: 14px; }
  .tool-analytics h2 code { font-family: ui-monospace, monospace; font-size: 12px; background: #f3f4f6; padding: 2px 6px; border-radius: 3px; }
  .tool-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .tool-card { border: 1px solid var(--border); border-radius: 6px; padding: 10px 12px; background: #fcfcfd; display: flex; flex-direction: column; gap: 6px; }
  .tool-card h3 { margin: 0; font-size: 12px; font-weight: 600; }
  .tool-card h3 em { color: var(--muted); font-size: 11px; font-weight: 500; margin-left: 4px; font-style: normal; }
  .tool-metric { display: flex; justify-content: space-between; align-items: baseline; font-size: 12px; }
  .tool-metric strong { font-size: 16px; color: var(--accent); }
  .tool-metric .muted { color: var(--muted); font-weight: normal; font-size: 11px; }
  .tool-metric span { color: var(--muted); font-size: 11px; }
  .tool-note { margin: 0; color: var(--muted); font-size: 11px; }
  .tool-note code { font-family: ui-monospace, monospace; }
  .tool-chip { display: inline-block; padding: 2px 6px; margin-left: 4px; font-size: 10px; color: var(--accent); background: rgba(79,70,229,0.08); border: 1px solid rgba(79,70,229,0.18); border-radius: 3px; font-family: ui-monospace, monospace; }
  .tpl-calls { display: flex; flex-direction: column; gap: 4px; margin-top: 4px; padding: 8px 10px; background: rgba(79,70,229,0.04); border: 1px solid rgba(79,70,229,0.18); border-radius: 4px; }
  .tpl-calls-label { font-size: 11px; font-weight: 600; color: var(--accent); text-transform: uppercase; letter-spacing: 0.04em; }
  details.tpl-call { background: #fff; border: 1px solid var(--border); border-radius: 3px; }
  details.tpl-call > summary { padding: 4px 8px; cursor: pointer; font-size: 11px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; list-style: none; }
  details.tpl-call > summary::-webkit-details-marker { display: none; }
  details.tpl-call .tpl-idx { color: var(--muted); font-family: ui-monospace, monospace; font-weight: 700; }
  details.tpl-call .tpl-action { font-family: ui-monospace, monospace; color: var(--accent); font-weight: 600; }
  details.tpl-call .tpl-detail { color: var(--muted); font-family: ui-monospace, monospace; overflow: hidden; text-overflow: ellipsis; }
  details.tpl-call > .tpl-body { padding: 6px 10px 8px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 4px; }
  .tpl-section-label { font-size: 10px; text-transform: uppercase; color: var(--muted); letter-spacing: 0.04em; font-weight: 600; }
  pre.tpl-args, pre.tpl-result { margin: 0; padding: 6px 8px; background: #fafbfc; border: 1px solid var(--border); border-radius: 3px; font-size: 11px; line-height: 1.4; white-space: pre-wrap; word-break: break-word; max-height: 240px; overflow-y: auto; }
  .tpl-truncated { font-size: 10px; color: var(--muted); font-style: italic; }
  .tpl-result-missing { font-size: 11px; color: var(--muted); font-style: italic; }
  .rows { background: var(--card); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
  details.row { border-bottom: 1px solid var(--border); }
  details.row:last-child { border-bottom: none; }
  details.row > summary {
    list-style: none;
    cursor: pointer;
    padding: 10px 16px;
    display: grid;
    grid-template-columns: 110px minmax(0, 1fr) auto;
    gap: 16px;
    align-items: center;
    font-size: 13px;
  }
  details.row > summary:hover { background: #fafbff; }
  details.row[open] > summary { background: #f5f6fb; border-bottom: 1px solid var(--border); }
  details.row > summary::-webkit-details-marker { display: none; }
  details.row > summary .verdict {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    padding: 3px 8px;
    border-radius: 3px;
    text-align: center;
  }
  details.row.verdict-both-pass > summary .verdict { background: rgba(16,185,129,0.12); color: var(--pass); }
  details.row.verdict-both-fail > summary .verdict { background: rgba(239,68,68,0.12); color: var(--fail); }
  details.row.verdict-ee-only > summary .verdict { background: rgba(99,102,241,0.14); color: var(--ee); }
  details.row.verdict-ia-only > summary .verdict { background: rgba(20,184,166,0.14); color: var(--ia); }
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
    background: #fff;
  }
  .builder-chip.chip-pass { border-color: rgba(16,185,129,0.3); background: rgba(16,185,129,0.05); }
  .builder-chip.chip-fail { border-color: rgba(239,68,68,0.25); background: rgba(239,68,68,0.04); }
  .builder-chip.chip-missing { border-color: var(--border); background: #fafafa; }
  .builder-chip .chip-label { font-weight: 700; color: var(--muted); letter-spacing: 0.04em; }
  .builder-chip .chip-meta { color: var(--muted); }
  .lazy-slot { margin-top: 14px; }
  .lazy-placeholder { padding: 18px; text-align: center; color: var(--muted); font-size: 12px; border: 1px dashed var(--border); border-radius: 4px; background: #fafbfc; }
  details.row > .body { padding: 16px; background: #fcfcfd; border-top: 1px solid var(--border); }
  details.row > .body h3 { margin: 0 0 6px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
  details.row pre { background: #fff; border: 1px solid var(--border); border-radius: 4px; padding: 8px 12px; font-size: 12px; white-space: pre-wrap; max-height: 200px; overflow-y: auto; }
  .criteria-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
  .criteria { border: 1px solid var(--border); border-radius: 4px; padding: 8px 12px; background: #fff; }
  .criteria h4 { margin: 0 0 4px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
  .criteria.do h4 { color: var(--pass); }
  .criteria.dont h4 { color: var(--fail); }
  .criteria ul { margin: 0; padding-left: 18px; font-size: 12px; }
  .builder-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }
  .builder-col { background: #fff; border: 1px solid var(--border); border-radius: 6px; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
  .builder-col.missing { background: #fafafa; }
  .builder-col .missing-msg { color: var(--muted); font-style: italic; font-size: 12px; }
  .builder-header { display: flex; justify-content: space-between; align-items: center; }
  .builder-label { font-weight: 600; font-size: 13px; }
  .status { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 3px; letter-spacing: 0.04em; }
  .status-pass { background: rgba(16,185,129,0.15); color: var(--pass); }
  .status-fail { background: rgba(239,68,68,0.15); color: var(--fail); }
  .builder-meta { font-size: 11px; color: var(--muted); display: flex; gap: 8px; flex-wrap: wrap; }
  .error { padding: 8px 10px; background: rgba(239,68,68,0.08); color: var(--fail); border-radius: 4px; font-size: 11px; white-space: pre-wrap; max-height: 120px; overflow-y: auto; }
  .workflow-wrap { display: flex; }
  n8n-demo { display: block; width: 100%; height: 480px; border: 1px solid var(--border); border-radius: 4px; background: #fff; }
  .no-workflow { padding: 30px; text-align: center; color: var(--muted); font-size: 12px; border: 1px dashed var(--border); border-radius: 4px; flex: 1; }
  table.judges { width: 100%; border-collapse: collapse; font-size: 11px; background: #fff; border: 1px solid var(--border); border-radius: 4px; overflow: hidden; }
  table.judges th, table.judges td { padding: 5px 8px; text-align: left; border-bottom: 1px solid var(--border); vertical-align: top; }
  table.judges tr:last-child td { border-bottom: none; }
  table.judges td.judge-pass { color: var(--pass); font-weight: 600; }
  table.judges td.judge-fail { color: var(--fail); font-weight: 600; }
</style>
</head>
<body>
<header class="top">
  <h1>Pairwise Eval Comparison — ${escapeHtml(labels.aLabel)} vs ${escapeHtml(labels.bLabel)}</h1>
  <div class="subhead">${rows.length} prompt${rows.length === 1 ? '' : 's'} compared. Rows are ordered: ${escapeHtml(labels.aLabel)}-only wins, ${escapeHtml(labels.bLabel)}-only wins, both fail, both pass.</div>
</header>
<main>
  <section class="summary-row">
    ${renderSummaryCard(labels.aLabel, ee.summary, ee.records.length, ee.records)}
    ${renderSummaryCard(labels.bLabel, ia.summary, ia.records.length, ia.records)}
  </section>
  ${renderVerdictTotals(rows, labels)}
  ${renderToolAnalytics(ee, ia, rows, labels)}
  ${renderMetricsNote()}
  <section class="rows">
    ${rows.map((r, i) => renderRow(r, i, labels)).join('\n')}
  </section>
</main>
<script>
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
	mode: 'ee-vs-ia' | 'ia-vs-ia';
	aDir: string;
	bDir: string;
	aLabel: string;
	bLabel: string;
	out: string;
}

function parseArgs(argv: string[]): CliArgs {
	const get = (flag: string): string | undefined => {
		const idx = argv.indexOf(flag);
		if (idx === -1) return undefined;
		const value = argv[idx + 1];
		return value && !value.startsWith('--') ? value : undefined;
	};

	const aDir = get('--a-dir');
	const bDir = get('--b-dir');
	const eeDir = get('--ee-dir');
	const iaDir = get('--ia-dir');

	if ((aDir || bDir) && (eeDir || iaDir)) {
		throw new Error('Use either --a-dir/--b-dir (IA-vs-IA) or --ee-dir/--ia-dir, not both.');
	}

	let mode: CliArgs['mode'];
	let leftDir: string;
	let rightDir: string;
	let leftLabel: string;
	let rightLabel: string;

	if (aDir && bDir) {
		mode = 'ia-vs-ia';
		leftDir = aDir;
		rightDir = bDir;
		leftLabel = get('--a-label') ?? 'A';
		rightLabel = get('--b-label') ?? 'B';
	} else if (eeDir && iaDir) {
		mode = 'ee-vs-ia';
		leftDir = eeDir;
		rightDir = iaDir;
		leftLabel = 'Code Builder';
		rightLabel = 'instance-ai';
	} else {
		throw new Error(
			'Usage:\n' +
				'  tsx evaluations/cli/compare-pairwise.ts --ee-dir <path> --ia-dir <path> [--out <path>]\n' +
				'  tsx evaluations/cli/compare-pairwise.ts --a-dir <path> --b-dir <path> [--a-label <name>] [--b-label <name>] [--out <path>]',
		);
	}

	const defaultOut = path.join(
		path.dirname(path.resolve(rightDir)),
		mode === 'ia-vs-ia' ? 'comparison-templates.html' : 'comparison.html',
	);
	const out = path.resolve(get('--out') ?? defaultOut);

	return {
		mode,
		aDir: path.resolve(leftDir),
		bDir: path.resolve(rightDir),
		aLabel: leftLabel,
		bLabel: rightLabel,
		out,
	};
}

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));

	const [a, b] =
		args.mode === 'ee-vs-ia'
			? await Promise.all([loadEERun(args.aDir), loadInstanceAiRun(args.bDir)])
			: await Promise.all([loadInstanceAiRun(args.aDir), loadInstanceAiRun(args.bDir)]);

	console.log(
		`${args.aLabel}: ${a.records.length} records (pass rate ${pct(a.summary.totals.primaryPassRate)})`,
	);
	console.log(
		`${args.bLabel}: ${b.records.length} records (pass rate ${pct(b.summary.totals.primaryPassRate)})`,
	);

	const rows = pairRecords(a.records, b.records);
	const matched = rows.filter((r) => r.ee && r.ia).length;
	console.log(`Joined ${rows.length} prompts (${matched} matched on both sides)`);

	const html = renderDocument(a, b, rows, { aLabel: args.aLabel, bLabel: args.bLabel });
	await fs.writeFile(args.out, html, 'utf8');
	console.log(`Wrote comparison report to ${args.out}`);
}

if (require.main === module) {
	main().catch((error) => {
		console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
		process.exit(1);
	});
}
