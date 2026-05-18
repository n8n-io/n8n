// ---------------------------------------------------------------------------
// Self-contained HTML report renderer for a RunReport.
//
// Drops a single static HTML file with inline CSS — no JS frameworks, no
// fetches, opens in any browser. Optimised for "what failed and why" at a
// glance, plus enough detail to debug a failed grader without opening the
// raw JSON.
// ---------------------------------------------------------------------------

import { escapeHtml, formatTokens, safeStringify } from './formatting';
import type {
	CapturedConfirmation,
	GraderResult,
	RunManifest,
	RunReport,
	ScenarioResult,
} from './types';

export function renderHtml(report: RunReport): string {
	const manifest: RunManifest = report.manifest;
	const passRate = report.totalScenarios > 0 ? report.passCount / report.totalScenarios : 0;
	const totalDurationMs = report.results.reduce((acc, r) => acc + r.durationMs, 0);
	const totalToolCalls = report.results.reduce((acc, r) => acc + r.toolCallCount, 0);
	const totalResultTokens = report.results.reduce((acc, r) => acc + r.tokens.totalResultsEst, 0);

	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Computer-use eval — ${report.passCount}/${report.totalScenarios} passed</title>
<style>${STYLE}</style>
</head>
<body>
<header>
  <h1>Computer-use eval</h1>
  <div class="meta">
    <span class="when">${escapeHtml(report.startedAt)} → ${escapeHtml(report.finishedAt)}</span>
  </div>
  <div class="manifest">
    <span class="manifest-item"><span class="manifest-label">git</span> <code>${escapeHtml(manifest.gitRef)}</code></span>
    <span class="manifest-item"><span class="manifest-label">computer-use</span> <code>${escapeHtml(manifest.daemonVersion)}</code></span>
    <span class="manifest-item"><span class="manifest-label">n8n</span> <code>${escapeHtml(manifest.n8nVersion)}</code></span>
  </div>
  <div class="banner ${passRate === 1 ? 'banner-ok' : 'banner-bad'}">
    <div class="banner-stat">
      <div class="num">${report.passCount}/${report.totalScenarios}</div>
      <div class="label">scenarios passed</div>
    </div>
    <div class="banner-stat">
      <div class="num">${formatDuration(totalDurationMs)}</div>
      <div class="label">total run time</div>
    </div>
    <div class="banner-stat">
      <div class="num">${totalToolCalls}</div>
      <div class="label">tool calls</div>
    </div>
    <div class="banner-stat">
      <div class="num">${formatTokens(totalResultTokens)}</div>
      <div class="label">result tokens (est)</div>
    </div>
  </div>
</header>

<main>
${report.results.map(renderScenario).join('\n')}
</main>

<footer>
  Token counts are local estimates (chars / 4). They cover what the agent
  fed back to the model via tool results — not system prompt, history, or
  model output. See the eval README for details.
</footer>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Per-scenario card
// ---------------------------------------------------------------------------

function renderScenario(result: ScenarioResult): string {
	const failedGraders = result.graderResults.filter((g) => !g.pass);
	const tagChips = (result.scenario.tags ?? [])
		.map((t) => `<span class="chip">${escapeHtml(t)}</span>`)
		.join(' ');

	return `<section class="scenario ${result.pass ? 'pass' : 'fail'}">
  <details ${result.pass ? '' : 'open'}>
    <summary>
      <span class="status">${result.pass ? 'PASS' : 'FAIL'}</span>
      <span class="id">${escapeHtml(result.scenario.id)}</span>
      <span class="cat">${escapeHtml(result.scenario.category)}</span>
      <span class="stats">
        ${result.toolCallCount} calls
        · ${formatDuration(result.durationMs)}
        · ${formatTokens(result.tokens.totalResultsEst)} result tokens est
      </span>
      ${tagChips ? `<span class="tags">${tagChips}</span>` : ''}
    </summary>

    <div class="body">
      ${result.error ? `<div class="error-box">Run error: ${escapeHtml(result.error)}</div>` : ''}

      <div class="prompt">
        <div class="section-label">Prompt</div>
        <pre>${escapeHtml(result.scenario.prompt)}</pre>
      </div>

      ${failedGraders.length > 0 ? renderFailedGraders(failedGraders) : ''}
      ${renderAllGraders(result.graderResults)}
      ${renderConfirmations(result.confirmations)}
      ${renderToolCalls(result)}
      ${renderFinalText(result.finalText)}
    </div>
  </details>
</section>`;
}

function renderConfirmations(confirmations: CapturedConfirmation[]): string {
	if (confirmations.length === 0) return '';
	const rows = confirmations
		.map(
			(c: CapturedConfirmation) => `<tr>
      <td class="conf-decision">${c.autoApproved ? 'auto-approved' : 'pending'}</td>
      <td class="conf-summary">${escapeHtml(c.summary ?? '(no summary)')}</td>
      <td class="conf-id"><code>${escapeHtml(c.requestId)}</code></td>
    </tr>`,
		)
		.join('\n');
	return `<div class="confirmations">
    <div class="section-label">Confirmations (${confirmations.length})</div>
    <table>${rows}</table>
  </div>`;
}

function renderFailedGraders(failed: GraderResult[]): string {
	const items = failed
		.map(
			(g) => `<li>
      <span class="grader-type">${escapeHtml(g.grader.type)}</span>
      <span class="reason">${escapeHtml(g.reason)}</span>
    </li>`,
		)
		.join('\n');
	return `<div class="failed-block">
    <div class="section-label">Why it failed</div>
    <ul class="failed-list">${items}</ul>
  </div>`;
}

function renderAllGraders(results: GraderResult[]): string {
	const rows = results
		.map(
			(g) => `<tr class="${g.pass ? 'g-pass' : 'g-fail'}">
      <td class="g-status">${g.pass ? 'pass' : 'fail'}</td>
      <td class="g-type">${escapeHtml(g.grader.type)}</td>
      <td class="g-reason">${escapeHtml(g.reason)}</td>
    </tr>`,
		)
		.join('\n');
	return `<div class="graders">
    <div class="section-label">Graders</div>
    <table>${rows}</table>
  </div>`;
}

function renderToolCalls(r: ScenarioResult): string {
	if (r.toolCalls.length === 0) {
		return '<div class="tools"><div class="section-label">Tool calls</div><div class="muted">none</div></div>';
	}

	const maxResult = Math.max(1, ...r.toolCalls.map((tc) => tc.resultTokensEst));
	const rows = r.toolCalls
		.map((tc, i) => {
			const widthPct = Math.max(1, Math.round((tc.resultTokensEst / maxResult) * 100));
			const argsPreview = previewArgs(tc.args);
			return `<tr>
      <td class="idx">#${i + 1}</td>
      <td class="tool">${escapeHtml(tc.name)}</td>
      <td class="args"><code>${escapeHtml(argsPreview)}</code></td>
      <td class="argTokens num">${formatTokens(tc.argTokensEst)}</td>
      <td class="resultBar">
        <div class="bar"><div class="fill" style="width:${widthPct}%"></div></div>
        <span class="num">${formatTokens(tc.resultTokensEst)}</span>
      </td>
    </tr>`;
		})
		.join('\n');

	const biggestNote = r.tokens.largestResultToolName
		? `<div class="biggest">Biggest result: <strong>${escapeHtml(r.tokens.largestResultToolName)}</strong> ~${formatTokens(r.tokens.largestResultEst)} tokens (est)</div>`
		: '';

	return `<div class="tools">
    <div class="section-label">Tool calls</div>
    ${biggestNote}
    <table class="tool-table">
      <thead><tr>
        <th>#</th>
        <th>Tool</th>
        <th>Args</th>
        <th>Arg tok</th>
        <th>Result tok (est)</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function renderFinalText(text: string): string {
	if (!text) return '';
	return `<details class="final-text">
    <summary>Final agent text (${text.length} chars)</summary>
    <pre>${escapeHtml(text)}</pre>
  </details>`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function previewArgs(args: Record<string, unknown>): string {
	const json = safeStringify(args);
	if (json.length <= 140) return json;
	return json.slice(0, 137) + '…';
}

function formatDuration(ms: number): string {
	if (ms < 1_000) return `${ms}ms`;
	if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
	// Round the whole duration to seconds first, then split. Splitting before
	// rounding (e.g. `Math.round((ms % 60_000) / 1000)`) can carry the seconds
	// component up to 60 and emit invalid `Xm60s` values for inputs like 119_500.
	const totalSeconds = Math.round(ms / 1000);
	const m = Math.floor(totalSeconds / 60);
	const s = totalSeconds % 60;
	return `${m}m${s}s`;
}

// ---------------------------------------------------------------------------
// Style — kept inline so the file is portable
// ---------------------------------------------------------------------------

const STYLE = `
:root {
  --bg: #0f1115;
  --panel: #181b22;
  --panel-2: #1f232c;
  --muted: #8a93a3;
  --text: #e6e9ef;
  --pass: #39c97a;
  --fail: #ef4f4f;
  --pass-bg: rgba(57, 201, 122, 0.10);
  --fail-bg: rgba(239, 79, 79, 0.12);
  --accent: #6aa9ff;
  --border: #2a2f3a;
}
* { box-sizing: border-box; }
body {
  background: var(--bg);
  color: var(--text);
  font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  margin: 0;
  padding: 24px;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
}
header h1 { margin: 0 0 4px 0; font-weight: 600; letter-spacing: -0.01em; }
.meta { color: var(--muted); margin-bottom: 8px; font-size: 13px; }
.manifest { color: var(--muted); margin-bottom: 16px; font-size: 12px; display: flex; gap: 16px; flex-wrap: wrap; }
.manifest-item { display: inline-flex; gap: 6px; align-items: center; }
.manifest-label { text-transform: uppercase; letter-spacing: 0.04em; font-size: 11px; }
.manifest code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--text); background: var(--panel-2); padding: 1px 6px; border-radius: 3px; }

.confirmations table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-top: 4px; }
.confirmations td { padding: 6px 8px; border-bottom: 1px solid var(--border); vertical-align: top; }
.conf-decision { width: 110px; color: var(--accent); }
.conf-summary { color: var(--text); }
.conf-id { width: 280px; color: var(--muted); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.banner {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 18px 20px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--panel);
  margin-bottom: 24px;
}
.banner-ok { border-color: var(--pass); }
.banner-bad { border-color: var(--fail); }
.banner-stat .num { font-size: 22px; font-weight: 600; letter-spacing: -0.01em; }
.banner-stat .label { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }

main { display: flex; flex-direction: column; gap: 12px; }

.scenario { border: 1px solid var(--border); border-radius: 8px; background: var(--panel); overflow: hidden; }
.scenario.pass { border-left: 3px solid var(--pass); }
.scenario.fail { border-left: 3px solid var(--fail); background: linear-gradient(180deg, var(--fail-bg), var(--panel) 60px); }

summary { list-style: none; cursor: pointer; padding: 12px 16px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
summary::-webkit-details-marker { display: none; }
summary:hover { background: var(--panel-2); }

.status { font-weight: 600; padding: 2px 8px; border-radius: 4px; font-size: 12px; letter-spacing: 0.04em; }
.scenario.pass .status { color: var(--pass); background: var(--pass-bg); }
.scenario.fail .status { color: var(--fail); background: var(--fail-bg); }

.id { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; }
.cat { color: var(--muted); font-size: 12px; }
.stats { color: var(--muted); font-size: 12px; margin-left: auto; }
.tags { width: 100%; margin-top: 4px; }
.chip { display: inline-block; font-size: 11px; padding: 1px 6px; border-radius: 3px; background: var(--panel-2); color: var(--muted); margin-right: 4px; }

.body { padding: 0 16px 16px; border-top: 1px solid var(--border); }
.section-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); margin: 14px 0 6px; }

pre {
  background: var(--panel-2); border: 1px solid var(--border); border-radius: 6px;
  padding: 10px 12px; overflow: auto; white-space: pre-wrap; word-break: break-word;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px;
  margin: 0;
}

.error-box { color: var(--fail); border: 1px solid var(--fail); border-radius: 6px; padding: 10px 12px; margin: 12px 0; background: var(--fail-bg); }

.failed-block { background: var(--fail-bg); border: 1px solid var(--fail); border-radius: 6px; padding: 8px 12px 12px; margin: 12px 0; }
.failed-list { margin: 0; padding-left: 18px; }
.failed-list .grader-type { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px; color: var(--fail); margin-right: 8px; }
.failed-list .reason { color: var(--text); }

.graders table, .tool-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.graders td, .tool-table td, .tool-table th { padding: 6px 8px; border-bottom: 1px solid var(--border); text-align: left; vertical-align: top; }
.tool-table th { color: var(--muted); font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
.g-status { width: 56px; font-weight: 600; }
.g-pass .g-status { color: var(--pass); }
.g-fail .g-status { color: var(--fail); }
.g-type { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; width: 220px; color: var(--accent); }

.tool-table .idx { width: 36px; color: var(--muted); }
.tool-table .tool { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--accent); width: 180px; white-space: nowrap; }
.tool-table .args code { font-size: 11.5px; color: var(--text); white-space: pre-wrap; word-break: break-word; }
.tool-table .num { text-align: right; font-variant-numeric: tabular-nums; width: 80px; }
.tool-table .resultBar { width: 220px; }
.bar { width: 140px; height: 6px; background: var(--panel-2); border-radius: 3px; overflow: hidden; display: inline-block; vertical-align: middle; }
.bar .fill { height: 100%; background: var(--accent); }
.resultBar .num { display: inline-block; margin-left: 8px; }
.biggest { color: var(--muted); font-size: 12px; margin-bottom: 4px; }

.final-text summary { padding: 10px 0; color: var(--accent); }
.final-text pre { margin-top: 8px; }

.muted { color: var(--muted); font-size: 12px; }
footer { color: var(--muted); font-size: 12px; margin-top: 32px; padding-top: 16px; border-top: 1px solid var(--border); text-align: center; }
`;
