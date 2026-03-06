/**
 * Generates workflow.json files and a report.html for each fixture.
 * Run via: npx ts-node --transpile-only src/simplified-compiler/generate-report.ts
 *
 * Generated files are gitignored.
 */
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { transpileWorkflowJS } from './compiler';
import { parseWorkflowCodeToBuilder } from '../codegen/parse-workflow-code';

interface FixtureMeta {
	title: string;
	templateId: number;
	skip?: string;
}

interface SubWorkflowEntry {
	name: string;
	workflowJson: string;
}

interface PinDataEntry {
	nodeName: string;
	data: unknown[];
}

interface ExecutionEntry {
	status: 'pass' | 'error' | 'skip';
	error?: string;
	reason?: string;
	executedNodes?: string[];
	nodeOutputs?: Record<string, unknown[]>;
}

interface ReportEntry {
	title: string;
	templateId: number;
	dirName: string;
	skip?: string;
	input: string;
	sdkOutput?: string;
	workflowJson?: string;
	subWorkflows?: SubWorkflowEntry[];
	pinData?: PinDataEntry[];
	execution?: ExecutionEntry;
	error?: string;
}

const FIXTURES_DIR = join(__dirname, '__fixtures__');
const REPORT_PATH = join(FIXTURES_DIR, 'report.html');
const EXECUTION_DATA_PATH = join(FIXTURES_DIR, 'execution-data.json');

interface LooseWorkflow {
	name?: string;
	nodes?: Array<{ type: string; name?: string; parameters?: Record<string, unknown> }>;
}

function extractSubWorkflows(workflowJson: LooseWorkflow): SubWorkflowEntry[] {
	const seen = new Set<string>();
	const results: SubWorkflowEntry[] = [];

	function walk(wf: LooseWorkflow) {
		for (const n of wf.nodes ?? []) {
			if (
				n.type === 'n8n-nodes-base.executeWorkflow' &&
				typeof n.parameters?.workflowJson === 'string'
			) {
				const parsed = JSON.parse(n.parameters.workflowJson as string) as LooseWorkflow;
				const key = parsed.name ?? n.name ?? 'unknown';
				if (!seen.has(key)) {
					seen.add(key);
					results.push({ name: key, workflowJson: JSON.stringify(parsed, null, 2) });
					walk(parsed);
				}
			}
		}
	}

	walk(workflowJson);
	return results;
}

function loadExecutionData(): Record<string, ExecutionEntry> {
	if (!existsSync(EXECUTION_DATA_PATH)) return {};
	try {
		return JSON.parse(readFileSync(EXECUTION_DATA_PATH, 'utf-8')) as Record<string, ExecutionEntry>;
	} catch {
		return {};
	}
}

function processFixtures(): ReportEntry[] {
	const dirs = readdirSync(FIXTURES_DIR)
		.filter((f) => statSync(join(FIXTURES_DIR, f)).isDirectory())
		.sort();

	const executionMap = loadExecutionData();
	const entries: ReportEntry[] = [];

	for (const dirName of dirs) {
		const dirPath = join(FIXTURES_DIR, dirName);
		const meta = JSON.parse(readFileSync(join(dirPath, 'meta.json'), 'utf-8')) as FixtureMeta;
		const input = readFileSync(join(dirPath, 'input.js'), 'utf-8').trim();
		const execution = executionMap[dirName];
		const base = { title: meta.title, templateId: meta.templateId, dirName, input, execution };

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

			const subWorkflows = extractSubWorkflows(workflowJson);

			// Extract pin data
			const pinDataMap = (workflowJson as Record<string, unknown>).pinData as
				| Record<string, unknown[]>
				| undefined;
			const pinData: PinDataEntry[] = pinDataMap
				? Object.entries(pinDataMap).map(([nodeName, data]) => ({ nodeName, data }))
				: [];

			entries.push({
				...base,
				sdkOutput: result.code,
				workflowJson: jsonStr,
				subWorkflows,
				pinData: pinData.length > 0 ? pinData : undefined,
			});
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

function renderExecutionSection(execution: ExecutionEntry): string {
	if (execution.status === 'skip') {
		return `<details>
        <summary>Execution Output <span class="exec-badge exec-skip">SKIPPED</span></summary>
        <div class="exec-skip-reason">${escapeHtml(execution.reason ?? 'Unknown reason')}</div>
      </details>`;
	}

	const executedNodes = execution.executedNodes ?? [];
	const nodeOutputs = execution.nodeOutputs ?? {};
	const statusClass = execution.status === 'pass' ? 'exec-pass' : 'exec-error';
	const statusLabel = execution.status === 'pass' ? 'PASS' : 'ERROR';

	const errorBlock = execution.error
		? `<div class="exec-error-msg">${escapeHtml(execution.error)}</div>`
		: '';

	const nodeRows = executedNodes
		.map((nodeName) => {
			const output = nodeOutputs[nodeName];
			const hasOutput = output && output.length > 0;
			const itemCount = output?.length ?? 0;
			const outputJson = hasOutput ? JSON.stringify(output, null, 2) : '';
			const truncated = outputJson.length > 2000;
			const displayJson = truncated ? outputJson.slice(0, 2000) + '\n  ...' : outputJson;

			return `<div class="exec-node">
          <div class="exec-node-header">
            <span class="exec-dot"></span>
            <span class="exec-node-name">${escapeHtml(nodeName)}</span>
            ${hasOutput ? `<span class="exec-item-count">${itemCount} item${itemCount !== 1 ? 's' : ''}</span>` : '<span class="exec-no-output">no output</span>'}
          </div>
          ${hasOutput ? `<pre class="code exec-output"><code>${escapeHtml(displayJson)}</code></pre>` : ''}
        </div>`;
		})
		.join('\n');

	return `<details>
        <summary>Execution Output <span class="exec-badge ${statusClass}">${statusLabel}</span> <span class="exec-count">${executedNodes.length} node${executedNodes.length !== 1 ? 's' : ''}</span></summary>
        ${errorBlock}
        <div class="exec-pipeline">
          ${nodeRows}
        </div>
      </details>`;
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

			const executionSection = entry.execution ? renderExecutionSection(entry.execution) : '';

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
      ${
				entry.sdkOutput
					? `<details>
        <summary>Output SDK</summary>
        <pre class="code"><code>${escapeHtml(entry.sdkOutput)}</code></pre>
      </details>`
					: ''
			}
      ${
				(entry.pinData ?? []).length > 0
					? `<details>
        <summary>Pin Data <span class="pin-count">${entry.pinData!.length} node${entry.pinData!.length > 1 ? 's' : ''}</span></summary>
        <div class="pin-data-list">
          ${entry.pinData!.map((pd) => `<div class="pin-data-item"><div class="pin-node-name">${escapeHtml(pd.nodeName)}</div><pre class="code pin-code"><code>${escapeHtml(JSON.stringify(pd.data, null, 2))}</code></pre></div>`).join('\n          ')}
        </div>
      </details>`
					: ''
			}
      ${executionSection}
      ${demoComponent ? `<div class="demo">${(entry.subWorkflows ?? []).length > 0 ? '<h3 class="demo-label">Main Workflow</h3>' : ''}${demoComponent}</div>` : ''}
      ${
				(entry.subWorkflows ?? [])
					.map(
						(sw) =>
							`<div class="demo sub-workflow">
        <h3 class="demo-label sub-workflow-label">Sub-workflow: ${escapeHtml(sw.name)}</h3>
        <n8n-demo tidyup="true" workflow='${sw.workflowJson.replace(/'/g, '&#39;')}'></n8n-demo>
      </div>`,
					)
					.join('\n') || ''
			}
    </div>`;
		})
		.join('\n');

	const hasExecutionData = entries.some((e) => e.execution);

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
    .demo-label { font-size: 13px; font-weight: 600; color: #555; margin-bottom: 8px; }
    .sub-workflow { margin-top: 16px; padding-top: 12px; border-top: 1px dashed #ddd; }
    .sub-workflow-label { color: #7c5cfc; }
    .pin-count { font-size: 11px; font-weight: 400; color: #888; margin-left: 4px; }
    .pin-data-list { margin-top: 8px; }
    .pin-data-item { margin-bottom: 12px; }
    .pin-node-name { font-size: 12px; font-weight: 600; color: #7c5cfc; margin-bottom: 4px; padding: 2px 0; }
    .pin-code { font-size: 12px; padding: 12px; }
    n8n-demo { width: 100%; min-height: 300px; display: block; }

    /* Execution output styles */
    .exec-badge { font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 3px; text-transform: uppercase; margin-left: 6px; vertical-align: middle; }
    .exec-pass { background: #d4edda; color: #155724; }
    .exec-error { background: #f8d7da; color: #721c24; }
    .exec-skip { background: #fff3cd; color: #856404; }
    .exec-count { font-size: 11px; font-weight: 400; color: #888; margin-left: 4px; }
    .exec-skip-reason { font-size: 12px; color: #856404; padding: 8px 12px; background: #fffdf0; border-radius: 4px; margin-top: 8px; }
    .exec-error-msg { font-size: 12px; color: #c00; padding: 8px 12px; background: #fff0f0; border-radius: 4px; margin: 8px 0; }
    .exec-pipeline { margin-top: 12px; padding-left: 16px; border-left: 2px solid #e0e0e0; }
    .exec-node { margin-bottom: 16px; position: relative; }
    .exec-node:last-child { margin-bottom: 4px; }
    .exec-node-header { display: flex; align-items: center; gap: 8px; }
    .exec-dot { width: 10px; height: 10px; border-radius: 50%; background: #7c5cfc; margin-left: -21px; flex-shrink: 0; border: 2px solid #fff; box-shadow: 0 0 0 1px #7c5cfc; }
    .exec-node-name { font-size: 12px; font-weight: 600; color: #333; }
    .exec-item-count { font-size: 10px; color: #888; background: #f0f0f0; padding: 1px 6px; border-radius: 3px; }
    .exec-no-output { font-size: 10px; color: #aaa; font-style: italic; }
    .exec-output { font-size: 11px; padding: 8px 12px; margin-top: 6px; margin-bottom: 0; line-height: 1.4; max-height: 200px; overflow-y: auto; }
  </style>
</head>
<body>
  <h1>Simplified Compiler - Fixture Report</h1>
  <p style="margin-bottom:20px;color:#666;font-size:14px;">${entries.length} fixtures total &middot; ${entries.filter((e) => !e.skip && !e.error).length} passing &middot; ${entries.filter((e) => e.skip).length} skipped &middot; ${entries.filter((e) => e.error).length} errors${hasExecutionData ? ' &middot; <span style="color:#7c5cfc">execution data available</span>' : ''}</p>
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
