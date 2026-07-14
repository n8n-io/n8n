import {
	ASK_CREDENTIAL_TOOL_NAME,
	ASK_EMBEDDING_CREDENTIAL_TOOL_NAME,
	ASK_QUESTIONS_TOOL_NAME,
	APPROVAL_TOOL_NAME,
	CONFIGURE_CHANNEL_TOOL_NAME,
	N8N_CHAT_ACTION_TOOL_NAME,
	askCredentialInputSchema,
	channelResumeSchema,
	channelSuspendPayloadSchema,
	credentialResumeSchema,
	credentialSuspendPayloadSchema,
	questionAnswerSchema,
	questionsResumeSchema,
	questionsSuspendPayloadSchema,
	type AgentBuilderOpenSuspension,
	type AgentPersistedMessageDto,
	type ChannelSuspendPayload,
	type CredentialSuspendPayload,
	type InteractiveToolName,
	type QuestionsSuspendPayload,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';
import {
	isAwaitingCard,
	n8nChatResumeValueSchema,
	parseN8nChatActionInput,
} from './n8nChatInteraction';

import { CHAT_MESSAGE_STATUS, TOOL_CALL_STATE } from './constants';
import type { ToolCallState } from './constants';
import { isFailedDelegateOutput } from './delegateTool';
import { summariseToolCall } from './interactiveSummary';
import type {
	ApprovalInput,
	ChannelResolvedValue,
	ChatMessage,
	ChatMessageRenderPart,
	CredentialResolvedValue,
	InteractivePayload,
	QuestionsResolvedValue,
	ToolCall,
} from './types';

const INTERACTIVE_TOOL_NAMES = [
	ASK_CREDENTIAL_TOOL_NAME,
	ASK_EMBEDDING_CREDENTIAL_TOOL_NAME,
	ASK_QUESTIONS_TOOL_NAME,
	CONFIGURE_CHANNEL_TOOL_NAME,
] as readonly InteractiveToolName[];

type MessageWithInteractives = Pick<ChatMessage, 'interactive' | 'interactives'>;

/** Ambient agent/project scope, needed only to reconstruct a `configure_channel` card from raw tool-call args (see `buildChannelPayloadFromInput`). */
export interface RebuildInteractiveContext {
	agentId?: string;
	projectId?: string;
}

export function isInteractiveToolName(value: unknown): value is InteractiveToolName {
	return typeof value === 'string' && (INTERACTIVE_TOOL_NAMES as readonly string[]).includes(value);
}

export { isRecord };

function syncLegacyInteractive(message: MessageWithInteractives): void {
	const interactives = message.interactives;
	if (!interactives?.length) {
		delete message.interactive;
		return;
	}
	message.interactive =
		interactives.find((payload) => payload.resolvedAt === undefined) ?? interactives[0];
}

export function getMessageInteractives(message: MessageWithInteractives): InteractivePayload[] {
	if (message.interactives?.length) return message.interactives;
	return message.interactive ? [message.interactive] : [];
}

export function setMessageInteractives(
	message: MessageWithInteractives,
	interactives: InteractivePayload[],
): void {
	if (interactives.length === 0) {
		delete message.interactives;
		delete message.interactive;
		return;
	}
	message.interactives = interactives;
	syncLegacyInteractive(message);
}

export function upsertMessageInteractive(
	message: MessageWithInteractives,
	interactive: InteractivePayload,
): void {
	const interactives = [...getMessageInteractives(message)];
	const index = interactives.findIndex((payload) => payload.toolCallId === interactive.toolCallId);
	if (index === -1) {
		interactives.push(interactive);
	} else {
		interactives[index] = interactive;
	}
	setMessageInteractives(message, interactives);
}

export function getMessageInteractive(
	message: MessageWithInteractives,
	toolCallId: string,
): InteractivePayload | undefined {
	return getMessageInteractives(message).find((payload) => payload.toolCallId === toolCallId);
}

export function findOpenInteractive(
	messages: MessageWithInteractives[],
): InteractivePayload | undefined {
	for (const message of messages) {
		const open = getMessageInteractives(message).find(
			(payload) => payload.resolvedAt === undefined,
		);
		if (open) return open;
	}
	return undefined;
}

/** True when a suspend payload is the approval tool's renderable input. */
export function isApprovalSuspendInput(value: unknown): boolean {
	return parseApprovalInput(value) !== undefined;
}

function parseApprovalInput(value: unknown): ApprovalInput | undefined {
	if (!isRecord(value)) return undefined;
	if (value.type !== 'approval') return undefined;
	if (typeof value.toolName !== 'string' || value.toolName.length === 0) return undefined;
	return {
		type: 'approval',
		toolName: value.toolName,
		...(typeof value.displayName === 'string' &&
			value.displayName.length > 0 && { displayName: value.displayName }),
		args: value.args,
	};
}

function isDeclinedToolOutput(value: unknown): boolean {
	return isRecord(value) && value.declined === true;
}

// ---------------------------------------------------------------------------
// ask_questions / ask_credential / configure_channel — dual-shape parsing
// ---------------------------------------------------------------------------
//
// These three tools transform their resume payload into a distinct tool
// OUTPUT shape rather than echoing it back. `tc.input` is
// similarly dual-shaped: live suspensions overwrite it with the full suspend
// payload (see `useAgentChatStream`'s `tool-call-suspended` handler), but
// persisted history only ever carries the tool's original call args (the
// suspend payload is a transient SSE-only concept, never persisted). The
// `buildXPayloadFromInput` helpers try the rich (suspend) shape first, then
// fall back to synthesizing one from the raw args — enough to render an open
// card even though a few incidental suspend-only fields (e.g. `requestId`,
// never used by the FE beyond correlation) are defaulted.

/** Mirrors `askQuestionsInputSchema` in `ask-questions.tool.ts` — not exported since it's cli-internal. */
const rawAskQuestionsInputSchema = z.object({
	questions: z
		.array(
			z.object({
				id: z.string().optional(),
				question: z.string(),
				type: z.enum(['single', 'multi', 'text']),
				options: z.array(z.string()).optional(),
			}),
		)
		.min(1),
	introMessage: z.string().optional(),
});

/** Mirrors `configureChannelInputSchema` in `configure-channel.tool.ts` — not exported since it's cli-internal. */
const rawConfigureChannelInputSchema = z.object({
	integrationType: z.string(),
});

function buildQuestionsPayloadFromInput(input: unknown): QuestionsSuspendPayload | undefined {
	const asSuspend = questionsSuspendPayloadSchema.safeParse(input);
	if (asSuspend.success) return asSuspend.data;

	const raw = rawAskQuestionsInputSchema.safeParse(input);
	if (!raw.success) return undefined;
	const questions = raw.data.questions.map((question, index) => ({
		...question,
		id: question.id ?? `q${index + 1}`,
	}));
	return {
		requestId: '',
		message: raw.data.introMessage ?? 'The agent builder has questions',
		severity: 'info',
		inputType: 'questions',
		questions,
		...(raw.data.introMessage ? { introMessage: raw.data.introMessage } : {}),
	};
}

function buildCredentialPayloadFromInput(input: unknown): CredentialSuspendPayload | undefined {
	const asSuspend = credentialSuspendPayloadSchema.safeParse(input);
	if (asSuspend.success) return asSuspend.data;

	const raw = askCredentialInputSchema.safeParse(input);
	if (!raw.success) return undefined;
	return {
		requestId: '',
		message: raw.data.purpose,
		severity: 'info',
		credentialRequests: [
			{
				credentialType: raw.data.credentialType,
				reason: raw.data.purpose,
				existingCredentials: [],
			},
		],
		credentialFlow: { stage: 'generic' },
	};
}

function buildChannelPayloadFromInput(
	input: unknown,
	context?: RebuildInteractiveContext,
): ChannelSuspendPayload | undefined {
	const asSuspend = channelSuspendPayloadSchema.safeParse(input);
	if (asSuspend.success) return asSuspend.data;

	const raw = rawConfigureChannelInputSchema.safeParse(input);
	if (!raw.success || !context?.agentId || !context.projectId) return undefined;
	// The tool's own args never carry agentId/projectId (they're server-injected
	// deps, not LLM-facing input), so this fallback borrows them from the
	// ambient route context instead. Safe here specifically because this path
	// only runs from `convertDbMessages`, which only ever loads the history of
	// the single agent the current chat route is scoped to — the reconstructed
	// card can never end up attributed to a different agent/project.
	return {
		requestId: '',
		message: `Set up the ${raw.data.integrationType} channel`,
		severity: 'info',
		channelConfig: { integrationType: raw.data.integrationType, agentId: context.agentId },
		projectId: context.projectId,
	};
}

/** Tool output shape for `ask_questions` (see `ask-questions.tool.ts`'s handler return). */
const askQuestionsOutputSchema = z.object({
	answered: z.boolean(),
	answers: z.array(questionAnswerSchema.extend({ question: z.string().optional() })).optional(),
});

function parseQuestionsResolvedValue(output: unknown): QuestionsResolvedValue | undefined {
	const asOutput = askQuestionsOutputSchema.safeParse(output);
	if (asOutput.success) return asOutput.data;
	const asResume = questionsResumeSchema.safeParse(output);
	return asResume.success ? asResume.data : undefined;
}

/** Tool output shape for `ask_credential` / `ask_embedding_credential` (see `AskCredentialToolResult`). */
const askCredentialOutputSchema = z.union([
	z.object({ skipped: z.literal(true) }),
	z.object({
		credentialId: z.string(),
		credentialName: z.string(),
		credentials: z.record(z.object({ id: z.string(), name: z.string() })).optional(),
	}),
]);

function parseCredentialResolvedValue(output: unknown): CredentialResolvedValue | undefined {
	const asOutput = askCredentialOutputSchema.safeParse(output);
	if (asOutput.success) return asOutput.data;
	const asResume = credentialResumeSchema.safeParse(output);
	return asResume.success ? asResume.data : undefined;
}

/** Tool output shape for `configure_channel` (see `configure-channel.tool.ts`'s resumed-leg return). */
const configureChannelOutputSchema = z.object({ connected: z.boolean() });

function parseChannelResolvedValue(output: unknown): ChannelResolvedValue | undefined {
	const asOutput = configureChannelOutputSchema.safeParse(output);
	if (asOutput.success) return asOutput.data;
	const asResume = channelResumeSchema.safeParse(output);
	return asResume.success ? asResume.data : undefined;
}

function parseAskEmbeddingCredentialOutput(value: unknown) {
	return parseCredentialResolvedValue(value);
}

/**
 * Given a tool call belonging to one of the interactive builder tools,
 * reconstruct an `InteractivePayload` for it. The result is:
 *
 * - **resolved**: when `output` is present — `resolvedValue` is parsed from it
 *   via the matching zod schema. Interactive tools transform the resume
 *   payload into a distinct output shape, so `resolvedValue` is parsed
 *   defensively (see the `parse*ResolvedValue` helpers above).
 * - **open**: when `output` is absent — the card renders as an active
 *   awaiting-user prompt. Used when a refresh during a suspension restored the
 *   suspended assistant turn from the open checkpoint.
 *
 * Returns `undefined` when the tool name isn't interactive or input parsing fails.
 *
 * `context` supplies the ambient agent/project scope needed only to
 * reconstruct an OPEN `configure_channel` card straight from persisted
 * history (see `buildChannelPayloadFromInput`) — omit it for live SSE calls,
 * where `tc.input` already carries the full suspend payload.
 */
export function rebuildInteractiveFromHistory(
	tc: ToolCall,
	context?: RebuildInteractiveContext,
): InteractivePayload | undefined {
	const approvalInput = parseApprovalInput(tc.input);
	if (approvalInput) {
		return {
			toolCallId: tc.toolCallId,
			...(tc.output !== undefined && { resolvedAt: 1 }),
			toolName: APPROVAL_TOOL_NAME,
			input: approvalInput,
			...(tc.output !== undefined && {
				resolvedValue: { approved: !isDeclinedToolOutput(tc.output) },
			}),
		};
	}

	if (tc.tool === N8N_CHAT_ACTION_TOOL_NAME) {
		const input = parseN8nChatActionInput(tc.input);
		if (!input) return undefined;
		// Display-only cards never suspend: only resolved ones render a card here.
		if (tc.output === undefined && !isAwaitingCard(input.card)) return undefined;
		const resolved = tc.output !== undefined ? n8nChatResumeValueSchema.safeParse(tc.output) : null;
		return {
			toolCallId: tc.toolCallId,
			...(tc.output !== undefined && { resolvedAt: 1 }),
			toolName: N8N_CHAT_ACTION_TOOL_NAME,
			input,
			...(resolved?.success && { resolvedValue: resolved.data }),
		};
	}

	if (!isInteractiveToolName(tc.tool)) return undefined;

	const base = {
		toolCallId: tc.toolCallId,
		// `resolvedAt` is a boolean-ish flag for the UI's disabled state — the
		// exact timestamp doesn't matter, only its presence.
		...(tc.output !== undefined && { resolvedAt: 1 }),
	};

	if (tc.tool === ASK_CREDENTIAL_TOOL_NAME || tc.tool === ASK_EMBEDDING_CREDENTIAL_TOOL_NAME) {
		const input = buildCredentialPayloadFromInput(tc.input);
		if (!input) return undefined;
		const resolved =
			tc.output === undefined
				? undefined
				: tc.tool === ASK_EMBEDDING_CREDENTIAL_TOOL_NAME
					? parseAskEmbeddingCredentialOutput(tc.output)
					: parseCredentialResolvedValue(tc.output);
		return {
			...base,
			toolName: tc.tool,
			input,
			...(resolved && { resolvedValue: resolved }),
		};
	}

	if (tc.tool === CONFIGURE_CHANNEL_TOOL_NAME) {
		const input = buildChannelPayloadFromInput(tc.input, context);
		if (!input) return undefined;
		const resolved = tc.output !== undefined ? parseChannelResolvedValue(tc.output) : undefined;
		return {
			...base,
			toolName: CONFIGURE_CHANNEL_TOOL_NAME,
			input,
			...(resolved && { resolvedValue: resolved }),
		};
	}

	const input = buildQuestionsPayloadFromInput(tc.input);
	if (!input) return undefined;
	const resolved = tc.output !== undefined ? parseQuestionsResolvedValue(tc.output) : undefined;
	return {
		...base,
		toolName: ASK_QUESTIONS_TOOL_NAME,
		input,
		...(resolved && { resolvedValue: resolved }),
	};
}

/**
 * Convert persisted agent messages into the frontend ChatMessage format.
 *
 * Whenever a tool call is interactive, we attach a reconstructed
 * `InteractivePayload` so the UI re-renders the card in either its open
 * (awaiting user) or resolved (disabled) state.
 */
export function convertDbMessages(
	dbMessages: AgentPersistedMessageDto[],
	context?: RebuildInteractiveContext,
): ChatMessage[] {
	const result: ChatMessage[] = [];

	for (const msg of dbMessages) {
		if (!msg.role || !Array.isArray(msg.content)) continue;

		const role: ChatMessage['role'] | null =
			msg.role === 'user' ? 'user' : msg.role === 'assistant' ? 'assistant' : null;
		if (role === null) continue;

		let text = '';
		let thinking = '';
		const toolCalls: ToolCall[] = [];
		const renderParts: ChatMessageRenderPart[] = [];
		const interactives: InteractivePayload[] = [];
		let status: ChatMessage['status'];

		for (const part of msg.content) {
			if (part.type === 'text' && part.text) {
				text += part.text;
				renderParts.push({ type: 'text', text: part.text });
			} else if (part.type === 'reasoning' && part.text) {
				thinking += part.text;
			} else if (part.type === 'tool-call' && part.toolName) {
				let state: ToolCallState;
				let output: unknown;
				const canceled = part.canceled === true;
				if (part.state === 'resolved') {
					output = part.output;
					if (canceled) {
						state = TOOL_CALL_STATE.CANCELLED;
					} else if (isFailedDelegateOutput(part.toolName, part.output)) {
						state = TOOL_CALL_STATE.ERROR;
					} else {
						state = TOOL_CALL_STATE.DONE;
					}
				} else if (part.state === 'rejected') {
					state = TOOL_CALL_STATE.ERROR;
					output = part.error;
				} else {
					state = TOOL_CALL_STATE.RUNNING;
					output = undefined;
				}

				const toolCall: ToolCall = {
					tool: part.toolName,
					toolCallId: part.toolCallId ?? '',
					input: part.input,
					...(output !== undefined && { output }),
					...(canceled && { canceled }),
					state,
					...(part.startTime !== undefined && { startTime: part.startTime }),
					...(part.endTime !== undefined && { endTime: part.endTime }),
					displaySummary: summariseToolCall(part.toolName, output, part.input),
				};
				toolCalls.push(toolCall);

				const rebuilt = rebuildInteractiveFromHistory(toolCall, context);
				if (!rebuilt) continue;
				if (rebuilt.resolvedAt === undefined) {
					toolCall.state = TOOL_CALL_STATE.SUSPENDED;
					status = CHAT_MESSAGE_STATUS.AWAITING_USER;
				}
				interactives.push(rebuilt);
				renderParts.push({ type: 'interactive', toolCallId: rebuilt.toolCallId });
			}
		}

		const chatMessage: ChatMessage = {
			id: msg.id ?? crypto.randomUUID(),
			role,
			content: text,
			...(renderParts.length > 0 && { renderParts }),
			thinking: thinking || undefined,
			toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
			...(status && { status }),
		};
		setMessageInteractives(chatMessage, interactives);
		result.push(chatMessage);
	}
	return result;
}

/**
 * Re-attach a `runId` to each interactive card whose underlying tool call is
 * still suspended on the backend. The sidecar comes from `GET /build/messages`
 * (`openSuspensions`) — `convertDbMessages` can't surface it on its own
 * because raw persisted messages don't carry runIds.
 *
 * Mutates `chat` in place (history-load happens before reactivity wraps the
 * messages, so this is safe and avoids an extra deep clone) and returns it
 * for ergonomic chaining.
 */
export function applyOpenSuspensions(
	chat: ChatMessage[],
	suspensions: AgentBuilderOpenSuspension[],
): ChatMessage[] {
	if (suspensions.length === 0) return chat;
	const byToolCallId = new Map(suspensions.map((s) => [s.toolCallId, s.runId]));
	for (const msg of chat) {
		const interactives = getMessageInteractives(msg);
		for (const interactive of interactives) {
			const runId = byToolCallId.get(interactive.toolCallId);
			if (runId) interactive.runId = runId;
		}
		setMessageInteractives(msg, interactives);
	}
	return chat;
}
