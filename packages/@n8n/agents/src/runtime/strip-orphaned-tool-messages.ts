import { isLlmMessage } from '../sdk/message';
import type { AgentDbMessage, MessageContent } from '../types/sdk/message';

/**
 * Strip orphaned tool-call and tool-result content from a message list.
 *
 * When memory loads the last N messages, the window boundary can split
 * tool-call / tool-result pairs, leaving one side without its counterpart.
 * Sending these orphans to the LLM causes provider errors because tool
 * calls and results must always be paired.
 *
 * This function:
 *  1. Collects all toolCallIds present in tool-call and tool-result blocks.
 *  2. Identifies orphans — calls without a matching result and vice-versa.
 *  3. Strips orphaned content blocks from their messages.
 *  4. Drops messages that become empty after stripping (e.g. a tool message
 *     whose only content was the orphaned result).
 *  5. Preserves non-tool content (text, reasoning, files) in mixed messages.
 */
export function stripOrphanedToolMessages(messages: AgentDbMessage[]): AgentDbMessage[] {
	const callIds = new Set<string>();
	const resultIds = new Set<string>();

	for (const msg of messages) {
		if (!isLlmMessage(msg)) continue;
		for (const block of msg.content) {
			if (block.type === 'tool-call' && block.toolCallId) {
				callIds.add(block.toolCallId);
			} else if (block.type === 'tool-result' && block.toolCallId) {
				resultIds.add(block.toolCallId);
			}
		}
	}

	const orphanedCallIds = new Set([...callIds].filter((id) => !resultIds.has(id)));
	const orphanedResultIds = new Set([...resultIds].filter((id) => !callIds.has(id)));

	if (orphanedCallIds.size === 0 && orphanedResultIds.size === 0) {
		return messages;
	}

	const result: AgentDbMessage[] = [];

	for (const msg of messages) {
		if (!isLlmMessage(msg)) {
			result.push(msg);
			continue;
		}

		const filtered = msg.content.filter((block: MessageContent) => {
			if (block.type === 'tool-call' && block.toolCallId && orphanedCallIds.has(block.toolCallId)) {
				return false;
			}
			if (
				block.type === 'tool-result' &&
				block.toolCallId &&
				orphanedResultIds.has(block.toolCallId)
			) {
				return false;
			}
			return true;
		});

		if (filtered.length === 0) continue;

		result.push({ ...msg, content: filtered });
	}

	return result;
}
