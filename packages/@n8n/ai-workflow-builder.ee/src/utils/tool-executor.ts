import type { BaseMessage } from '@langchain/core/messages';
import { isAIMessage, ToolMessage } from '@langchain/core/messages';
import { ToolInputParsingException } from '@langchain/core/tools';
import { isCommand } from '@langchain/langgraph';

import { ToolExecutionError, WorkflowStateError } from '../errors';
import type { ToolExecutorOptions } from '../types/config';
import type { NodeConfigurationsMap } from '../types/tools';
import type { WorkflowOperation } from '../types/workflow';
import type { WorkflowState } from '../workflow-state';

type StateUpdate = Partial<typeof WorkflowState.State>;

/**
 * Type guard to check if a value is an array
 */
function isArray(value: unknown): value is unknown[] {
	return Array.isArray(value);
}

/**
 * Collect and flatten arrays from state updates for a given key.
 * Uses type guard for array detection and explicit typing on the result.
 * @param updates - State updates to collect from
 * @param key - The key to collect array values from
 * @returns Flattened array of values from the specified key
 */
function collectArrayFromUpdates<T>(updates: StateUpdate[], key: keyof StateUpdate): T[] {
	const result: T[] = [];
	for (const update of updates) {
		const value = update[key];
		if (isArray(value)) {
			// Each element is validated as part of the source StateUpdate structure
			for (const item of value) {
				result.push(item as T);
			}
		}
	}
	return result;
}

/**
 * Merge node configurations from multiple state updates
 * Configurations are grouped by node type
 */
function mergeNodeConfigurations(updates: StateUpdate[]): NodeConfigurationsMap {
	const merged: NodeConfigurationsMap = {};

	for (const update of updates) {
		if (update.nodeConfigurations && typeof update.nodeConfigurations === 'object') {
			for (const [nodeType, configs] of Object.entries(update.nodeConfigurations)) {
				if (!merged[nodeType]) {
					merged[nodeType] = [];
				}
				merged[nodeType].push(...configs);
			}
		}
	}

	return merged;
}

/**
 * Create an error ToolMessage for failed tool invocations
 */
function createToolErrorMessage(toolName: string, toolCallId: string, error: unknown): ToolMessage {
	const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

	const isParsingError =
		error instanceof ToolInputParsingException || errorMessage.includes('expected schema');

	const errorContent = isParsingError
		? `Invalid input for tool ${toolName}: ${errorMessage}`
		: `Tool ${toolName} failed: ${errorMessage}`;

	return new ToolMessage({
		content: errorContent,
		tool_call_id: toolCallId,
		name: toolName,
		additional_kwargs: { error: true },
	});
}

/**
 * PARALLEL TOOL EXECUTION
 *
 * This executor handles running multiple tools in parallel and collecting their results.
 * All workflow modifications are done through operations that are processed by the
 * operations processor node.
 *
 * This executor:
 * 1. Executes all tools in parallel
 * 2. Collects their operations and messages
 * 3. Returns a single update with all operations to be processed
 */

/**
 * Execute multiple tools in parallel and collect their state updates
 *
 * Tools return operations that will be processed by the operations processor node.
 * This function executes tools and collects all their operations and messages.
 *
 * @param options - Contains the current state and tool map
 * @returns Combined state updates from all tool executions
 */
export async function executeToolsInParallel(
	options: ToolExecutorOptions,
): Promise<Partial<typeof WorkflowState.State>> {
	const { state, toolMap } = options;
	const lastMessage = state.messages.at(-1);

	if (!lastMessage || !isAIMessage(lastMessage)) {
		const error = new WorkflowStateError(
			'Most recent message must be an AIMessage with tool calls',
		);
		throw error;
	}

	const aiMessage = lastMessage;
	if (!aiMessage.tool_calls?.length) {
		const error = new WorkflowStateError('AIMessage must have tool calls');
		throw error;
	}

	// Execute all tools in parallel
	const toolResults = await Promise.all(
		aiMessage.tool_calls.map(async (toolCall) => {
			try {
				const tool = toolMap.get(toolCall.name);
				if (!tool) {
					throw new ToolExecutionError(`Tool ${toolCall.name} not found`, {
						toolName: toolCall.name,
					});
				}
				const result: unknown = await tool.invoke(toolCall.args ?? {}, {
					toolCall: {
						id: toolCall.id,
						name: toolCall.name,
						args: toolCall.args ?? {},
					},
				});

				return result;
			} catch (error) {
				// Handle tool invocation errors by returning a ToolMessage with error
				// This ensures the conversation history remains valid (every tool_use has a tool_result)
				return createToolErrorMessage(toolCall.name, toolCall.id ?? '', error);
			}
		}),
	);

	// Collect all messages and state updates
	const allMessages: BaseMessage[] = [];
	const stateUpdates: Array<Partial<typeof WorkflowState.State>> = [];

	toolResults.forEach((result) => {
		if (isCommand(result)) {
			// Tool returned a Command with state updates
			const update = result.update as Partial<typeof WorkflowState.State>;
			if (update) {
				stateUpdates.push(update);
			}
		} else {
			// Tool returned a regular message
			allMessages.push(result as BaseMessage);
		}
	});

	// Collect messages from state updates
	allMessages.push(...collectArrayFromUpdates<BaseMessage>(stateUpdates, 'messages'));

	// Collect all state update arrays using helper function
	const allOperations = collectArrayFromUpdates<WorkflowOperation>(
		stateUpdates,
		'workflowOperations',
	);
	const allTechniqueCategories = collectArrayFromUpdates<string>(
		stateUpdates,
		'techniqueCategories',
	);
	const allValidationHistory = collectArrayFromUpdates<
		(typeof WorkflowState.State.validationHistory)[number]
	>(stateUpdates, 'validationHistory');

	// Merge node configurations from all updates
	const allNodeConfigurations = mergeNodeConfigurations(stateUpdates);

	// Collect template IDs from all updates
	const allTemplateIds = collectArrayFromUpdates<number>(stateUpdates, 'templateIds');

	// Return the combined update
	const finalUpdate: Partial<typeof WorkflowState.State> = {
		messages: allMessages,
	};

	if (allOperations.length > 0) {
		finalUpdate.workflowOperations = allOperations;
	}

	if (allTechniqueCategories.length > 0) {
		finalUpdate.techniqueCategories = allTechniqueCategories;
	}

	if (allValidationHistory.length > 0) {
		finalUpdate.validationHistory = allValidationHistory;
	}

	if (Object.keys(allNodeConfigurations).length > 0) {
		finalUpdate.nodeConfigurations = allNodeConfigurations;
	}

	if (allTemplateIds.length > 0) {
		finalUpdate.templateIds = allTemplateIds;
	}

	return finalUpdate;
}
