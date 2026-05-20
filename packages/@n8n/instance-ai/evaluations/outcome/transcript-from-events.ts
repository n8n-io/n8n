/**
 * Build a chat-style transcript from the captured SSE event stream + the
 * proxy's confirmation responses. In-process, no LangSmith roundtrip.
 *
 * Reasoning/thinking blocks aren't included — those only live in the agent's
 * LangSmith LLM-run outputs, not forwarded over SSE.
 */

import type { InstanceAiConfirmRequest } from '@n8n/api-types';

import type {
	AskUserAnswer,
	AskUserQuestion,
	CapturedEvent,
	PlanTask,
	SetupWizardCompletedNode,
	SetupWizardSkippedNode,
	ToolInteraction,
	TranscriptTurn,
} from '../types';
import { splitEventsIntoTurns } from './event-parser';
import { getNestedRecord as getRecord, getString, isRecord } from '../utils/safe-extract';

type ProxyResponses = Map<string, InstanceAiConfirmRequest>;

export interface BuildTranscriptOptions {
	events: CapturedEvent[];
	openingMessage?: string;
	followUpMessages?: string[];
	proxyResponses?: ProxyResponses;
}

export function buildTranscriptFromEvents(opts: BuildTranscriptOptions): TranscriptTurn[] {
	const { events, openingMessage, followUpMessages = [], proxyResponses } = opts;
	if (events.length === 0) return [];

	const userMessages: string[] = [];
	if (openingMessage) userMessages.push(openingMessage);
	userMessages.push(...followUpMessages);

	const turns: TranscriptTurn[] = [];
	for (const turnEvents of splitEventsIntoTurns(events)) {
		const turn = buildTurn(turnEvents, userMessages.shift(), proxyResponses);
		if (turn.userMessage || turn.agentText || turn.toolInteractions.length > 0) {
			turns.push(turn);
		}
	}
	return turns;
}

// ---------------------------------------------------------------------------
// Tool dispatch table
//
// Each row claims one (event type, tool name) pair and produces a
// ToolInteraction. The table is the single source of truth for "what
// renders" — to support a new tool, add one row.
//
// Each logical interaction may fire two events (e.g. ask-user emits both a
// `tool-call` and a `confirmation-request`). To render it exactly once we
// only register the variant carrying the richer payload — the other variant
// has no row and is silently ignored.
//
// Assumption: when a tool-call has no row because its richer twin is
// expected, the twin must actually arrive in the same turn. If the SSE
// stream loses one half of a pair, that interaction won't render at all.
// In practice both halves always co-occur — the agent runtime emits them
// together.
// ---------------------------------------------------------------------------

interface RendererContext {
	args: Record<string, unknown>;
	result: unknown;
	payload: Record<string, unknown>;
	response?: InstanceAiConfirmRequest;
}

interface ToolRenderer {
	/** SSE event this renderer reads from. */
	eventType: 'tool-call' | 'tool-result' | 'confirmation-request';
	/**
	 * Identifies the event this row claims. For tool-call/tool-result the agent
	 * payload carries `toolName`; for confirmation-request the suspend payload
	 * has no toolName, so we discriminate on a shape field (e.g. `inputType`).
	 */
	matches: (payload: Record<string, unknown>) => boolean;
	build: (ctx: RendererContext) => ToolInteraction | null;
}

const TOOL_RENDERERS: ToolRenderer[] = [
	// ask-user — rendered from the confirmation-request so we can pair questions
	// with the proxy's answers. The tool-call twin has no row → skipped.
	{
		eventType: 'confirmation-request',
		matches: (p) => p.inputType === 'questions',
		build: renderAskUser,
	},

	// plan — `plan` tool, args carry the task list.
	{
		eventType: 'tool-call',
		matches: (p) =>
			getString(p, 'toolName') === 'plan' || getString(p, 'toolName') === 'add-plan-item',
		build: renderPlan,
	},

	// setup wizard — rendered from the tool-result (carries completed/skipped
	// breakdown). The confirmation-request suspend has no row → skipped.
	{
		eventType: 'tool-result',
		matches: (p) => getString(p, 'toolName') === 'workflows',
		build: renderSetupWizardOutcome,
	},
];

/** Tool names whose tool-call event is intentionally skipped because their
 *  richer twin is in the dispatch table on a different event type. */
const TOOLS_RENDERED_ELSEWHERE = new Set(['ask-user']);

function buildTurn(
	events: CapturedEvent[],
	userMessage: string | undefined,
	proxyResponses: ProxyResponses | undefined,
): TranscriptTurn {
	const textChunks: string[] = [];
	const toolInteractions: ToolInteraction[] = [];
	const seenPlainTools = new Set<string>();

	for (const event of events) {
		if (event.type === 'text-delta') {
			const text =
				getString(event.data, 'text') ?? getString(getRecord(event.data, 'payload') ?? {}, 'text');
			if (text) textChunks.push(text);
			continue;
		}

		const interaction = dispatchEvent(event, proxyResponses, seenPlainTools);
		if (interaction) toolInteractions.push(interaction);
	}

	return {
		userMessage,
		agentText: textChunks.join(''),
		toolInteractions,
	};
}

/**
 * Match an event against the dispatch table. Falls back to:
 *   - a generic plain `tool-call` entry (collapsed by tool name across the turn)
 *   - a generic `confirmation` entry for any confirmation-request not in the table
 *   - `null` for everything else (skipped)
 */
function dispatchEvent(
	event: CapturedEvent,
	proxyResponses: ProxyResponses | undefined,
	seenPlainTools: Set<string>,
): ToolInteraction | null {
	const payload = getRecord(event.data, 'payload') ?? event.data;
	const toolName = getString(payload, 'toolName') ?? '';
	const requestId = getString(payload, 'requestId');
	const response = requestId ? proxyResponses?.get(requestId) : undefined;

	const renderer = TOOL_RENDERERS.find((r) => r.eventType === event.type && r.matches(payload));
	if (renderer) {
		return renderer.build({
			args: getRecord(payload, 'args') ?? {},
			result: payload.result,
			payload,
			response,
		});
	}

	if (event.type === 'tool-call') {
		if (TOOLS_RENDERED_ELSEWHERE.has(toolName)) return null;
		if (!toolName || seenPlainTools.has(toolName)) return null;
		seenPlainTools.add(toolName);
		return { kind: 'tool-call', toolName };
	}

	if (event.type === 'confirmation-request') {
		// Setup wizard suspend — outcome will be rendered from its tool-result row.
		if (Array.isArray(payload.setupRequests)) return null;
		const fallbackToolName =
			getString(payload, 'toolName') ?? getString(payload, 'agentId') ?? 'confirmation';
		return {
			kind: 'confirmation',
			toolName: fallbackToolName,
			resumeReason: inferResumeReason(payload, response),
			approved: inferApproval(response),
		};
	}

	return null;
}

// ---------------------------------------------------------------------------
// Per-tool renderers (referenced by TOOL_RENDERERS above)
// ---------------------------------------------------------------------------

function renderAskUser(ctx: RendererContext): ToolInteraction | null {
	const questions = Array.isArray(ctx.payload.questions)
		? extractAskUserQuestions(ctx.payload.questions)
		: [];
	if (questions.length === 0) return null;
	const answers =
		ctx.response?.kind === 'questions' ? extractAskUserAnswers(ctx.response.answers) : undefined;
	return { kind: 'ask-user', questions, answers };
}

function renderPlan(ctx: RendererContext): ToolInteraction | null {
	const tasks = Array.isArray(ctx.args.tasks) ? extractPlanTasks(ctx.args.tasks) : [];
	if (tasks.length === 0) return null;
	return { kind: 'plan', tasks };
}

function renderSetupWizardOutcome(ctx: RendererContext): ToolInteraction | null {
	return isRecord(ctx.result) ? extractSetupWizardOutcome(ctx.result) : null;
}

// ---------------------------------------------------------------------------
// Payload extractors
// ---------------------------------------------------------------------------

function extractSetupWizardOutcome(result: Record<string, unknown>): ToolInteraction | null {
	const completed = Array.isArray(result.completedNodes)
		? extractCompletedNodes(result.completedNodes)
		: [];
	const skipped = Array.isArray(result.skippedNodes)
		? extractSkippedNodes(result.skippedNodes)
		: [];
	if (completed.length === 0 && skipped.length === 0) return null;
	const reason = typeof result.reason === 'string' ? result.reason : undefined;
	return { kind: 'setup-wizard', completedNodes: completed, skippedNodes: skipped, reason };
}

function inferResumeReason(
	payload: Record<string, unknown>,
	response: InstanceAiConfirmRequest | undefined,
): string {
	if (response?.kind === 'domainAccessApprove') return 'domain-access';
	if (response?.kind === 'resourceDecision') return 'resource-decision';
	if (response?.kind === 'credentialSelection') return 'credential-selection';
	if (payload.domainAccess) return 'domain-access';
	if (payload.resourceDecision) return 'resource-decision';
	if (Array.isArray(payload.credentialRequests)) return 'credential-selection';
	return 'approval';
}

function inferApproval(response: InstanceAiConfirmRequest | undefined): boolean | undefined {
	if (!response) return undefined;
	if (response.kind === 'approval') return response.approved;
	return true; // questions/domainAccess/resourceDecision/credentialSelection are all "permit"
}

function extractPlanTasks(raw: unknown[]): PlanTask[] {
	const tasks: PlanTask[] = [];
	for (const item of raw) {
		if (!isRecord(item)) continue;
		const title = typeof item.title === 'string' ? item.title : undefined;
		const description = typeof item.description === 'string' ? item.description : undefined;
		if (title || description) tasks.push({ title, description });
	}
	return tasks;
}

function extractAskUserQuestions(raw: unknown[]): AskUserQuestion[] {
	const questions: AskUserQuestion[] = [];
	for (const item of raw) {
		if (!isRecord(item)) continue;
		const id = typeof item.id === 'string' ? item.id : '';
		const question = typeof item.question === 'string' ? item.question : '';
		const options = Array.isArray(item.options)
			? item.options.filter((o): o is string => typeof o === 'string')
			: undefined;
		if (id || question) questions.push({ id, question, options });
	}
	return questions;
}

function extractAskUserAnswers(raw: unknown): AskUserAnswer[] {
	if (!Array.isArray(raw)) return [];
	const answers: AskUserAnswer[] = [];
	for (const item of raw) {
		if (!isRecord(item) || typeof item.questionId !== 'string') continue;
		const selectedOptions = Array.isArray(item.selectedOptions)
			? item.selectedOptions.filter((o): o is string => typeof o === 'string')
			: [];
		answers.push({
			questionId: item.questionId,
			selectedOptions,
			customText: typeof item.customText === 'string' ? item.customText : undefined,
			skipped: typeof item.skipped === 'boolean' ? item.skipped : undefined,
		});
	}
	return answers;
}

function extractCompletedNodes(raw: unknown[]): SetupWizardCompletedNode[] {
	const nodes: SetupWizardCompletedNode[] = [];
	for (const item of raw) {
		if (!isRecord(item) || typeof item.nodeName !== 'string') continue;
		const parametersSet = Array.isArray(item.parametersSet)
			? item.parametersSet.filter((p): p is string => typeof p === 'string')
			: undefined;
		nodes.push({ nodeName: item.nodeName, parametersSet });
	}
	return nodes;
}

function extractSkippedNodes(raw: unknown[]): SetupWizardSkippedNode[] {
	const nodes: SetupWizardSkippedNode[] = [];
	for (const item of raw) {
		if (!isRecord(item) || typeof item.nodeName !== 'string') continue;
		nodes.push({
			nodeName: item.nodeName,
			credentialType: typeof item.credentialType === 'string' ? item.credentialType : undefined,
		});
	}
	return nodes;
}
