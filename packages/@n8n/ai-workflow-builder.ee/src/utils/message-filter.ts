import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';

/**
 * Filter messages to prevent agent contamination while preserving agent's own context
 *
 * Problem: When agents share the full message history, they see each other's tool calls
 * and might try to "complete" or interfere with other agents' work.
 *
 * Solution: Keep a sliding window of recent messages, but ensure we never split
 * tool_call → tool_result pairs (Anthropic requirement).
 */

/**
 * Find a safe boundary for message slicing that won't orphan tool messages
 *
 * Anthropic requires: Each tool_result must have a corresponding tool_use in the previous message.
 * This means we can't slice between an AIMessage with tool_calls and its ToolMessages.
 *
 * Algorithm:
 * 1. Start from desired cutoff index (messages.length - windowSize)
 * 2. Scan forward to find a safe boundary:
 *    - HumanMessage: Always safe (new conversation turn)
 *    - AIMessage without tool_calls: Safe (no pending results)
 *    - ToolMessage: Not safe (might orphan it)
 *    - AIMessage with tool_calls: Check if all results are after this point
 *
 * @param messages - Full message history
 * @param windowSize - Desired number of messages to keep
 * @returns Safe start index for slicing
 */
function findSafeMessageBoundary(messages: BaseMessage[], windowSize: number): number {
	if (messages.length <= windowSize) {
		return 0; // Keep all messages
	}

	const targetIndex = messages.length - windowSize;

	// Scan forward from target to find a safe boundary
	for (let i = targetIndex; i < messages.length; i++) {
		const msg = messages[i];

		// HumanMessage is always a safe boundary (new turn)
		if (msg instanceof HumanMessage) {
			return i;
		}

		// AIMessage without tool_calls is safe
		if (msg instanceof AIMessage && (!msg.tool_calls || msg.tool_calls.length === 0)) {
			return i;
		}

		// ToolMessage is not a safe boundary (could be orphaned)
		if (msg instanceof ToolMessage) {
			// Continue scanning
			continue;
		}
	}

	// If no safe boundary found, keep everything (safest option)
	return 0;
}

/**
 * Filter messages for a specific agent using a sliding window approach
 *
 * This keeps the most recent N messages while ensuring tool_call → tool_result pairs
 * are never split (Anthropic API requirement).
 *
 * @param messages - Full message history from state
 * @param windowSize - Target number of messages to keep
 * @returns Safely sliced messages
 */
export function filterMessagesForAgent(messages: BaseMessage[], windowSize: number): BaseMessage[] {
	if (messages.length <= windowSize) {
		return messages;
	}

	// Find safe boundary that won't orphan tool messages
	const safeStartIndex = findSafeMessageBoundary(messages, windowSize);

	return messages.slice(safeStartIndex);
}

/**
 * Filter messages for Supervisor
 * Keeps last 30 messages for routing decisions
 */
export function filterMessagesForSupervisor(messages: BaseMessage[]): BaseMessage[] {
	return filterMessagesForAgent(messages, 30);
}

/**
 * Filter messages for Discovery Agent
 * Keeps last 20 messages including tool execution history
 */
export function filterMessagesForDiscovery(messages: BaseMessage[]): BaseMessage[] {
	return filterMessagesForAgent(messages, 20);
}

/**
 * Filter messages for Builder Agent
 * Keeps last 25 messages for structure building context
 */
export function filterMessagesForBuilder(messages: BaseMessage[]): BaseMessage[] {
	return filterMessagesForAgent(messages, 25);
}

/**
 * Filter messages for Configurator Agent
 * Keeps last 30 messages for parameter configuration
 */
export function filterMessagesForConfigurator(messages: BaseMessage[]): BaseMessage[] {
	return filterMessagesForAgent(messages, 30);
}

/**
 * Filter messages for Responder Agent
 * Keeps last 10 messages for conversational context
 */
export function filterMessagesForResponder(messages: BaseMessage[]): BaseMessage[] {
	return filterMessagesForAgent(messages, 10);
}
