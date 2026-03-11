/**
 * Generates report.html for data-flow compiler fixtures.
 * Shows: input code, parsed JSON, re-generated code, round-trip comparison.
 *
 * Generated files are gitignored.
 */
import { writeFileSync } from 'fs';
import { join } from 'path';
import type { CompilerTestEntry } from './compiler-types';

const REPORT_PATH = join(__dirname, '__fixtures__', 'report.html');

// ---------------------------------------------------------------------------
// HTML rendering
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function generateHtml(entries: CompilerTestEntry[]): string {
	const cards = entries
		.map((entry) => {
			const statusBadge = entry.skip
				? '<span class="badge skip">SKIPPED</span>'
				: entry.roundTripStatus === 'error'
					? '<span class="badge error">ERROR</span>'
					: '<span class="badge pass">PASS</span>';

			const skipNote = entry.skip ? `<div class="skip-reason">${escapeHtml(entry.skip)}</div>` : '';

			const errorNote = entry.roundTripError
				? `<div class="error-msg">${escapeHtml(entry.roundTripError)}</div>`
				: '';

			const codeMatchBadge =
				entry.codeMatch === true
					? '<span class="badge pass">ROUND-TRIP OK</span>'
					: entry.codeMatch === false
						? '<span class="badge error">ROUND-TRIP MISMATCH</span>'
						: '';

			const statsBadges = [
				entry.nodeCount !== undefined
					? `<span class="badge-stat">${entry.nodeCount} nodes</span>`
					: '',
				entry.connectionCount !== undefined
					? `<span class="badge-stat">${entry.connectionCount} conns</span>`
					: '',
			]
				.filter(Boolean)
				.join(' ');

			return `
    <div class="card">
      <details class="card-details" data-id="${entry.dirName}">
        <summary class="card-summary">
          ${statusBadge} ${codeMatchBadge}
          <span class="card-title">${escapeHtml(entry.title)}</span>
          <span class="card-stats">${statsBadges}</span>
        </summary>
        ${skipNote}
        ${errorNote}
        <details>
          <summary>Input Code</summary>
          <pre class="code"><code>${escapeHtml(entry.inputCode)}</code></pre>
        </details>
        ${
					entry.parsedJson
						? `<details>
          <summary>Parsed JSON</summary>
          <pre class="code"><code>${escapeHtml(entry.parsedJson)}</code></pre>
        </details>`
						: ''
				}
        ${
					entry.reGeneratedCode
						? `<details>
          <summary>Re-Generated Code</summary>
          <pre class="code"><code>${escapeHtml(entry.reGeneratedCode)}</code></pre>
        </details>`
						: ''
				}
        ${
					entry.validationErrors && entry.validationErrors.length > 0
						? `<details>
          <summary>Validation Errors (${entry.validationErrors.length})</summary>
          <pre class="code"><code>${entry.validationErrors.map(escapeHtml).join('\n')}</code></pre>
        </details>`
						: ''
				}
        ${
					entry.parsedJson
						? `<details class="demo-details" open>
          <summary>Workflow Preview</summary>
          <div class="demo">
            <template class="lazy-demo" data-workflow='${entry.parsedJson.replace(/'/g, '&#39;')}'></template>
          </div>
        </details>`
						: ''
				}
      </details>
    </div>`;
		})
		.join('\n');

	const compilePass = entries.filter((e) => !e.skip && e.roundTripStatus === 'pass').length;
	const compileSkip = entries.filter((e) => e.skip).length;
	const compileError = entries.filter((e) => e.roundTripStatus === 'error').length;

	const summaryHtml = `<div class="summary">
    <div class="summary-row">
      <span class="summary-label">Round-trip</span>
      <span class="summary-stat pass">${compilePass} pass</span>
      ${compileError > 0 ? `<span class="summary-stat error">${compileError} error</span>` : ''}
      ${compileSkip > 0 ? `<span class="summary-stat skip">${compileSkip} skip</span>` : ''}
    </div>
  </div>`;

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Data-Flow Compiler - Fixture Report</title>
  <script src="https://cdn.jsdelivr.net/npm/@webcomponents/webcomponentsjs@2.0.0/webcomponents-loader.js"></script>
  <script src="https://www.unpkg.com/lit@2.0.0-rc.2/polyfill-support.js"></script>
  <script type="module" src="https://cdn.jsdelivr.net/npm/@n8n_io/n8n-demo-component/n8n-demo.bundled.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Inter, system-ui, sans-serif; background: #0d1117; color: #c9d1d9; padding: 24px; }
    h1 { margin-bottom: 24px; color: #e6edf3; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    .card-details > .card-summary { display: flex; align-items: center; gap: 12px; list-style: none; cursor: pointer; padding: 4px 0; font-size: 14px; flex-wrap: wrap; }
    .card-details > .card-summary::-webkit-details-marker { display: none; }
    .card-details > .card-summary::before { content: '▶'; font-size: 10px; color: #6e7681; transition: transform 0.15s; flex-shrink: 0; }
    .card-details[open] > .card-summary::before { transform: rotate(90deg); }
    .card-title { font-size: 16px; font-weight: 600; color: #e6edf3; }
    .card-stats { font-size: 12px; color: #6e7681; margin-left: auto; }
    .badge-stat { font-size: 11px; color: #8b949e; padding: 2px 6px; background: #21262d; border-radius: 3px; }
    .badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; }
    .badge.pass { background: #1b3a2d; color: #3fb950; }
    .badge.skip { background: #3d2e00; color: #d29922; }
    .badge.error { background: #3d1a1a; color: #f85149; }
    .skip-reason, .error-msg { font-size: 13px; color: #8b949e; margin-bottom: 12px; padding: 8px 12px; background: #1c2128; border-radius: 4px; }
    .error-msg { background: #2d1216; color: #f85149; }
    details { margin-bottom: 12px; }
    summary { cursor: pointer; font-size: 13px; font-weight: 600; color: #8b949e; padding: 4px 0; }
    .code { background: #0d1117; color: #c9d1d9; padding: 16px; border-radius: 6px; overflow-x: auto; font-size: 13px; line-height: 1.5; margin-top: 8px; border: 1px solid #30363d; }
    .demo { margin-top: 12px; }
    n8n-demo { width: 100%; min-height: 300px; display: block; }

    .summary { margin-bottom: 20px; display: flex; flex-direction: column; gap: 6px; }
    .summary-row { display: flex; align-items: center; gap: 8px; font-size: 13px; }
    .summary-label { font-weight: 600; color: #8b949e; width: 80px; flex-shrink: 0; }
    .summary-stat { padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 12px; }
    .summary-stat.pass { background: #1b3a2d; color: #3fb950; }
    .summary-stat.error { background: #3d1a1a; color: #f85149; }
    .summary-stat.skip { background: #3d2e00; color: #d29922; }
    .summary-stat.none { background: #21262d; color: #6e7681; }
    .toolbar { display: flex; gap: 8px; margin-bottom: 16px; }
    .toolbar button { background: #21262d; color: #c9d1d9; border: 1px solid #30363d; border-radius: 6px; padding: 6px 14px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
    .toolbar button:hover { background: #30363d; }
  </style>
</head>
<body>
  <h1>Data-Flow Compiler - Fixture Report</h1>
  ${summaryHtml}
  <div class="toolbar">
    <button onclick="toggleAll(true)">Expand All</button>
    <button onclick="toggleAll(false)">Collapse All</button>
  </div>
${cards}
<script>
  const STORAGE_KEY = 'dataflow-report-open-cards';
  function getOpenSet() {
    try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); }
    catch { return new Set(); }
  }
  function saveOpenSet(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify([...s])); }

  function hydrateDemos(container) {
    container.querySelectorAll('template.lazy-demo').forEach(tmpl => {
      const demo = document.createElement('n8n-demo');
      demo.setAttribute('tidyup', 'true');
      demo.setAttribute('workflow', tmpl.dataset.workflow);
      tmpl.replaceWith(demo);
    });
  }

  function toggleAll(open) {
    const openSet = getOpenSet();
    document.querySelectorAll('details.card-details').forEach(card => {
      card.open = open;
      const id = card.dataset.id;
      if (open) { openSet.add(id); hydrateDemos(card); }
      else { openSet.delete(id); }
    });
    saveOpenSet(openSet);
  }

  const openSet = getOpenSet();
  document.querySelectorAll('details.card-details').forEach(card => {
    const id = card.dataset.id;
    if (openSet.has(id)) {
      card.open = true;
      hydrateDemos(card);
    }
    card.addEventListener('toggle', () => {
      const s = getOpenSet();
      if (card.open) { s.add(id); hydrateDemos(card); }
      else { s.delete(id); }
      saveOpenSet(s);
    });
  });
</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate the report HTML from compiler test results.
 */
export function generateReport(testEntries: CompilerTestEntry[]): void {
	writeFileSync(REPORT_PATH, generateHtml(testEntries));
}
