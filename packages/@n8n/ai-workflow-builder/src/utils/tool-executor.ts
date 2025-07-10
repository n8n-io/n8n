import type { BaseMessage } from '@langchain/core/messages';
import { isAIMessage } from '@langchain/core/messages';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import { isCommand } from '@langchain/langgraph';

import type { WorkflowState, WorkflowOperation } from '../workflow-state';

/**
 * SIMPLIFIED PARALLEL TOOL EXECUTION
 *
 * With the custom workflowJSONReducer in place, we no longer need complex manual merging.
 * The reducer handles all the complexity of merging parallel updates to the workflow state.
 *
 * This executor now simply:
 * 1. Executes all tools in parallel
 * 2. Collects their state updates and messages
 * 3. Returns a single merged update that LangGraph will apply through the reducers
 */

export interface ToolExecutorOptions {
	state: typeof WorkflowState.State;
	toolMap: Map<string, DynamicStructuredTool>;
}

/**
 * Execute multiple tools in parallel and collect their state updates
 *
 * The custom reducers in workflow-state.ts handle all the merging complexity,
 * so this function just needs to execute tools and collect their updates.
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
		throw new Error('Most recent message must be an AIMessage with tool calls');
	}

	const aiMessage = lastMessage;
	if (!aiMessage.tool_calls?.length) {
		throw new Error('AIMessage must have tool calls');
	}

	// Execute all tools in parallel
	const toolResults = await Promise.all(
		aiMessage.tool_calls.map(async (toolCall) => {
			const tool = toolMap.get(toolCall.name);
			if (!tool) {
				throw new Error(`Tool ${toolCall.name} not found`);
			}

			const result: unknown = await tool.invoke(toolCall.args ?? {}, {
				toolCall: {
					id: toolCall.id,
					name: toolCall.name,
					args: toolCall.args ?? {},
				},
			});

			return result;
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

	// Log only if there are operations
	if (allOperations.length > 0) {
		console.log(
			`Tool executor: ${allOperations.length} operations from ${aiMessage.tool_calls.length} tools`,
		);
	}
	return finalUpdate;
}
