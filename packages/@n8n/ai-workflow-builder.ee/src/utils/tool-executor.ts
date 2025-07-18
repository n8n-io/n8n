import type { BaseMessage } from '@langchain/core/messages';
import { isAIMessage, ToolMessage } from '@langchain/core/messages';
import { ToolInputParsingException } from '@langchain/core/tools';
import { isCommand } from '@langchain/langgraph';

import { ToolExecutionError, WorkflowStateError } from '../errors';
import type { ToolExecutorOptions } from '../types/config';
import type { WorkflowOperation } from '../types/workflow';
import type { WorkflowState } from '../workflow-state';

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
				const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

				// Create error message content
				let errorContent: string;
				if (
					error instanceof ToolInputParsingException ||
					errorMessage.includes('expected schema')
				) {
					errorContent = `Invalid input for tool ${toolCall.name}: ${errorMessage}`;
				} else {
					errorContent = `Tool ${toolCall.name} failed: ${errorMessage}`;
				}

				// Return a ToolMessage with the error to maintain conversation continuity
				return new ToolMessage({
					content: errorContent,
					tool_call_id: toolCall.id ?? '',
					// Include error flag so tools can handle errors appropriately
					additional_kwargs: { error: true },
				});
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

	// Collect all messages from state updates
	stateUpdates.forEach((update) => {
		if (update.messages && Array.isArray(update.messages)) {
			allMessages.push(...update.messages);
		}
	});

	// Collect all workflow operations
	const allOperations: WorkflowOperation[] = [];

	for (const update of stateUpdates) {
		if (update.workflowOperations && Array.isArray(update.workflowOperations)) {
			allOperations.push(...update.workflowOperations);
		}
	}

	// Return the combined update
	const finalUpdate: Partial<typeof WorkflowState.State> = {
		messages: allMessages,
	};

	if (allOperations.length > 0) {
		finalUpdate.workflowOperations = allOperations;
	}

	return finalUpdate;
}
