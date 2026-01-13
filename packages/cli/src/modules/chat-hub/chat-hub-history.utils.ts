import type { ChatHubMemoryMessage } from 'n8n-workflow';

import type { ChatHubMessage } from './chat-hub-message.entity';

/**
 * Builds a linear message history chain from a collection of messages,
 * handling edits (revisionOfMessageId) and regeneration (retryOfMessageId).
 *
 * The algorithm:
 * 1. Start from the lastMessageId (or find the most recent message)
 * 2. Walk backwards via previousMessageId
 * 3. Filter out messages that have been superseded by a revision or retry
 * 4. Return the chain in chronological order
 *
 * @param messages - All messages in the session
 * @param lastMessageId - Optional starting point; if not provided, uses the most recent message
 * @returns Messages in chronological order, with superseded messages filtered out
 */
export function buildMessageHistory(
	messages: ChatHubMessage[],
	lastMessageId: string | null,
): ChatHubMemoryMessage[] {
	if (messages.length === 0) return [];

	const messagesById = new Map(messages.map((m) => [m.id, m]));

	// Find starting point
	let current = lastMessageId;
	if (!current) {
		// Find the most recent message by createdAt
		const sorted = [...messages].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
		current = sorted[0]?.id;
	}

	if (!current) return [];

	// Build set of superseded message IDs
	// A message is superseded if another message exists that is a revision or retry of it
	const superseded = new Set<string>();
	for (const msg of messages) {
		if (msg.revisionOfMessageId) superseded.add(msg.revisionOfMessageId);
		if (msg.retryOfMessageId) superseded.add(msg.retryOfMessageId);
	}

	// Walk backwards to build chain
	const visited = new Set<string>();
	const historyIds: string[] = [];

	while (current && !visited.has(current)) {
		const message = messagesById.get(current);
		if (!message) break;

		// Skip superseded messages - they've been replaced by an edit or retry
		if (!superseded.has(current)) {
			historyIds.unshift(current);
		}

		visited.add(current);

		current = message.previousMessageId;
	}

	// Convert to output format
	return historyIds.map((id) => {
		const msg = messagesById.get(id)!;
		return {
			id: msg.id,
			type: msg.type,
			content: msg.content,
			name: msg.name,
			createdAt: msg.createdAt,
			previousMessageId: msg.previousMessageId,
			retryOfMessageId: msg.retryOfMessageId,
			revisionOfMessageId: msg.revisionOfMessageId,
			turnId: msg.turnId,
		};
	});
}

/**
 * Extracts the turn IDs from AI messages in a message history.
 * Turn IDs are correlation IDs linking memory entries to AI messages.
 * Memory entries are loaded based on the turnIds of active AI messages in the chain,
 * enabling proper branching on regeneration - superseded AI messages (and their memory)
 * are automatically excluded from the chain.
 *
 * @param messages - Message history (typically from buildMessageHistory)
 * @returns Array of turn IDs in chronological order (excluding null values)
 */
export function extractTurnIds(messages: ChatHubMemoryMessage[]): string[] {
	return messages
		.filter((msg) => msg.type === 'ai' && msg.turnId !== null)
		.map((msg) => msg.turnId!);
}
