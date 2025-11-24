import type { BaseMessage } from '@langchain/core/messages';
import { isAIMessage, ToolMessage, HumanMessage } from '@langchain/core/messages';
import type { StructuredTool } from '@langchain/core/tools';
import { isCommand, END } from '@langchain/langgraph';

import type { WorkflowOperation } from '../types/workflow';

interface CommandUpdate {
	messages?: BaseMessage[];
	workflowOperations?: WorkflowOperation[];
}

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
	toolMap: Map<string, StructuredTool>,
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
				const result: unknown = await tool.invoke(toolCall.args ?? {}, {
					toolCall: {
						id: toolCall.id,
						name: toolCall.name,
						args: toolCall.args ?? {},
					},
				});
				return result as BaseMessage;
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
			const update = result.update as CommandUpdate;
			if (update.messages) {
				messages.push(...update.messages);
			}
			if (update.workflowOperations) {
				operations.push(...update.workflowOperations);
			}
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

/**
 * Extract user request from parent state messages
 * Helper to reduce duplication across transformInput methods
 */
export function extractUserRequest(messages: BaseMessage[], defaultValue = ''): string {
	const userMessage = messages.find((m) => m instanceof HumanMessage);
	return typeof userMessage?.content === 'string' ? userMessage.content : defaultValue;
}

/**
 * Standard shouldContinue logic for tool-based subgraphs
 * Checks iteration limit and presence of tool calls
 */
export function createStandardShouldContinue(maxIterations: number) {
	return (state: { iterationCount: number; messages: BaseMessage[] }) => {
		if (state.iterationCount >= maxIterations) {
			return END;
		}

		const lastMessage = state.messages[state.messages.length - 1];
		const hasToolCalls =
			lastMessage &&
			'tool_calls' in lastMessage &&
			Array.isArray(lastMessage.tool_calls) &&
			lastMessage.tool_calls.length > 0;

		return hasToolCalls ? 'tools' : END;
	};
}
