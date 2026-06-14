import type { SerializableAgentState } from '@n8n/agents';
import type { AgentChatMessagesResponse, AgentPersistedMessageDto } from '@n8n/api-types';

import { messagesToDto } from '../agent-message-mapper';

/**
 * Merge an open suspended checkpoint into already-persisted history and
 * surface the open-suspensions sidecar (toolCallId + runId) so the FE can
 * re-arm suspended interactive cards after a refresh. Same contract as
 * GET /build/messages.
 *
 * The input `messages` must already be in DTO form (the caller converts raw
 * memory before passing it here). Only the checkpoint's additional messages
 * go through `messagesToDto`.
 */
export function withOpenSuspensions(
	messages: AgentPersistedMessageDto[],
	checkpoint: SerializableAgentState | null,
): AgentChatMessagesResponse {
	if (!checkpoint) return { messages, openSuspensions: [] };

	const openSuspensions = Object.values(checkpoint.pendingToolCalls ?? {})
		.filter((tc) => tc.suspended)
		.map((tc) => ({ toolCallId: tc.toolCallId, runId: tc.runId }));

	const persistedIds = new Set(messages.map((m) => m.id));
	const newFromCheckpoint = checkpoint.messageList.messages.filter((m) => !persistedIds.has(m.id));
	return { messages: [...messages, ...messagesToDto(newFromCheckpoint)], openSuspensions };
}
