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
// Per-turn assembly
//
// Each tool can emit two events for one logical interaction (e.g. ask-user
// fires both a tool-call and a confirmation-request). To render it once,
// only the variant carrying the richer payload handles it; the other is
// skipped. This relies on both events arriving in the same turn — which
// they always do in practice.
// ---------------------------------------------------------------------------

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

		if (event.type === 'tool-call') {
			handleToolCall(event, toolInteractions, seenPlainTools);
			continue;
		}

		if (event.type === 'tool-result') {
			handleToolResult(event, toolInteractions);
			continue;
		}

		if (event.type === 'confirmation-request') {
			handleConfirmationRequest(event, proxyResponses, toolInteractions);
			continue;
		}
	}

	return {
		userMessage,
		agentText: textChunks.join(''),
		toolInteractions,
	};
}

function handleToolCall(
	event: CapturedEvent,
	out: ToolInteraction[],
	seenPlainTools: Set<string>,
): void {
	const payload = getRecord(event.data, 'payload') ?? event.data;
	const toolName = getString(payload, 'toolName') ?? '';
	const args = getRecord(payload, 'args') ?? {};

	// ask-user is rendered from the confirmation-request (which has the answers).
	if (toolName === 'ask-user') return;

	if (toolName === 'plan' || toolName === 'add-plan-item') {
		const tasks = Array.isArray(args.tasks) ? extractPlanTasks(args.tasks) : [];
		if (tasks.length > 0) out.push({ kind: 'plan', tasks });
		return;
	}

	// Plain tool-call — collapsed to one entry per tool name within the turn.
	if (!toolName || seenPlainTools.has(toolName)) return;
	seenPlainTools.add(toolName);
	out.push({ kind: 'tool-call', toolName });
}

function handleToolResult(event: CapturedEvent, out: ToolInteraction[]): void {
	const payload = getRecord(event.data, 'payload') ?? event.data;
	const toolName = getString(payload, 'toolName') ?? '';
	const result = payload.result;

	if (toolName === 'workflows' && isRecord(result)) {
		const interaction = extractSetupWizardOutcome(result);
		if (interaction) out.push(interaction);
	}
}

function handleConfirmationRequest(
	event: CapturedEvent,
	proxyResponses: ProxyResponses | undefined,
	out: ToolInteraction[],
): void {
	const payload = getRecord(event.data, 'payload') ?? {};
	const requestId = getString(payload, 'requestId');
	const response = requestId ? proxyResponses?.get(requestId) : undefined;

	if (payload.inputType === 'questions') {
		const questions = Array.isArray(payload.questions)
			? extractAskUserQuestions(payload.questions)
			: [];
		if (questions.length === 0) return;
		const answers =
			response?.kind === 'questions' ? extractAskUserAnswers(response.answers) : undefined;
		out.push({ kind: 'ask-user', questions, answers });
		return;
	}

	// setup wizard suspend — its outcome is rendered from the tool-result instead.
	if (Array.isArray(payload.setupRequests)) return;

	const toolName =
		getString(payload, 'toolName') ?? getString(payload, 'agentId') ?? 'confirmation';
	out.push({
		kind: 'confirmation',
		toolName,
		resumeReason: inferResumeReason(payload, response),
		approved: inferApproval(response),
	});
}

// ---------------------------------------------------------------------------
// Helpers
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
	return true;
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
