/**
 * Generates workflow.json files and a report.html for each fixture.
 * Run via: npx ts-node --transpile-only src/simplified-compiler/generate-report.ts
 *
 * Generated files are gitignored.
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join } from 'path';
import { transpileWorkflowJS } from './compiler';
import { parseWorkflowCodeToBuilder } from '../codegen/parse-workflow-code';

interface FixtureMeta {
	title: string;
	templateId: number;
	skip?: string;
}

interface ReportEntry {
	title: string;
	templateId: number;
	dirName: string;
	skip?: string;
	input: string;
	workflowJson?: string;
	error?: string;
}

const FIXTURES_DIR = join(__dirname, '__fixtures__');
const REPORT_PATH = join(FIXTURES_DIR, 'report.html');

function processFixtures(): ReportEntry[] {
	const dirs = readdirSync(FIXTURES_DIR)
		.filter((f) => statSync(join(FIXTURES_DIR, f)).isDirectory())
		.sort();

	const entries: ReportEntry[] = [];

	for (const dirName of dirs) {
		const dirPath = join(FIXTURES_DIR, dirName);
		const meta = JSON.parse(readFileSync(join(dirPath, 'meta.json'), 'utf-8')) as FixtureMeta;
		const input = readFileSync(join(dirPath, 'input.js'), 'utf-8').trim();
		const base = { title: meta.title, templateId: meta.templateId, dirName, input };

		if (meta.skip) {
			entries.push({ ...base, skip: meta.skip });
			continue;
		}

		try {
			const result = transpileWorkflowJS(input);
			if (result.errors.length > 0) {
				entries.push({ ...base, error: result.errors.map((e) => e.message).join('; ') });
				continue;
			}

			const builder = parseWorkflowCodeToBuilder(result.code);
			const workflowJson = builder.toJSON();
			const jsonStr = JSON.stringify(workflowJson, null, 2);

			// Write workflow.json to the fixture directory
			writeFileSync(join(dirPath, 'workflow.json'), jsonStr + '\n');

			entries.push({ ...base, workflowJson: jsonStr });
		} catch (err) {
			entries.push({ ...base, error: err instanceof Error ? err.message : String(err) });
		}
	}

	return entries;
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function generateHtml(entries: ReportEntry[]): string {
	const cards = entries
		.map((entry) => {
			const statusBadge = entry.skip
				? '<span class="badge skip">SKIPPED</span>'
				: entry.error
					? '<span class="badge error">ERROR</span>'
					: '<span class="badge pass">PASS</span>';

			const templateLink = `<a class="template-link" href="https://n8n.io/workflows/${entry.templateId}/" target="_blank">#${entry.templateId}</a>`;

			const skipNote = entry.skip ? `<div class="skip-reason">${escapeHtml(entry.skip)}</div>` : '';

			const errorNote = entry.error
				? `<div class="error-msg">${escapeHtml(entry.error)}</div>`
				: '';

			const demoComponent = entry.workflowJson
				? `<n8n-demo tidyup="true" workflow='${entry.workflowJson.replace(/'/g, '&#39;')}'></n8n-demo>`
				: '';

			return `
    <div class="card">
      <div class="card-header">
        ${statusBadge}
        <h2>${escapeHtml(entry.title)}</h2>
        ${templateLink}
      </div>
      ${skipNote}
      ${errorNote}
      <details>
        <summary>Input JS</summary>
        <pre class="code"><code>${escapeHtml(entry.input)}</code></pre>
      </details>
      ${demoComponent ? `<div class="demo">${demoComponent}</div>` : ''}
    </div>`;
		})
		.join('\n');

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Simplified Compiler - Fixture Report</title>
  <script src="https://cdn.jsdelivr.net/npm/@webcomponents/webcomponentsjs@2.0.0/webcomponents-loader.js"></script>
  <script src="https://www.unpkg.com/lit@2.0.0-rc.2/polyfill-support.js"></script>
  <script type="module" src="https://cdn.jsdelivr.net/npm/@n8n_io/n8n-demo-component/n8n-demo.bundled.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Inter, system-ui, sans-serif; background: #f5f5f5; padding: 24px; }
    h1 { margin-bottom: 24px; color: #1a1a2e; }
    .card { background: #fff; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .card-header h2 { font-size: 16px; color: #333; }
    .template-link { font-size: 13px; color: #ff6d5a; text-decoration: none; font-weight: 600; }
    .template-link:hover { text-decoration: underline; }
    .badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; }
    .badge.pass { background: #d4edda; color: #155724; }
    .badge.skip { background: #fff3cd; color: #856404; }
    .badge.error { background: #f8d7da; color: #721c24; }
    .skip-reason, .error-msg { font-size: 13px; color: #666; margin-bottom: 12px; padding: 8px 12px; background: #f9f9f9; border-radius: 4px; }
    .error-msg { background: #fff0f0; color: #c00; }
    details { margin-bottom: 12px; }
    summary { cursor: pointer; font-size: 13px; font-weight: 600; color: #555; padding: 4px 0; }
    .code { background: #1e1e2e; color: #cdd6f4; padding: 16px; border-radius: 6px; overflow-x: auto; font-size: 13px; line-height: 1.5; margin-top: 8px; }
    .demo { margin-top: 12px; }
    n8n-demo { width: 100%; min-height: 300px; display: block; }
  </style>
</head>
<body>
  <h1>Simplified Compiler - Fixture Report</h1>
  <p style="margin-bottom:20px;color:#666;font-size:14px;">${entries.length} fixtures total &middot; ${entries.filter((e) => !e.skip && !e.error).length} passing &middot; ${entries.filter((e) => e.skip).length} skipped &middot; ${entries.filter((e) => e.error).length} errors</p>
${cards}
</body>
</html>`;
}

export function generateReport(): void {
	const entries = processFixtures();
	writeFileSync(REPORT_PATH, generateHtml(entries));
}

// Run as standalone script
if (require.main === module) {
	generateReport();
	const entries = processFixtures();
	const passing = entries.filter((e) => !e.skip && !e.error).length;
	const skipped = entries.filter((e) => e.skip).length;
	const errors = entries.filter((e) => e.error).length;
	console.log(`Report generated: ${REPORT_PATH}`);
	console.log(`  ${passing} passing, ${skipped} skipped, ${errors} errors`);
}
