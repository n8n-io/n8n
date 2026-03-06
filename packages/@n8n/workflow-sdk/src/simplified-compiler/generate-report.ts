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
import type { Expectations } from './expectation-matcher';

interface ExpectationMismatch {
	path: string;
	expected: unknown;
	actual: unknown;
}

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

interface NodeOutputEntry {
	items: unknown[];
	outputIndex: number;
}

interface NodeExecutionInfo {
	outputs: NodeOutputEntry[];
	error?: string;
	startTime?: number;
	executionTime?: number;
}

type NodeOutputMap = Record<string, NodeExecutionInfo>;

interface SubWorkflowExecutionEntry {
	name: string;
	executedNodes: string[];
	nodeOutputs: NodeOutputMap;
}

interface NockRequestRecord {
	timestamp?: number;
	method: string;
	url: string;
	requestHeaders?: Record<string, string>;
	requestBody?: unknown;
	responseStatus: number;
	responseHeaders?: Record<string, string>;
	responseBody?: unknown;
}

interface NockTraceEntry {
	interceptors: string[];
	consumed: string[];
	pending: string[];
	requests?: NockRequestRecord[];
}

interface ExecutionEntry {
	status: 'pass' | 'error' | 'skip';
	error?: string;
	reason?: string;
	executedNodes?: string[];
	nodeOutputs?: NodeOutputMap;
	subWorkflows?: SubWorkflowExecutionEntry[];
	nockTrace?: NockTraceEntry;
	expectationMismatches?: ExpectationMismatch[];
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
	expectations?: Expectations;
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
		const expectationsPath = join(dirPath, 'expectations.json');
		const expectations = existsSync(expectationsPath)
			? (JSON.parse(readFileSync(expectationsPath, 'utf-8')) as Expectations)
			: undefined;
		const base = {
			title: meta.title,
			templateId: meta.templateId,
			dirName,
			input,
			execution,
			expectations,
		};

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

function renderExecutionSection(execution: ExecutionEntry, expectations?: Expectations): string {
	if (execution.status === 'skip') {
		return `<details>
        <summary>Execution Output <span class="exec-badge exec-skip">SKIPPED</span></summary>
        <div class="exec-skip-reason">${escapeHtml(execution.reason ?? 'Unknown reason')}</div>
      </details>`;
	}

	const executedNodes = execution.executedNodes ?? [];
	const nodeOutputs = execution.nodeOutputs ?? {};
	const hasMismatches = (execution.expectationMismatches ?? []).length > 0;
	const effectiveStatus = hasMismatches ? 'error' : execution.status;
	const statusClass = effectiveStatus === 'pass' ? 'exec-pass' : 'exec-error';
	const statusLabel = effectiveStatus === 'pass' ? 'PASS' : hasMismatches ? 'EXPECT FAIL' : 'ERROR';

	const errorBlock = execution.error
		? `<div class="exec-error-msg">${escapeHtml(execution.error)}</div>`
		: '';

	const mismatches = execution.expectationMismatches;
	const nockRequests = execution.nockTrace?.requests;
	const nodeRows = renderNodePipeline(
		executedNodes,
		nodeOutputs,
		nockRequests,
		mismatches,
		expectations,
	);

	const subWorkflowSections = (execution.subWorkflows ?? [])
		.map((sw) => {
			const swNodeNames = sw.executedNodes ?? Object.keys(sw.nodeOutputs);
			return `<div class="exec-sub-workflow">
          <h4 class="exec-sub-label">Sub-workflow: ${escapeHtml(sw.name)}</h4>
          <div class="exec-pipeline">
            ${renderNodePipeline(swNodeNames, sw.nodeOutputs)}
          </div>
        </div>`;
		})
		.join('\n');

	const nockSection = execution.nockTrace ? renderNockSummary(execution.nockTrace) : '';

	return `<details>
        <summary>Execution Output <span class="exec-badge ${statusClass}">${statusLabel}</span> <span class="exec-count">${executedNodes.length} node${executedNodes.length !== 1 ? 's' : ''}${(execution.subWorkflows ?? []).length > 0 ? ` + ${execution.subWorkflows!.length} sub` : ''}${execution.nockTrace ? ' · nock' : ''}</span></summary>
        ${errorBlock}
        ${nockSection}
        <div class="exec-pipeline">
          ${nodeRows}
        </div>
        ${subWorkflowSections}
      </details>`;
}

function renderNockRequestDetail(req: NockRequestRecord, expectBadge = '', diffBlock = ''): string {
	const reqHeaders =
		req.requestHeaders && Object.keys(req.requestHeaders).length > 0
			? `<div class="nock-req-section"><span class="nock-req-label">Request Headers</span><pre class="code nock-req-body"><code>${escapeHtml(
					Object.entries(req.requestHeaders)
						.map(([k, v]) => `${k}: ${v}`)
						.join('\n'),
				)}</code></pre></div>`
			: '';
	const reqBody =
		req.requestBody != null
			? `<div class="nock-req-section"><span class="nock-req-label">Request Body</span><pre class="code nock-req-body"><code>${escapeHtml(typeof req.requestBody === 'string' ? req.requestBody : JSON.stringify(req.requestBody, null, 2))}</code></pre></div>`
			: '';
	const resHeaders =
		req.responseHeaders && Object.keys(req.responseHeaders).length > 0
			? `<div class="nock-req-section"><span class="nock-req-label">Response Headers</span><pre class="code nock-req-body"><code>${escapeHtml(
					Object.entries(req.responseHeaders)
						.map(([k, v]) => `${k}: ${v}`)
						.join('\n'),
				)}</code></pre></div>`
			: '';
	const resBody =
		req.responseBody != null
			? `<div class="nock-req-section"><span class="nock-req-label">Response Body</span><pre class="code nock-req-body"><code>${escapeHtml(typeof req.responseBody === 'string' ? req.responseBody : JSON.stringify(req.responseBody, null, 2))}</code></pre></div>`
			: '';
	return `<details class="nock-req-detail">
          <summary><span class="nock-req-method">${escapeHtml(req.method)}</span> <span class="nock-req-url">${escapeHtml(req.url)}</span> <span class="nock-req-status nock-status-${req.responseStatus < 400 ? 'ok' : 'err'}">${req.responseStatus}</span> ${expectBadge}</summary>
          <div class="nock-req-panels">
            <div class="nock-req-panel"><h5 class="nock-panel-title">Request</h5>${reqHeaders}${reqBody}</div>
            <div class="nock-req-panel"><h5 class="nock-panel-title">Response <span class="nock-req-status nock-status-${req.responseStatus < 400 ? 'ok' : 'err'}">${req.responseStatus}</span></h5>${resHeaders}${resBody}</div>
          </div>
          ${diffBlock}
        </details>`;
}

function renderNockSummary(trace: NockTraceEntry): string {
	const consumedSet = new Set(trace.consumed);
	const rows = trace.interceptors
		.map((interceptor) => {
			const hit = consumedSet.has(interceptor);
			const dotClass = hit ? 'nock-dot nock-dot-hit' : 'nock-dot nock-dot-miss';
			const label = hit ? 'matched' : 'unused';
			return `<div class="nock-row"><span class="${dotClass}"></span><span class="nock-url">${escapeHtml(interceptor)}</span><span class="nock-label nock-label-${hit ? 'hit' : 'miss'}">${label}</span></div>`;
		})
		.join('\n');

	const allHit = trace.pending.length === 0;
	const summaryBadge = allHit
		? `<span class="nock-badge nock-badge-ok">${trace.consumed.length}/${trace.interceptors.length} matched</span>`
		: `<span class="nock-badge nock-badge-warn">${trace.consumed.length}/${trace.interceptors.length} matched · ${trace.pending.length} unused</span>`;

	return `<details class="nock-trace">
        <summary>Nock Interceptors ${summaryBadge}</summary>
        <div class="nock-list">${rows}</div>
      </details>`;
}

function renderExpectBadge(
	entityPath: string,
	mismatches: ExpectationMismatch[] | undefined,
	hasExpectation: boolean,
): string {
	if (!hasExpectation) return '';
	const relevant = (mismatches ?? []).filter((m) => m.path.startsWith(entityPath));
	if (relevant.length === 0) {
		return '<span class="expect-badge expect-pass">expected</span>';
	}
	return `<span class="expect-badge expect-fail">${relevant.length} mismatch${relevant.length !== 1 ? 'es' : ''}</span>`;
}

function renderMismatchDiff(
	entityPath: string,
	mismatches: ExpectationMismatch[] | undefined,
): string {
	const relevant = (mismatches ?? []).filter((m) => m.path.startsWith(entityPath));
	if (relevant.length === 0) return '';
	const rows = relevant
		.map(
			(m) =>
				`<tr><td class="diff-path">${escapeHtml(m.path)}</td><td class="diff-expected">${escapeHtml(JSON.stringify(m.expected))}</td><td class="diff-actual">${escapeHtml(JSON.stringify(m.actual))}</td></tr>`,
		)
		.join('\n');
	return `<details class="diff-details"><summary class="diff-summary">Expectation Diff</summary><table class="diff-table"><thead><tr><th>Path</th><th>Expected</th><th>Actual</th></tr></thead><tbody>${rows}</tbody></table></details>`;
}

function renderOutputBlock(items: unknown[]): string {
	const outputJson = JSON.stringify(items, null, 2);
	const truncated = outputJson.length > 2000;
	const displayJson = truncated ? outputJson.slice(0, 2000) + '\n  ...' : outputJson;
	return `<pre class="code exec-output"><code>${escapeHtml(displayJson)}</code></pre>`;
}

function renderSingleNode(
	nodeName: string,
	info: NodeExecutionInfo | undefined,
	mismatches?: ExpectationMismatch[],
	hasExpectation?: boolean,
): string {
	const outputs = info?.outputs ?? [];
	const nodeError = info?.error;
	const hasError = !!nodeError;
	const totalItems = outputs.reduce((sum, o) => sum + o.items.length, 0);
	const dotClass = hasError ? 'exec-dot exec-dot-error' : 'exec-dot';

	let statusBadge: string;
	if (hasError) {
		statusBadge = '<span class="exec-badge exec-error">ERROR</span>';
	} else if (totalItems > 0) {
		statusBadge = `<span class="exec-item-count">${totalItems} item${totalItems !== 1 ? 's' : ''}</span>`;
	} else {
		statusBadge = '<span class="exec-no-output">no output</span>';
	}

	const expectBadge = renderExpectBadge(`nodes[${nodeName}]`, mismatches, !!hasExpectation);
	const diffBlock = renderMismatchDiff(`nodes[${nodeName}]`, mismatches);

	const errorBlock = hasError ? `<div class="exec-node-error">${escapeHtml(nodeError)}</div>` : '';

	let outputBlocks: string;
	if (outputs.length === 1) {
		outputBlocks = renderOutputBlock(outputs[0].items);
	} else if (outputs.length > 1) {
		outputBlocks = outputs
			.map(
				(o) =>
					`<div class="exec-output-index"><span class="exec-output-label">Output ${o.outputIndex}</span> <span class="exec-item-count">${o.items.length} item${o.items.length !== 1 ? 's' : ''}</span>${renderOutputBlock(o.items)}</div>`,
			)
			.join('\n');
	} else {
		outputBlocks = '';
	}

	return `<div class="exec-node">
          <div class="exec-node-header">
            <span class="${dotClass}"></span>
            <span class="exec-node-name">${escapeHtml(nodeName)}</span>
            ${statusBadge}
            ${expectBadge}
          </div>
          ${errorBlock}
          ${outputBlocks}
          ${diffBlock}
        </div>`;
}

function renderNodePipeline(
	nodeNames: string[],
	nodeOutputs: NodeOutputMap,
	nockRequests?: NockRequestRecord[],
	mismatches?: ExpectationMismatch[],
	expectations?: Expectations,
): string {
	const nodeExpKeys = expectations?.nodes ? new Set(Object.keys(expectations.nodes)) : undefined;
	const reqExpKeys = expectations?.requests
		? new Set(Object.keys(expectations.requests))
		: undefined;

	if (!nockRequests || nockRequests.length === 0) {
		return nodeNames
			.map((name) => renderSingleNode(name, nodeOutputs[name], mismatches, nodeExpKeys?.has(name)))
			.join('\n');
	}

	// Build a unified timeline: nodes by startTime, nock requests by timestamp
	type TimelineEntry =
		| { kind: 'node'; name: string; time: number }
		| { kind: 'nock'; request: NockRequestRecord; time: number };

	const timeline: TimelineEntry[] = [];

	for (const name of nodeNames) {
		const info = nodeOutputs[name];
		timeline.push({ kind: 'node', name, time: info?.startTime ?? 0 });
	}

	for (const req of nockRequests) {
		timeline.push({ kind: 'nock', request: req, time: req.timestamp ?? 0 });
	}

	timeline.sort((a, b) => a.time - b.time);

	// Track occurrence counts for nock request keys
	const nockOccurrences = new Map<string, number>();

	return timeline
		.map((entry) => {
			if (entry.kind === 'node') {
				return renderSingleNode(
					entry.name,
					nodeOutputs[entry.name],
					mismatches,
					nodeExpKeys?.has(entry.name),
				);
			}
			const req = entry.request;
			const baseKey = `${req.method} ${req.url}`;
			const count = (nockOccurrences.get(baseKey) ?? 0) + 1;
			nockOccurrences.set(baseKey, count);
			const reqKey = count === 1 ? baseKey : `${baseKey}#${count}`;
			const hasReqExp = reqExpKeys?.has(reqKey) ?? false;
			const reqBadge = renderExpectBadge(`requests[${reqKey}]`, mismatches, hasReqExp);
			const reqDiff = renderMismatchDiff(`requests[${reqKey}]`, mismatches);
			return `<div class="exec-node nock-inline">${renderNockRequestDetail(req, reqBadge, reqDiff)}</div>`;
		})
		.join('\n');
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

			const executionSection = entry.execution
				? renderExecutionSection(entry.execution, entry.expectations)
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
      ${
				entry.workflowJson
					? `<details class="demo-details">
        <summary>Workflow Preview${(entry.subWorkflows ?? []).length > 0 ? ` <span class="pin-count">${(entry.subWorkflows ?? []).length + 1} workflows</span>` : ''}</summary>
        <div class="demo">
          ${(entry.subWorkflows ?? []).length > 0 ? '<h3 class="demo-label">Main Workflow</h3>' : ''}
          <template class="lazy-demo" data-workflow='${entry.workflowJson.replace(/'/g, '&#39;')}'></template>
        </div>
        ${(entry.subWorkflows ?? [])
					.map(
						(sw) =>
							`<div class="demo sub-workflow">
          <h3 class="demo-label sub-workflow-label">Sub-workflow: ${escapeHtml(sw.name)}</h3>
          <template class="lazy-demo" data-workflow='${sw.workflowJson.replace(/'/g, '&#39;')}'></template>
        </div>`,
					)
					.join('\n')}
      </details>`
					: ''
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
    .exec-dot-error { background: #dc3545; box-shadow: 0 0 0 1px #dc3545; }
    .exec-node-error { font-size: 11px; color: #c00; padding: 4px 8px; margin-top: 4px; background: #fff0f0; border-radius: 3px; }
    .exec-output-index { margin-top: 6px; margin-left: 18px; }
    .exec-output-label { font-size: 10px; font-weight: 600; color: #666; }
    .exec-sub-workflow { margin-top: 16px; padding-top: 12px; border-top: 1px dashed #e0e0e0; }
    .exec-sub-label { font-size: 12px; font-weight: 600; color: #7c5cfc; margin-bottom: 8px; }

    /* Nock trace styles */
    .nock-trace { margin: 8px 0 12px; }
    .nock-trace summary { font-size: 12px; }
    .nock-badge { font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 3px; margin-left: 6px; vertical-align: middle; }
    .nock-badge-ok { background: #d4edda; color: #155724; }
    .nock-badge-warn { background: #fff3cd; color: #856404; }
    .nock-list { margin-top: 6px; padding-left: 8px; }
    .nock-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; font-size: 12px; }
    .nock-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .nock-dot-hit { background: #28a745; }
    .nock-dot-miss { background: #ffc107; }
    .nock-url { font-family: monospace; color: #333; }
    .nock-label { font-size: 10px; padding: 0 4px; border-radius: 2px; }
    .nock-label-hit { color: #155724; background: #d4edda; }
    .nock-label-miss { color: #856404; background: #fff3cd; }
    .nock-requests { margin-top: 8px; padding-left: 8px; }
    .nock-requests-summary { font-size: 12px; }
    .nock-requests-list { margin-top: 4px; }
    .nock-req-detail { margin-bottom: 4px; padding-left: 8px; }
    .nock-req-detail summary { font-size: 12px; font-family: monospace; gap: 6px; }
    .nock-req-method { font-weight: 700; color: #7c5cfc; }
    .nock-req-url { color: #333; }
    .nock-req-status { font-size: 10px; padding: 0 4px; border-radius: 2px; font-weight: 600; margin-left: 4px; }
    .nock-status-ok { color: #155724; background: #d4edda; }
    .nock-status-err { color: #721c24; background: #f8d7da; }
    .nock-req-panels { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px; }
    .nock-req-panel { min-width: 0; }
    .nock-panel-title { font-size: 11px; font-weight: 700; color: #555; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
    .nock-req-section { margin-top: 4px; }
    .nock-req-label { font-size: 10px; font-weight: 600; color: #888; display: block; margin-bottom: 2px; }
    .nock-req-body { font-size: 11px; padding: 6px 10px; margin-top: 2px; max-height: 150px; overflow-y: auto; }
    .nock-inline { border-left: 2px solid #28a745; margin-left: 2px; padding-left: 10px; }

    /* Expectation badge + diff styles */
    .expect-badge { font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 3px; margin-left: 6px; vertical-align: middle; }
    .expect-pass { background: #d4edda; color: #155724; }
    .expect-fail { background: #f8d7da; color: #721c24; }
    .diff-details { margin-top: 6px; }
    .diff-summary { font-size: 11px; color: #721c24; }
    .diff-table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 11px; }
    .diff-table th { text-align: left; padding: 4px 8px; background: #f0f0f0; border: 1px solid #ddd; font-weight: 600; }
    .diff-table td { padding: 4px 8px; border: 1px solid #ddd; font-family: monospace; }
    .diff-path { color: #555; }
    .diff-expected { color: #155724; background: #f0fff0; }
    .diff-actual { color: #721c24; background: #fff0f0; }
  </style>
</head>
<body>
  <h1>Simplified Compiler - Fixture Report</h1>
  <p style="margin-bottom:20px;color:#666;font-size:14px;">${entries.length} fixtures total &middot; ${entries.filter((e) => !e.skip && !e.error).length} passing &middot; ${entries.filter((e) => e.skip).length} skipped &middot; ${entries.filter((e) => e.error).length} errors${hasExecutionData ? ' &middot; <span style="color:#7c5cfc">execution data available</span>' : ''}</p>
${cards}
<script>
  document.querySelectorAll('details.demo-details').forEach(details => {
    details.addEventListener('toggle', function handler() {
      if (!details.open) return;
      details.querySelectorAll('template.lazy-demo').forEach(tmpl => {
        const demo = document.createElement('n8n-demo');
        demo.setAttribute('tidyup', 'true');
        demo.setAttribute('workflow', tmpl.dataset.workflow);
        tmpl.replaceWith(demo);
      });
      details.removeEventListener('toggle', handler);
    });
  });
</script>
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
