/**
 * Generates report.html for data-flow compiler fixtures.
 * Shows: input code, parsed JSON, re-generated code, round-trip comparison,
 * execution output with node pipeline, nock traces, and expectation diffs.
 *
 * Generated files are gitignored.
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type {
	CompilerTestEntry,
	NockTraceEntry,
	SubWorkflowExecutionEntry,
} from './compiler-types';
import type {
	ExpectationMismatch,
	Expectations,
	NockRequestRecord,
	NodeOutputMap,
} from './expectation-matcher';

const FIXTURES_DIR = join(__dirname, '__fixtures__');
const REPORT_PATH = join(FIXTURES_DIR, 'report.html');
const EXECUTION_DATA_PATH = join(FIXTURES_DIR, 'execution-data.json');

// ---------------------------------------------------------------------------
// Execution data loader
// ---------------------------------------------------------------------------

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

function loadExecutionData(): Record<string, ExecutionEntry> {
	if (!existsSync(EXECUTION_DATA_PATH)) return {};
	try {
		return JSON.parse(readFileSync(EXECUTION_DATA_PATH, 'utf-8')) as Record<string, ExecutionEntry>;
	} catch {
		return {};
	}
}

function loadFixtureExpectations(dirName: string): Expectations | undefined {
	const p = join(FIXTURES_DIR, dirName, 'expectations.json');
	if (!existsSync(p)) return undefined;
	try {
		return JSON.parse(readFileSync(p, 'utf-8')) as Expectations;
	} catch {
		return undefined;
	}
}

function loadFixturePinData(dirName: string): Array<{ nodeName: string; data: unknown[] }> {
	const p = join(FIXTURES_DIR, dirName, 'pin-data.json');
	if (!existsSync(p)) return [];
	try {
		const raw = JSON.parse(readFileSync(p, 'utf-8')) as Record<string, unknown[]>;
		return Object.entries(raw).map(([nodeName, data]) => ({ nodeName, data }));
	} catch {
		return [];
	}
}

// ---------------------------------------------------------------------------
// HTML rendering helpers
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function renderOutputBlock(items: unknown[]): string {
	const outputJson = JSON.stringify(items, null, 2);
	const truncated = outputJson.length > 2000;
	const displayJson = truncated ? outputJson.slice(0, 2000) + '\n  ...' : outputJson;
	return `<pre class="code exec-output"><code>${escapeHtml(displayJson)}</code></pre>`;
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
	return `<details class="diff-details" open><summary class="diff-summary">Expectation Diff</summary><table class="diff-table"><thead><tr><th>Path</th><th>Expected</th><th>Actual</th></tr></thead><tbody>${rows}</tbody></table></details>`;
}

// ---------------------------------------------------------------------------
// Execution section renderers
// ---------------------------------------------------------------------------

interface NodeExecutionInfo {
	outputs: Array<{ items: unknown[]; outputIndex: number }>;
	error?: string;
	startTime?: number;
	executionTime?: number;
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
	const resBody =
		req.responseBody != null
			? `<div class="nock-req-section"><span class="nock-req-label">Response Body</span><pre class="code nock-req-body"><code>${escapeHtml(typeof req.responseBody === 'string' ? req.responseBody : JSON.stringify(req.responseBody, null, 2))}</code></pre></div>`
			: '';
	return `<details class="nock-req-detail">
          <summary><span class="nock-req-method">${escapeHtml(req.method)}</span> <span class="nock-req-url">${escapeHtml(req.url)}</span> <span class="nock-req-status nock-status-${req.responseStatus < 400 ? 'ok' : 'err'}">${req.responseStatus}</span> ${expectBadge}</summary>
          <div class="nock-req-panels">
            <div class="nock-req-panel"><h5 class="nock-panel-title">Request</h5>${reqHeaders}${reqBody}</div>
            <div class="nock-req-panel"><h5 class="nock-panel-title">Response <span class="nock-req-status nock-status-${req.responseStatus < 400 ? 'ok' : 'err'}">${req.responseStatus}</span></h5>${resBody}</div>
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

// ---------------------------------------------------------------------------
// Unified execution timeline
// ---------------------------------------------------------------------------

type TimelineEntry =
	| { kind: 'node'; name: string; time: number }
	| { kind: 'nock'; request: NockRequestRecord; time: number }
	| { kind: 'subworkflow'; entry: SubWorkflowExecutionEntry; time: number };

function renderNodePipeline(
	nodeNames: string[],
	nodeOutputs: NodeOutputMap,
	nockRequests?: NockRequestRecord[],
	mismatches?: ExpectationMismatch[],
	expectations?: Expectations,
	subWorkflows?: SubWorkflowExecutionEntry[],
): string {
	const nodeExpKeys = expectations?.nodes ? new Set(Object.keys(expectations.nodes)) : undefined;
	const reqExpKeys = expectations?.requests
		? new Set(Object.keys(expectations.requests))
		: undefined;

	// If no nock or subworkflows, render simple node list
	if (
		(!nockRequests || nockRequests.length === 0) &&
		(!subWorkflows || subWorkflows.length === 0)
	) {
		return nodeNames
			.map((name) =>
				renderSingleNode(
					name,
					nodeOutputs[name] as NodeExecutionInfo | undefined,
					mismatches,
					nodeExpKeys?.has(name),
				),
			)
			.join('\n');
	}

	// Build unified timeline
	const timeline: TimelineEntry[] = [];

	for (const name of nodeNames) {
		const info = nodeOutputs[name] as NodeExecutionInfo | undefined;
		timeline.push({ kind: 'node', name, time: info?.startTime ?? 0 });
	}

	if (nockRequests) {
		for (const req of nockRequests) {
			timeline.push({ kind: 'nock', request: req, time: req.timestamp ?? 0 });
		}
	}

	if (subWorkflows) {
		for (const sw of subWorkflows) {
			// Use earliest node startTime from the sub-workflow
			let minTime = Infinity;
			for (const info of Object.values(sw.nodeOutputs)) {
				const nodeInfo = info as NodeExecutionInfo;
				if (nodeInfo.startTime !== undefined && nodeInfo.startTime < minTime) {
					minTime = nodeInfo.startTime;
				}
			}
			timeline.push({ kind: 'subworkflow', entry: sw, time: minTime === Infinity ? 0 : minTime });
		}
	}

	timeline.sort((a, b) => a.time - b.time);

	// Track occurrence counts for nock request keys
	const nockOccurrences = new Map<string, number>();

	return timeline
		.map((entry) => {
			if (entry.kind === 'node') {
				return renderSingleNode(
					entry.name,
					nodeOutputs[entry.name] as NodeExecutionInfo | undefined,
					mismatches,
					nodeExpKeys?.has(entry.name),
				);
			}
			if (entry.kind === 'nock') {
				const req = entry.request;
				const baseKey = `${req.method} ${req.url}`;
				const count = (nockOccurrences.get(baseKey) ?? 0) + 1;
				nockOccurrences.set(baseKey, count);
				const reqKey = count === 1 ? baseKey : `${baseKey}#${count}`;
				const hasReqExp = reqExpKeys?.has(reqKey) ?? false;
				const reqBadge = renderExpectBadge(`requests[${reqKey}]`, mismatches, hasReqExp);
				const reqDiff = renderMismatchDiff(`requests[${reqKey}]`, mismatches);
				return `<div class="exec-node nock-inline">${renderNockRequestDetail(req, reqBadge, reqDiff)}</div>`;
			}
			// subworkflow
			const sw = entry.entry;
			const swNodeNames = sw.executedNodes ?? Object.keys(sw.nodeOutputs);
			const swPipeline = renderNodePipeline(swNodeNames, sw.nodeOutputs);
			return `<div class="exec-subworkflow">
          <div class="exec-subworkflow-label">Sub-workflow: ${escapeHtml(sw.name)}</div>
          <div class="exec-pipeline">${swPipeline}</div>
        </div>`;
		})
		.join('\n');
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

	const nockSection = execution.nockTrace ? renderNockSummary(execution.nockTrace) : '';

	const nodeRows = renderNodePipeline(
		executedNodes,
		nodeOutputs,
		execution.nockTrace?.requests,
		execution.expectationMismatches,
		expectations,
		execution.subWorkflows,
	);

	// Force open when there are mismatches
	const openAttr = hasMismatches ? ' open' : '';

	return `<details${openAttr}>
        <summary>Execution Output <span class="exec-badge ${statusClass}">${statusLabel}</span> <span class="exec-count">${executedNodes.length} node${executedNodes.length !== 1 ? 's' : ''}${(execution.subWorkflows ?? []).length > 0 ? ` + ${execution.subWorkflows!.length} sub` : ''}${execution.nockTrace ? ' · nock' : ''}</span></summary>
        ${errorBlock}
        ${nockSection}
        <div class="exec-pipeline">
          ${nodeRows}
        </div>
      </details>`;
}

// ---------------------------------------------------------------------------
// Main HTML generator
// ---------------------------------------------------------------------------

function generateHtml(entries: CompilerTestEntry[]): string {
	const cards = entries
		.map((entry) => {
			const execStatus = entry.executionStatus;
			const hasMismatches = (entry.expectationMismatches ?? []).length > 0;

			const statusBadge = entry.skip
				? '<span class="badge skip">SKIPPED</span>'
				: entry.roundTripStatus === 'error'
					? '<span class="badge error">ERROR</span>'
					: execStatus === 'error' || hasMismatches
						? '<span class="badge error">EXEC ERROR</span>'
						: '<span class="badge pass">PASS</span>';

			const codeMatchBadge =
				entry.codeMatch === true
					? '<span class="badge pass">ROUND-TRIP OK</span>'
					: entry.codeMatch === false
						? '<span class="badge error">ROUND-TRIP MISMATCH</span>'
						: '';

			const skipNote = entry.skip ? `<div class="skip-reason">${escapeHtml(entry.skip)}</div>` : '';

			const errorNote = entry.roundTripError
				? `<div class="error-msg">${escapeHtml(entry.roundTripError)}</div>`
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

			// Pin data section
			const pinDataSection =
				(entry.pinData ?? []).length > 0
					? `<details>
          <summary>Pin Data <span class="pin-count">${entry.pinData!.length} node${entry.pinData!.length > 1 ? 's' : ''}</span></summary>
          <div class="pin-data-list">
            ${entry.pinData!.map((pd) => `<div class="pin-data-item"><div class="pin-node-name">${escapeHtml(pd.nodeName)}</div><pre class="code pin-code"><code>${escapeHtml(JSON.stringify(pd.data, null, 2))}</code></pre></div>`).join('\n            ')}
          </div>
        </details>`
					: '';

			// Execution section
			const executionSection =
				entry.executionStatus !== undefined
					? renderExecutionSection(
							{
								status: entry.executionStatus,
								error: entry.executionError,
								executedNodes: entry.executedNodes,
								nodeOutputs: entry.nodeOutputs,
								subWorkflows: entry.subWorkflows,
								nockTrace: entry.nockTrace,
								expectationMismatches: entry.expectationMismatches,
							},
							entry.expectations,
						)
					: '';

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
          <pre class="code"><code class="language-typescript">${escapeHtml(entry.inputCode)}</code></pre>
        </details>
        ${
					entry.parsedJson
						? `<details>
          <summary>Parsed JSON</summary>
          <pre class="code"><code class="language-json">${escapeHtml(entry.parsedJson)}</code></pre>
        </details>`
						: ''
				}
        ${
					entry.reGeneratedCode
						? `<details>
          <summary>Re-Generated Code</summary>
          <pre class="code"><code class="language-typescript">${escapeHtml(entry.reGeneratedCode)}</code></pre>
        </details>`
						: ''
				}
        ${
					entry.validationErrors && entry.validationErrors.length > 0
						? `<details>
          <summary>Validation Errors (${entry.validationErrors.length})</summary>
          <pre class="code"><code class="language-plaintext">${entry.validationErrors.map(escapeHtml).join('\n')}</code></pre>
        </details>`
						: ''
				}
        ${pinDataSection}
        ${executionSection}
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

	// Summary stats
	const compilePass = entries.filter((e) => !e.skip && e.roundTripStatus === 'pass').length;
	const compileSkip = entries.filter((e) => e.skip).length;
	const compileError = entries.filter((e) => e.roundTripStatus === 'error').length;

	const withExec = entries.filter((e) => e.executionStatus !== undefined);
	const execPass = withExec.filter(
		(e) => e.executionStatus === 'pass' && (e.expectationMismatches ?? []).length === 0,
	).length;
	const execFail = withExec.filter(
		(e) => e.executionStatus === 'error' || (e.expectationMismatches ?? []).length > 0,
	).length;
	const execSkip = withExec.filter((e) => e.executionStatus === 'skip').length;
	const execNone = entries.length - withExec.length;

	const summaryHtml = `<div class="summary">
    <div class="summary-row">
      <span class="summary-label">Round-trip</span>
      <span class="summary-stat pass">${compilePass} pass</span>
      ${compileError > 0 ? `<span class="summary-stat error">${compileError} error</span>` : ''}
      ${compileSkip > 0 ? `<span class="summary-stat skip">${compileSkip} skip</span>` : ''}
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
  <title>Data-Flow Compiler - Fixture Report</title>
  <script src="https://cdn.jsdelivr.net/npm/@webcomponents/webcomponentsjs@2.0.0/webcomponents-loader.js"></script>
  <script src="https://www.unpkg.com/lit@2.0.0-rc.2/polyfill-support.js"></script>
  <script type="module" src="https://cdn.jsdelivr.net/npm/@n8n_io/n8n-demo-component/n8n-demo.bundled.js"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/github-dark.min.css">
  <script src="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/highlight.min.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/languages/typescript.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Inter, system-ui, sans-serif; background: #0d1117; color: #c9d1d9; padding: 24px; }
    h1 { margin-bottom: 24px; color: #e6edf3; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    .card-details > .card-summary { display: flex; align-items: center; gap: 12px; list-style: none; cursor: pointer; padding: 4px 0; font-size: 14px; flex-wrap: wrap; }
    .card-details > .card-summary::-webkit-details-marker { display: none; }
    .card-details > .card-summary::before { content: '\\25B6'; font-size: 10px; color: #6e7681; transition: transform 0.15s; flex-shrink: 0; }
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
    .code code { background: transparent; padding: 0; }
    .code code.hljs { background: transparent; padding: 0; }
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

    /* Pin data */
    .pin-count { font-size: 11px; font-weight: 400; color: #6e7681; margin-left: 4px; }
    .pin-data-list { margin-top: 8px; }
    .pin-data-item { margin-bottom: 12px; }
    .pin-node-name { font-size: 12px; font-weight: 600; color: #a78bfa; margin-bottom: 4px; padding: 2px 0; }
    .pin-code { font-size: 12px; padding: 12px; }

    /* Execution output */
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
    .exec-dot-error { background: #f85149; box-shadow: 0 0 0 1px #f85149; }
    .exec-node-name { font-size: 12px; font-weight: 600; color: #e6edf3; }
    .exec-item-count { font-size: 10px; color: #8b949e; background: #21262d; padding: 1px 6px; border-radius: 3px; }
    .exec-no-output { font-size: 10px; color: #484f58; font-style: italic; }
    .exec-output { font-size: 11px; padding: 8px 12px; margin-top: 6px; margin-bottom: 0; line-height: 1.4; max-height: 200px; overflow-y: auto; }
    .exec-node-error { font-size: 11px; color: #f85149; padding: 4px 8px; margin-top: 4px; background: #2d1216; border-radius: 3px; }
    .exec-output-index { margin-top: 6px; margin-left: 18px; }
    .exec-output-label { font-size: 10px; font-weight: 600; color: #8b949e; }

    /* Sub-workflow */
    .exec-subworkflow { margin: 12px 0; padding: 12px 0 12px 16px; border-left: 2px dashed #a78bfa; }
    .exec-subworkflow-label { font-size: 12px; font-weight: 600; color: #a78bfa; margin-bottom: 8px; }

    /* Nock trace */
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
    .nock-inline { border-left: 2px solid #3fb950; margin-left: 2px; padding-left: 10px; }
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

    /* Expectation badges + diff */
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

  hljs.highlightAll();
</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate the report HTML from compiler test results.
 * Merges execution data from execution-data.json (written by execution.test.ts).
 */
export function generateReport(testEntries: CompilerTestEntry[]): void {
	// Load execution data and merge into entries
	const executionMap = loadExecutionData();

	for (const entry of testEntries) {
		const exec = executionMap[entry.dirName];
		if (exec) {
			entry.executionStatus = exec.status;
			entry.executionError = exec.error;
			entry.executedNodes = exec.executedNodes;
			entry.nodeOutputs = exec.nodeOutputs;
			entry.subWorkflows = exec.subWorkflows;
			entry.nockTrace = exec.nockTrace;
			entry.expectationMismatches = exec.expectationMismatches;
			entry.expectations = loadFixtureExpectations(entry.dirName);
		}
		entry.pinData = loadFixturePinData(entry.dirName);
	}

	writeFileSync(REPORT_PATH, generateHtml(testEntries));
}
