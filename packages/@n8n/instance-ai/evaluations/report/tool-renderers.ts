/**
 * Per-tool transcript renderers.
 *
 * The HTML transcript surfaces what each tool *did* in a turn — plan items,
 * ask-user questions and answers, confirmation resume outcomes — rather than
 * just listing tool names. To add a new tool surface, write a `tryRender*`
 * function below and register it in TOOL_RENDERERS. Each renderer returns an
 * HTML string when it claims the node, or `null` to pass on it.
 */

import type { TraceNode } from '../types';
import { isRecord } from '../utils/safe-extract';

export interface ToolRenderContext {
	escapeHtml: (str: string) => string;
}

type ToolRenderer = (node: TraceNode, ctx: ToolRenderContext) => string | null;

// Order matters: specific renderers run before the generic confirmation-resume
// fallback, so a setup/domain/resource/credential resume gets its richer block
// instead of the bare "↪ resume X: approval" line.
const TOOL_RENDERERS: ToolRenderer[] = [
	tryRenderAskUser,
	tryRenderPlan,
	tryRenderSetupWorkflowApply,
	tryRenderDomainAccess,
	tryRenderResourceDecision,
	tryRenderCredentialSelection,
	tryRenderConfirmationResume,
];

/**
 * Walk the renderer list and return the first HTML block produced for `node`.
 * Returns `null` if no renderer claims the node — the caller can ignore it or
 * fall back to a generic tool-name display.
 */
export function tryRenderToolDetail(node: TraceNode, ctx: ToolRenderContext): string | null {
	if (node.runType !== 'tool') return null;
	for (const renderer of TOOL_RENDERERS) {
		const block = renderer(node, ctx);
		if (block) return block;
	}
	return null;
}

export function isAskUserNode(node: TraceNode): boolean {
	return (
		node.name === 'tool:ask-user' ||
		node.name === 'ask-user' ||
		node.name === 'tool:ask-user:resume'
	);
}

export function isResumeNode(node: TraceNode): boolean {
	return node.name.endsWith(':resume');
}

// ---------------------------------------------------------------------------
// Individual tool renderers
// ---------------------------------------------------------------------------

function tryRenderPlan(node: TraceNode, ctx: ToolRenderContext): string | null {
	if (node.name !== 'tool:plan' && node.name !== 'plan') return null;
	const inputs = unwrapInput(node.inputs);
	const items = isRecord(inputs) && Array.isArray(inputs.tasks) ? inputs.tasks : null;
	if (!items || items.length === 0) return null;
	const lines = items
		.filter(isRecord)
		.map((item, i) => {
			const title = typeof item.title === 'string' ? item.title : `Task ${String(i + 1)}`;
			const desc = typeof item.description === 'string' ? item.description : '';
			return `<li><strong>${ctx.escapeHtml(title)}</strong>${desc ? `: ${ctx.escapeHtml(desc)}` : ''}</li>`;
		})
		.join('');
	const taskWord = items.length === 1 ? 'task' : 'tasks';
	return `<details class="transcript-aside" open><summary>📋 plan (${String(items.length)} ${taskWord})</summary><ul class="transcript-plan">${lines}</ul></details>`;
}

function tryRenderAskUser(node: TraceNode, ctx: ToolRenderContext): string | null {
	if (!isAskUserNode(node)) return null;
	const inputs = unwrapInput(node.inputs);
	const questions = isRecord(inputs) && Array.isArray(inputs.questions) ? inputs.questions : null;
	if (!questions || questions.length === 0) return null;

	const answersByQId = collectAskUserAnswers(node.outputs);

	const lines = questions
		.filter(isRecord)
		.map((q) => {
			const text = typeof q.question === 'string' ? q.question : '(no text)';
			const qId = typeof q.id === 'string' ? q.id : undefined;
			const opts = Array.isArray(q.options) ? q.options.filter((o) => typeof o === 'string') : [];
			const optList =
				opts.length > 0
					? ` <em>(${opts.map((o) => ctx.escapeHtml(String(o))).join(' / ')})</em>`
					: '';
			const answer = qId ? answersByQId.get(qId) : undefined;
			const answerHtml = answer
				? `<div class="transcript-answer">👤 ${ctx.escapeHtml(answer)}</div>`
				: '';
			return `<li>${ctx.escapeHtml(text)}${optList}${answerHtml}</li>`;
		})
		.join('');
	const summary =
		answersByQId.size > 0
			? '❓ ask-user (with answers)'
			: `❓ ask-user (${String(questions.length)} question${questions.length === 1 ? '' : 's'})`;
	return `<details class="transcript-aside" open><summary>${summary}</summary><ul class="transcript-questions">${lines}</ul></details>`;
}

function tryRenderConfirmationResume(node: TraceNode, ctx: ToolRenderContext): string | null {
	if (!isRecord(node.metadata)) return null;
	if (node.metadata.phase !== 'resume') return null;
	const resumeReason = node.metadata.resume_reason;
	if (typeof resumeReason !== 'string') return null;

	const rawName = node.metadata.tool_name;
	const toolName = typeof rawName === 'string' && rawName.length > 0 ? rawName : node.name;
	const approved = node.metadata.approved;
	const decisionTag =
		typeof approved === 'boolean' ? ` <em>(${approved ? 'approved' : 'rejected'})</em>` : '';
	return `<div class="transcript-resume">↪ resume <code>${ctx.escapeHtml(toolName)}</code>: ${ctx.escapeHtml(resumeReason)}${decisionTag}</div>`;
}

/**
 * Surface setupWorkflowApply outcomes: which nodes got configured by the
 * proxy's "apply setup" response and which still need credentials.
 */
function tryRenderSetupWorkflowApply(node: TraceNode, ctx: ToolRenderContext): string | null {
	if (!isResumeNode(node)) return null;
	const meta = isRecord(node.metadata) ? node.metadata : {};
	if (meta.tool_name !== 'workflows') return null;
	const input = unwrapInput(node.inputs);
	if (!isRecord(input) || input.action !== 'setup') return null;

	const outputs = isRecord(node.outputs) ? node.outputs : {};
	const completed = Array.isArray(outputs.completedNodes) ? outputs.completedNodes : [];
	const skipped = Array.isArray(outputs.skippedNodes) ? outputs.skippedNodes : [];

	// Bucket skipped reasons: a node with credentialType needs auth setup; one
	// without needs parameter input the proxy didn't provide.
	const skippedRecords = skipped.filter(isRecord);
	const needCredentials = skippedRecords.filter((s) => typeof s.credentialType === 'string').length;
	const needParameters = skippedRecords.length - needCredentials;

	const skipBreakdown: string[] = [];
	if (needCredentials > 0) skipBreakdown.push(`${String(needCredentials)} need credentials`);
	if (needParameters > 0) skipBreakdown.push(`${String(needParameters)} need parameters`);

	const headerParts: string[] = [];
	if (completed.length > 0) headerParts.push(`${String(completed.length)} configured`);
	if (skippedRecords.length > 0) {
		headerParts.push(
			`${String(skippedRecords.length)} skipped${skipBreakdown.length > 0 ? ` (${skipBreakdown.join(', ')})` : ''}`,
		);
	}
	const header = headerParts.length > 0 ? headerParts.join(', ') : 'nothing to apply';

	const sections: string[] = [];
	if (completed.length > 0) {
		const items = completed
			.filter(isRecord)
			.map((c) => {
				const name = typeof c.nodeName === 'string' ? c.nodeName : '(unknown)';
				const params = Array.isArray(c.parametersSet)
					? c.parametersSet.filter((p) => typeof p === 'string').join(', ')
					: '';
				return `<li>${ctx.escapeHtml(name)}${params ? ` — params: ${ctx.escapeHtml(params)}` : ''}</li>`;
			})
			.join('');
		sections.push(
			`<div class="transcript-section-label">configured (${String(completed.length)})</div><ul class="transcript-plan">${items}</ul>`,
		);
	}
	if (skippedRecords.length > 0) {
		const items = skippedRecords
			.map((s) => {
				const name = typeof s.nodeName === 'string' ? s.nodeName : '(unknown)';
				const cred = typeof s.credentialType === 'string' ? s.credentialType : '';
				return `<li>${ctx.escapeHtml(name)}${cred ? ` — needs <code>${ctx.escapeHtml(cred)}</code> credential` : ' — needs parameters'}</li>`;
			})
			.join('');
		sections.push(
			`<div class="transcript-section-label">skipped (${String(skippedRecords.length)})</div><ul class="transcript-plan">${items}</ul>`,
		);
	}

	const body = sections.length > 0 ? sections.join('') : '';
	return `<details class="transcript-aside" open><summary>🛠 setup wizard — ${ctx.escapeHtml(header)}</summary>${body}</details>`;
}

function tryRenderDomainAccess(node: TraceNode, ctx: ToolRenderContext): string | null {
	const meta = isRecord(node.metadata) ? node.metadata : {};
	if (meta.resume_reason !== 'domain_access' && meta.resume_reason !== 'domain-access') return null;

	const input = unwrapInput(node.inputs);
	const domain =
		isRecord(input) && typeof input.url === 'string' ? new URL(input.url).host : '(unknown)';
	const action =
		typeof meta.domain_access_action === 'string' ? meta.domain_access_action : 'approved';
	return `<details class="transcript-aside" open><summary>🌐 domain access — ${ctx.escapeHtml(domain)} <em>(${ctx.escapeHtml(action)})</em></summary></details>`;
}

function tryRenderResourceDecision(node: TraceNode, ctx: ToolRenderContext): string | null {
	const meta = isRecord(node.metadata) ? node.metadata : {};
	if (meta.resume_reason !== 'resource_decision' && meta.resume_reason !== 'resource-decision')
		return null;

	const decision =
		typeof meta.resource_decision === 'string' ? meta.resource_decision : '(unknown)';
	const toolName = typeof meta.tool_name === 'string' ? meta.tool_name : node.name;
	return `<details class="transcript-aside" open><summary>🔒 resource decision — <code>${ctx.escapeHtml(toolName)}</code> <em>(${ctx.escapeHtml(decision)})</em></summary></details>`;
}

function tryRenderCredentialSelection(node: TraceNode, ctx: ToolRenderContext): string | null {
	const meta = isRecord(node.metadata) ? node.metadata : {};
	if (
		meta.resume_reason !== 'credential_selection' &&
		meta.resume_reason !== 'credential-selection'
	)
		return null;

	const input = unwrapInput(node.inputs);
	const credType =
		isRecord(input) &&
		Array.isArray(input.credentialRequests) &&
		input.credentialRequests.length > 0
			? extractCredentialTypes(input.credentialRequests)
			: '(unknown)';
	return `<details class="transcript-aside" open><summary>🔑 credential selection — ${ctx.escapeHtml(credType)}</summary></details>`;
}

function extractCredentialTypes(requests: unknown[]): string {
	const types = requests
		.filter(isRecord)
		.map((r) => (typeof r.type === 'string' ? r.type : ''))
		.filter(Boolean);
	return types.length > 0 ? types.join(', ') : '(unknown)';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** LangSmith tool nodes wrap their args under `.input` — unwrap or return as-is. */
function unwrapInput(value: unknown): unknown {
	if (!isRecord(value)) return value;
	return 'input' in value ? value.input : value;
}

function collectAskUserAnswers(outputs: unknown): Map<string, string> {
	const map = new Map<string, string>();
	if (!isRecord(outputs)) return map;
	const answers = outputs.answers;
	if (!Array.isArray(answers)) return map;
	for (const a of answers) {
		if (!isRecord(a) || typeof a.questionId !== 'string') continue;
		const selected =
			Array.isArray(a.selectedOptions) && a.selectedOptions.length > 0
				? a.selectedOptions.filter((o) => typeof o === 'string').join(', ')
				: '';
		const custom = typeof a.customText === 'string' ? a.customText : '';
		const text = [selected, custom].filter(Boolean).join(' — ');
		if (text) map.set(a.questionId, text);
	}
	return map;
}
