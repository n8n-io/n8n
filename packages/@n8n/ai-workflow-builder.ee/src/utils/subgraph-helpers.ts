import type { BaseMessage } from '@langchain/core/messages';
import { isAIMessage, ToolMessage } from '@langchain/core/messages';
import { isCommand } from '@langchain/langgraph';

import type { WorkflowOperation } from '../types/workflow';

/**
 * Execute tools in a subgraph node
 *
 * Adapts the executeToolsInParallel pattern for subgraph use.
 * Executes all tool calls from the last AI message in parallel.
 *
 * @param state - Subgraph state with messages array
 * @param toolMap - Map of tool name to tool instance
 * @returns State update with messages and optional operations
 */
export async function executeSubgraphTools(
	state: { messages: BaseMessage[] },
	toolMap: Map<string, any>,
): Promise<{ messages?: BaseMessage[]; workflowOperations?: WorkflowOperation[] | null }> {
	const lastMessage = state.messages[state.messages.length - 1];

	if (!lastMessage || !isAIMessage(lastMessage) || !lastMessage.tool_calls?.length) {
		return {};
	}

	// Execute all tools in parallel
	const toolResults = await Promise.all(
		lastMessage.tool_calls.map(async (toolCall) => {
			const tool = toolMap.get(toolCall.name);
			if (!tool) {
				return new ToolMessage({
					content: `Tool ${toolCall.name} not found`,
					tool_call_id: toolCall.id ?? '',
				});
			}

			try {
				const result = await tool.invoke(toolCall.args ?? {}, {
					toolCall: {
						id: toolCall.id,
						name: toolCall.name,
						args: toolCall.args ?? {},
					},
				});
				return result;
			} catch (error) {
				return new ToolMessage({
					content: `Tool failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
					tool_call_id: toolCall.id ?? '',
				});
			}
		}),
	);

	// Unwrap Command objects and collect messages/operations
	const messages: BaseMessage[] = [];
	const operations: WorkflowOperation[] = [];

	for (const result of toolResults) {
		if (isCommand(result)) {
			// Tool returned Command - extract update
			const update = result.update as any;
			if (update?.messages) messages.push(...update.messages);
			if (update?.workflowOperations) operations.push(...update.workflowOperations);
		} else if (result) {
			// Direct message (ToolMessage, AIMessage, etc.)
			messages.push(result as BaseMessage);
		}
	}

	const stateUpdate: { messages?: BaseMessage[]; workflowOperations?: WorkflowOperation[] | null } =
		{};

	if (messages.length > 0) {
		stateUpdate.messages = messages;
	}

	if (operations.length > 0) {
		stateUpdate.workflowOperations = operations;
	}

	return stateUpdate;
}
