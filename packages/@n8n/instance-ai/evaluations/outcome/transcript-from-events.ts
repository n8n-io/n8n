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
	SetupCardRequest,
	SetupWizardCompletedNode,
	SetupWizardSkippedNode,
	ToolInteraction,
	TranscriptStep,
	TranscriptTurn,
} from '../types';
import { USER_TURN_EVENT } from '../types';
import { splitEventsIntoTurns } from './event-parser';
import { redactSecrets, redactSecretsInText } from '../harness/redact';
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

	const turns: TranscriptTurn[] = [];

	// Preferred path: the harness injected a USER_TURN_EVENT marker at each send,
	// so each turn is one user message plus every run it triggered (agent resumes
	// included) — no positional drift between messages and runs.
	if (events.some((e) => e.type === USER_TURN_EVENT)) {
		for (const segment of splitEventsByUserTurn(events)) {
			const turn = buildTurn(segment.events, segment.userMessage, proxyResponses);
			if (turn.userMessage || turn.steps.length > 0) turns.push(turn);
		}
		return turns;
	}

	// Fallback (no markers, e.g. legacy captures): align messages to run-start
	// turns positionally.
	const userMessages: string[] = [];
	if (openingMessage) userMessages.push(openingMessage);
	userMessages.push(...followUpMessages);
	for (const turnEvents of splitEventsIntoTurns(events)) {
		const turn = buildTurn(turnEvents, userMessages.shift(), proxyResponses);
		if (turn.userMessage || turn.steps.length > 0) turns.push(turn);
	}
	return turns;
}

/** Split events into per-user-message turns using the injected USER_TURN_EVENT
 *  markers. Each turn carries the message text and all events up to the next
 *  marker — spanning any number of agent runs/resumes. */
function splitEventsByUserTurn(
	events: CapturedEvent[],
): Array<{ userMessage?: string; events: CapturedEvent[] }> {
	const turns: Array<{ userMessage?: string; events: CapturedEvent[] }> = [];
	let current: { userMessage?: string; events: CapturedEvent[] } | null = null;
	for (const event of events) {
		if (event.type === USER_TURN_EVENT) {
			if (current) turns.push(current);
			current = { userMessage: extractUserTurnText(event), events: [] };
		} else {
			current ??= { userMessage: undefined, events: [] };
			current.events.push(event);
		}
	}
	if (current) turns.push(current);
	return turns;
}

function extractUserTurnText(event: CapturedEvent): string | undefined {
	const payload = getRecord(event.data, 'payload');
	return payload ? getString(payload, 'text') : undefined;
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
	const steps: TranscriptStep[] = [];
	const outcomeByCallId = collectToolOutcomes(events);
	let textBuffer = '';

	const flushText = () => {
		if (textBuffer.length > 0) {
			steps.push({ kind: 'agent-text', text: textBuffer });
			textBuffer = '';
		}
	};

	for (const event of events) {
		if (event.type === 'text-delta') {
			const text =
				getString(event.data, 'text') ?? getString(getRecord(event.data, 'payload') ?? {}, 'text');
			if (text) textBuffer += text;
			continue;
		}

		let interaction: ToolInteraction | null = null;
		// A tool call or confirmation is an action boundary: flush the narration
		// before it even when the action itself doesn't render a step, so distinct
		// thoughts never fuse across a dropped/empty interaction.
		let isActionBoundary = false;
		if (event.type === 'tool-call') {
			interaction = interpretToolCall(event, outcomeByCallId);
			isActionBoundary = true;
		} else if (event.type === 'tool-result') {
			interaction = interpretToolResult(event);
		} else if (event.type === 'confirmation-request') {
			interaction = interpretConfirmationRequest(event, proxyResponses);
			isActionBoundary = true;
		}

		if (isActionBoundary || interaction) flushText();
		if (interaction) steps.push(interaction);
	}

	flushText();
	return { userMessage, steps };
}

interface ToolOutcome {
	result?: unknown;
	error?: string;
}

/** Pair every tool result/error in the turn to its originating call by toolCallId. */
function collectToolOutcomes(events: CapturedEvent[]): Map<string, ToolOutcome> {
	const map = new Map<string, ToolOutcome>();
	for (const event of events) {
		if (event.type !== 'tool-result' && event.type !== 'tool-error') continue;
		const payload = getRecord(event.data, 'payload') ?? event.data;
		const callId = getString(payload, 'toolCallId');
		if (!callId) continue;
		if (event.type === 'tool-error') {
			// Flat string, so content-scrub (key-based redaction can't reach an inline token).
			map.set(callId, { error: redactSecretsInText(getString(payload, 'error') ?? 'tool error') });
		} else {
			// Redact secret-shaped keys before the result reaches the report/judge.
			map.set(callId, { result: redactSecrets(payload.result) });
		}
	}
	return map;
}

function interpretToolCall(
	event: CapturedEvent,
	outcomeByCallId: Map<string, ToolOutcome>,
): ToolInteraction | null {
	const payload = getRecord(event.data, 'payload') ?? event.data;
	const toolName = getString(payload, 'toolName') ?? '';
	const args = getRecord(payload, 'args') ?? {};

	// ask-user is rendered from the confirmation-request (which has the answers).
	if (toolName === 'ask-user') return null;

	if (toolName === 'create-tasks') {
		const tasks = Array.isArray(args.tasks) ? extractPlanTasks(args.tasks) : [];
		if (tasks.length > 0) return { kind: 'plan', tasks };
		// Empty plan: fall through and render as a plain tool-call so the call
		// stays visible (1:1 with what happened) instead of vanishing.
	}

	// Every named call renders — no de-duping, so repeat calls aren't dropped.
	if (!toolName) return null;
	const callId = getString(payload, 'toolCallId');
	const outcome = callId ? outcomeByCallId.get(callId) : undefined;
	// `workflows` output is rendered as the setup-wizard block — don't duplicate its result here.
	const result = toolName === 'workflows' ? undefined : outcome?.result;
	return {
		kind: 'tool-call',
		toolName,
		toolCallId: callId,
		args:
			Object.keys(args).length > 0 ? (redactSecrets(args) as Record<string, unknown>) : undefined,
		result,
		error: outcome?.error,
	};
}

function interpretToolResult(event: CapturedEvent): ToolInteraction | null {
	const payload = getRecord(event.data, 'payload') ?? event.data;
	const toolName = getString(payload, 'toolName') ?? '';
	const result = payload.result;

	if (toolName === 'workflows' && isRecord(result)) {
		return extractSetupWizardOutcome(result);
	}
	return null;
}

function interpretConfirmationRequest(
	event: CapturedEvent,
	proxyResponses: ProxyResponses | undefined,
): ToolInteraction | null {
	const payload = getRecord(event.data, 'payload') ?? {};
	const requestId = getString(payload, 'requestId');
	const response = requestId ? proxyResponses?.get(requestId) : undefined;

	if (payload.inputType === 'questions') {
		const questions = Array.isArray(payload.questions)
			? extractAskUserQuestions(payload.questions)
			: [];
		if (questions.length === 0) return null;
		const answers =
			response?.kind === 'questions' ? extractAskUserAnswers(response.answers) : undefined;
		return { kind: 'ask-user', questions, answers };
	}

	// Setup card (configure credentials / fill parameters). Render the prompt
	// itself — generic across node types and params — so it stays visible even
	// when the proxy skips it; the apply outcome, if any, renders separately.
	if (Array.isArray(payload.setupRequests)) {
		return interpretSetupCard(payload.setupRequests, response);
	}

	const toolName =
		getString(payload, 'toolName') ?? getString(payload, 'agentId') ?? 'confirmation';
	return {
		kind: 'confirmation',
		toolName,
		resumeReason: inferResumeReason(payload, response),
		approved: inferApproval(response),
		// Plan-review prompts are boilerplate and the plan is rendered separately;
		// keep the message only for confirm types where it's specific.
		message:
			payload.inputType === 'plan-review'
				? undefined
				: (getString(payload, 'message') ?? getString(payload, 'introMessage')),
		feedback: inferFeedback(response),
	};
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

/**
 * Render a setup card (a `workflows action:"setup"` suspend) as a transcript
 * step. Generic: works for any node type, credential, or set of parameters the
 * card surfaces — it reads the node name, the credential type, and the names of
 * the parameters the card flags, plus how the proxy responded.
 */
function interpretSetupCard(
	rawRequests: unknown[],
	response: InstanceAiConfirmRequest | undefined,
): ToolInteraction | null {
	const requests = extractSetupCardRequests(rawRequests);
	if (requests.length === 0) return null;
	const { outcome, filled } = describeSetupCardResponse(response);
	return { kind: 'setup-card', requests, outcome, filled };
}

function extractSetupCardRequests(raw: unknown[]): SetupCardRequest[] {
	const requests: SetupCardRequest[] = [];
	for (const item of raw) {
		if (!isRecord(item)) continue;
		const node = isRecord(item.node) ? item.node : undefined;
		// Server payloads nest the name under `node.name`; `nodeName` is only a
		// loose fallback for hand-built/partial inputs.
		const nodeName = (node ? getString(node, 'name') : undefined) ?? getString(item, 'nodeName');
		const credentialType = getString(item, 'credentialType');
		// The card surfaces `editableParameters` for the user to fill; `parameterIssues`
		// is only the subset with validation problems. Union both (editable first) so the
		// "the agent asked for X" evidence isn't under-reported.
		const editable = Array.isArray(item.editableParameters)
			? item.editableParameters.flatMap((p) => (isRecord(p) ? [getString(p, 'name')] : []))
			: [];
		const issues = isRecord(item.parameterIssues) ? Object.keys(item.parameterIssues) : [];
		const params = [...new Set([...editable, ...issues].filter((n): n is string => Boolean(n)))];
		requests.push({
			nodeName: nodeName ?? 'node',
			credentialType: credentialType ?? undefined,
			params: params.length > 0 ? params : undefined,
		});
	}
	return requests;
}

function describeSetupCardResponse(response: InstanceAiConfirmRequest | undefined): {
	outcome: 'filled' | 'skipped' | 'declined' | 'pending';
	filled?: string[];
} {
	if (!response) return { outcome: 'pending' };
	if (response.kind === 'setupWorkflowApply') {
		// An apply (even the empty auto-approve apply) means the user accepted the
		// setup — never report "skipped" here; that would contradict the sibling
		// setup-wizard outcome reporting those same nodes as completed.
		const filled = collectFilledParams(response.nodeParameters);
		return { outcome: 'filled', filled: filled.length > 0 ? filled : undefined };
	}
	if (response.kind === 'approval' && !response.approved) return { outcome: 'declined' };
	if (response.kind === 'questions') {
		const allSkipped = response.answers.length === 0 || response.answers.every((a) => a.skipped);
		return allSkipped ? { outcome: 'skipped' } : { outcome: 'filled' };
	}
	return { outcome: 'pending' };
}

function collectFilledParams(nodeParameters: unknown): string[] {
	// Key-based pass first: mask values under secret-shaped names (apiKey, token, …)
	// before they're rendered into the transcript/report.
	const redacted = redactSecrets(nodeParameters);
	if (!isRecord(redacted)) return [];
	const filled: string[] = [];
	for (const params of Object.values(redacted)) {
		if (!isRecord(params)) continue;
		for (const [name, value] of Object.entries(params)) {
			// Content-based pass: scrub any token inlined in a non-secret-shaped value.
			filled.push(redactSecretsInText(`${name}=${formatParamValue(value)}`));
		}
	}
	return filled;
}

/** Compact, readable rendering of a filled parameter value (objects → JSON, truncated). */
function formatParamValue(value: unknown): string {
	if (typeof value === 'string') return value.length > 0 ? value : '(empty)';
	// Resource-locator values render the human-readable name (or id), not raw JSON.
	if (isRecord(value) && value.__rl === true) {
		const name = getString(value, 'cachedResultName');
		if (name && name.length > 0) return name;
		const id = getString(value, 'value');
		if (id && id.length > 0) return id;
		return '(unset)';
	}
	try {
		const s = JSON.stringify(value);
		return s.length > 80 ? `${s.slice(0, 80)}…` : s;
	} catch {
		return String(value);
	}
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
	if (response.kind === 'planDeny' || response.kind === 'domainAccessDeny') return false;
	return true;
}

/** Free-text the user attached to their decision (e.g. plan-review feedback via userInput). */
function inferFeedback(response: InstanceAiConfirmRequest | undefined): string | undefined {
	if (response?.kind === 'approval' && response.userInput) return response.userInput;
	return undefined;
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
