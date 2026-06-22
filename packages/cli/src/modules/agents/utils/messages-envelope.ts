import type { SerializableAgentState } from '@n8n/agents';
import type { AgentChatMessagesResponse, AgentPersistedMessageDto } from '@n8n/api-types';

import { messagesToDto } from '../agent-message-mapper';

type MessageContentPart = AgentPersistedMessageDto['content'][number];

function getOpenSuspendedToolCallIds(
	message: AgentPersistedMessageDto,
	openToolCallIds: Set<string>,
): string[] {
	const ids: string[] = [];
	for (const part of message.content) {
		if (
			part.type === 'tool-call' &&
			typeof part.toolCallId === 'string' &&
			openToolCallIds.has(part.toolCallId)
		) {
			ids.push(part.toolCallId);
		}
	}
	return ids;
}

function mergeOpenSuspendedToolCalls(
	existing: AgentPersistedMessageDto,
	checkpoint: AgentPersistedMessageDto,
	openToolCallIds: Set<string>,
): AgentPersistedMessageDto {
	const checkpointParts = new Map<string, MessageContentPart>();
	for (const part of checkpoint.content) {
		if (
			part.type === 'tool-call' &&
			typeof part.toolCallId === 'string' &&
			openToolCallIds.has(part.toolCallId)
		) {
			checkpointParts.set(part.toolCallId, part);
		}
	}

	let mergedAny = false;
	const content = existing.content.map((part) => {
		if (part.type !== 'tool-call' || typeof part.toolCallId !== 'string') return part;
		const checkpointPart = checkpointParts.get(part.toolCallId);
		if (!checkpointPart) return part;

		mergedAny = true;
		return { ...part, ...checkpointPart };
	});

	if (!mergedAny) return checkpoint;

	return {
		...existing,
		content,
	};
}

/**
 * Merge an open suspended checkpoint into already-persisted history and
 * surface the open-suspensions sidecar (toolCallId + runId) so the FE can
 * re-arm suspended interactive cards after a refresh. Same contract as
 * GET /build/messages.
 *
 * The input `messages` must already be in DTO form (the caller converts raw
 * memory before passing it here). Checkpoint messages are converted here so
 * same-id suspended copies can replace stale persisted copies when needed.
 */
export function withOpenSuspensions(
	messages: AgentPersistedMessageDto[],
	checkpoint: SerializableAgentState | null,
): AgentChatMessagesResponse {
	if (!checkpoint) return { messages, openSuspensions: [] };

	const openSuspensions = Object.values(checkpoint.pendingToolCalls ?? {})
		.filter((tc) => tc.suspended)
		.map((tc) => ({ toolCallId: tc.toolCallId, runId: tc.runId }));

	const openToolCallIds = new Set(openSuspensions.map((s) => s.toolCallId));
	const merged = [...messages];
	const byId = new Map(messages.map((m, index) => [m.id, index]));
	const existingIndexByOpenToolCallId = new Map<string, number>();
	for (const [index, message] of messages.entries()) {
		for (const toolCallId of getOpenSuspendedToolCallIds(message, openToolCallIds)) {
			existingIndexByOpenToolCallId.set(toolCallId, index);
		}
	}

	const checkpointMessages = messagesToDto(checkpoint.messageList.messages);
	const checkpointTurnAlreadyPersisted = checkpointMessages.some((message) =>
		getOpenSuspendedToolCallIds(message, openToolCallIds).some((toolCallId) =>
			existingIndexByOpenToolCallId.has(toolCallId),
		),
	);

	for (const checkpointMessage of checkpointMessages) {
		const checkpointToolCallIds = getOpenSuspendedToolCallIds(checkpointMessage, openToolCallIds);
		const existingIndex = byId.get(checkpointMessage.id);
		if (existingIndex === undefined) {
			const matchingToolCallId = checkpointToolCallIds.find((toolCallId) =>
				existingIndexByOpenToolCallId.has(toolCallId),
			);
			const matchingIndex =
				matchingToolCallId === undefined
					? undefined
					: existingIndexByOpenToolCallId.get(matchingToolCallId);

			if (matchingIndex !== undefined) {
				merged[matchingIndex] = mergeOpenSuspendedToolCalls(
					merged[matchingIndex],
					checkpointMessage,
					openToolCallIds,
				);
				continue;
			}

			if (checkpointTurnAlreadyPersisted && checkpointToolCallIds.length === 0) continue;

			byId.set(checkpointMessage.id, merged.length);
			merged.push(checkpointMessage);
			continue;
		}

		if (checkpointToolCallIds.length > 0) {
			merged[existingIndex] = mergeOpenSuspendedToolCalls(
				merged[existingIndex],
				checkpointMessage,
				openToolCallIds,
			);
		}
	}

	return { messages: merged, openSuspensions };
}
