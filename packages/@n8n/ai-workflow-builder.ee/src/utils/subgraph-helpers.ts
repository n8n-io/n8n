import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
import type { StructuredTool } from '@langchain/core/tools';
import { END, isCommand, isGraphInterrupt } from '@langchain/langgraph';

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
 * Tools that call interrupt() (like submit_questions) are handled naturally:
 * - On initial run: interrupt() throws GraphInterrupt, Promise.all rejects, graph pauses
 * - On resume: interrupt() returns the user's answers, all tools complete normally
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

	if (!lastMessage || !AIMessage.isInstance(lastMessage) || !lastMessage.tool_calls?.length) {
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
				// Let GraphInterrupt propagate - tools like submit_questions use interrupt() for HITL
				if (isGraphInterrupt(error)) {
					throw error;
				}
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
	// Skip resume messages to avoid treating plan decisions/answers as new requests.
	const humanMessages = messages.filter((m) => m instanceof HumanMessage);
	const lastNonResumeMessage = [...humanMessages]
		.reverse()
		.find((msg) => msg.additional_kwargs?.resumeData === undefined);
	const lastUserMessage = lastNonResumeMessage ?? humanMessages[humanMessages.length - 1];
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

/**
 * Extract tool-related messages for persistence in parent state.
 * Filters messages to only include complete tool call/result pairs:
 * - AIMessages with tool_calls (to show which tools were called)
 * - ToolMessages (to show tool results)
 *
 * IMPORTANT: Only includes AIMessages with tool_calls if ALL of their
 * tool_calls have corresponding ToolMessages. This prevents orphaned
 * tool_use blocks that would cause Anthropic API errors.
 *
 * Excludes AIMessages with only text content (internal reasoning/summaries)
 * as user-facing output is handled by the responder subgraph.
 *
 * @param messages - Subgraph messages array
 * @returns Filtered array of tool-related messages for persistence
 */
export function extractToolMessagesForPersistence(messages: BaseMessage[]): BaseMessage[] {
	// Build a set of all tool_call_ids that have corresponding ToolMessages
	const completedToolCallIds = new Set<string>();
	for (const msg of messages) {
		if (ToolMessage.isInstance(msg) && msg.tool_call_id) {
			completedToolCallIds.add(msg.tool_call_id);
		}
	}

	return messages.filter((msg) => {
		if (ToolMessage.isInstance(msg)) {
			return true;
		}
		if (AIMessage.isInstance(msg) && msg.tool_calls && msg.tool_calls.length > 0) {
			// Only include AIMessage if ALL its tool_calls have completed ToolMessages
			return msg.tool_calls.every((tc) => tc.id && completedToolCallIds.has(tc.id));
		}
		return false;
	});
}
