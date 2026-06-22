import {
	ASK_CREDENTIAL_TOOL_NAME,
	ASK_LLM_TOOL_NAME,
	ASK_QUESTION_TOOL_NAME,
	APPROVAL_TOOL_NAME,
	N8N_CHAT_ACTION_TOOL_NAME,
	askCredentialInputSchema,
	askCredentialResumeSchema,
	askLlmInputSchema,
	askLlmResumeSchema,
	askQuestionInputSchema,
	askQuestionResumeSchema,
	type AgentBuilderOpenSuspension,
	type AgentPersistedMessageDto,
	type InteractiveToolName,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils';
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
	ChatMessage,
	ChatMessageRenderPart,
	InteractivePayload,
	ToolCall,
} from './types';

const INTERACTIVE_TOOL_NAMES = [
	ASK_CREDENTIAL_TOOL_NAME,
	ASK_LLM_TOOL_NAME,
	ASK_QUESTION_TOOL_NAME,
] as readonly InteractiveToolName[];

type MessageWithInteractives = Pick<ChatMessage, 'interactive' | 'interactives'>;

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

/**
 * Given a tool call belonging to one of the interactive builder tools,
 * reconstruct an `InteractivePayload` for it. The result is:
 *
 * - **resolved**: when `output` is present — `resolvedValue` is parsed from it
 *   via the matching zod schema. The output IS the user's resume payload (the
 *   tool handler returns `ctx.resumeData` after a resume), so no separate
 *   `resumedAt` signal is needed.
 * - **open**: when `output` is absent — the card renders as an active
 *   awaiting-user prompt. Used when a refresh during a suspension restored the
 *   suspended assistant turn from the open checkpoint.
 *
 * Returns `undefined` when the tool name isn't interactive or input parsing fails.
 */
export function rebuildInteractiveFromHistory(tc: ToolCall): InteractivePayload | undefined {
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

	if (tc.tool === ASK_CREDENTIAL_TOOL_NAME) {
		const input = askCredentialInputSchema.safeParse(tc.input);
		if (!input.success) return undefined;
		const resolved =
			tc.output !== undefined ? askCredentialResumeSchema.safeParse(tc.output) : null;
		return {
			...base,
			toolName: ASK_CREDENTIAL_TOOL_NAME,
			input: input.data,
			...(resolved?.success && { resolvedValue: resolved.data }),
		};
	}

	if (tc.tool === ASK_LLM_TOOL_NAME) {
		const input = askLlmInputSchema.safeParse(tc.input ?? {});
		if (!input.success) return undefined;
		const resolved = tc.output !== undefined ? askLlmResumeSchema.safeParse(tc.output) : null;
		return {
			...base,
			toolName: ASK_LLM_TOOL_NAME,
			input: input.data,
			...(resolved?.success && { resolvedValue: resolved.data }),
		};
	}

	const input = askQuestionInputSchema.safeParse(tc.input);
	if (!input.success) return undefined;
	const resolved = tc.output !== undefined ? askQuestionResumeSchema.safeParse(tc.output) : null;
	return {
		...base,
		toolName: ASK_QUESTION_TOOL_NAME,
		input: input.data,
		...(resolved?.success && { resolvedValue: resolved.data }),
	};
}

/**
 * Convert persisted agent messages into the frontend ChatMessage format.
 *
 * Whenever a tool call is interactive, we attach a reconstructed
 * `InteractivePayload` so the UI re-renders the card in either its open
 * (awaiting user) or resolved (disabled) state.
 */
export function convertDbMessages(dbMessages: AgentPersistedMessageDto[]): ChatMessage[] {
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

				const rebuilt = rebuildInteractiveFromHistory(toolCall);
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
