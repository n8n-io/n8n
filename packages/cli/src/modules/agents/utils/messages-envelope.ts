import { redactDeep, type SerializableAgentState } from '@n8n/agents';
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
 * Whether a checkpoint part is an open call that still waits. The checkpoint also holds the
 * thread history, where a settled call with the same id and tool is an earlier call.
 */
function isWaitingToolCallPart(
	part: MessageContentPart,
	open: OpenToolCalls,
): part is ToolCallContentPart {
	return isOpenToolCallPart(part, open) && !isTerminalToolCallPart(part);
}

function openToolCallIdsIn(message: AgentPersistedMessageDto, open: OpenToolCalls): string[] {
	return message.content
		.filter((part) => isOpenToolCallPart(part, open))
		.map((part) => part.toolCallId);
}

function waitingToolCallIdsIn(message: AgentPersistedMessageDto, open: OpenToolCalls): string[] {
	return message.content
		.filter((part) => isWaitingToolCallPart(part, open))
		.map((part) => part.toolCallId);
}

function mergeOpenSuspendedToolCalls(
	existing: AgentPersistedMessageDto,
	checkpoint: AgentPersistedMessageDto,
	open: OpenToolCalls,
): AgentPersistedMessageDto {
	const checkpointParts = new Map<string, ToolCallContentPart>();
	for (const part of checkpoint.content) {
		if (isWaitingToolCallPart(part, open)) checkpointParts.set(part.toolCallId, part);
	}

	let matchedAny = false;
	const content = existing.content.map((part) => {
		if (!isOpenToolCallPart(part, open)) return part;
		const checkpointPart = checkpointParts.get(part.toolCallId);
		if (!checkpointPart) return part;

		matchedAny = true;
		if (isTerminalToolCallPart(part)) return part;
		return { ...part, ...checkpointPart };
	});

	if (!matchedAny) return checkpoint;

	return {
		...existing,
		content,
	};
}

/** Where each open call is in the persisted history. The latest message with the call wins. */
function indexByOpenToolCallId(
	messages: AgentPersistedMessageDto[],
	open: OpenToolCalls,
): Map<string, number> {
	const indexes = new Map<string, number>();
	for (const [index, message] of messages.entries()) {
		for (const toolCallId of openToolCallIdsIn(message, open)) indexes.set(toolCallId, index);
	}
	return indexes;
}

function mergeCheckpointMessages(
	messages: AgentPersistedMessageDto[],
	checkpointMessages: AgentPersistedMessageDto[],
	open: OpenToolCalls,
	options: WithOpenSuspensionsOptions,
): AgentPersistedMessageDto[] {
	const merged = [...messages];
	const byId = new Map(messages.map((m, index) => [m.id, index]));
	const existingIndexByOpenToolCallId = indexByOpenToolCallId(messages, open);
	const checkpointTurnAlreadyPersisted = checkpointMessages.some((message) =>
		waitingToolCallIdsIn(message, open).some((id) => existingIndexByOpenToolCallId.has(id)),
	);
	const skipInactive =
		checkpointTurnAlreadyPersisted || options.appendInactiveCheckpointMessages === false;

	for (const checkpointMessage of checkpointMessages) {
		const waitingIds = waitingToolCallIdsIn(checkpointMessage, open);
		const matchingId = waitingIds.find((id) => existingIndexByOpenToolCallId.has(id));
		const targetIndex =
			byId.get(checkpointMessage.id) ??
			(matchingId === undefined ? undefined : existingIndexByOpenToolCallId.get(matchingId));

		if (targetIndex !== undefined) {
			if (waitingIds.length > 0) {
				merged[targetIndex] = mergeOpenSuspendedToolCalls(
					merged[targetIndex],
					checkpointMessage,
					open,
				);
			}
			continue;
		}
		if (skipInactive && waitingIds.length === 0) continue;

		byId.set(checkpointMessage.id, merged.length);
		merged.push(checkpointMessage);
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
