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
import { validateSimplifiedJS, type ValidationError, type RuleResult } from './validator';

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
	validationErrors: ValidationError[];
	ruleResults: RuleResult[];
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

		// Run pre-compile validation
		const validation = validateSimplifiedJS(input);
		const { errors: validationErrors, ruleResults } = validation;

		if (meta.skip) {
			entries.push({ ...base, skip: meta.skip, validationErrors, ruleResults });
			continue;
		}

		try {
			const result = transpileWorkflowJS(input);
			if (result.errors.length > 0) {
				entries.push({
					...base,
					validationErrors,
					ruleResults,
					error: result.errors.map((e) => e.message).join('; '),
				});
				continue;
			}

			const builder = parseWorkflowCodeToBuilder(result.code);
			const workflowJson = builder.toJSON();
			const jsonStr = JSON.stringify(workflowJson, null, 2);

			// Write workflow.json to the fixture directory
			writeFileSync(join(dirPath, 'workflow.json'), jsonStr + '\n');

			const subWorkflows = extractSubWorkflows(workflowJson);

			// Extract pin data
			const pinDataMap = (workflowJson as unknown as Record<string, unknown>).pinData as
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
				validationErrors,
				ruleResults,
			});
		} catch (err) {
			entries.push({
				...base,
				validationErrors,
				ruleResults,
				error: err instanceof Error ? err.message : String(err),
			});
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
			const execStatus = entry.execution?.status;
			const hasMismatches = (entry.execution?.expectationMismatches ?? []).length > 0;
			const statusBadge = entry.skip
				? '<span class="badge skip">SKIPPED</span>'
				: entry.error
					? '<span class="badge error">ERROR</span>'
					: execStatus === 'error' || hasMismatches
						? '<span class="badge error">EXEC ERROR</span>'
						: execStatus === 'skip'
							? '<span class="badge skip">EXEC SKIP</span>'
							: '<span class="badge pass">PASS</span>';

			const templateLink = entry.templateId
				? `<a class="template-link" href="https://n8n.io/workflows/${entry.templateId}/" target="_blank">#${entry.templateId}</a>`
				: '';

			const skipNote = entry.skip ? `<div class="skip-reason">${escapeHtml(entry.skip)}</div>` : '';

			const errorNote = entry.error
				? `<div class="error-msg">${escapeHtml(entry.error)}</div>`
				: '';

			const executionSection = entry.execution
				? renderExecutionSection(entry.execution, entry.expectations)
				: '';

			const hasValidationErrors = entry.validationErrors.length > 0;
			const validationBadge = entry.skip
				? ''
				: hasValidationErrors
					? `<span class="badge error">VALIDATION FAIL</span>`
					: `<span class="badge pass">VALIDATED</span>`;

			const passedCount = entry.ruleResults.filter((r) => r.passed).length;
			const totalCount = entry.ruleResults.length;
			const summaryBadge = hasValidationErrors
				? `<span class="exec-badge exec-error">${passedCount}/${totalCount} passed</span>`
				: `<span class="exec-badge exec-pass">${totalCount}/${totalCount} passed</span>`;

			const ruleRows = entry.ruleResults
				.map((r) => {
					const icon = r.passed ? '✓' : '✗';
					const rowClass = r.passed ? 'rule-row rule-pass' : 'rule-row rule-fail';
					const errorDetails =
						r.errors.length > 0
							? r.errors
									.map(
										(ve) =>
											`<div class="rule-error-detail">${ve.line ? `<span class="validation-loc">line ${ve.line}</span> ` : ''}<span class="validation-msg">${escapeHtml(ve.message)}</span><div class="validation-suggestion">${escapeHtml(ve.suggestion)}</div></div>`,
									)
									.join('')
							: '';
					return `<div class="${rowClass}"><span class="rule-icon">${icon}</span><span class="rule-id">${escapeHtml(r.ruleId)}</span>${errorDetails}</div>`;
				})
				.join('\n          ');

			const validationSection = `<details${hasValidationErrors ? ' open' : ''}>
        <summary>Validation ${summaryBadge}</summary>
        <div class="validation-rules-list">
          ${ruleRows}
        </div>
      </details>`;

			return `
    <div class="card">
      <details class="card-details" data-id="${entry.dirName}">
        <summary class="card-summary">
          ${statusBadge}
          ${validationBadge}
          <span class="card-title">${escapeHtml(entry.title)}</span>
          ${templateLink}
        </summary>
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
        ${validationSection}
        ${
					(entry.pinData ?? []).length > 0
						? `<details>
          <summary>Pin Data <span class="pin-count">${entry.pinData!.length} node${entry.pinData!.length > 1 ? 's' : ''}</span></summary>
          <div class="pin-data-list">
            ${entry.pinData!.map((pd) => `<div class="pin-data-item"><div class="pin-node-name">${escapeHtml(pd.nodeName)}</div><pre class="code pin-code"><code>${escapeHtml(JSON.stringify(pd.data, null, 2))}</code></pre></div>`).join('\n            ')}
          </div>
        </details>`
						: ''
				}
        ${executionSection}
        ${
					entry.workflowJson
						? `<details class="demo-details" open>
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
      </details>
    </div>`;
		})
		.join('\n');

	const compilePass = entries.filter((e) => !e.skip && !e.error).length;
	const compileSkip = entries.filter((e) => e.skip).length;
	const compileError = entries.filter((e) => e.error).length;
	const validationFail = entries.filter((e) => e.validationErrors.length > 0).length;

	const withExec = entries.filter((e) => e.execution);
	const execPass = withExec.filter(
		(e) =>
			e.execution!.status === 'pass' && (e.execution!.expectationMismatches ?? []).length === 0,
	).length;
	const execFail = withExec.filter(
		(e) => e.execution!.status === 'error' || (e.execution!.expectationMismatches ?? []).length > 0,
	).length;
	const execSkip = withExec.filter((e) => e.execution!.status === 'skip').length;
	const execNone = entries.length - withExec.length;

	const summaryHtml = `<div class="summary">
    <div class="summary-row">
      <span class="summary-label">Compile</span>
      <span class="summary-stat pass">${compilePass} pass</span>
      ${compileError > 0 ? `<span class="summary-stat error">${compileError} error</span>` : ''}
      ${compileSkip > 0 ? `<span class="summary-stat skip">${compileSkip} skip</span>` : ''}
    </div>
    <div class="summary-row">
      <span class="summary-label">Validate</span>
      ${validationFail > 0 ? `<span class="summary-stat error">${validationFail} fail</span><span class="summary-stat pass">${entries.length - validationFail} pass</span>` : `<span class="summary-stat pass">${entries.length} pass</span>`}
    </div>
    <div class="summary-row">
      <span class="summary-label">Execute</span>
      ${withExec.length > 0 ? `<span class="summary-stat pass">${execPass} pass</span>${execFail > 0 ? `<span class="summary-stat error">${execFail} fail</span>` : ''}${execSkip > 0 ? `<span class="summary-stat skip">${execSkip} skip</span>` : ''}${execNone > 0 ? `<span class="summary-stat none">${execNone} no data</span>` : ''}` : `<span class="summary-stat none">no execution data</span>`}
    </div>
  </div>`;

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
    body { font-family: Inter, system-ui, sans-serif; background: #0d1117; color: #c9d1d9; padding: 24px; }
    h1 { margin-bottom: 24px; color: #e6edf3; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    .card-details > .card-summary { display: flex; align-items: center; gap: 12px; list-style: none; cursor: pointer; padding: 4px 0; font-size: 14px; }
    .card-details > .card-summary::-webkit-details-marker { display: none; }
    .card-details > .card-summary::before { content: '▶'; font-size: 10px; color: #6e7681; transition: transform 0.15s; flex-shrink: 0; }
    .card-details[open] > .card-summary::before { transform: rotate(90deg); }
    .card-title { font-size: 16px; font-weight: 600; color: #e6edf3; }
    .template-link { font-size: 13px; color: #ff7b72; text-decoration: none; font-weight: 600; }
    .template-link:hover { text-decoration: underline; }
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
    .demo-label { font-size: 13px; font-weight: 600; color: #8b949e; margin-bottom: 8px; }
    .sub-workflow { margin-top: 16px; padding-top: 12px; border-top: 1px dashed #30363d; }
    .sub-workflow-label { color: #a78bfa; }
    .pin-count { font-size: 11px; font-weight: 400; color: #6e7681; margin-left: 4px; }
    .pin-data-list { margin-top: 8px; }
    .pin-data-item { margin-bottom: 12px; }
    .pin-node-name { font-size: 12px; font-weight: 600; color: #a78bfa; margin-bottom: 4px; padding: 2px 0; }
    .pin-code { font-size: 12px; padding: 12px; }
    n8n-demo { width: 100%; min-height: 300px; display: block; }

    /* Execution output styles */
    .exec-badge { font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 3px; text-transform: uppercase; margin-left: 6px; vertical-align: middle; }
    .exec-pass { background: #1b3a2d; color: #3fb950; }
    .exec-error { background: #3d1a1a; color: #f85149; }
    .exec-skip { background: #3d2e00; color: #d29922; }
    .exec-count { font-size: 11px; font-weight: 400; color: #6e7681; margin-left: 4px; }
    .exec-skip-reason { font-size: 12px; color: #d29922; padding: 8px 12px; background: #2a2000; border-radius: 4px; margin-top: 8px; }
    .exec-error-msg { font-size: 12px; color: #f85149; padding: 8px 12px; background: #2d1216; border-radius: 4px; margin: 8px 0; }
    .exec-pipeline { margin-top: 12px; padding-left: 16px; border-left: 2px solid #30363d; }
    .exec-node { margin-bottom: 16px; position: relative; }
    .exec-node:last-child { margin-bottom: 4px; }
    .exec-node-header { display: flex; align-items: center; gap: 8px; }
    .exec-dot { width: 10px; height: 10px; border-radius: 50%; background: #a78bfa; margin-left: -21px; flex-shrink: 0; border: 2px solid #161b22; box-shadow: 0 0 0 1px #a78bfa; }
    .exec-node-name { font-size: 12px; font-weight: 600; color: #e6edf3; }
    .exec-item-count { font-size: 10px; color: #8b949e; background: #21262d; padding: 1px 6px; border-radius: 3px; }
    .exec-no-output { font-size: 10px; color: #484f58; font-style: italic; }
    .exec-output { font-size: 11px; padding: 8px 12px; margin-top: 6px; margin-bottom: 0; line-height: 1.4; max-height: 200px; overflow-y: auto; }
    .exec-dot-error { background: #f85149; box-shadow: 0 0 0 1px #f85149; }
    .exec-node-error { font-size: 11px; color: #f85149; padding: 4px 8px; margin-top: 4px; background: #2d1216; border-radius: 3px; }
    .exec-output-index { margin-top: 6px; margin-left: 18px; }
    .exec-output-label { font-size: 10px; font-weight: 600; color: #8b949e; }
    .exec-sub-workflow { margin-top: 16px; padding-top: 12px; border-top: 1px dashed #30363d; }
    .exec-sub-label { font-size: 12px; font-weight: 600; color: #a78bfa; margin-bottom: 8px; }

    /* Nock trace styles */
    .nock-trace { margin: 8px 0 12px; }
    .nock-trace summary { font-size: 12px; }
    .nock-badge { font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 3px; margin-left: 6px; vertical-align: middle; }
    .nock-badge-ok { background: #1b3a2d; color: #3fb950; }
    .nock-badge-warn { background: #3d2e00; color: #d29922; }
    .nock-list { margin-top: 6px; padding-left: 8px; }
    .nock-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; font-size: 12px; }
    .nock-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .nock-dot-hit { background: #3fb950; }
    .nock-dot-miss { background: #d29922; }
    .nock-url { font-family: monospace; color: #c9d1d9; }
    .nock-label { font-size: 10px; padding: 0 4px; border-radius: 2px; }
    .nock-label-hit { color: #3fb950; background: #1b3a2d; }
    .nock-label-miss { color: #d29922; background: #3d2e00; }
    .nock-requests { margin-top: 8px; padding-left: 8px; }
    .nock-requests-summary { font-size: 12px; }
    .nock-requests-list { margin-top: 4px; }
    .nock-req-detail { margin-bottom: 4px; padding-left: 8px; }
    .nock-req-detail summary { font-size: 12px; font-family: monospace; gap: 6px; }
    .nock-req-method { font-weight: 700; color: #a78bfa; }
    .nock-req-url { color: #c9d1d9; }
    .nock-req-status { font-size: 10px; padding: 0 4px; border-radius: 2px; font-weight: 600; margin-left: 4px; }
    .nock-status-ok { color: #3fb950; background: #1b3a2d; }
    .nock-status-err { color: #f85149; background: #3d1a1a; }
    .nock-req-panels { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px; }
    .nock-req-panel { min-width: 0; }
    .nock-panel-title { font-size: 11px; font-weight: 700; color: #8b949e; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
    .nock-req-section { margin-top: 4px; }
    .nock-req-label { font-size: 10px; font-weight: 600; color: #6e7681; display: block; margin-bottom: 2px; }
    .nock-req-body { font-size: 11px; padding: 6px 10px; margin-top: 2px; max-height: 150px; overflow-y: auto; }
    .nock-inline { border-left: 2px solid #3fb950; margin-left: 2px; padding-left: 10px; }

    /* Expectation badge + diff styles */
    .expect-badge { font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 3px; margin-left: 6px; vertical-align: middle; }
    .expect-pass { background: #1b3a2d; color: #3fb950; }
    .expect-fail { background: #3d1a1a; color: #f85149; }
    .diff-details { margin-top: 6px; }
    .diff-summary { font-size: 11px; color: #f85149; }
    .diff-table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 11px; }
    .diff-table th { text-align: left; padding: 4px 8px; background: #21262d; border: 1px solid #30363d; font-weight: 600; color: #c9d1d9; }
    .diff-table td { padding: 4px 8px; border: 1px solid #30363d; font-family: monospace; }
    .diff-path { color: #8b949e; }
    .diff-expected { color: #3fb950; background: #122117; }
    .diff-actual { color: #f85149; background: #2d1216; }

    /* Validation styles */
    .validation-errors { margin-top: 8px; }
    .validation-error { padding: 6px 10px; margin-bottom: 6px; background: #1c1216; border-left: 3px solid #f85149; border-radius: 3px; font-size: 12px; }
    .validation-rule { font-weight: 600; color: #f85149; font-family: monospace; font-size: 11px; }
    .validation-loc { color: #6e7681; font-size: 11px; margin-left: 4px; }
    .validation-msg { color: #c9d1d9; margin-left: 4px; }
    .validation-suggestion { color: #8b949e; font-size: 11px; margin-top: 2px; padding-left: 4px; font-style: italic; }
    .validation-rules-list { margin-top: 8px; }
    .rule-row { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px; padding: 3px 8px; font-size: 12px; border-radius: 3px; margin-bottom: 2px; }
    .rule-pass { color: #3fb950; }
    .rule-fail { color: #f85149; background: #1c1216; border-left: 3px solid #f85149; }
    .rule-icon { font-weight: 700; width: 14px; flex-shrink: 0; }
    .rule-id { font-family: monospace; font-size: 11px; font-weight: 600; }
    .rule-error-detail { width: 100%; padding-left: 20px; margin-top: 2px; font-size: 11px; }
    .summary { margin-bottom: 20px; display: flex; flex-direction: column; gap: 6px; }
    .summary-row { display: flex; align-items: center; gap: 8px; font-size: 13px; }
    .summary-label { font-weight: 600; color: #8b949e; width: 64px; flex-shrink: 0; }
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
  <h1>Simplified Compiler - Fixture Report</h1>
  ${summaryHtml}
  <div class="toolbar">
    <button onclick="toggleAll(true)">Expand All</button>
    <button onclick="toggleAll(false)">Collapse All</button>
  </div>
${cards}
<script>
  const STORAGE_KEY = 'report-open-cards';
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

  // Restore open state from localStorage + wire up toggle persistence
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
