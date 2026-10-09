import { redactDeep, redactText, type SerializableAgentState } from '@n8n/agents';
import { isDeepStrictEqual } from 'node:util';
import type {
	AgentBuilderOpenSuspension,
	AgentChatMessagesResponse,
	AgentPersistedMessageDto,
} from '@n8n/api-types';

import { messagesToDto } from '../agent-message-mapper';
import { isApprovalSuspendPayload } from '../integrations/agent-chat-suspension-cards';
import {
	isTerminalToolCallPart,
	isToolCallWithId,
	type ToolCallContentPart,
} from './tool-call-parts';

type MessageContentPart = AgentPersistedMessageDto['content'][number];

interface WithOpenSuspensionsOptions {
	appendInactiveCheckpointMessages?: boolean;
}

/**
 * The tool calls that wait for an answer: the tool name of each, by tool call id. A model can
 * use an id again in a later turn, so a part with the same id but another tool is another call.
 */
type OpenToolCalls = ReadonlyMap<string, string | undefined>;

/** The checkpoint part of an open call that still waits. */
interface WaitingCall {
	/** The id of the checkpoint message that holds the part. */
	messageId: string;
	part: ToolCallContentPart;
	/** How many parts with the identity of the call the checkpoint holds before this part. */
	earlierCopies: number;
}

/** A persisted part with the identity of an open call. */
interface PersistedCopy {
	messageIndex: number;
	partIndex: number;
	terminal: boolean;
	/**
	 * `waiting`: the message has the id of the checkpoint message of the waiting part.
	 * `earlier`: the checkpoint holds the message as an earlier message, so the part is an
	 * earlier call. `unknown`: the checkpoint does not hold the message (another id scheme).
	 */
	place: 'waiting' | 'earlier' | 'unknown';
}

/** The waiting checkpoint part of an open call and the persisted part that is the same call. */
interface OpenCallMatch {
	waiting?: WaitingCall;
	target?: PersistedCopy;
}

const REDACT_SENSITIVE = { redactSensitiveKeys: true };

function openToolCallsOf(checkpoint: SerializableAgentState): OpenToolCalls {
	const open = new Map<string, string | undefined>();
	for (const call of Object.values(checkpoint.pendingToolCalls ?? {})) {
		// The checkpoint is parsed JSON. An entry without a tool name matches by id alone.
		if (call.suspended) open.set(call.toolCallId, call.toolName || undefined);
	}
	return open;
}

function openSuspensionsOf(checkpoint: SerializableAgentState): AgentBuilderOpenSuspension[] {
	return Object.values(checkpoint.pendingToolCalls ?? {})
		.filter((tc) => tc.suspended)
		.map((tc) => ({
			toolCallId: tc.toolCallId,
			runId: tc.runId,
			suspendPayload: isApprovalSuspendPayload(tc.suspendPayload)
				? redactDeep(tc.suspendPayload, { redactSensitiveKeys: true }).value
				: tc.suspendPayload,
		}));
}

/**
 * The checkpoint holds the raw tool input and output. The recorded history replaces sensitive
 * values, and the teammates of a shared chat read this response too, so a checkpoint part that
 * reaches the response gets the same treatment.
 */
function redactToolCallPart(part: MessageContentPart): MessageContentPart {
	if (part.type !== 'tool-call') return part;
	return {
		...part,
		...(part.input !== undefined && { input: redactDeep(part.input, REDACT_SENSITIVE).value }),
		...(part.output !== undefined && { output: redactDeep(part.output, REDACT_SENSITIVE).value }),
		...(part.error !== undefined && { error: redactText(part.error).text }),
	};
}

function redactCheckpointMessage(message: AgentPersistedMessageDto): AgentPersistedMessageDto {
	return { ...message, content: message.content.map(redactToolCallPart) };
}

/** Whether the part is an open call or an earlier copy of it: the same id and the same tool. */
function isOpenToolCallPart(
	part: MessageContentPart,
	open: OpenToolCalls,
): part is ToolCallContentPart {
	if (!isToolCallWithId(part) || !open.has(part.toolCallId)) return false;
	const toolName = open.get(part.toolCallId);
	return toolName === undefined || part.toolName === toolName;
}

/**
 * The checkpoint part of each open call that still waits. The checkpoint also holds the thread
 * history, where a settled part with the same identity is an earlier call.
 */
function waitingCallsIn(
	messages: AgentPersistedMessageDto[],
	open: OpenToolCalls,
): Map<string, WaitingCall> {
	const copies = new Map<string, number>();
	const waiting = new Map<string, WaitingCall>();
	for (const message of messages) {
		for (const part of message.content) {
			if (!isOpenToolCallPart(part, open)) continue;
			const earlierCopies = copies.get(part.toolCallId) ?? 0;
			if (!isTerminalToolCallPart(part)) {
				waiting.set(part.toolCallId, { messageId: message.id, part, earlierCopies });
			}
			copies.set(part.toolCallId, earlierCopies + 1);
		}
	}
	return waiting;
}

function persistedCopiesOf(
	messages: AgentPersistedMessageDto[],
	toolCallId: string,
	open: OpenToolCalls,
	placeOf: (messageId: string) => PersistedCopy['place'],
): PersistedCopy[] {
	return messages.flatMap((message, messageIndex) =>
		message.content.flatMap((part, partIndex) =>
			isOpenToolCallPart(part, open) && part.toolCallId === toolCallId
				? [
						{
							messageIndex,
							partIndex,
							terminal: isTerminalToolCallPart(part),
							place: placeOf(message.id),
						},
					]
				: [],
		),
	);
}

/**
 * The persisted part that is the open call. When the history holds the waiting checkpoint
 * message (the same id), the part in that message is the call, if the message has it yet.
 * Otherwise the call is the latest part with its identity, when that part still waits. A
 * settled latest part is the call only when the history holds more parts with the identity
 * than the checkpoint holds before the waiting part: the user answered, and the checkpoint is
 * not removed yet. Otherwise the history does not hold the call yet.
 */
function persistedCallOf(
	copies: PersistedCopy[],
	waiting: WaitingCall | undefined,
	waitingMessagePersisted: boolean,
): PersistedCopy | undefined {
	const inWaitingMessage = copies.findLast((copy) => copy.place === 'waiting');
	if (inWaitingMessage !== undefined || waitingMessagePersisted) return inWaitingMessage;
	const latest = copies.at(-1);
	if (latest?.place !== 'unknown') return undefined;
	if (!latest.terminal) return latest;
	return waiting !== undefined && copies.length > waiting.earlierCopies ? latest : undefined;
}

function matchOpenCalls(
	messages: AgentPersistedMessageDto[],
	checkpointMessages: AgentPersistedMessageDto[],
	open: OpenToolCalls,
): Map<string, OpenCallMatch> {
	const waitingCalls = waitingCallsIn(checkpointMessages, open);
	const checkpointIds = new Set(checkpointMessages.map(({ id }) => id));
	const persistedIds = new Set(messages.map(({ id }) => id));
	const matches = new Map<string, OpenCallMatch>();
	for (const toolCallId of open.keys()) {
		const waiting = waitingCalls.get(toolCallId);
		const placeOf = (messageId: string): PersistedCopy['place'] => {
			if (messageId === waiting?.messageId) return 'waiting';
			return checkpointIds.has(messageId) ? 'earlier' : 'unknown';
		};
		const copies = persistedCopiesOf(messages, toolCallId, open, placeOf);
		const waitingMessagePersisted = waiting !== undefined && persistedIds.has(waiting.messageId);
		matches.set(toolCallId, {
			waiting,
			target: persistedCallOf(copies, waiting, waitingMessagePersisted),
		});
	}
	return matches;
}

/**
 * The input to show for the waiting call. The recorded input stays when it is the input of the
 * same call: it is complete, while the redaction of the checkpoint input withholds deep values.
 * In a short window the persisted part can be an earlier open call with the identity of the
 * waiting call and another input. The answer resumes the checkpoint call, so its input wins.
 */
function inputOfWaitingCall(recorded: unknown, checkpoint: unknown): unknown {
	if (recorded === undefined) return checkpoint;
	if (checkpoint === undefined) return recorded;
	const sameCall = isDeepStrictEqual(redactDeep(recorded, REDACT_SENSITIVE).value, checkpoint);
	return sameCall ? recorded : checkpoint;
}

/** The checkpoint fills in the waiting call. Its values have sensitive values replaced. */
function mergeWaitingPart(part: MessageContentPart, waiting: WaitingCall): MessageContentPart {
	if (isTerminalToolCallPart(part)) return part;
	const checkpointPart = redactToolCallPart(waiting.part);
	const input = inputOfWaitingCall(part.input, checkpointPart.input);
	return { ...part, ...checkpointPart, ...(input !== undefined && { input }) };
}

/**
 * Fills each persisted open call from the checkpoint. Every other part with the id of an open
 * call that has no result is an earlier call that never got one (for example a card that the
 * user stopped, with an id that a later call uses again). It is marked as cancelled, so the
 * chat does not show it as the open call.
 */
function settlePersistedCalls(
	messages: AgentPersistedMessageDto[],
	matches: Map<string, OpenCallMatch>,
): AgentPersistedMessageDto[] {
	return messages.map((message, messageIndex) => {
		let changed = false;
		const content = message.content.map((part, partIndex) => {
			if (!isToolCallWithId(part) || isTerminalToolCallPart(part)) return part;
			const match = matches.get(part.toolCallId);
			if (!match) return part;
			changed = true;
			const { target, waiting } = match;
			if (target?.messageIndex !== messageIndex || target.partIndex !== partIndex) {
				return { ...part, canceled: true };
			}
			return waiting ? mergeWaitingPart(part, waiting) : part;
		});
		return changed ? { ...message, content } : message;
	});
}

function waitingMatchesIn(
	message: AgentPersistedMessageDto,
	matches: Map<string, OpenCallMatch>,
): OpenCallMatch[] {
	return [...matches.values()].filter(({ waiting }) => waiting?.messageId === message.id);
}

function mergeCheckpointMessages(
	messages: AgentPersistedMessageDto[],
	checkpointMessages: AgentPersistedMessageDto[],
	open: OpenToolCalls,
	options: WithOpenSuspensionsOptions,
): AgentPersistedMessageDto[] {
	const matches = matchOpenCalls(messages, checkpointMessages, open);
	const merged = settlePersistedCalls(messages, matches);
	const indexById = new Map(messages.map(({ id }, index) => [id, index]));
	const checkpointTurnAlreadyPersisted = [...matches.values()].some(
		({ waiting, target }) => waiting !== undefined && target !== undefined,
	);
	const skipInactive =
		checkpointTurnAlreadyPersisted || options.appendInactiveCheckpointMessages === false;

	for (const checkpointMessage of checkpointMessages) {
		const waitingMatches = waitingMatchesIn(checkpointMessage, matches);
		const existingIndex = indexById.get(checkpointMessage.id);
		if (waitingMatches.length === 0) {
			if (existingIndex !== undefined || skipInactive) continue;
		} else if (waitingMatches.some(({ target }) => target !== undefined)) {
			continue;
		} else if (existingIndex !== undefined) {
			// The persisted copy of the message does not hold the waiting call yet.
			merged[existingIndex] = redactCheckpointMessage(checkpointMessage);
			continue;
		}

		indexById.set(checkpointMessage.id, merged.length);
		merged.push(redactCheckpointMessage(checkpointMessage));
	}

	return merged;
}

/**
 * Merge an open suspended checkpoint into already-persisted history and
 * surface the open-suspensions sidecar (parent tool/run ids plus the client-safe
 * suspend payload) so the FE can re-arm suspended interactive cards after a
 * refresh. Used by the chat controller's
 * `GET /:agentId/chat/:threadId/messages` and `GET /:agentId/chat/messages`
 * envelopes.
 *
 * The input `messages` must already be in DTO form (the caller converts raw
 * memory before passing it here). Checkpoint messages are converted here so
 * same-id suspended copies can replace stale persisted copies when needed.
 */
export function withOpenSuspensions(
	messages: AgentPersistedMessageDto[],
	checkpoint: SerializableAgentState | null,
	options: WithOpenSuspensionsOptions = {},
): AgentChatMessagesResponse {
	if (!checkpoint) return { messages, openSuspensions: [] };

	return {
		messages: mergeCheckpointMessages(
			messages,
			messagesToDto(checkpoint.messageList.messages),
			openToolCallsOf(checkpoint),
			options,
		),
		openSuspensions: openSuspensionsOf(checkpoint),
	};
}
