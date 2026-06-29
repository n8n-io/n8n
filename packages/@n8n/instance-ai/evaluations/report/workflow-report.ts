/**
 * HTML report generator for workflow test case evaluations.
 *
 * Produces a self-contained HTML file optimized for three tasks:
 * 1. Triage — which scenarios failed? (seconds)
 * 2. Diagnose — why did they fail? (minutes)
 * 3. Compare — what changed between runs? (cross-report)
 */

import fs from 'fs';
import path from 'path';

import { getTestCaseAnchorId } from './report-anchors';
import { groupOutcomesByDimension } from '../binaryChecks/aggregate';
import { CHECK_DIMENSIONS, type CheckDimension, type CheckOutcome } from '../binaryChecks/types';
import type {
	BuildExpectationResult,
	ConversationMetrics,
	ExecutionScenarioResult,
	ToolInteraction,
	TranscriptStep,
	TranscriptTurn,
	TurnCounter,
	WorkflowTestCaseResult,
} from '../types';
import { caseDisplayPrompt } from '../utils/conversation-text';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

type StageStatus = 'pass' | 'fail';

interface StageReview {
	label: string;
	status: StageStatus;
	reason: string;
	body: string;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function getNodeOutputEntries(outputs: unknown): Array<[string, unknown[][]]> {
	const record = asRecord(outputs);
	if (!record) return [];
	return Object.entries(record).filter(
		(entry): entry is [string, unknown[][]] =>
			Array.isArray(entry[1]) && entry[1].every((branch) => Array.isArray(branch)),
	);
}

function getString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function getStringArray(value: unknown): string[] {
	return Array.isArray(value)
		? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
		: [];
}

function joinList(items: string[]): string {
	if (items.length === 0) return '';
	return `<ul class="review-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

interface WorkflowDiagramNode {
	name: string;
	type: string;
	mode: string;
	x: number;
	y: number;
}

interface WorkflowDiagramEdge {
	source: string;
	target: string;
	connType: string;
	outputIndex: number;
	inputIndex: number;
	label: string;
}

function truncateText(value: string, maxLength: number): string {
	return value.length > maxLength ? `${value.slice(0, Math.max(0, maxLength - 1))}…` : value;
}

function getNodePosition(node: unknown, fallbackIndex: number): { x: number; y: number } {
	const record = asRecord(node);
	const position = Array.isArray(record?.position) ? record.position : undefined;
	const x = typeof position?.[0] === 'number' ? position[0] : (fallbackIndex % 4) * 280;
	const y = typeof position?.[1] === 'number' ? position[1] : Math.floor(fallbackIndex / 4) * 160;
	return { x, y };
}

function getWorkflowDiagramNodes(result: WorkflowTestCaseResult): WorkflowDiagramNode[] {
	const workflowJson = result.workflowJson;
	if (!workflowJson) return [];

	const firstEval = result.executionScenarioResults[0]?.evalResult;
	const modeByNode = new Map(
		firstEval
			? Object.entries(firstEval.nodeResults).map(([name, nodeResult]) => [
					name,
					nodeResult.executionMode,
				])
			: [],
	);

	return workflowJson.nodes.map((node, index) => {
		const { x, y } = getNodePosition(node, index);
		return {
			name: node.name,
			type: node.type,
			mode: modeByNode.get(node.name) ?? (node.disabled ? 'disabled' : 'real'),
			x,
			y,
		};
	});
}

function describeOutputLabel(nodeType: string, connType: string, outputIndex: number): string {
	if (connType !== 'main') return `${connType}[${String(outputIndex)}]`;
	if (nodeType.includes('.if')) return outputIndex === 0 ? 'true' : 'false';
	if (nodeType.includes('.switch')) return `case ${String(outputIndex + 1)}`;
	if (nodeType.includes('.splitInBatches')) return outputIndex === 0 ? 'loop' : 'done';
	return outputIndex === 0 ? '' : `main[${String(outputIndex)}]`;
}

function getWorkflowDiagramEdges(result: WorkflowTestCaseResult): WorkflowDiagramEdge[] {
	const workflowJson = result.workflowJson;
	if (!workflowJson) return [];

	const nodeTypeByName = new Map(workflowJson.nodes.map((node) => [node.name, node.type]));
	const edges: WorkflowDiagramEdge[] = [];

	for (const [source, outputs] of Object.entries(workflowJson.connections ?? {})) {
		const outputsRecord = asRecord(outputs);
		if (!outputsRecord) continue;

		for (const [connType, groups] of Object.entries(outputsRecord)) {
			if (!Array.isArray(groups)) continue;

			groups.forEach((group, outputIndex) => {
				if (!Array.isArray(group)) return;

				group.forEach((link) => {
					const linkRecord = asRecord(link);
					const target = getString(linkRecord?.node);
					if (!target) return;
					const inputIndex =
						typeof linkRecord?.index === 'number' && Number.isFinite(linkRecord.index)
							? linkRecord.index
							: 0;
					edges.push({
						source,
						target,
						connType,
						outputIndex,
						inputIndex,
						label: describeOutputLabel(nodeTypeByName.get(source) ?? '', connType, outputIndex),
					});
				});
			});
		}
	}

	return edges;
}

function renderWorkflowEdgeList(edges: WorkflowDiagramEdge[]): string {
	if (edges.length === 0) return '';
	const items = edges
		.map((edge) => {
			const prefix = edge.label ? `${edge.label}: ` : '';
			const suffix =
				edge.connType !== 'main' || edge.inputIndex > 0
					? ` <span class="muted">(${escapeHtml(edge.connType)} → input ${String(edge.inputIndex)})</span>`
					: '';
			return `<li><code>${escapeHtml(prefix + edge.source)} -&gt; ${escapeHtml(edge.target)}</code>${suffix}</li>`;
		})
		.join('');
	return `<details class="section"><summary>Workflow edges (${String(edges.length)})</summary><ul class="edge-list">${items}</ul></details>`;
}

function renderWorkflowDiagram(result: WorkflowTestCaseResult): string {
	const nodes = getWorkflowDiagramNodes(result);
	if (nodes.length === 0) return '';

	const edges = getWorkflowDiagramEdges(result);
	const boxWidth = 220;
	const boxHeight = 58;
	const padding = 48;
	const minX = Math.min(...nodes.map((node) => node.x));
	const minY = Math.min(...nodes.map((node) => node.y));

	const shiftedNodes = nodes.map((node) => ({
		...node,
		x: node.x - minX + padding,
		y: node.y - minY + padding,
	}));
	const shiftedByName = new Map(shiftedNodes.map((node) => [node.name, node]));

	const maxX = Math.max(...shiftedNodes.map((node) => node.x + boxWidth)) + padding;
	const maxY = Math.max(...shiftedNodes.map((node) => node.y + boxHeight)) + padding;

	const edgeSvg = edges
		.map((edge, index) => {
			const source = shiftedByName.get(edge.source);
			const target = shiftedByName.get(edge.target);
			if (!source || !target) return '';

			const startX = source.x + boxWidth;
			const startY = source.y + boxHeight / 2;
			const endX = target.x;
			const endY = target.y + boxHeight / 2;
			const deltaX = Math.max(40, Math.abs(endX - startX) / 2);
			const path = `M ${startX} ${startY} C ${startX + deltaX} ${startY}, ${endX - deltaX} ${endY}, ${endX} ${endY}`;
			const labelX = (startX + endX) / 2;
			const labelY = (startY + endY) / 2 - 6;
			const label =
				edge.label.length > 0
					? `<text x="${labelX}" y="${labelY}" class="diagram-edge-label" text-anchor="middle">${escapeHtml(edge.label)}</text>`
					: '';

			return `<g class="diagram-edge-group" data-edge-index="${String(index)}">
				<path d="${path}" class="diagram-edge-path" marker-end="url(#workflow-arrow)" />
				${label}
			</g>`;
		})
		.join('');

	const nodeSvg = shiftedNodes
		.map((node) => {
			const safeMode = ['mocked', 'pinned', 'real', 'disabled'].includes(node.mode)
				? node.mode
				: 'real';
			const name = truncateText(node.name, 28);
			const type = truncateText(node.type.replace(/^n8n-nodes-base\./, ''), 30);
			return `<g class="diagram-node diagram-node-${safeMode}" transform="translate(${node.x}, ${node.y})">
				<rect width="${String(boxWidth)}" height="${String(boxHeight)}" rx="8" ry="8" class="diagram-node-box" />
				<text x="12" y="24" class="diagram-node-name">${escapeHtml(name)}</text>
				<text x="12" y="42" class="diagram-node-type">${escapeHtml(type)}</text>
			</g>`;
		})
		.join('');

	const svg = `<div class="workflow-diagram-shell">
		<svg class="workflow-diagram-svg" viewBox="0 0 ${String(maxX)} ${String(maxY)}" role="img" aria-label="Workflow diagram">
			<defs>
				<marker id="workflow-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
					<path d="M0,0 L0,6 L9,3 z" class="diagram-arrow-head" />
				</marker>
			</defs>
			${edgeSvg}
			${nodeSvg}
		</svg>
	</div>`;

	return `<details class="section"><summary>Workflow diagram</summary>${svg}</details>`;
}

function renderStageReview(stage: StageReview): string {
	return `<section class="review-stage ${stage.status}">
		<div class="review-stage-header">
			<div class="review-stage-heading">
				<span class="review-status-dot ${stage.status}"></span>
				<span class="review-stage-label">${escapeHtml(stage.label)}</span>
			</div>
			<span class="review-status-pill ${stage.status}">${stage.status === 'pass' ? 'green' : 'red'}</span>
		</div>
		<div class="review-stage-reason">${escapeHtml(stage.reason)}</div>
		<div class="review-stage-body">${stage.body}</div>
	</section>`;
}

function firstPromptText(result: WorkflowTestCaseResult): string {
	return caseDisplayPrompt(result.testCase, result.transcript);
}

function promptReview(result: WorkflowTestCaseResult, sr: ExecutionScenarioResult): StageReview {
	const evidence = `${sr.reasoning} ${sr.rootCause ?? ''}`.toLowerCase();
	const promptLooksUnderspecified =
		sr.failureCategory === 'legitimate_failure' &&
		['ambiguous', 'unclear', 'not specified', 'not define', 'does not specify'].some((needle) =>
			evidence.includes(needle),
		);

	return {
		label: '1. Prompt',
		status: promptLooksUnderspecified ? 'fail' : 'pass',
		reason: promptLooksUnderspecified
			? 'The failure analysis points to an under-specified request or acceptance condition.'
			: 'No direct prompt-spec issue was identified from the recorded scenario verdict.',
		body: `<div class="prompt-text review-prompt">${escapeHtml(firstPromptText(result))}</div>`,
	};
}

function plannerReview(result: WorkflowTestCaseResult): StageReview {
	const buildTrace = result.buildTrace;
	if (!buildTrace) {
		return {
			label: "2. Planner's understanding",
			status: 'pass',
			reason:
				'Planner trace details were not captured in this report, and no planner-specific failure marker is available.',
			body: '<div class="muted">Planner trace details were not captured for this run.</div>',
		};
	}

	const plannerActivity = buildTrace?.agentActivities.find(
		(activity) => activity.role === 'planner',
	);
	const planCalls = buildTrace?.toolCalls.filter((call) => call.toolName === 'add-plan-item') ?? [];
	const submitPlan = buildTrace?.toolCalls.find((call) => call.toolName === 'submit-plan');
	const submitPlanResult = asRecord(submitPlan?.result);
	const approved = submitPlanResult?.approved === true;
	const plannerLooksHealthy =
		plannerActivity?.status === 'completed' && approved && planCalls.length > 0;

	const workflowItems = planCalls
		.map((call) => {
			const item = asRecord(call.args.item);
			const itemKind = getString(item?.kind);
			if (itemKind !== 'workflow') return undefined;
			const name = getString(item.name);
			const summary =
				getString(call.args.summary) ?? getString(item.purpose) ?? getString(item.name);
			return [name, summary].filter(Boolean).join(': ');
		})
		.filter((item): item is string => Boolean(item));

	const checkpointItems = planCalls
		.map((call) => {
			const item = asRecord(call.args.item);
			const itemKind = getString(item?.kind);
			if (itemKind !== 'checkpoint') return undefined;
			return getString(item.title) ?? getString(item.instructions);
		})
		.filter((item): item is string => Boolean(item));

	const assumptions = planCalls
		.flatMap((call) => getStringArray(call.args.assumptions))
		.slice(0, 5);
	const bodyParts = [
		workflowItems.length > 0
			? `<div class="review-subsection"><div class="subsection-label">Workflow intent</div>${joinList(workflowItems)}</div>`
			: '',
		checkpointItems.length > 0
			? `<div class="review-subsection"><div class="subsection-label">Verification checkpoint</div>${joinList(checkpointItems)}</div>`
			: '',
		assumptions.length > 0
			? `<div class="review-subsection"><div class="subsection-label">Planner assumptions</div>${joinList(assumptions)}</div>`
			: '',
		plannerActivity?.textContent
			? `<div class="review-subsection"><div class="subsection-label">Planner output</div><div class="diagnosis">${escapeHtml(plannerActivity.textContent)}</div></div>`
			: '',
	].filter(Boolean);

	return {
		label: "2. Planner's understanding",
		status: plannerLooksHealthy ? 'pass' : 'fail',
		reason: plannerLooksHealthy
			? 'The trace contains an approved plan with explicit workflow/checkpoint items.'
			: 'The report does not show a completed approved plan with recorded plan items.',
		body:
			bodyParts.join('') ||
			'<div class="muted">Planner trace details were not captured for this run.</div>',
	};
}

function summarizeToolCalls(result: WorkflowTestCaseResult): string[] {
	const toolCalls = result.buildTrace?.toolCalls ?? [];
	const count = (toolName: string): number =>
		toolCalls.filter((call) => call.toolName === toolName).length;
	const submitCalls = toolCalls.filter((call) => call.toolName === 'submit-workflow');
	const verifyCalls = toolCalls.filter((call) => call.toolName === 'verify-built-workflow');

	const summaries = [
		count('nodes') > 0 ? `${String(count('nodes'))} node-research call(s)` : '',
		count('credentials') > 0 ? `${String(count('credentials'))} credential lookup call(s)` : '',
		submitCalls.length > 0 ? `${String(submitCalls.length)} workflow submission call(s)` : '',
		verifyCalls.length > 0 ? `${String(verifyCalls.length)} builder verification call(s)` : '',
	];

	return summaries.filter((summary) => summary.length > 0);
}

function builderReview(result: WorkflowTestCaseResult, sr: ExecutionScenarioResult): StageReview {
	const builderActivity = result.buildTrace?.agentActivities.find((activity) =>
		activity.role.includes('builder'),
	);
	const builderFailedScenario =
		!result.workflowBuildSuccess || sr.failureCategory === 'builder_issue';
	const summaryItems = summarizeToolCalls(result);
	const bodyParts = [
		builderActivity?.textContent
			? `<div class="review-subsection"><div class="subsection-label">Builder output</div><div class="diagnosis">${escapeHtml(builderActivity.textContent)}</div></div>`
			: '',
		summaryItems.length > 0
			? `<div class="review-subsection"><div class="subsection-label">Observed builder actions</div>${joinList(summaryItems)}</div>`
			: '',
		result.buildError ? `<div class="error-box">${escapeHtml(result.buildError)}</div>` : '',
	].filter(Boolean);

	return {
		label: '3. Builder action',
		status: builderFailedScenario ? 'fail' : 'pass',
		reason: builderFailedScenario
			? sr.failureCategory === 'builder_issue'
				? (sr.rootCause ?? 'The verifier attributed this failed scenario to the builder.')
				: (result.buildError ?? 'The workflow build itself did not complete successfully.')
			: 'No builder-attributed issue was recorded for this scenario.',
		body:
			bodyParts.join('') ||
			'<div class="muted">Builder trace details were not captured for this run.</div>',
	};
}

function verifierReview(sr: ExecutionScenarioResult): StageReview {
	const evalErrors = sr.evalResult?.errors ?? [];
	const warnings = sr.evalResult?.hints?.warnings ?? [];
	const bodyParts = [
		sr.reasoning
			? `<div class="review-subsection"><div class="subsection-label">Verifier reasoning</div><div class="diagnosis">${escapeHtml(sr.reasoning)}</div></div>`
			: '<div class="warning-box">Verifier reasoning was not captured.</div>',
		!sr.success && sr.rootCause
			? `<div class="review-subsection"><div class="subsection-label">Root cause</div><div class="diagnosis">${escapeHtml(sr.rootCause)}</div></div>`
			: '',
		evalErrors.length > 0
			? `<div class="error-box">${escapeHtml(evalErrors.join('; '))}</div>`
			: '',
		warnings.length > 0 ? `<div class="warning-box">${escapeHtml(warnings.join('; '))}</div>` : '',
	].filter(Boolean);

	return {
		label: '4. Verifier judgment',
		status: sr.success ? 'pass' : 'fail',
		reason: sr.success
			? 'The verifier accepted this scenario.'
			: `The verifier rejected this scenario${sr.failureCategory ? ` as ${sr.failureCategory}` : ''}.`,
		body: bodyParts.join(''),
	};
}

function promptImprovementSuggestion(sr: ExecutionScenarioResult): string {
	switch (sr.failureCategory) {
		case 'builder_issue':
			return 'For workflows with multiple required effects, branches, or error paths, state each required action explicitly and add observable acceptance conditions for every branch. This reduces silent omission during planning or build.';
		case 'mock_issue':
			return 'When success depends on an external response shape or an edge-case payload, specify the response envelope, key fields, and failure variant explicitly so the mock path is constrained and comparable across runs.';
		case 'framework_issue':
			return 'Make trigger preconditions and scenario setup requirements explicit in the test prompt or fixture description so empty-input framework failures are easier to separate from workflow defects.';
		case 'verification_gap':
			return 'Add concrete, inspectable success evidence to the prompt, such as the exact side effect, branch behavior, or output field that should be observed, so the verifier has less room to infer.';
		case 'legitimate_failure':
			return 'If this behavior is required, move it from an implied expectation into an explicit prompt requirement with a clear fallback path and observable success criterion.';
		default:
			return 'Turn the failed behavior into a more explicit, testable requirement in future prompts: name the required step, the expected branch, and the observable evidence that proves it happened.';
	}
}

function renderScenarioReview(result: WorkflowTestCaseResult, sr: ExecutionScenarioResult): string {
	const stages = [
		promptReview(result, sr),
		plannerReview(result),
		builderReview(result, sr),
		verifierReview(sr),
	];
	const improvement = sr.success
		? ''
		: `<section class="prompt-improvement">
				<div class="prompt-improvement-label">Generalisable prompt improvement</div>
				<div class="prompt-improvement-copy">${escapeHtml(promptImprovementSuggestion(sr))}</div>
			</section>`;

	return `<div class="review-shell">
		<div class="review-overview">
			${stages
				.map(
					(stage) =>
						`<span class="review-overview-chip ${stage.status}">${escapeHtml(stage.label.replace(/^\d+\.\s*/, ''))}</span>`,
				)
				.join('')}
		</div>
		<div class="review-grid">${stages.map(renderStageReview).join('')}</div>
		${improvement}
	</div>`;
}

function trimTrailingSlash(url: string): string {
	return url.endsWith('/') ? url.slice(0, -1) : url;
}

function workflowUrl(baseUrl: string, workflowId: string): string {
	return `${trimTrailingSlash(baseUrl)}/workflow/${workflowId}`;
}

function executionUrl(baseUrl: string, workflowId: string, executionId: string): string {
	return `${trimTrailingSlash(baseUrl)}/workflow/${workflowId}/executions/${executionId}`;
}

// ---------------------------------------------------------------------------
// Scenario rendering
// ---------------------------------------------------------------------------

function renderExecutionLink(
	sr: ExecutionScenarioResult,
	baseUrl: string | undefined,
	workflowId: string | undefined,
): string {
	if (!baseUrl || !workflowId || !sr.evalResult?.executionId) return '';
	const href = executionUrl(baseUrl, workflowId, sr.evalResult.executionId);
	// stopPropagation prevents the click from also toggling the parent header.
	return `<a class="execution-link" href="${href}" target="_blank" rel="noopener" onclick="event.stopPropagation()">view in n8n →</a>`;
}

function renderScenario(
	sr: ExecutionScenarioResult,
	index: number,
	result: WorkflowTestCaseResult,
): string {
	const icon = sr.success ? '&#10003;' : '&#10007;';
	const statusClass = sr.success ? 'pass' : 'fail';
	const execLink = renderExecutionLink(sr, result.n8nBaseUrl, result.workflowId);

	// Passing scenarios: compact one-liner with collapsible detail
	if (sr.success) {
		const summary = sr.reasoning ? sr.reasoning.slice(0, 150) : 'All checks passed';
		return `<div class="scenario ${statusClass}">
			<div class="scenario-header" onclick="this.parentElement.classList.toggle('expanded')">
				<span class="scenario-icon ${statusClass}">${icon}</span>
				<span class="scenario-name">${escapeHtml(sr.scenario.name)}</span>
				<span class="scenario-summary-inline">${escapeHtml(summary)}${sr.reasoning && sr.reasoning.length > 150 ? '...' : ''}</span>
				${execLink}
			</div>
			<div class="scenario-detail" id="scenario-${String(index)}">
				${renderScenarioReview(result, sr)}
				${renderScenarioDetail(sr)}
			</div>
		</div>`;
	}

	// Failing scenarios: show error prominently, detail expanded by default
	return `<div class="scenario ${statusClass} expanded">
		<div class="scenario-header" onclick="this.parentElement.classList.toggle('expanded')">
			<span class="scenario-icon ${statusClass}">${icon}</span>
			<span class="scenario-name">${escapeHtml(sr.scenario.name)}</span>
			<span class="scenario-desc">${escapeHtml(sr.scenario.description)}</span>
			${execLink}
		</div>
		<div class="scenario-detail" id="scenario-${String(index)}">
			${renderScenarioReview(result, sr)}
			${renderScenarioDetail(sr)}
		</div>
	</div>`;
}

function renderScenarioDetail(sr: ExecutionScenarioResult): string {
	let html = '';

	if (!sr.evalResult) {
		if (sr.reasoning) {
			html += `<div class="diagnosis">${escapeHtml(sr.reasoning)}</div>`;
		}
		return html;
	}

	// Failure category badge
	if (!sr.success && sr.failureCategory) {
		const catClass =
			sr.failureCategory === 'builder_issue'
				? 'warn'
				: sr.failureCategory === 'mock_issue'
					? 'fail'
					: 'info';
		html += `<div class="category-badge category-${catClass}">${escapeHtml(sr.failureCategory)}${sr.rootCause ? ': ' + escapeHtml(sr.rootCause) : ''}</div>`;
	}

	// 1. Error — what broke
	if (sr.evalResult.errors.length > 0) {
		html += `<div class="error-box">${escapeHtml(sr.evalResult.errors.join('; '))}</div>`;
	}

	// Phase 1 warnings
	const warnings = sr.evalResult.hints?.warnings ?? [];
	if (warnings.length > 0) {
		html += `<div class="warning-box">${escapeHtml(warnings.join('; '))}</div>`;
	}

	// 2. Diagnosis — verifier's reasoning
	if (sr.reasoning) {
		html += '<details class="section" open><summary>Diagnosis</summary>';
		html += `<div class="diagnosis">${escapeHtml(sr.reasoning)}</div>`;
		html += '</details>';
	}

	// 3. Mock data plan — Phase 1 hints
	if (sr.evalResult.hints) {
		html += '<details class="section"><summary>Mock data plan</summary>';
		const { globalContext, triggerContent, nodeHints } = sr.evalResult.hints;

		if (globalContext) {
			html += '<div class="subsection-label">Global context</div>';
			html += `<div class="hint-text">${escapeHtml(globalContext)}</div>`;
		}

		if (Object.keys(triggerContent ?? {}).length > 0) {
			html += '<div class="subsection-label">Trigger content</div>';
			html += `<pre class="json-block"><code>${escapeHtml(JSON.stringify(triggerContent, null, 2))}</code></pre>`;
		} else {
			html +=
				'<div class="warning-inline">No trigger content generated \u2014 start node has no input data</div>';
		}

		if (nodeHints && Object.keys(nodeHints).length > 0) {
			html += '<div class="subsection-label">Per-node hints</div>';
			for (const [nodeName, hint] of Object.entries(nodeHints)) {
				html += `<details class="node-hint"><summary>${escapeHtml(nodeName)}</summary>`;
				html += `<div class="hint-text">${escapeHtml(hint)}</div>`;
				html += '</details>';
			}
		}
		html += '</details>';
	}

	// 4. Execution trace — per-node results
	const nodeEntries = Object.entries(sr.evalResult.nodeResults);
	if (nodeEntries.length > 0) {
		html += '<details class="section"><summary>Execution trace</summary>';
		html +=
			'<div class="trace-legend"><span class="node-mode-mocked">mocked</span> <span class="node-mode-pinned">pinned</span> <span class="node-mode-real">real</span></div>';

		for (const [nodeName, nr] of nodeEntries) {
			const modeClass = `node-mode-${nr.executionMode}`;
			const hasError = nr.configIssues && Object.keys(nr.configIssues).length > 0;
			const configWarning = hasError
				? `<span class="build-issue">Build issue: ${escapeHtml(Object.values(nr.configIssues!).flat().join('; '))}</span>`
				: '';

			html += '<div class="trace-node">';
			html += '<div class="trace-node-header">';
			html += `<span class="${modeClass}">[${nr.executionMode}]</span> <strong>${escapeHtml(nodeName)}</strong>`;
			if (nr.interceptedRequests.length > 0) {
				html += ` <span class="request-count">${String(nr.interceptedRequests.length)} request(s)</span>`;
			}
			html += '</div>';
			if (configWarning) html += configWarning;

			// Intercepted requests
			for (const req of nr.interceptedRequests) {
				html += '<div class="request-pair">';
				html += '<div class="request-header">Request sent</div>';
				html += `<div class="request-method">${escapeHtml(req.method)} ${escapeHtml(req.url)}</div>`;
				if (req.requestBody) {
					html += `<pre class="json-block json-sm"><code>${escapeHtml(JSON.stringify(req.requestBody, null, 2))}</code></pre>`;
				}
				html += '<div class="response-header">Mock returned</div>';
				if (req.mockResponse !== undefined) {
					html += `<pre class="json-block json-sm"><code>${escapeHtml(JSON.stringify(req.mockResponse, null, 2))}</code></pre>`;
				} else {
					html += '<div class="muted">no mock response</div>';
				}
				html += '</div>';
			}

			const outputEntries = getNodeOutputEntries(nr.outputs);
			const hasOutput = outputEntries.some(([, branches]) => branches.length > 0);
			if (hasOutput) {
				html += '<details class="node-output-toggle"><summary>Node output</summary>';
				for (const [connType, branches] of outputEntries) {
					for (let i = 0; i < branches.length; i++) {
						const label =
							branches.length > 1 || connType !== 'main'
								? `${connType} branch ${String(i)} (${String(branches[i].length)} items)`
								: `${connType} (${String(branches[i].length)} items)`;
						html += `<div class="node-output-branch"><strong>${escapeHtml(label)}</strong>`;
						html += `<pre class="json-block"><code>${escapeHtml(JSON.stringify(branches[i], null, 2))}</code></pre></div>`;
					}
				}
				if (nr.truncated) {
					html += `<div class="muted">truncated; full count: ${String(nr.outputCount)}</div>`;
				}
				html += '</details>';
			} else {
				html += '<div class="muted">no output</div>';
			}

			html += '</div>';
		}
		html += '</details>';
	}

	return html;
}

// ---------------------------------------------------------------------------
// Conversation metrics (per-turn deterministic counters)
// ---------------------------------------------------------------------------

function renderConversationMetrics(metrics: ConversationMetrics | undefined): string {
	if (!metrics || metrics.perTurn.length === 0) return '';

	const turnRows = metrics.perTurn.map((turn) => renderTurnRow(turn)).join('');
	const finishBadge = metrics.reachedRunFinishCleanly
		? '<span class="badge badge-pass">finished cleanly</span>'
		: '<span class="badge badge-fail">incomplete</span>';

	const byKindBits = Object.entries(metrics.confirmationAskedByKind)
		.map(([kind, count]) => `${escapeHtml(kind)}×${String(count)}`)
		.join(' · ');

	const summary = [
		`<strong>${String(metrics.turnCount)}</strong> turn${metrics.turnCount === 1 ? '' : 's'}`,
		`<strong>${String(metrics.confirmationAskedTotal)}</strong> confirmation${metrics.confirmationAskedTotal === 1 ? '' : 's'} asked${byKindBits ? ` (${byKindBits})` : ''}`,
		finishBadge,
	].join(' · ');

	return `<details class="section"><summary>Conversation metrics</summary>
		<div class="conv-summary">${summary}</div>
		<table class="conv-table">
			<thead><tr>
				<th>Turn</th><th>Tool calls</th><th>Tool errors</th><th>Confirmations</th>
				<th>Replan after error</th><th>Repeat questions</th><th>Finish status</th>
			</tr></thead>
			<tbody>${turnRows}</tbody>
		</table>
	</details>`;
}

function renderTurnRow(turn: TurnCounter): string {
	const status = turn.runFinishStatus ?? '—';
	const statusClass =
		turn.runFinishStatus === 'completed'
			? 'turn-status-ok'
			: turn.runFinishStatus === undefined
				? 'turn-status-pending'
				: 'turn-status-fail';
	const confByKind = Object.entries(turn.confirmationAskedByKind)
		.map(([kind, count]) => `${escapeHtml(kind)}×${String(count)}`)
		.join(', ');
	const confDetail = confByKind ? ` <span class="muted">(${confByKind})</span>` : '';
	return `<tr>
		<td>#${String(turn.turn)}</td>
		<td>${String(turn.toolCallCount)}</td>
		<td>${String(turn.toolErrorCount)}</td>
		<td>${String(turn.confirmationAskedTotal)}${confDetail}</td>
		<td>${String(turn.replanAfterErrorCount)}</td>
		<td>${String(turn.repeatQuestionCount)}</td>
		<td class="${statusClass}">${escapeHtml(status)}</td>
	</tr>`;
}

// ---------------------------------------------------------------------------
// Conversation transcript — chat-style view built from the captured event stream
// ---------------------------------------------------------------------------

function renderConversationTranscript(transcript: TranscriptTurn[] | undefined): string {
	if (!transcript || transcript.length === 0) return '';
	const turnsHtml = transcript.map((turn, i) => renderTranscriptTurn(turn, i + 1)).join('');
	return `<details class="section" open><summary>Conversation transcript</summary>
		<div class="transcript">${turnsHtml}</div>
	</details>`;
}

function renderTranscriptTurn(turn: TranscriptTurn, turnNum: number): string {
	// Judged as part of the whole conversation; marked subtly only for human readers.
	const seededTag = turn.seeded
		? ' <span class="transcript-seeded" title="restored prior context — not part of the evaluated run">seeded</span>'
		: '';
	const parts: string[] = [
		`<div class="transcript-turn-header">Turn ${String(turnNum)}${seededTag}</div>`,
	];
	if (turn.userMessage) {
		parts.push(
			`<div class="transcript-line transcript-user"><span class="transcript-icon">👤</span><span class="transcript-text">${escapeHtml(turn.userMessage)}</span></div>`,
		);
	}
	for (const step of turn.steps) {
		const block = renderStep(step);
		if (block) parts.push(block);
	}
	return `<div class="transcript-turn${turn.seeded ? ' seeded' : ''}">${parts.join('')}</div>`;
}

function renderStep(step: TranscriptStep): string | null {
	if (step.kind === 'agent-text') {
		if (!step.text) return null;
		return `<div class="transcript-line transcript-assistant"><span class="transcript-icon">🤖</span><span class="transcript-text">${escapeHtml(step.text)}</span></div>`;
	}
	return renderInteraction(step);
}

function renderInteraction(interaction: ToolInteraction): string | null {
	switch (interaction.kind) {
		case 'plan': {
			if (interaction.tasks.length === 0) return null;
			const lines = interaction.tasks
				.map((t, i) => {
					const title = t.title ?? `Task ${String(i + 1)}`;
					const desc = t.description ? `: ${escapeHtml(t.description)}` : '';
					return `<li><strong>${escapeHtml(title)}</strong>${desc}</li>`;
				})
				.join('');
			const word = interaction.tasks.length === 1 ? 'task' : 'tasks';
			return `<details class="transcript-aside" open><summary>📋 plan (${String(interaction.tasks.length)} ${word})</summary><ul class="transcript-plan">${lines}</ul></details>`;
		}
		case 'ask-user': {
			if (interaction.questions.length === 0) return null;
			const answerByQId = new Map<string, string>();
			for (const a of interaction.answers ?? []) {
				const selected = a.selectedOptions.join(', ');
				// A skipped answer is a real response — surface it so it's not mistaken
				// for an unanswered question (mirrors the judge-text transcript).
				const text = a.skipped ? '(skipped)' : [selected, a.customText].filter(Boolean).join(' — ');
				if (text) answerByQId.set(a.questionId, text);
			}
			const lines = interaction.questions
				.map((q) => {
					const opts =
						q.options && q.options.length > 0
							? ` <em>(${q.options.map((o) => escapeHtml(o)).join(' / ')})</em>`
							: '';
					const answer = answerByQId.get(q.id);
					const answerHtml = answer
						? `<div class="transcript-answer">👤 ${escapeHtml(answer)}</div>`
						: '';
					return `<li>${escapeHtml(q.question)}${opts}${answerHtml}</li>`;
				})
				.join('');
			const summary =
				answerByQId.size > 0
					? '❓ ask-user (with answers)'
					: `❓ ask-user (${String(interaction.questions.length)} question${interaction.questions.length === 1 ? '' : 's'})`;
			return `<details class="transcript-aside" open><summary>${summary}</summary><ul class="transcript-questions">${lines}</ul></details>`;
		}
		case 'setup-wizard': {
			const skipped = interaction.skippedNodes;
			const needCreds = skipped.filter((s) => Boolean(s.credentialType)).length;
			const needParams = skipped.length - needCreds;
			const breakdown: string[] = [];
			if (needCreds > 0) breakdown.push(`${String(needCreds)} need credentials`);
			if (needParams > 0) breakdown.push(`${String(needParams)} need parameters`);
			const headerParts: string[] = [];
			if (interaction.completedNodes.length > 0) {
				headerParts.push(`${String(interaction.completedNodes.length)} configured`);
			}
			if (skipped.length > 0) {
				headerParts.push(
					`${String(skipped.length)} skipped${breakdown.length > 0 ? ` (${breakdown.join(', ')})` : ''}`,
				);
			}
			const header = headerParts.length > 0 ? headerParts.join(', ') : 'nothing to apply';

			const sections: string[] = [];
			if (interaction.completedNodes.length > 0) {
				const items = interaction.completedNodes
					.map((c) => {
						const params = c.parametersSet ? c.parametersSet.join(', ') : '';
						return `<li>${escapeHtml(c.nodeName)}${params ? ` — params: ${escapeHtml(params)}` : ''}</li>`;
					})
					.join('');
				sections.push(
					`<div class="transcript-section-label">configured (${String(interaction.completedNodes.length)})</div><ul class="transcript-plan">${items}</ul>`,
				);
			}
			if (skipped.length > 0) {
				const items = skipped
					.map(
						(s) =>
							`<li>${escapeHtml(s.nodeName)}${s.credentialType ? ` — needs <code>${escapeHtml(s.credentialType)}</code> credential` : ' — needs parameters'}</li>`,
					)
					.join('');
				sections.push(
					`<div class="transcript-section-label">skipped (${String(skipped.length)})</div><ul class="transcript-plan">${items}</ul>`,
				);
			}
			return `<details class="transcript-aside" open><summary>🛠 setup wizard — ${escapeHtml(header)}</summary>${sections.join('')}</details>`;
		}
		case 'setup-card': {
			if (interaction.requests.length === 0) return null;
			const asks = interaction.requests
				.map((r) => {
					const bits: string[] = [];
					if (r.credentialType) bits.push(`${escapeHtml(r.credentialType)} credential`);
					if (r.params && r.params.length > 0)
						bits.push(r.params.map((p) => escapeHtml(p)).join(', '));
					return bits.length > 0
						? `${escapeHtml(r.nodeName)} (${bits.join('; ')})`
						: escapeHtml(r.nodeName);
				})
				.join(', ');
			const filledList =
				interaction.filled && interaction.filled.length > 0
					? ` (${interaction.filled.map((p) => escapeHtml(p)).join(', ')})`
					: '';
			const outcome =
				interaction.outcome === 'filled'
					? `user filled it${filledList}`
					: interaction.outcome === 'skipped'
						? 'user skipped it'
						: interaction.outcome === 'declined'
							? 'user dismissed it'
							: 'no response';
			return `<div class="transcript-resume">🪪 <strong>Setup card</strong> — agent asked the user to configure: ${asks} → ${outcome}</div>`;
		}
		case 'confirmation': {
			const decisionTag =
				typeof interaction.approved === 'boolean'
					? ` <span class="transcript-decision ${interaction.approved ? 'pass' : 'fail'}">👤 ${interaction.approved ? 'approved' : 'rejected'}</span>`
					: '';
			const messageHtml = interaction.message
				? `<div class="transcript-answer">💬 ${escapeHtml(interaction.message)}</div>`
				: '';
			const feedbackHtml = interaction.feedback
				? `<div class="transcript-answer">👤 ${escapeHtml(interaction.feedback)}</div>`
				: '';
			return `<div class="transcript-resume">↪ resume <code>${escapeHtml(interaction.toolName)}</code>: ${escapeHtml(interaction.resumeReason)}${decisionTag}</div>${messageHtml}${feedbackHtml}`;
		}
		case 'tool-call': {
			const args = interaction.args;
			const hasArgs = Boolean(args && Object.keys(args).length > 0);
			const errorText = typeof interaction.error === 'string' ? interaction.error : '';
			const hasResult = interaction.result !== undefined && interaction.result !== null;
			const idTag = interaction.toolCallId
				? ` <span class="transcript-tool-id">${escapeHtml(interaction.toolCallId)}</span>`
				: '';
			// Surface load_skill's skillId inline so the loaded skill is visible without expanding args.
			const inlineArg =
				interaction.toolName === 'load_skill' && args && typeof args.skillId === 'string'
					? ` <span class="transcript-inline-arg">${escapeHtml(args.skillId)}</span>`
					: '';
			const title = `🔧 <code>${escapeHtml(interaction.toolName)}</code>${inlineArg}${idTag}`;
			if (!hasArgs && !errorText && !hasResult) {
				return `<div class="transcript-tools">${title}</div>`;
			}
			const argsBlock = hasArgs
				? `<div class="transcript-section-label">args</div><pre class="transcript-args">${escapeHtml(formatJson(args))}</pre>`
				: '';
			const outcomeBlock = errorText
				? `<div class="transcript-section-label">error</div><pre class="transcript-args transcript-error">${escapeHtml(errorText)}</pre>`
				: hasResult
					? `<div class="transcript-section-label">result</div><pre class="transcript-args">${escapeHtml(formatJson(interaction.result))}</pre>`
					: '';
			const badge = errorText ? ' <span class="transcript-decision fail">error</span>' : '';
			return `<details class="transcript-aside"${errorText ? ' open' : ''}><summary>${title}${badge}</summary>${argsBlock}${outcomeBlock}</details>`;
		}
	}
}

function formatJson(value: unknown): string {
	const MAX = 2000;
	if (typeof value === 'string') {
		return value.length > MAX
			? `${value.slice(0, MAX)}\n… (${String(value.length - MAX)} more chars)`
			: value;
	}
	let json: string | undefined;
	try {
		json = JSON.stringify(value, null, 2);
	} catch {
		return '[unserializable]';
	}
	if (typeof json !== 'string') return String(value);
	return json.length > MAX
		? `${json.slice(0, MAX)}\n… (${String(json.length - MAX)} more chars)`
		: json;
}

// ---------------------------------------------------------------------------
// Workflow check rubric
// ---------------------------------------------------------------------------

function dimensionLabel(d: CheckDimension): string {
	return d.replace(/_/g, ' ');
}

function renderDimensionGroup(dimension: CheckDimension, outcomes: CheckOutcome[]): string {
	const passed = outcomes.filter((o) => o.status === 'pass').length;
	const failed = outcomes.filter((o) => o.status === 'fail').length;
	const naCount = outcomes.filter((o) => o.status === 'n_a').length;
	const scored = passed + failed;
	const headerCounts = `${String(passed)}/${String(scored)}${naCount > 0 ? ` · ${String(naCount)} N/A` : ''}`;
	const headerClass = failed > 0 ? 'fail' : 'pass';

	const items = outcomes
		.map((o) => {
			const icon = o.status === 'pass' ? '&#10003;' : o.status === 'fail' ? '&#10007;' : '⌀';
			const kindTag = `<span class="check-kind check-kind-${o.kind}">${o.kind}</span>`;
			const comment = o.comment ? ` — ${escapeHtml(o.comment)}` : '';
			return `<li class="check ${o.status}"><span class="check-icon ${o.status}">${icon}</span> <code>${escapeHtml(o.name)}</code> ${kindTag}${comment}</li>`;
		})
		.join('');

	return `<div class="check-dimension"><div class="check-dimension-header"><strong>${escapeHtml(dimensionLabel(dimension))}</strong> <span class="${headerClass}">${headerCounts}</span></div><ul class="check-list">${items}</ul></div>`;
}

function renderWorkflowChecks(outcomes: CheckOutcome[] | undefined): string {
	if (!outcomes || outcomes.length === 0) return '';

	const totalPassed = outcomes.filter((o) => o.status === 'pass').length;
	const totalFailed = outcomes.filter((o) => o.status === 'fail').length;
	const totalNa = outcomes.filter((o) => o.status === 'n_a').length;
	const totalScored = totalPassed + totalFailed;
	const summary = `${String(totalPassed)}/${String(totalScored)} passed${totalNa > 0 ? ` · ${String(totalNa)} N/A` : ''}`;
	const summaryClass = totalFailed > 0 ? 'fail' : 'pass';
	const openAttr = totalFailed > 0 ? 'open' : '';

	const grouped = groupOutcomesByDimension(outcomes);
	const groups = CHECK_DIMENSIONS.filter((d) => grouped[d]?.length > 0)
		.map((d) => renderDimensionGroup(d, grouped[d]))
		.join('');

	return `<details class="section" ${openAttr}><summary>Workflow checks <span class="${summaryClass}">${summary}</span></summary>${groups}</details>`;
}

// ---------------------------------------------------------------------------
// Build expectations
// ---------------------------------------------------------------------------

function renderBuildExpectations(results: BuildExpectationResult[] | undefined): string {
	if (!results || results.length === 0) return '';
	// `incomplete` (no verdict) stays out of the pass/fail count — rendered neutrally.
	const passCount = results.filter((r) => r.pass && !r.incomplete).length;
	const failCount = results.filter((r) => !r.pass && !r.incomplete).length;
	const incompleteCount = results.filter((r) => r.incomplete).length;
	const scored = passCount + failCount;
	const statusClass = failCount > 0 ? 'fail' : 'pass';
	const openAttr = failCount > 0 ? 'open' : '';
	const summary = `${String(passCount)}/${String(scored)}${incompleteCount > 0 ? ` · ${String(incompleteCount)} no verdict` : ''}`;
	const items = results
		.map((r) => {
			const cls = r.incomplete ? 'n_a' : r.pass ? 'pass' : 'fail';
			const icon = r.incomplete ? '⌀' : r.pass ? '&#10003;' : '&#10007;';
			const judgment = r.reason
				? `<div class="expectation-judgment">${escapeHtml(r.reason)}</div>`
				: '';
			return `<li class="expectation ${cls}"><span class="check-icon ${cls}">${icon}</span><div class="expectation-body"><div class="expectation-text">${escapeHtml(r.expectation)}</div>${judgment}</div></li>`;
		})
		.join('');
	return `<details class="section" ${openAttr}><summary>Build expectations <span class="${statusClass}">${summary}</span></summary><ul class="check-list">${items}</ul></details>`;
}

// ---------------------------------------------------------------------------
// Workflow summary
// ---------------------------------------------------------------------------

function renderWorkflowSummary(result: WorkflowTestCaseResult): string {
	const firstEval = result.executionScenarioResults[0]?.evalResult;
	const edges = getWorkflowDiagramEdges(result);

	let nodesHtml = '';
	if (firstEval) {
		const nodes = Object.entries(firstEval.nodeResults);
		if (nodes.length > 0) {
			const nodeList = nodes
				.map(([name, nr]) => {
					const mode = nr.executionMode;
					const requests = nr.interceptedRequests.length;
					const issues = nr.configIssues ? Object.values(nr.configIssues).flat().join('; ') : '';
					let line = `<span class="node-mode-${mode}">[${mode}]</span> ${escapeHtml(name)}`;
					if (requests > 0) line += ` <span class="muted">(${String(requests)} req)</span>`;
					if (issues)
						line += ` <span class="build-issue">Build issue: ${escapeHtml(issues)}</span>`;
					return `<li>${line}</li>`;
				})
				.join('');
			nodesHtml = `<details class="section"><summary>Built workflow (${String(nodes.length)} nodes)</summary><ul class="node-list">${nodeList}</ul></details>`;
		}
	}

	const diagramHtml = renderWorkflowDiagram(result);
	const edgesHtml = renderWorkflowEdgeList(edges);

	let jsonHtml = '';
	if (result.workflowJson) {
		const raw = JSON.stringify(result.workflowJson, null, 2);
		jsonHtml = `<details class="section"><summary>Agent output (raw JSON)</summary><pre class="json-block"><code>${escapeHtml(raw)}</code></pre></details>`;
	}

	let traceHtml = '';
	if (result.buildTrace) {
		const nodeResearchCalls = result.buildTrace.toolCalls.filter(
			(call) => call.toolName === 'nodes',
		);
		const workflowWriteCalls = result.buildTrace.toolCalls.filter((call) =>
			['build-workflow', 'submit-workflow', 'build-workflow-with-agent'].includes(call.toolName),
		);
		const validationCalls = result.buildTrace.toolCalls.filter(
			(call) => call.toolName === 'submit-workflow',
		);
		const credentialCalls = result.buildTrace.toolCalls.filter(
			(call) => call.toolName === 'credentials',
		);
		const verificationCalls = result.buildTrace.toolCalls.filter(
			(call) => call.toolName === 'verify-built-workflow',
		);
		const completionActivity = [...result.buildTrace.agentActivities]
			.reverse()
			.find((activity) => activity.status !== 'running');

		const summary = {
			nodeResearchCalls: nodeResearchCalls.map((call) => call.args),
			workflowWriteCalls: workflowWriteCalls.map((call) => ({
				toolName: call.toolName,
				args: call.args,
				result: call.result,
				error: call.error,
			})),
			validationCalls: validationCalls.map((call) => ({
				args: call.args,
				result: call.result,
				error: call.error,
			})),
			credentialCalls: credentialCalls.map((call) => ({
				args: call.args,
				result: call.result,
				error: call.error,
			})),
			verificationCalls: verificationCalls.map((call) => ({
				args: call.args,
				result: call.result,
				error: call.error,
			})),
			completionActivity: completionActivity
				? {
						role: completionActivity.role,
						status: completionActivity.status,
						textContent: completionActivity.textContent,
					}
				: null,
		};

		traceHtml =
			`<details class="section"><summary>Builder trace summary</summary><pre class="json-block"><code>${escapeHtml(JSON.stringify(summary, null, 2))}</code></pre></details>` +
			`<details class="section"><summary>Builder tool calls (raw)</summary><pre class="json-block"><code>${escapeHtml(JSON.stringify(result.buildTrace.toolCalls, null, 2))}</code></pre></details>` +
			`<details class="section"><summary>Builder agent activity (raw)</summary><pre class="json-block"><code>${escapeHtml(JSON.stringify(result.buildTrace.agentActivities, null, 2))}</code></pre></details>`;
	}

	return nodesHtml + diagramHtml + edgesHtml + jsonHtml + traceHtml;
}

// ---------------------------------------------------------------------------
// Test case rendering
// ---------------------------------------------------------------------------

function renderTestCase(result: WorkflowTestCaseResult, tcIndex: number): string {
	// Pass rate counts scenarios AND build expectations as units (incomplete expectations excluded).
	const scoredExpectations = (result.buildExpectationResults ?? []).filter((e) => !e.incomplete);
	const passCount =
		result.executionScenarioResults.filter((sr) => sr.success).length +
		scoredExpectations.filter((e) => e.pass).length;
	const totalCount = result.executionScenarioResults.length + scoredExpectations.length;
	const allPass = passCount === totalCount && totalCount > 0;
	const statusClass = result.workflowBuildSuccess ? (allPass ? 'pass' : 'mixed') : 'fail';

	const buildBadge = result.workflowBuildSuccess
		? '<span class="badge badge-pass">BUILT</span>'
		: '<span class="badge badge-fail">BUILD FAILED</span>';

	const scoreBadge =
		totalCount > 0
			? `<span class="badge badge-${allPass ? 'pass' : 'fail'}">${String(passCount)}/${String(totalCount)}</span>`
			: '';

	const prompt = caseDisplayPrompt(result.testCase, result.transcript);
	const truncatedPrompt = prompt.length > 100 ? prompt.slice(0, 100) + '...' : prompt;
	// Header label = the source-file slug (the same identifier the PR comment
	// uses), falling back to the description then the prompt. The full prompt
	// stays in the expandable "Prompt" section below.
	// flattenRunsForReport prefixes the prompt with "[iter N/M] " so multi-run cards stay
	// distinguishable; carry that marker onto the slug/description header too.
	const iterPrefix = /^\[iter \d+\/\d+\]\s*/.exec(prompt)?.[0] ?? '';
	const headerLabel =
		iterPrefix + (result.fileSlug ?? result.testCase.description ?? truncatedPrompt);

	// Inline indicators for quick triage without expanding — scenarios and expectations as units.
	const scenarioIndicators = [
		...result.executionScenarioResults.map(
			(sr) =>
				`<span class="scenario-indicator ${sr.success ? 'pass' : 'fail'}" title="${escapeHtml(sr.scenario.name)}">${sr.success ? '✓' : '✗'} scenario: ${escapeHtml(sr.scenario.name)}</span>`,
		),
		...(result.buildExpectationResults ?? []).map((e) => {
			const cls = e.incomplete ? 'na' : e.pass ? 'pass' : 'fail';
			const icon = e.incomplete ? '⌀' : e.pass ? '✓' : '✗';
			return `<span class="scenario-indicator ${cls}" title="${escapeHtml(e.expectation)}">${icon} expectation: ${escapeHtml(e.expectation)}</span>`;
		}),
	].join(' ');

	let scenariosHtml = '';
	if (result.executionScenarioResults.length > 0) {
		scenariosHtml = result.executionScenarioResults
			.map((sr, i) => renderScenario(sr, tcIndex * 100 + i, result))
			.join('');
	} else if (!result.workflowBuildSuccess) {
		const errorDetail = result.buildError
			? `<div class="error-box">${escapeHtml(result.buildError)}</div>`
			: '';
		scenariosHtml = `<div class="muted">Workflow failed to build — no scenarios executed</div>${errorDetail}`;
	}

	const workflowLink =
		result.workflowId && result.n8nBaseUrl
			? `<a class="workflow-link" href="${workflowUrl(result.n8nBaseUrl, result.workflowId)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">open in n8n →</a>`
			: '';

	const llmDebugLink =
		(result.runDebug?.length ?? 0) > 0
			? `<a class="workflow-link" href="workflow-eval-llm-debug.html#${escapeHtml(getTestCaseAnchorId(result, tcIndex))}" onclick="event.stopPropagation()">LLM steps →</a>`
			: '';

	return `<div class="test-case ${statusClass}">
		<div class="test-case-header" onclick="this.parentElement.classList.toggle('expanded')">
			<div class="test-case-title">
				${buildBadge} ${scoreBadge}
				<span class="test-case-prompt">${escapeHtml(headerLabel)}</span>
			</div>
			<div class="test-case-meta">
				<span class="badge badge-tag">${escapeHtml(result.testCase.complexity)}</span>
				${result.threadId ? `<span class="workflow-id" title="thread id — open in the UI">🧵 ${escapeHtml(result.threadId)}</span>` : ''}
				${result.workflowId ? `<span class="workflow-id">${escapeHtml(result.workflowId)}</span>` : ''}
				${workflowLink}
				${llmDebugLink}
			</div>
			<div class="scenario-indicators">${scenarioIndicators}</div>
		</div>
		<div class="test-case-detail">
			<details class="section"><summary>Prompt</summary><div class="prompt-text">${escapeHtml(prompt)}</div></details>
			${renderConversationMetrics(result.conversationMetrics)}
			${renderConversationTranscript(result.transcript)}
			${renderBuildExpectations(result.buildExpectationResults)}
			${renderWorkflowChecks(result.workflowChecks)}
			${renderWorkflowSummary(result)}
			${scenariosHtml}
		</div>
	</div>`;
}

// ---------------------------------------------------------------------------
// Full report
// ---------------------------------------------------------------------------

export function generateWorkflowReport(results: WorkflowTestCaseResult[]): string {
	const totalTestCases = results.length;
	const builtCount = results.filter((r) => r.workflowBuildSuccess).length;
	const allScenarios = results.flatMap((r) => r.executionScenarioResults);
	const passCount = allScenarios.filter((sr) => sr.success).length;
	const failCount = allScenarios.length - passCount;
	const totalScenarios = allScenarios.length;
	const passRate = totalScenarios > 0 ? Math.round((passCount / totalScenarios) * 100) : 0;

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Workflow evaluation report</title>
<style>
	:root {
		--bg-primary: #0d1117;
		--bg-secondary: #161b22;
		--bg-tertiary: #1c2129;
		--border: #30363d;
		--border-light: #21262d;
		--text-primary: #f0f6fc;
		--text-secondary: #c9d1d9;
		--text-muted: #8b949e;
		--color-pass: #3fb950;
		--color-fail: #f85149;
		--color-warn: #d29922;
		--color-info: #58a6ff;
		--color-purple: #bc8cff;
		--color-pass-bg: #23863622;
		--color-fail-bg: #da363322;
		--color-warn-bg: #d2992222;
	}

	* { margin: 0; padding: 0; box-sizing: border-box; }
	body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg-primary); color: var(--text-secondary); padding: 24px; max-width: 1400px; margin: 0 auto; font-size: 14px; line-height: 1.5; }

	/* Header */
	h1 { color: var(--text-primary); font-size: 20px; margin-bottom: 2px; }
	.subtitle { color: var(--text-muted); font-size: 13px; margin-bottom: 20px; }

	/* Dashboard */
	.dashboard { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; align-items: stretch; }
	.stat-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; padding: 14px 20px; min-width: 120px; }
	.stat-card .label { color: var(--text-muted); font-size: 12px; }
	.stat-card .value { color: var(--text-primary); font-size: 26px; font-weight: 700; margin-top: 2px; }
	.stat-card .value.pass { color: var(--color-pass); }
	.stat-card .value.fail { color: var(--color-fail); }
	.stat-card .value.mixed { color: var(--color-warn); }

	/* Toolbar */
	.toolbar { display: flex; gap: 8px; margin-bottom: 16px; }
	.toolbar button { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 6px; color: var(--text-secondary); padding: 6px 12px; font-size: 12px; cursor: pointer; }
	.toolbar button:hover { background: var(--bg-tertiary); color: var(--text-primary); }
	.toolbar button.active { border-color: var(--color-info); color: var(--color-info); }

	/* Badges */
	.badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; margin-right: 4px; }
	.badge-pass { background: var(--color-pass-bg); color: var(--color-pass); }
	.badge-fail { background: var(--color-fail-bg); color: var(--color-fail); }
	.badge-tag { background: var(--border); color: var(--text-muted); }

	/* Test case cards */
	.test-case { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 10px; overflow: hidden; }
	.test-case.pass { border-left: 3px solid var(--color-pass); }
	.test-case.fail { border-left: 3px solid var(--color-fail); }
	.test-case.mixed { border-left: 3px solid var(--color-warn); }
	.test-case-header { padding: 12px 16px; cursor: pointer; }
	.test-case-header:hover { background: var(--bg-tertiary); }
	.test-case-title { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
	.test-case-prompt { color: var(--text-primary); font-weight: 500; font-size: 13px; }
	.test-case-meta { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
	.workflow-id { color: var(--text-muted); font-size: 11px; font-family: monospace; }
	.scenario-indicators { display: flex; flex-direction: column; gap: 3px; }
	.scenario-indicator { font-size: 11px; font-family: monospace; }
	.scenario-indicator.pass { color: var(--color-pass); }
	.scenario-indicator.fail { color: var(--color-fail); }
	.scenario-indicator.na { color: #8b949e; }
	.test-case-detail { display: none; padding: 0 16px 16px; }
	.test-case.expanded .test-case-detail { display: block; }

	/* Sections (collapsible) */
	.section { margin: 8px 0; }
	.section > summary { cursor: pointer; color: var(--color-info); font-size: 12px; font-weight: 600; padding: 4px 0; }
	.section > summary:hover { text-decoration: underline; }

	/* Scenarios */
	.scenario { border: 1px solid var(--border-light); border-radius: 6px; margin-bottom: 6px; overflow: hidden; }
	.scenario-header { padding: 8px 12px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 13px; }
	.scenario-header:hover { background: var(--bg-tertiary); }
	.scenario-icon { font-weight: bold; font-size: 14px; min-width: 16px; }
	.scenario-icon.pass { color: var(--color-pass); }
	.scenario-icon.fail { color: var(--color-fail); }
	.scenario-name { color: var(--text-primary); font-weight: 600; }
	.scenario-desc { color: var(--text-muted); font-size: 12px; }
	.scenario-summary-inline { color: var(--text-muted); font-size: 12px; flex: 1; }
	.scenario-detail { display: none; padding: 10px 12px; border-top: 1px solid var(--border-light); background: var(--bg-primary); }
	.scenario.expanded .scenario-detail { display: block; }

	.execution-link, .workflow-link { color: var(--color-info); font-size: 11px; text-decoration: none; margin-left: auto; padding: 2px 6px; border-radius: 4px; }
	.execution-link:hover, .workflow-link:hover { background: var(--bg-tertiary); text-decoration: underline; }

	/* Workflow check rubric (per built workflow) */
	.check-dimension { margin: 8px 0 12px; }
	.check-dimension-header { font-size: 12px; padding: 2px 0; text-transform: capitalize; color: var(--text-secondary); }
	.check-list { list-style: none; padding: 2px 0 2px 10px; margin: 2px 0; font-size: 12px; }
	.check { padding: 3px 0; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; line-height: 1.5; }
	.check code { background: var(--bg-tertiary); color: var(--text-primary); padding: 1px 6px; border-radius: 3px; font-size: 11px; }
	.check-icon { font-weight: bold; font-size: 13px; min-width: 14px; }
	.check-icon.pass { color: var(--color-pass); }
	.check-icon.fail { color: var(--color-fail); }
	.check-icon.n_a { color: var(--text-muted); }
	.check.n_a code { color: var(--text-muted); }
	.check-kind { color: var(--text-muted); font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
	.check-kind-llm { color: var(--color-purple); }
	.expectation { padding: 5px 0; display: flex; align-items: baseline; gap: 8px; list-style: none; line-height: 1.5; }
	.expectation-text { font-size: 12px; }
	.expectation-judgment { color: var(--text-muted); font-size: 12px; margin-top: 2px; }

	/* Error and warning boxes */
	.error-box { color: var(--color-fail); font-size: 12px; padding: 6px 10px; background: var(--color-fail-bg); border-radius: 4px; margin-bottom: 8px; border-left: 3px solid var(--color-fail); }
	.warning-box { color: var(--color-warn); font-size: 12px; padding: 6px 10px; background: var(--color-warn-bg); border-radius: 4px; margin-bottom: 8px; border-left: 3px solid var(--color-warn); }
	.warning-inline { color: var(--color-warn); font-size: 11px; margin: 4px 0; }
	.build-issue { color: var(--color-warn); font-size: 11px; display: block; margin-top: 2px; }

	/* Diagnosis */
	.diagnosis { color: var(--text-secondary); font-size: 12px; line-height: 1.6; padding: 6px 0; }

	/* Prompt */
	.prompt-text { color: var(--text-secondary); font-size: 13px; line-height: 1.6; padding: 10px; background: var(--bg-primary); border: 1px solid var(--border); border-radius: 6px; white-space: pre-wrap; }
	.review-prompt { margin-top: 8px; }

	/* Scenario review lane */
	.review-shell { margin: 8px 0 14px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-secondary); overflow: hidden; }
	.review-overview { display: flex; flex-wrap: wrap; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--border-light); background: var(--bg-primary); }
	.review-overview-chip { display: inline-flex; align-items: center; min-height: 24px; padding: 0 10px; border: 1px solid var(--border); border-radius: 999px; color: var(--text-secondary); font-size: 11px; font-weight: 600; }
	.review-overview-chip.pass { border-color: #238636; color: var(--color-pass); background: var(--color-pass-bg); }
	.review-overview-chip.fail { border-color: #da3633; color: var(--color-fail); background: var(--color-fail-bg); }
	.review-grid { display: grid; grid-template-columns: 1fr; }
	.review-stage { padding: 12px; border-top: 1px solid var(--border-light); border-left: 4px solid var(--border); background: var(--bg-secondary); }
	.review-stage:first-child { border-top: 0; }
	.review-stage.pass { border-left-color: var(--color-pass); }
	.review-stage.fail { border-left-color: var(--color-fail); }
	.review-stage-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
	.review-stage-heading { display: flex; align-items: center; gap: 8px; min-width: 0; }
	.review-stage-label { color: var(--text-primary); font-size: 12px; font-weight: 700; }
	.review-status-dot { width: 10px; height: 10px; border-radius: 50%; flex: 0 0 auto; }
	.review-status-dot.pass { background: var(--color-pass); box-shadow: 0 0 0 3px var(--color-pass-bg); }
	.review-status-dot.fail { background: var(--color-fail); box-shadow: 0 0 0 3px var(--color-fail-bg); }
	.review-status-pill { display: inline-flex; align-items: center; min-height: 22px; padding: 0 8px; border-radius: 999px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0; }
	.review-status-pill.pass { background: var(--color-pass-bg); color: var(--color-pass); }
	.review-status-pill.fail { background: var(--color-fail-bg); color: var(--color-fail); }
	.review-stage-reason { color: var(--text-secondary); font-size: 12px; line-height: 1.6; margin-bottom: 4px; }
	.review-stage-body { margin-top: 6px; }
	.review-subsection { padding-top: 4px; }
	.review-list { margin: 6px 0 0 18px; color: var(--text-secondary); font-size: 12px; line-height: 1.6; }
	.review-list li { margin: 2px 0; }
	.prompt-improvement { padding: 12px; border-top: 1px solid var(--border-light); background: #151d18; border-left: 4px solid var(--color-warn); }
	.prompt-improvement-label { color: var(--color-warn); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0; margin-bottom: 4px; }
	.prompt-improvement-copy { color: var(--text-secondary); font-size: 12px; line-height: 1.6; }

	/* Execution trace */
	.trace-legend { font-size: 11px; margin-bottom: 8px; display: flex; gap: 12px; }
	.trace-node { border: 1px solid var(--border-light); border-radius: 4px; margin-bottom: 6px; padding: 8px; }
	.trace-node-header { font-size: 12px; font-family: monospace; margin-bottom: 4px; }
	.request-count { color: var(--text-muted); font-size: 11px; }

	/* Request/response pairs */
	.request-pair { border: 1px solid var(--border-light); border-radius: 4px; margin: 6px 0; overflow: hidden; }
	.request-header { background: #1c3a5e; color: var(--color-info); font-size: 10px; font-weight: 700; padding: 3px 8px; letter-spacing: 0.5px; }
	.response-header { background: #2a1f3e; color: var(--color-purple); font-size: 10px; font-weight: 700; padding: 3px 8px; letter-spacing: 0.5px; }
	.request-method { font-size: 11px; color: var(--text-primary); padding: 4px 8px; font-family: monospace; font-weight: 600; background: var(--bg-primary); }

	/* JSON blocks */
	.json-block { font-size: 11px; margin: 4px 0; padding: 8px; background: var(--bg-secondary); border: 1px solid var(--border-light); border-radius: 4px; overflow-x: auto; }
	.json-sm { font-size: 10px; }
	pre { overflow-x: auto; margin: 0; }
	code { color: var(--text-secondary); }

	/* Node list */
	.node-list { list-style: none; padding: 4px 0; font-size: 12px; font-family: monospace; }
	.node-list li { padding: 3px 0; }
	.edge-list { list-style: none; padding: 4px 0; font-size: 12px; }
	.edge-list li { padding: 4px 0; }
	.node-mode-mocked { color: var(--color-info); font-weight: 600; }
	.node-mode-pinned { color: var(--color-warn); font-weight: 600; }
	.node-mode-real { color: var(--color-pass); font-weight: 600; }

	/* Workflow diagram */
	.workflow-diagram-shell { margin-top: 8px; padding: 8px; overflow: auto; background: var(--bg-primary); border: 1px solid var(--border); border-radius: 6px; }
	.workflow-diagram-svg { display: block; width: 100%; min-width: 720px; height: auto; }
	.diagram-edge-path { fill: none; stroke: var(--border); stroke-width: 2; }
	.diagram-edge-label { fill: var(--text-muted); font-size: 10px; font-family: monospace; }
	.diagram-arrow-head { fill: var(--border); }
	.diagram-node-box { fill: var(--bg-secondary); stroke: var(--border); stroke-width: 2; }
	.diagram-node-name { fill: var(--text-primary); font-size: 12px; font-weight: 600; }
	.diagram-node-type { fill: var(--text-muted); font-size: 10px; font-family: monospace; }
	.diagram-node-real .diagram-node-box { stroke: var(--color-pass); }
	.diagram-node-mocked .diagram-node-box { stroke: var(--color-info); }
	.diagram-node-pinned .diagram-node-box { stroke: var(--color-warn); }
	.diagram-node-disabled .diagram-node-box { stroke: var(--text-muted); stroke-dasharray: 5 3; }

	/* Node output toggle */
	.node-output-toggle { margin: 4px 0; }
	.node-output-toggle > summary { cursor: pointer; color: var(--text-muted); font-size: 11px; }

	/* Node hint */
	.node-hint { margin: 2px 0; }
	.node-hint > summary { cursor: pointer; color: var(--text-secondary); font-size: 11px; font-family: monospace; }
	.hint-text { color: var(--text-muted); font-size: 11px; padding: 4px 0; line-height: 1.5; }
	.subsection-label { color: var(--text-primary); font-size: 11px; font-weight: 600; margin-top: 8px; margin-bottom: 2px; }

	/* Category badges */
	.category-badge { font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 4px; margin-bottom: 8px; }
	.category-warn { background: var(--color-warn-bg); color: var(--color-warn); border-left: 3px solid var(--color-warn); }
	.category-fail { background: var(--color-fail-bg); color: var(--color-fail); border-left: 3px solid var(--color-fail); }
	.category-info { background: #1c3a5e33; color: var(--color-info); border-left: 3px solid var(--color-info); }

	/* Utilities */
	.muted { color: var(--text-muted); font-size: 12px; }

		/* Conversation metrics */
		.conv-summary { color: var(--text-secondary); font-size: 12px; padding: 6px 0; }
		.conv-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 6px; }
	.conv-table th, .conv-table td { text-align: left; padding: 4px 8px; border-bottom: 1px solid var(--border-light); }
	.conv-table th { color: var(--text-muted); font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
	.conv-table td { font-family: monospace; }
	.turn-status-ok { color: var(--color-pass); }
	.turn-status-fail { color: var(--color-fail); }
	.turn-status-pending { color: var(--text-muted); }

	/* Conversation transcript */
	.transcript { padding: 4px 0; }
	.transcript-turn { padding: 8px 0; border-bottom: 1px dashed var(--border-light); }
	.transcript-turn:last-child { border-bottom: none; }
	.transcript-turn-header { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 6px; }
	.transcript-turn.seeded { border-left: 2px solid var(--border-light); padding-left: 10px; }
	.transcript-seeded { text-transform: none; letter-spacing: 0; color: var(--text-muted); border: 1px solid var(--border-light); border-radius: 3px; padding: 0 5px; margin-left: 6px; }
	.transcript-line { display: flex; gap: 8px; padding: 4px 0; align-items: flex-start; font-size: 13px; line-height: 1.5; }
	.transcript-icon { width: 18px; text-align: center; flex-shrink: 0; }
	.transcript-text { color: var(--text-primary); white-space: pre-wrap; }
	.transcript-user .transcript-text { color: var(--text-primary); }
	.transcript-assistant .transcript-text { color: var(--text-secondary); }
	.transcript-internal > summary { cursor: pointer; padding: 4px 0; font-size: 12px; color: var(--text-muted); display: flex; gap: 8px; align-items: flex-start; }
	.transcript-internal > summary:hover { color: var(--text-secondary); }
	.transcript-internal .transcript-text { color: var(--text-muted); font-style: italic; }
	.transcript-aside { margin: 4px 0 4px 26px; }
	.transcript-aside > summary { cursor: pointer; color: var(--text-muted); font-size: 11px; padding: 2px 0; }
	.transcript-reasoning { color: var(--text-muted); font-size: 12px; line-height: 1.5; padding: 6px 8px; background: var(--bg-primary); border-left: 2px solid var(--border); border-radius: 2px; white-space: pre-wrap; margin-top: 4px; }
	.transcript-tools { color: var(--text-muted); font-size: 11px; font-family: monospace; padding: 4px 0 0 26px; }
	.transcript-args { margin: 4px 0 4px 26px; padding: 6px 8px; font-size: 11px; font-family: monospace; line-height: 1.45; color: var(--text-secondary); background: var(--bg-primary); border-left: 2px solid var(--border); border-radius: 2px; white-space: pre-wrap; word-break: break-word; max-height: 280px; overflow: auto; }
	.transcript-args.transcript-error { color: var(--color-fail); border-left-color: var(--color-fail); }
	.transcript-tool-id { color: var(--text-muted); font-size: 10px; font-family: monospace; opacity: 0.7; }
	.transcript-inline-arg { color: var(--text-muted); font-size: 11px; font-family: monospace; }
	.transcript-plan, .transcript-questions { margin: 4px 0 4px 18px; padding: 0; font-size: 12px; line-height: 1.5; color: var(--text-primary); }
	.transcript-plan li, .transcript-questions li { margin: 4px 0; }
	.transcript-answer { color: var(--text-secondary); font-size: 12px; margin: 2px 0 6px 16px; padding: 2px 0; }
	.transcript-resume { font-size: 11px; font-family: monospace; color: var(--text-muted); padding: 2px 0 2px 26px; }
	.transcript-decision { font-weight: 600; }
	.transcript-decision.pass { color: var(--color-pass); }
	.transcript-decision.fail { color: var(--color-fail); }
	.transcript-resume code { background: var(--bg-tertiary); padding: 0 4px; border-radius: 2px; }
	.transcript-section-label { font-size: 11px; color: var(--text-muted); margin: 6px 0 2px 18px; text-transform: uppercase; letter-spacing: 0.04em; }
	.transcript-empty { font-size: 12px; color: var(--text-muted); font-style: italic; margin: 4px 0 4px 18px; }

		@media (min-width: 960px) {
			.review-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
			.review-stage:nth-child(2) { border-top: 0; }
			.review-stage:nth-child(odd) { border-right: 1px solid var(--border-light); }
		}
	</style>
</head>
<body>

<h1>Workflow evaluation report</h1>
<p class="subtitle">Generated ${new Date().toLocaleString()} &mdash; ${String(totalScenarios)} scenarios across ${String(totalTestCases)} test cases</p>

<div class="dashboard">
	<div class="stat-card">
		<div class="label">Pass rate</div>
		<div class="value${passRate >= 80 ? ' pass' : passRate >= 50 ? ' mixed' : ' fail'}">${String(passRate)}%</div>
	</div>
	<div class="stat-card">
		<div class="label">Passed</div>
		<div class="value pass">${String(passCount)}</div>
	</div>
	<div class="stat-card">
		<div class="label">Failed</div>
		<div class="value${failCount > 0 ? ' fail' : ''}">${String(failCount)}</div>
	</div>
	<div class="stat-card">
		<div class="label">Built</div>
		<div class="value${builtCount === totalTestCases ? ' pass' : ' mixed'}">${String(builtCount)}/${String(totalTestCases)}</div>
	</div>
</div>

<div class="toolbar">
	<button onclick="document.querySelectorAll('.test-case').forEach(e => e.classList.add('expanded'))">Expand all</button>
	<button onclick="document.querySelectorAll('.test-case').forEach(e => e.classList.remove('expanded'))">Collapse all</button>
	<button onclick="document.querySelectorAll('.test-case').forEach(e => { e.style.display = e.classList.contains('pass') ? 'none' : '' }); this.classList.toggle('active')">Show failures only</button>
</div>

${results.map((r, i) => renderTestCase(r, i)).join('')}

</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Write report to disk
// ---------------------------------------------------------------------------

export function writeWorkflowReport(results: WorkflowTestCaseResult[]): string {
	const reportDir = path.join(__dirname, '..', '..', '.data');
	if (!fs.existsSync(reportDir)) {
		fs.mkdirSync(reportDir, { recursive: true });
	}
	const html = generateWorkflowReport(results);
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
	const reportPath = path.join(reportDir, `workflow-eval-${timestamp}.html`);
	fs.writeFileSync(reportPath, html);

	// Also write to the stable filename for quick access
	fs.writeFileSync(path.join(reportDir, 'workflow-eval-report.html'), html);

	return reportPath;
}
