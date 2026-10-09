import {
	APPROVAL_TOOL_NAME,
	N8N_CHAT_ACTION_TOOL_NAME,
	WAIT_TOOL_NAME,
	type AgentBuilderOpenSuspension,
	type AgentPersistedMessageContentPart,
	type AgentPersistedMessageDto,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import {
	ASSISTANT_CONFIRMATION_TOOL_NAME,
	parseAssistantConfirmationInput,
} from './assistantConfirmation';
import {
	isAwaitingCard,
	n8nChatResumeValueSchema,
	parseN8nChatActionInput,
	parseWaitSuspendPayload,
} from './n8nChatInteraction';

import { CHAT_MESSAGE_STATUS, TOOL_CALL_STATE } from './constants';
import { isDelegateSubAgentTool } from './delegateTool';
import {
	getPersistedPartSegmentKind,
	getSegmentMessageId,
	getTailSegments,
	splitIntoSegments,
} from './messageSegments';
import {
	isSettledToolCall,
	openSuspensionOf,
	reconcileMessageStatus,
	settleUnfinishedToolCall,
	type OpenSuspensionsById,
} from './openSuspensionState';
import {
	attachmentFromPersistedPart,
	reasoningSegmentFromPersistedPart,
	toolCallFromPersistedPart,
} from './persistedParts';
import type {
	ApprovalInput,
	ChatMessage,
	ChatMessageAttachment,
	ChatMessageRenderPart,
	InteractivePayload,
	ThinkingSegment,
	ToolCall,
} from './types';

type MessageWithInteractives = Pick<ChatMessage, 'interactive' | 'interactives'>;

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

type TailMessage = MessageWithInteractives & Pick<ChatMessage, 'id' | 'segmentOf'>;

/**
 * The open interactive on the last turn, which is the one that owns the chat
 * input and any steering. A parked run is always the tail of the transcript, so
 * an unresolved card further up belongs to a turn the conversation already moved
 * past — `findOpenInteractive` returns those too, and acting on them would
 * answer or cancel the wrong tool call. The tail is the whole last output: text
 * after the card in the same output is a later segment of it.
 */
export function findTailOpenInteractive(messages: TailMessage[]): InteractivePayload | undefined {
	return findOpenInteractive(getTailSegments(messages));
}

/**
 * The open interactive on the last turn that a steering message is allowed to
 * cancel. A waiting card is never one: the workflow resumes it by itself, so
 * cancelling it because the user typed would abandon a run they never asked to
 * stop and leave the sub-workflow finishing into a checkpoint nobody reads.
 * Stopping a wait is a deliberate act — the card's own button, or Stop.
 */
export function findTailSteerableInteractive(
	messages: TailMessage[],
): InteractivePayload | undefined {
	return getTailSegments(messages)
		.flatMap(getMessageInteractives)
		.find((payload) => payload.resolvedAt === undefined && payload.toolName !== WAIT_TOOL_NAME);
}

/** True when a suspend payload is the approval tool's renderable input. */
export function isApprovalSuspendInput(value: unknown): boolean {
	return parseApprovalInput(value) !== undefined;
}

export function parseApprovalInput(value: unknown): ApprovalInput | undefined {
	if (!isRecord(value)) return undefined;
	if (value.type !== 'approval') return undefined;
	if (typeof value.toolName !== 'string' || value.toolName.length === 0) return undefined;
	return {
		type: 'approval',
		toolName: value.toolName,
		...(value.supportsSessionApproval === true && { supportsSessionApproval: true }),
		...(typeof value.displayName === 'string' &&
			value.displayName.length > 0 && { displayName: value.displayName }),
		args: value.args,
	};
}

function isDeclinedToolOutput(value: unknown): boolean {
	return isRecord(value) && value.declined === true;
}

/**
 * Given a tool call belonging to one of the interactive tools still rendered
 * in agents chat (`approval`, `chat_action`) — or a workflow tool parked on a
 * Wait node — reconstruct an `InteractivePayload` for it. The result is:
 *
 * - **resolved**: when `output` is present.
 * - **open**: when `output` is absent — the card renders as an active
 *   awaiting-user prompt. Used when a refresh during a suspension restored the
 *   suspended assistant turn from the open checkpoint.
 *
 * Returns `undefined` when the tool name isn't interactive or input parsing fails.
 */
export function rebuildInteractiveFromHistory(tc: ToolCall): InteractivePayload | undefined {
	const approvalInput = parseApprovalInput(tc.suspendPayload) ?? parseApprovalInput(tc.input);
	if (approvalInput) {
		const resolved = tc.output !== undefined;
		return {
			toolCallId: tc.toolCallId,
			...(resolved && { resolvedAt: 1 }),
			...(tc.canceled === true && { cancelled: true }),
			toolName: APPROVAL_TOOL_NAME,
			input: approvalInput,
			...(resolved &&
				tc.canceled !== true &&
				!isDelegateSubAgentTool(tc.tool) && {
					resolvedValue: { approved: !isDeclinedToolOutput(tc.output) },
				}),
		};
	}

	// An n8n Assistant confirmation: many Assistant tools suspend with the same
	// confirmation payload, so the payload shape is the discriminator.
	const parsedAssistantInput = parseAssistantConfirmationInput(tc.suspendPayload);
	if (parsedAssistantInput) {
		// The suspend payload often omits the tool, which "Always allow" keys on.
		const assistantInput = {
			...parsedAssistantInput,
			toolName: parsedAssistantInput.toolName ?? tc.tool,
			args: parsedAssistantInput.args ?? (isRecord(tc.input) ? tc.input : {}),
		};
		const resolved = tc.output !== undefined;
		return {
			toolCallId: tc.toolCallId,
			...(resolved && { resolvedAt: 1 }),
			...(tc.canceled === true && { cancelled: true }),
			toolName: ASSISTANT_CONFIRMATION_TOOL_NAME,
			input: assistantInput,
			call: { toolName: tc.tool, input: tc.input, suspendPayload: tc.suspendPayload },
			...(resolved && tc.canceled !== true && { resolvedValue: tc.output }),
		};
	}

	// A workflow tool waiting on a Wait node: the tool name is per-workflow, so
	// the suspend payload's own marker is the only discriminator.
	const waitInput = parseWaitSuspendPayload(tc.suspendPayload);
	if (waitInput) {
		const resolved = tc.output !== undefined ? n8nChatResumeValueSchema.safeParse(tc.output) : null;
		return {
			toolCallId: tc.toolCallId,
			...(tc.output !== undefined && { resolvedAt: 1 }),
			...(tc.canceled === true && { cancelled: true }),
			toolName: WAIT_TOOL_NAME,
			input: waitInput,
			...(tc.canceled !== true && resolved?.success && { resolvedValue: resolved.data }),
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
			...(tc.canceled === true && { cancelled: true }),
			toolName: N8N_CHAT_ACTION_TOOL_NAME,
			input,
			...(tc.canceled !== true && resolved?.success && { resolvedValue: resolved.data }),
		};
	}

	return undefined;
}

type PersistedPartEntry = [index: number, part: AgentPersistedMessageContentPart];

interface HistoryMessageContext {
	msg: AgentPersistedMessageDto;
	role: ChatMessage['role'];
	/** The persisted id. The first segment keeps it. */
	messageId: string;
	failed: boolean;
}

interface SegmentContent {
	text: string;
	thinking: string;
	thinkingSegments: ThinkingSegment[];
	toolCalls: ToolCall[];
	renderParts: ChatMessageRenderPart[];
	interactives: InteractivePayload[];
	attachments: ChatMessageAttachment[];
	awaitingUser: boolean;
}

function toChatRole(msg: AgentPersistedMessageDto): ChatMessage['role'] | null {
	if (!Array.isArray(msg.content)) return null;
	return msg.role === 'user' ? 'user' : msg.role === 'assistant' ? 'assistant' : null;
}

/** An open card puts the message, and the call, in the awaiting-user state. */
function addInteractive(
	context: HistoryMessageContext,
	content: SegmentContent,
	toolCall: ToolCall,
	interactive: InteractivePayload,
): void {
	if (
		interactive.resolvedAt === undefined &&
		!context.failed &&
		context.msg.executionStatus !== 'running'
	) {
		toolCall.state = TOOL_CALL_STATE.SUSPENDED;
		content.awaitingUser = true;
	}
	content.interactives.push(interactive);
	content.renderParts.push({ type: 'interactive', toolCallId: interactive.toolCallId });
}

function addPart(
	context: HistoryMessageContext,
	content: SegmentContent,
	[partIndex, part]: PersistedPartEntry,
): void {
	if (part.type === 'text' && part.text) {
		content.text += part.text;
		content.renderParts.push({ type: 'text', text: part.text });
	} else if (part.type === 'file' && part.fileId) {
		content.attachments.push(attachmentFromPersistedPart(part, part.fileId));
	} else if (part.type === 'reasoning' && part.text) {
		content.thinking += part.text;
		// The index in the whole persisted message keeps the id stable.
		const id = `${context.messageId}:reasoning:${partIndex}`;
		content.thinkingSegments.push(reasoningSegmentFromPersistedPart(part, part.text, id));
	} else if (part.type === 'tool-call' && part.toolName) {
		const toolCall = toolCallFromPersistedPart(part, part.toolName, context.failed);
		content.toolCalls.push(toolCall);
		const interactive = rebuildInteractiveFromHistory(toolCall);
		if (interactive) addInteractive(context, content, toolCall, interactive);
	}
}

function historyStatus(
	context: HistoryMessageContext,
	awaitingUser: boolean,
): ChatMessage['status'] {
	if (awaitingUser) return CHAT_MESSAGE_STATUS.AWAITING_USER;
	if (context.failed) return CHAT_MESSAGE_STATUS.ERROR;
	return context.msg.executionStatus === 'running' ? CHAT_MESSAGE_STATUS.STREAMING : undefined;
}

/** Fields that come from the persisted message and not from its parts. */
function historyMessageFields(
	context: HistoryMessageContext,
	segmentIndex: number,
): Partial<ChatMessage> {
	const { msg, role } = context;
	// A malformed wire timestamp must not reach the transcript as NaN: it would
	// silence every later timestamp divider in the chat.
	const createdAt = msg.createdAt ? Date.parse(msg.createdAt) : NaN;
	return {
		...(msg.author && { author: msg.author }),
		...(msg.executionId ? { executionId: msg.executionId } : {}),
		...(segmentIndex > 0 && { segmentOf: context.messageId }),
		// Only the first segment carries the signal: each copy renders its own card.
		...(role === 'assistant' && segmentIndex === 0 && msg.backgroundTaskSignal
			? { backgroundJobSignal: msg.backgroundTaskSignal }
			: {}),
		...(Number.isFinite(createdAt) && { createdAt }),
	};
}

function convertSegment(
	context: HistoryMessageContext,
	entries: PersistedPartEntry[],
	segmentIndex: number,
): ChatMessage {
	const content: SegmentContent = {
		text: '',
		thinking: '',
		thinkingSegments: [],
		toolCalls: [],
		renderParts: [],
		interactives: [],
		attachments: [],
		awaitingUser: false,
	};
	for (const entry of entries) addPart(context, content, entry);

	const status = historyStatus(context, content.awaitingUser);
	const chatMessage: ChatMessage = {
		...historyMessageFields(context, segmentIndex),
		id: getSegmentMessageId(context.messageId, segmentIndex),
		role: context.role,
		content: content.text,
		...(content.renderParts.length > 0 && { renderParts: content.renderParts }),
		thinking: content.thinking || undefined,
		...(content.thinkingSegments.length > 0 && { thinkingSegments: content.thinkingSegments }),
		toolCalls: content.toolCalls.length > 0 ? content.toolCalls : undefined,
		...(content.attachments.length > 0 && { attachments: content.attachments }),
		...(status && { status }),
	};
	setMessageInteractives(chatMessage, content.interactives);
	return chatMessage;
}

/**
 * Convert persisted agent messages into the frontend ChatMessage format.
 *
 * An assistant message becomes one ChatMessage for each run of text or of tool
 * calls, in persisted order, the same as the live stream. A user message stays
 * whole: callers read one message for each input.
 *
 * Whenever a tool call is interactive, we attach a reconstructed
 * `InteractivePayload` so the UI re-renders the card in either its open
 * (awaiting user) or resolved (disabled) state.
 */
export function convertDbMessages(dbMessages: AgentPersistedMessageDto[]): ChatMessage[] {
	const result: ChatMessage[] = [];

	for (const msg of dbMessages) {
		const role = toChatRole(msg);
		if (role === null) continue;

		const context: HistoryMessageContext = {
			msg,
			role,
			messageId: msg.id ?? crypto.randomUUID(),
			failed: msg.executionStatus === 'error' || msg.executionStatus === 'interrupted',
		};
		const entries = [...msg.content.entries()];
		const segments =
			role === 'assistant'
				? splitIntoSegments(entries, ([, part]) => getPersistedPartSegmentKind(part))
				: [entries];
		result.push(...segments.map((segment, index) => convertSegment(context, segment, index)));

		// A turn that ended in an error carries the recorded run error — render
		// it as its own error bubble, mirroring what the live stream showed.
		// Without this, an errored turn reloads as red-marked partial output (or
		// nothing at all) with no explanation.
		if (msg.executionError) {
			result.push({
				id: `${context.messageId}:error`,
				role: 'assistant',
				content: msg.executionError,
				toolCalls: [],
				status: CHAT_MESSAGE_STATUS.ERROR,
				...(msg.executionId ? { executionId: msg.executionId } : {}),
			});
		}
	}
	return result;
}

function reArmToolCall(
	msg: ChatMessage,
	toolCall: ToolCall,
	suspension: AgentBuilderOpenSuspension,
): void {
	toolCall.state = TOOL_CALL_STATE.SUSPENDED;
	toolCall.runId = suspension.runId;
	if (suspension.suspendPayload !== undefined) {
		toolCall.suspendPayload = suspension.suspendPayload;
	}
	const rebuilt = rebuildInteractiveFromHistory(toolCall);
	if (rebuilt) {
		rebuilt.runId = suspension.runId;
		upsertMessageInteractive(msg, rebuilt);
	}
}

/** Resolved cards stay. An open card stays only while its suspension is open. */
function retainedInteractives(
	msg: ChatMessage,
	byToolCallId: OpenSuspensionsById,
): InteractivePayload[] {
	return getMessageInteractives(msg).filter((interactive) => {
		if (interactive.resolvedAt !== undefined) return true;
		const suspension = openSuspensionOf(interactive, byToolCallId);
		if (suspension) interactive.runId = suspension.runId;
		return suspension !== undefined;
	});
}

/**
 * Reconcile unfinished tool calls and interactive cards with the suspensions
 * still open on the backend. The sidecar comes from chat history
 * (`openSuspensions`) — raw persisted messages don't carry runIds or enough
 * information to distinguish a live suspension from an interrupted run.
 *
 * Mutates `chat` in place (history-load happens before reactivity wraps the
 * messages, so this is safe and avoids an extra deep clone) and returns it
 * for ergonomic chaining.
 */
export function applyOpenSuspensions(
	chat: ChatMessage[],
	suspensions: AgentBuilderOpenSuspension[],
): ChatMessage[] {
	const byToolCallId = new Map(suspensions.map((s) => [s.toolCallId, s]));
	for (const msg of chat) {
		let hasOpenToolCall = false;
		for (const toolCall of msg.toolCalls ?? []) {
			if (isSettledToolCall(toolCall)) continue;

			const suspension = openSuspensionOf(
				{ toolCallId: toolCall.toolCallId, cancelled: toolCall.canceled },
				byToolCallId,
			);
			if (suspension) {
				reArmToolCall(msg, toolCall, suspension);
				hasOpenToolCall = true;
			} else {
				settleUnfinishedToolCall(msg, toolCall);
			}
		}

		setMessageInteractives(msg, retainedInteractives(msg, byToolCallId));
		reconcileMessageStatus(msg, hasOpenToolCall);
	}
	return chat;
}
