import type { BaseMessage } from '@langchain/core/messages';
import { isAIMessage } from '@langchain/core/messages';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import type { Command } from '@langchain/langgraph';
import { isCommand } from '@langchain/langgraph';

import {
	type WorkflowState,
	type WorkflowUpdate,
	type WorkflowStatePartialUpdate,
	isWorkflowRemovalUpdate,
	isSimpleWorkflow,
} from '../workflow-state';

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
): Promise<WorkflowStatePartialUpdate> {
	const { state, toolMap } = options;
	const lastMessage = state.messages.at(-1);

	if (!lastMessage || !isAIMessage(lastMessage)) {
		throw new Error('Most recent message must be an AIMessage with tool calls');
	}

	const aiMessage = lastMessage;
	if (!aiMessage.tool_calls?.length) {
		throw new Error('AIMessage must have tool calls');
	}

	console.log(`Executing ${aiMessage.tool_calls.length} tools in parallel`);

	// Execute all tools in parallel
	const toolResults = await Promise.all(
		aiMessage.tool_calls.map(async (toolCall) => {
			const tool = toolMap.get(toolCall.name);
			if (!tool) {
				throw new Error(`Tool ${toolCall.name} not found`);
			}
			console.log(`Executing tool: ${toolCall.name}`);

			const result = await tool.invoke(toolCall.args, {
				toolCall: {
					id: toolCall.id,
					name: toolCall.name,
					args: toolCall.args,
				},
			});

			console.log(`Tool ${toolCall.name} completed`);
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

	// Merge all workflow updates into a single update
	// The reducer will handle the actual merging logic
	let mergedWorkflowUpdate: WorkflowUpdate | undefined = undefined;

	for (const update of stateUpdates) {
		if (update.workflowJSON) {
			const workflowUpdate = update.workflowJSON;

			if (!mergedWorkflowUpdate) {
				// First workflow update
				mergedWorkflowUpdate = workflowUpdate;
			} else {
				// Check if we have removal operations to merge
				if (
					isWorkflowRemovalUpdate(workflowUpdate) &&
					isWorkflowRemovalUpdate(mergedWorkflowUpdate)
				) {
					// Merge removal operations
					mergedWorkflowUpdate = {
						_operation: 'remove',
						_nodeIds: [...mergedWorkflowUpdate._nodeIds, ...workflowUpdate._nodeIds],
					};
				} else if (isSimpleWorkflow(workflowUpdate) && isSimpleWorkflow(mergedWorkflowUpdate)) {
					// Both are regular workflow updates - merge nodes and connections
					mergedWorkflowUpdate = {
						nodes: [...(mergedWorkflowUpdate.nodes ?? []), ...(workflowUpdate.nodes ?? [])],
						connections: {
							// @ts-ignore
							...(mergedWorkflowUpdate.connections || {}),
							...(workflowUpdate.connections || {}),
						},
					};
				} else {
					// Mixed operation types - this shouldn't happen in normal usage
					console.warn('Mixed workflow update types in parallel execution');
					// Just use the latest update
					mergedWorkflowUpdate = workflowUpdate;
				}
			}
		}
	}

	// Return the combined update
	const finalUpdate: WorkflowStatePartialUpdate = {
		messages: allMessages,
	};

	if (mergedWorkflowUpdate) {
		finalUpdate.workflowJSON = mergedWorkflowUpdate;
	}

	console.log(
		`Returning updates: ${allMessages.length} messages, workflow update: ${!!mergedWorkflowUpdate}`,
	);
	return finalUpdate;
}
