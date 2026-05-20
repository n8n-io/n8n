import { isLlmMessage } from '../sdk/message';
import type { AgentMessage, MessageContent } from '../types/sdk/message';

/**
 * Strip pending tool-call blocks from a message list before sending to the LLM.
 *
 * This function:
 *  1. Drops any tool-call block whose state is 'pending'.
 *  2. Drops empty reasoning blocks, which only carry provider bookkeeping.
 *  3. If a message becomes empty after stripping, drops the message entirely.
 *  4. Preserves all other content (text, reasoning, files, resolved/rejected
 *     tool-call blocks, and non-LLM custom messages).
 */
export function stripOrphanedToolMessages<T extends AgentMessage>(messages: T[]): T[] {
	const result: T[] = [];

	for (const msg of messages) {
		if (!isLlmMessage(msg)) {
			result.push(msg);
			continue;
		}

		const filtered = msg.content.filter((block: MessageContent) => {
			if (block.type === 'tool-call' && block.state === 'pending') {
				return false;
			}
			if (block.type === 'reasoning' && block.text.trim() === '') {
				return false;
			}
			return true;
		});

		if (filtered.length === 0) continue;

		result.push({ ...msg, content: filtered });
	}

	return result;
}
