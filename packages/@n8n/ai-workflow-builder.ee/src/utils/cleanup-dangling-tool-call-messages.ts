import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage, RemoveMessage, ToolMessage } from '@langchain/core/messages';

/**
 * In cases where the request was interrupted while a tool call was in progress
 * (e.g. network error), we might end up with dangling tool calls in the state.
 * This function identifies AI messages that have tool calls without corresponding
 * ToolMessage responses and returns RemoveMessage instances to clean them up.
 */
export function cleanupDanglingToolCallMessages(messages: BaseMessage[]): RemoveMessage[] {
	// First we collect all tool call IDs from ToolMessages
	const toolCallIds = new Set(
		messages.filter((m): m is ToolMessage => m instanceof ToolMessage).map((m) => m.tool_call_id),
	);

	// Then we look for AI messages which reference tool calls, but the tool call ID is not in the set
	// (this means the tool call was never completed)
	const danglingToolCalls = messages.filter(
		(m) => m instanceof AIMessage && m.tool_calls?.some(({ id }) => id && !toolCallIds.has(id)),
	);

	// Remove dangling tool calls, as otherwise it will block agent execution
	return danglingToolCalls.map((m) => new RemoveMessage({ id: m.id! }));
}
