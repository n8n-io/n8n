import type { BaseMessage } from '@langchain/core/messages';
import { isAIMessage, ToolMessage, HumanMessage } from '@langchain/core/messages';
import type { StructuredTool } from '@langchain/core/tools';
import { isCommand, END } from '@langchain/langgraph';

import { isBaseMessage } from '../types/langchain';
import type { WorkflowMetadata } from '../types/tools';
import type { WorkflowOperation } from '../types/workflow';
import type { ProgrammaticViolation } from '../validation/types';

interface CommandUpdate {
	messages?: BaseMessage[];
	workflowOperations?: WorkflowOperation[];
	templateIds?: number[];
	cachedTemplates?: WorkflowMetadata[];
	bestPractices?: string;
	lastValidationViolations?: ProgrammaticViolation[];
}

/**
 * Check if an optional field is a valid array (undefined or array)
 */
function isOptionalArray(obj: Record<string, unknown>, key: string): boolean {
	return !(key in obj) || obj[key] === undefined || Array.isArray(obj[key]);
}

/**
 * Check if an optional field is a valid string (undefined or string)
 */
function isOptionalString(obj: Record<string, unknown>, key: string): boolean {
	return !(key in obj) || obj[key] === undefined || typeof obj[key] === 'string';
}

/**
 * Type guard to check if an object has the shape of CommandUpdate
 */
function isCommandUpdate(value: unknown): value is CommandUpdate {
	if (typeof value !== 'object' || value === null) {
		return false;
	}
	const obj = value as Record<string, unknown>;

	// Check all optional array fields
	const arrayFields = [
		'messages',
		'workflowOperations',
		'templateIds',
		'cachedTemplates',
		'lastValidationViolations',
	];
	for (const field of arrayFields) {
		if (!isOptionalArray(obj, field)) return false;
	}

	// Check optional string field
	return isOptionalString(obj, 'bestPractices');
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
	lastValidationViolations?: ProgrammaticViolation[];
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

	// Unwrap Command objects and collect all state updates
	const collected = collectToolResults(toolResults);
	return buildStateUpdate(collected);
}

/**
 * Collected results from tool execution
 */
interface CollectedResults {
	messages: BaseMessage[];
	operations: WorkflowOperation[];
	templateIds: number[];
	cachedTemplates: WorkflowMetadata[];
	bestPractices?: string;
	lastValidationViolations?: ProgrammaticViolation[];
}

/**
 * Collect and merge results from tool executions
 */
function collectToolResults(toolResults: unknown[]): CollectedResults {
	const collected: CollectedResults = {
		messages: [],
		operations: [],
		templateIds: [],
		cachedTemplates: [],
	};

	for (const result of toolResults) {
		if (isCommand(result) && isCommandUpdate(result.update)) {
			const update = result.update;
			if (update.messages) collected.messages.push(...update.messages);
			if (update.workflowOperations) collected.operations.push(...update.workflowOperations);
			if (update.templateIds) collected.templateIds.push(...update.templateIds);
			if (update.cachedTemplates) collected.cachedTemplates.push(...update.cachedTemplates);
			if (update.bestPractices) collected.bestPractices = update.bestPractices;
			if (update.lastValidationViolations)
				collected.lastValidationViolations = update.lastValidationViolations;
		} else if (isBaseMessage(result)) {
			collected.messages.push(result);
		}
	}

	return collected;
}

/**
 * Build state update from collected results
 */
function buildStateUpdate(collected: CollectedResults): {
	messages?: BaseMessage[];
	workflowOperations?: WorkflowOperation[] | null;
	templateIds?: number[];
	cachedTemplates?: WorkflowMetadata[];
	bestPractices?: string;
	lastValidationViolations?: ProgrammaticViolation[];
} {
	const stateUpdate: {
		messages?: BaseMessage[];
		workflowOperations?: WorkflowOperation[] | null;
		templateIds?: number[];
		cachedTemplates?: WorkflowMetadata[];
		bestPractices?: string;
		lastValidationViolations?: ProgrammaticViolation[];
	} = {};

	if (collected.messages.length > 0) stateUpdate.messages = collected.messages;
	if (collected.operations.length > 0) stateUpdate.workflowOperations = collected.operations;
	if (collected.templateIds.length > 0) stateUpdate.templateIds = collected.templateIds;
	if (collected.cachedTemplates.length > 0) stateUpdate.cachedTemplates = collected.cachedTemplates;
	if (collected.bestPractices) stateUpdate.bestPractices = collected.bestPractices;
	if (collected.lastValidationViolations)
		stateUpdate.lastValidationViolations = collected.lastValidationViolations;

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
