import type { INode, IConnections } from 'n8n-workflow';

import type { SimpleWorkflow, WorkflowOperation } from '../types/workflow';
import type { WorkflowState } from '../workflow-state';

/**
 * Apply a list of operations to a workflow
 */
// eslint-disable-next-line complexity
export function applyOperations(
	workflow: SimpleWorkflow,
	operations: WorkflowOperation[],
): SimpleWorkflow {
	// Start with a copy of the current workflow
	let result: SimpleWorkflow = {
		nodes: [...workflow.nodes],
		connections: { ...workflow.connections },
		name: workflow.name || '',
	};

	// Apply each operation in sequence
	for (const operation of operations) {
		switch (operation.type) {
			case 'clear':
				result = { nodes: [], connections: {}, name: '' };
				break;

			case 'removeNode': {
				const nodesToRemove = new Set(operation.nodeIds);

				// Filter out removed nodes
				result.nodes = result.nodes.filter((node) => !nodesToRemove.has(node.id));

				// Clean up connections
				const cleanedConnections: IConnections = {};

				// Copy connections, excluding those from/to removed nodes
				for (const [sourceId, nodeConnections] of Object.entries(result.connections)) {
					if (!nodesToRemove.has(sourceId)) {
						cleanedConnections[sourceId] = {};

						for (const [connectionType, outputs] of Object.entries(nodeConnections)) {
							if (Array.isArray(outputs)) {
								cleanedConnections[sourceId][connectionType] = outputs.map((outputConnections) => {
									if (Array.isArray(outputConnections)) {
										return outputConnections.filter((conn) => !nodesToRemove.has(conn.node));
									}
									return outputConnections;
								});
							}
						}
					}
				}

				result.connections = cleanedConnections;
				break;
			}

			case 'addNodes': {
				// Create a map for quick lookup
				const nodeMap = new Map<string, INode>();
				result.nodes.forEach((node) => nodeMap.set(node.id, node));

				// Add or update nodes
				operation.nodes.forEach((node) => {
					nodeMap.set(node.id, node);
				});

				result.nodes = Array.from(nodeMap.values());
				break;
			}

			case 'updateNode': {
				result.nodes = result.nodes.map((node) => {
					if (node.id === operation.nodeId) {
						return { ...node, ...operation.updates };
					}
					return node;
				});
				break;
			}

			case 'setConnections': {
				// Replace connections entirely
				result.connections = operation.connections;
				break;
			}

			case 'mergeConnections': {
				// Merge connections additively
				for (const [sourceId, nodeConnections] of Object.entries(operation.connections)) {
					if (!result.connections[sourceId]) {
						result.connections[sourceId] = nodeConnections;
					} else {
						// Merge connections for this source node
						for (const [connectionType, newOutputs] of Object.entries(nodeConnections)) {
							if (!result.connections[sourceId][connectionType]) {
								result.connections[sourceId][connectionType] = newOutputs;
							} else {
								// Merge arrays of connections
								const existingOutputs = result.connections[sourceId][connectionType];

								if (Array.isArray(newOutputs) && Array.isArray(existingOutputs)) {
									// Merge each output index
									for (let i = 0; i < Math.max(newOutputs.length, existingOutputs.length); i++) {
										if (!newOutputs[i]) continue;

										if (!existingOutputs[i]) {
											existingOutputs[i] = newOutputs[i];
										} else if (Array.isArray(newOutputs[i]) && Array.isArray(existingOutputs[i])) {
											// Merge connections at this output index, avoiding duplicates
											const existingSet = new Set(
												existingOutputs[i]!.map((conn) =>
													JSON.stringify({ node: conn.node, type: conn.type, index: conn.index }),
												),
											);

											newOutputs[i]!.forEach((conn) => {
												const connStr = JSON.stringify({
													node: conn.node,
													type: conn.type,
													index: conn.index,
												});
												if (!existingSet.has(connStr)) {
													existingOutputs[i]!.push(conn);
												}
											});
										}
									}
								}
							}
						}
					}
				}
				break;
			}
		}
	}

	return result;
}

/**
 * Process operations node for the LangGraph workflow
 * This node applies accumulated operations to the workflow state
 */
export function processOperations(state: typeof WorkflowState.State) {
	const { workflowJSON, workflowOperations } = state;

	// If no operations to process, return unchanged
	if (!workflowOperations || workflowOperations.length === 0) {
		return {};
	}

	// Apply all operations to get the new workflow
	const newWorkflow = applyOperations(workflowJSON, workflowOperations);

	// Return updated state with cleared operations
	return {
		workflowJSON: newWorkflow,
		workflowOperations: null, // Clear processed operations
	};
}
