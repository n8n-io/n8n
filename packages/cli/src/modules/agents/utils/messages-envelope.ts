import type { SerializableAgentState } from '@n8n/agents';
import type { AgentChatMessagesResponse, AgentPersistedMessageDto } from '@n8n/api-types';

import { messagesToDto } from '../agent-message-mapper';

function hasOpenSuspendedToolCall(
	message: AgentPersistedMessageDto,
	openToolCallIds: Set<string>,
): boolean {
	return message.content.some(
		(part) =>
			part.type === 'tool-call' &&
			typeof part.toolCallId === 'string' &&
			openToolCallIds.has(part.toolCallId),
	);
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

	for (const checkpointMessage of messagesToDto(checkpoint.messageList.messages)) {
		const existingIndex = byId.get(checkpointMessage.id);
		if (existingIndex === undefined) {
			byId.set(checkpointMessage.id, merged.length);
			merged.push(checkpointMessage);
			continue;
		}

		if (hasOpenSuspendedToolCall(checkpointMessage, openToolCallIds)) {
			merged[existingIndex] = checkpointMessage;
		}
	}

	return { messages: merged, openSuspensions };
}
