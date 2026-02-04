import type { BaseMessage } from '@langchain/core/messages';
import { isAIMessage, ToolMessage, HumanMessage } from '@langchain/core/messages';
import type { StructuredTool } from '@langchain/core/tools';
import { isCommand, END } from '@langchain/langgraph';

import { isBaseMessage } from '../types/langchain';
import type { WorkflowMetadata } from '../types/tools';
import type { WorkflowOperation } from '../types/workflow';

interface CommandUpdate {
	messages?: BaseMessage[];
	workflowOperations?: WorkflowOperation[];
	templateIds?: number[];
	cachedTemplates?: WorkflowMetadata[];
	bestPractices?: string;
}

/**
 * Type guard to check if an object has the shape of CommandUpdate
 */
function isCommandUpdate(value: unknown): value is CommandUpdate {
	if (typeof value !== 'object' || value === null) {
		return false;
	}
	const obj = value as Record<string, unknown>;
	// messages is optional, but if present must be an array
	if ('messages' in obj && obj.messages !== undefined && !Array.isArray(obj.messages)) {
		return false;
	}
	// workflowOperations is optional, but if present must be an array
	if (
		'workflowOperations' in obj &&
		obj.workflowOperations !== undefined &&
		!Array.isArray(obj.workflowOperations)
	) {
		return false;
	}
	// templateIds is optional, but if present must be an array
	if ('templateIds' in obj && obj.templateIds !== undefined && !Array.isArray(obj.templateIds)) {
		return false;
	}
	// cachedTemplates is optional, but if present must be an array
	if (
		'cachedTemplates' in obj &&
		obj.cachedTemplates !== undefined &&
		!Array.isArray(obj.cachedTemplates)
	) {
		return false;
	}
	// bestPractices is optional, but if present must be a string
	if (
		'bestPractices' in obj &&
		obj.bestPractices !== undefined &&
		typeof obj.bestPractices !== 'string'
	) {
		return false;
	}
	return true;
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
): Promise<{
	messages?: BaseMessage[];
	workflowOperations?: WorkflowOperation[] | null;
	templateIds?: number[];
	cachedTemplates?: WorkflowMetadata[];
	bestPractices?: string;
}> {
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
				// Result can be a Command (with update) or a BaseMessage
				// We return it as-is and handle the type in the loop below
				return result;
			} catch (error) {
				return new ToolMessage({
					content: `Tool failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
					tool_call_id: toolCall.id ?? '',
				});
			}
		}),
	);

	// Unwrap Command objects and collect messages/operations/templateIds/cachedTemplates/bestPractices
	const messages: BaseMessage[] = [];
	const operations: WorkflowOperation[] = [];
	const templateIds: number[] = [];
	const cachedTemplates: WorkflowMetadata[] = [];
	let bestPractices: string | undefined;

	for (const result of toolResults) {
		if (isCommand(result)) {
			// Tool returned Command - extract update using type guard
			if (isCommandUpdate(result.update)) {
				if (result.update.messages) {
					messages.push(...result.update.messages);
				}
				if (result.update.workflowOperations) {
					operations.push(...result.update.workflowOperations);
				}
				if (result.update.templateIds) {
					templateIds.push(...result.update.templateIds);
				}
				if (result.update.cachedTemplates) {
					cachedTemplates.push(...result.update.cachedTemplates);
				}
				if (result.update.bestPractices) {
					bestPractices = result.update.bestPractices;
				}
			}
		} else if (isBaseMessage(result)) {
			// Direct message (ToolMessage, AIMessage, etc.)
			messages.push(result);
		}
	}

	const stateUpdate: {
		messages?: BaseMessage[];
		workflowOperations?: WorkflowOperation[] | null;
		templateIds?: number[];
		cachedTemplates?: WorkflowMetadata[];
		bestPractices?: string;
	} = {};

	if (messages.length > 0) {
		stateUpdate.messages = messages;
	}

	if (operations.length > 0) {
		stateUpdate.workflowOperations = operations;
	}

	if (templateIds.length > 0) {
		stateUpdate.templateIds = templateIds;
	}

	if (cachedTemplates.length > 0) {
		stateUpdate.cachedTemplates = cachedTemplates;
	}

	if (bestPractices) {
		stateUpdate.bestPractices = bestPractices;
	}

	return stateUpdate;
}

/**
 * Extract user request from parent state messages
 * Gets the LAST HumanMessage (most recent user request), not the first
 */
export function extractUserRequest(messages: BaseMessage[], defaultValue = ''): string {
	// Get the LAST HumanMessage (most recent user request for iteration support)
	const humanMessages = messages.filter((m) => m instanceof HumanMessage);
	const lastUserMessage = humanMessages[humanMessages.length - 1];
	return typeof lastUserMessage?.content === 'string' ? lastUserMessage.content : defaultValue;
}

/**
 * Standard shouldContinue logic for tool-based subgraphs
 * Checks presence of tool calls to determine if we should continue to tools node.
 */
export function createStandardShouldContinue() {
	return (state: { messages: BaseMessage[] }) => {
		const lastMessage = state.messages[state.messages.length - 1];
		const hasToolCalls =
			lastMessage &&
			'tool_calls' in lastMessage &&
			Array.isArray(lastMessage.tool_calls) &&
			lastMessage.tool_calls.length > 0;

		return hasToolCalls ? 'tools' : END;
	};
}
