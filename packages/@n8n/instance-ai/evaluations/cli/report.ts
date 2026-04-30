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

interface ResultRecord {
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
		extraWorkflowCount: number;
		interactivity: {
			askUserCount: number;
			planToolCount: number;
			autoApprovedSuspensions: number;
			mockedCredentialTypes: string[];
		};
	};
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

async function loadRuns(rootDir: string): Promise<Run[]> {
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

function renderWorkflow(workflow: unknown): string {
	if (!workflow) {
		return '<div class="no-workflow">No workflow built.</div>';
	}
	const json = JSON.stringify(workflow);
	// The component takes the workflow as an attribute — escape for HTML
	// attribute safety. JSON can contain < > & — we encode those.
	return `<n8n-demo workflow="${escapeAttr(json)}" frame="true" clicktointeract="true" collapseformobile="true"></n8n-demo>`;
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

	const errorBlock = record.build.errorMessage
		? `<div class="error">${escapeHtml(record.build.errorMessage)}</div>`
		: '';

	return `
<details class="example ${statusCls}" id="${escapeAttr(exampleId)}">
  <summary>
    <span class="status">${statusLabel}</span>
    <span class="example-id">${escapeHtml(record.exampleId)}</span>
    <span class="iteration">#${record.iteration}</span>
    <span class="duration">${record.build.durationMs}ms</span>
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

function renderDocument(runs: Run[]): string {
	const runLinks = runs
		.map((run, i) => {
			const s = run.summary;
			const pct = (s.totals.primaryPassRate * 100).toFixed(0);
			return `<a href="#run-${i}"><span class="nav-exp">${escapeHtml(s.experimentName)}</span><span class="nav-time">${escapeHtml(s.startedAt)}</span><span class="nav-score">${pct}%</span></a>`;
		})
		.join('\n');

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
    color-scheme: light;
    --bg: #f7f7f9;
    --fg: #222;
    --muted: #6b7280;
    --border: #e5e7eb;
    --card: #fff;
    --pass: #10b981;
    --partial: #f59e0b;
    --fail: #ef4444;
    --accent: #4f46e5;
  }
  body { margin: 0; background: var(--bg); color: var(--fg); }
  header.top { position: sticky; top: 0; background: var(--card); border-bottom: 1px solid var(--border); padding: 12px 20px; z-index: 10; }
  header.top h1 { margin: 0 0 6px 0; font-size: 18px; }
  nav.runs { display: flex; flex-wrap: wrap; gap: 8px; }
  nav.runs a { display: inline-flex; gap: 6px; padding: 6px 10px; border: 1px solid var(--border); border-radius: 4px; text-decoration: none; color: inherit; font-size: 12px; background: #fafafa; }
  nav.runs a:hover { border-color: var(--accent); color: var(--accent); }
  nav.runs .nav-time { color: var(--muted); }
  nav.runs .nav-score { font-weight: 600; }
  main { padding: 20px; display: flex; flex-direction: column; gap: 32px; max-width: 1400px; margin: 0 auto; }
  section.run { background: var(--card); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
  section.run header.run-header { padding: 16px 20px; border-bottom: 1px solid var(--border); background: #fafafa; }
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
    grid-template-columns: 60px minmax(0, 1fr) 40px 80px auto;
    gap: 12px;
    align-items: center;
    font-size: 13px;
  }
  details.example > summary::-webkit-details-marker { display: none; }
  details.example > summary .status {
    font-weight: 700;
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 3px;
    letter-spacing: 0.03em;
    text-align: center;
  }
  details.ex-pass > summary .status { background: rgba(16,185,129,0.1); color: var(--pass); }
  details.ex-partial > summary .status { background: rgba(245,158,11,0.1); color: var(--partial); }
  details.ex-fail > summary .status { background: rgba(239,68,68,0.1); color: var(--fail); }
  details.example > summary .example-id { font-family: ui-monospace, monospace; font-size: 12px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  details.example > summary .iteration { color: var(--muted); font-size: 11px; }
  details.example > summary .duration { color: var(--muted); font-size: 11px; text-align: right; }
  details.example > summary .badges { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
  .badge { font-size: 11px; padding: 2px 6px; border-radius: 3px; background: #eef0f3; color: #374151; }
  .badge.badge-pass { background: rgba(16,185,129,0.15); color: var(--pass); }
  .badge.badge-fail { background: rgba(239,68,68,0.15); color: var(--fail); }
  details.example > .body { padding: 16px 20px 24px; background: #fcfcfd; }
  details.example > .body h3 { margin: 16px 0 6px 0; font-size: 13px; text-transform: uppercase; color: var(--muted); letter-spacing: 0.05em; }
  details.example pre { background: #fff; border: 1px solid var(--border); border-radius: 4px; padding: 8px 12px; font-size: 12px; white-space: pre-wrap; }
  .criteria-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 8px; }
  .criteria { border: 1px solid var(--border); border-radius: 4px; padding: 8px 12px; background: #fff; }
  .criteria h4 { margin: 0 0 4px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
  .criteria.do h4 { color: var(--pass); }
  .criteria.dont h4 { color: var(--fail); }
  .criteria ul { margin: 0; padding-left: 18px; font-size: 12px; }
  .error { margin-top: 8px; padding: 8px 12px; background: rgba(239,68,68,0.08); color: var(--fail); border-radius: 4px; font-size: 12px; white-space: pre-wrap; }
  .interactivity { margin-top: 8px; font-size: 11px; color: var(--muted); }
  .workflow-section { margin-top: 8px; }
  n8n-demo { display: block; height: 560px; border: 1px solid var(--border); border-radius: 4px; background: #fff; }
  .no-workflow { padding: 40px; text-align: center; color: var(--muted); font-size: 13px; border: 1px dashed var(--border); border-radius: 4px; }
  table.judges { margin-top: 12px; width: 100%; border-collapse: collapse; font-size: 12px; background: #fff; border: 1px solid var(--border); border-radius: 4px; overflow: hidden; }
  table.judges th, table.judges td { padding: 6px 10px; text-align: left; border-bottom: 1px solid var(--border); }
  table.judges tr:last-child td { border-bottom: none; }
  table.judges td.judge-pass { color: var(--pass); font-weight: 600; }
  table.judges td.judge-fail { color: var(--fail); font-weight: 600; }
</style>
</head>
<body>
<header class="top">
  <h1>Instance AI — Pairwise Eval Report (${runs.length} run${runs.length === 1 ? '' : 's'})</h1>
  <nav class="runs">${runLinks}</nav>
</header>
<main>${body}</main>
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
