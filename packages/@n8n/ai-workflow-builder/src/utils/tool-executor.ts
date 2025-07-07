import type { BaseMessage } from '@langchain/core/messages';
import { isAIMessage } from '@langchain/core/messages';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import { isCommand } from '@langchain/langgraph';

import type { SimpleWorkflow } from '../types';
import type { WorkflowState } from '../workflow-state';

/**
 * PARALLEL TOOL EXECUTION CHALLENGES IN LANGGRAPH
 *
 * When LangGraph executes multiple tools in parallel, each tool receives the SAME initial state.
 * This creates a fundamental challenge for operations that modify shared state, especially deletions.
 *
 * Example scenario with parallel node removals:
 * - Initial state: nodes [A, B, C]
 * - Tool 1: remove node A -> returns nodes [B, C]
 * - Tool 2: remove node B -> returns nodes [A, C]
 *
 * Without proper merging logic, we'd end up with either [B, C] or [A, C] instead of [C].
 *
 * LANGGRAPH COMMAND UPDATES
 *
 * Each tool returns a Command object with state updates. LangGraph applies these updates
 * sequentially, with the last update winning for any given field. This means:
 * - Simple field updates (like messages) can be accumulated
 * - Complex nested updates (like workflowJSON) require custom merging logic
 * - The default behavior would cause one tool's changes to completely overwrite another's
 *
 * OUR SOLUTION
 *
 * This executor implements intelligent state merging that:
 * 1. Processes removal operations separately to handle the deletion problem
 * 2. Tracks which tool performed which operation for context-aware merging
 * 3. Applies different merge strategies based on the operation type
 * 4. Ensures all parallel modifications are properly combined
 */

export interface ToolExecutorOptions {
	state: typeof WorkflowState.State;
	toolMap: Map<string, DynamicStructuredTool>;
}

export interface ToolResultWithName {
	result: Record<string, unknown>;
	toolName: string;
}

export interface StateUpdateWithTool {
	update: Partial<typeof WorkflowState.State>;
	toolName: string;
}

/**
 * Deeply merge connections objects, handling the nested structure properly
 *
 * Connections in n8n have a complex nested structure:
 * - Top level: source node IDs
 * - Second level: connection types (e.g., 'main')
 * - Third level: output indices (array)
 * - Fourth level: array of connection objects
 *
 * This function ensures that when multiple tools add connections in parallel,
 * all connections are preserved without duplicates. It's especially important
 * for tools like connect_nodes that may be called multiple times in parallel.
 *
 * @param base - The existing connections object
 * @param update - New connections to merge in
 * @returns Merged connections with all unique connections preserved
 */
function deepMergeConnections(
	base: SimpleWorkflow['connections'],
	update: SimpleWorkflow['connections'],
): SimpleWorkflow['connections'] {
	const merged = { ...base };

	for (const [nodeName, nodeConnections] of Object.entries(update)) {
		if (!merged[nodeName]) {
			merged[nodeName] = nodeConnections;
		} else {
			// Merge connections for this node
			for (const [connectionType, connections] of Object.entries(nodeConnections)) {
				if (!merged[nodeName][connectionType]) {
					merged[nodeName][connectionType] = connections;
				} else {
					// Merge arrays of connections (NodeInputConnections type)
					const existingConnections = merged[nodeName][connectionType];
					const newConnections = connections;

					// Both are arrays where each index can contain IConnection[] or null
					for (let i = 0; i < newConnections.length; i++) {
						const newConnArray = newConnections[i];
						if (!newConnArray) continue;

						if (!existingConnections[i]) {
							// No existing connections at this index
							existingConnections[i] = newConnArray;
						} else {
							// Merge connections at this index
							const existingConnArray = existingConnections[i];
							if (!existingConnArray) continue;

							// Create a set of existing connection strings for comparison
							const existingSet = new Set(
								existingConnArray.map((conn) =>
									JSON.stringify({
										node: conn.node,
										type: conn.type,
										index: conn.index,
									}),
								),
							);

							// Add only new connections
							for (const conn of newConnArray) {
								const connString = JSON.stringify({
									node: conn.node,
									type: conn.type,
									index: conn.index,
								});
								if (!existingSet.has(connString)) {
									existingConnArray.push(conn);
								}
							}
						}
					}
				}
			}
		}
	}

	return merged;
}

/**
 * Execute multiple tools in parallel and merge their state updates intelligently
 *
 * This function replaces the default LangGraph tool executor to handle the challenges
 * of parallel state modifications. It ensures that when multiple tools modify the
 * workflow state simultaneously, all changes are properly combined rather than
 * having later updates overwrite earlier ones.
 *
 * @param options - Contains the current state and tool map
 * @returns Merged state updates from all tool executions
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

	console.log(`Executing ${aiMessage.tool_calls.length} tools in parallel`);

	// Execute all tools in parallel
	const toolResultsWithNames = await Promise.all(
		aiMessage.tool_calls.map(async (toolCall) => {
			const tool = toolMap.get(toolCall.name);
			if (!tool) {
				throw new Error(`Tool ${toolCall.name} not found`);
			}
			console.log(`Executing tool: ${toolCall.name}`);
			// Pass the tool call arguments and tool call ID in config

			const result = (await tool.invoke(toolCall.args, {
				toolCall: {
					id: toolCall.id,
					name: toolCall.name,
					args: toolCall.args,
				},
			})) as Record<string, unknown>;
			console.log(`Tool ${toolCall.name} completed`);
			return { result, toolName: toolCall.name };
		}),
	);

	// Process results and track which tool generated each update
	// This is crucial for applying tool-specific merge strategies
	const stateUpdatesWithTools: StateUpdateWithTool[] = [];
	const regularResults: BaseMessage[] = [];

	toolResultsWithNames.forEach(({ result, toolName }: ToolResultWithName) => {
		if (isCommand(result)) {
			// Tool returned a Command with state updates
			const cmd = result;
			const update = cmd.update as Partial<typeof WorkflowState.State>;
			if (update) {
				// Track which tool produced this update for context-aware merging
				stateUpdatesWithTools.push({ update, toolName });
			}
		} else {
			// Tool returned a regular result (not a state update)
			regularResults.push(result as unknown as BaseMessage);
		}
	});

	// Merge workflowJSON updates intelligently
	let mergedWorkflowJSON = state.workflowJSON;
	const allMessages = [];

	console.log(`Processing ${stateUpdatesWithTools.length} state updates`);
	console.log(`Initial workflow has ${mergedWorkflowJSON.nodes.length} nodes`);

	// CRITICAL: Separate remove operations from other operations
	// This separation is necessary because remove operations need special handling:
	// - Each remove tool sees the same initial state and returns a complete list minus one node
	// - We need to identify ALL nodes to remove across all parallel removals
	// - Only then can we apply all removals at once
	const removeOperations = stateUpdatesWithTools.filter(
		({ toolName }) => toolName === 'remove_node',
	);
	const otherOperations = stateUpdatesWithTools.filter(
		({ toolName }) => toolName !== 'remove_node',
	);

	// Process remove operations first
	if (removeOperations.length > 0) {
		// Create a set of node IDs to remove
		const nodesToRemove = new Set<string>();

		// Identify all nodes that should be removed by comparing each tool's output
		// with the initial state. This works because each remove_node tool starts
		// with the same state and removes exactly one node.
		removeOperations.forEach(({ update }) => {
			if (update.workflowJSON?.nodes) {
				// Find which nodes were removed by comparing with the initial state
				const removedNodeIds = state.workflowJSON.nodes
					.filter((node) => !update.workflowJSON!.nodes.some((n) => n.id === node.id))
					.map((node) => node.id);
				removedNodeIds.forEach((id) => nodesToRemove.add(id));
			}
		});

		// Apply all removals at once
		if (nodesToRemove.size > 0) {
			console.log(`Removing nodes: ${Array.from(nodesToRemove).join(', ')}`);

			// Filter out removed nodes
			const remainingNodes = mergedWorkflowJSON.nodes.filter((node) => !nodesToRemove.has(node.id));

			// Clean up connections
			const cleanedConnections = { ...mergedWorkflowJSON.connections };

			// Remove connections where removed nodes are the source
			nodesToRemove.forEach((nodeId) => {
				delete cleanedConnections[nodeId];
			});

			// Remove connections where removed nodes are the target
			for (const [, nodeConnections] of Object.entries(cleanedConnections)) {
				for (const [connectionType, outputs] of Object.entries(nodeConnections)) {
					if (Array.isArray(outputs)) {
						nodeConnections[connectionType] = outputs.map((outputConnections) => {
							if (Array.isArray(outputConnections)) {
								return outputConnections.filter((conn) => !nodesToRemove.has(conn.node));
							}
							return outputConnections;
						});
					}
				}
			}

			mergedWorkflowJSON = {
				nodes: remainingNodes,
				connections: cleanedConnections,
			};
		}
	}

	// Process other operations (add, update, connect)
	// These operations are additive and can be merged more straightforwardly
	// than removals. The main challenge here is handling cases where multiple
	// tools modify the same node (e.g., parallel parameter updates).
	otherOperations.forEach(({ update, toolName }) => {
		if (!update || typeof update !== 'object' || Array.isArray(update)) return;

		// Collect messages from all tools - these accumulate naturally
		if (update.messages && Array.isArray(update.messages)) {
			allMessages.push(...update.messages);
		}

		// Merge workflowJSON if present
		if (update.workflowJSON && typeof update.workflowJSON === 'object') {
			const beforeNodeCount = mergedWorkflowJSON.nodes.length;
			const beforeConnectionCount = Object.keys(mergedWorkflowJSON.connections).length;

			// Deep merge nodes using a Map for efficient lookups
			const nodeMap = new Map(mergedWorkflowJSON.nodes.map((node) => [node.id, node]));

			// Add or update nodes from the update
			if (update.workflowJSON.nodes && Array.isArray(update.workflowJSON.nodes)) {
				update.workflowJSON.nodes.forEach((node) => {
					const existingNode = nodeMap.get(node.id);
					if (!existingNode) {
						// This is a new node added by this tool
						nodeMap.set(node.id, node);
					} else if (toolName === 'update_node_parameters') {
						// Special handling for parameter updates: merge parameters deeply
						// This ensures that parallel parameter updates to the same node
						// don't overwrite each other
						console.log(`Merging node ${node.id} - updating parameters`);
						const mergedNode = {
							...existingNode,
							...node,
							parameters: {
								...existingNode.parameters,
								...node.parameters,
							},
						};
						nodeMap.set(node.id, mergedNode);
					}
					// Note: For other operations on existing nodes, we don't merge
					// to avoid unexpected behavior
				});
			}

			const mergedNodes = Array.from(nodeMap.values());

			// Deep merge connections
			const mergedConnections = deepMergeConnections(
				mergedWorkflowJSON.connections,
				update.workflowJSON.connections || {},
			);

			mergedWorkflowJSON = {
				nodes: mergedNodes,
				connections: mergedConnections,
			};

			console.log(
				`Update from ${toolName}: Added ${mergedNodes.length - beforeNodeCount} nodes, ` +
					`${Object.keys(mergedConnections).length - beforeConnectionCount} connection groups`,
			);
		}
	});

	// Add messages from remove operations
	removeOperations.forEach(({ update }) => {
		if (update.messages && Array.isArray(update.messages)) {
			allMessages.push(...update.messages);
		}
	});

	console.log(`Final workflow has ${mergedWorkflowJSON.nodes.length} nodes`);
	console.log(
		`Final workflow has ${Object.keys(mergedWorkflowJSON.connections).length} connection groups`,
	);

	// Add any regular tool results as messages
	allMessages.push(...regularResults);

	// Return the merged state update
	// This object will be used by LangGraph to update the workflow state.
	// By returning a single merged update instead of individual tool updates,
	// we ensure all parallel modifications are preserved.
	return {
		messages: allMessages,
		workflowJSON: mergedWorkflowJSON,
	};
}
