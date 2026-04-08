import type { INode, IConnections, INodeTypes } from 'n8n-workflow';
import { Workflow } from 'n8n-workflow';

import type { SimpleWorkflow, WorkflowOperation } from '../types/workflow';

/**
 * Minimal INodeTypes implementation for use with Workflow.renameNode().
 * The renameNode method doesn't use nodeTypes, but the Workflow constructor requires it.
 * By returning undefined, we ensure the Workflow constructor skips parameter processing
 * for nodes (see lines 97-107 in workflow.ts), which preserves original parameters.
 *
 * Note: We cast the functions to the expected types because the INodeTypes interface
 * doesn't explicitly allow undefined returns, but the Workflow constructor handles
 * undefined gracefully by skipping parameter processing for that node.
 */
const minimalNodeTypes: INodeTypes = {
	getByName: (() => undefined) as unknown as INodeTypes['getByName'],
	getByNameAndVersion: (() => undefined) as unknown as INodeTypes['getByNameAndVersion'],
	getKnownTypes() {
		return {};
	},
};

/**
 * Type for operation handler functions
 */
type OperationHandler = (workflow: SimpleWorkflow, operation: WorkflowOperation) => SimpleWorkflow;

/**
 * Handle 'clear' operation - reset workflow to empty state
 */
function applyClearOperation(
	_workflow: SimpleWorkflow,
	_operation: WorkflowOperation,
): SimpleWorkflow {
	return { nodes: [], connections: {}, name: '' };
}

/**
 * Handle 'removeNode' operation - remove nodes and their connections
 */
function applyRemoveNodeOperation(
	workflow: SimpleWorkflow,
	operation: WorkflowOperation,
): SimpleWorkflow {
	if (operation.type !== 'removeNode') return workflow;

	const nodesToRemove = new Set(operation.nodeIds);

	// Build a set of node names to remove (connections are keyed by node name in n8n)
	const nodeNamesToRemove = new Set<string>();
	for (const node of workflow.nodes) {
		if (nodesToRemove.has(node.id)) {
			nodeNamesToRemove.add(node.name);
		}
	}

	// Filter out removed nodes
	const nodes = workflow.nodes.filter((node) => !nodesToRemove.has(node.id));

	// Clean up connections
	const cleanedConnections: IConnections = {};

	// Copy connections, excluding those from/to removed nodes (using node names)
	for (const [sourceName, nodeConnections] of Object.entries(workflow.connections)) {
		if (!nodeNamesToRemove.has(sourceName)) {
			cleanedConnections[sourceName] = {};

			for (const [connectionType, outputs] of Object.entries(nodeConnections)) {
				if (Array.isArray(outputs)) {
					cleanedConnections[sourceName][connectionType] = outputs.map((outputConnections) => {
						if (Array.isArray(outputConnections)) {
							return outputConnections.filter((conn) => !nodeNamesToRemove.has(conn.node));
						}
						return outputConnections;
					});
				}
			}
		}
	}

	return {
		...workflow,
		nodes,
		connections: cleanedConnections,
	};
}

/**
 * Handle 'addNodes' operation - add or update nodes in workflow
 */
function applyAddNodesOperation(
	workflow: SimpleWorkflow,
	operation: WorkflowOperation,
): SimpleWorkflow {
	if (operation.type !== 'addNodes') return workflow;

	// Create a map for quick lookup
	const nodeMap = new Map<string, INode>();
	workflow.nodes.forEach((node) => nodeMap.set(node.id, node));

	// Add or update nodes
	operation.nodes.forEach((node) => {
		nodeMap.set(node.id, node);
	});

	return {
		...workflow,
		nodes: Array.from(nodeMap.values()),
	};
}

/**
 * Handle 'updateNode' operation - update specific node properties
 */
function applyUpdateNodeOperation(
	workflow: SimpleWorkflow,
	operation: WorkflowOperation,
): SimpleWorkflow {
	if (operation.type !== 'updateNode') return workflow;

	const nodes = workflow.nodes.map((node) => {
		if (node.id === operation.nodeId) {
			return { ...node, ...operation.updates };
		}
		return node;
	});

	return {
		...workflow,
		nodes,
	};
}

/**
 * Handle 'setConnections' operation - replace all connections
 */
function applySetConnectionsOperation(
	workflow: SimpleWorkflow,
	operation: WorkflowOperation,
): SimpleWorkflow {
	if (operation.type !== 'setConnections') return workflow;

	return {
		...workflow,
		connections: operation.connections,
	};
}

/**
 * Handle 'mergeConnections' operation - merge new connections with existing ones
 */
function applyMergeConnectionsOperation(
	workflow: SimpleWorkflow,
	operation: WorkflowOperation,
): SimpleWorkflow {
	if (operation.type !== 'mergeConnections') return workflow;

	const connections = { ...workflow.connections };

	// Merge connections additively
	for (const [sourceId, nodeConnections] of Object.entries(operation.connections)) {
		if (!connections[sourceId]) {
			connections[sourceId] = nodeConnections;
		} else {
			// Merge connections for this source node
			for (const [connectionType, newOutputs] of Object.entries(nodeConnections)) {
				if (!connections[sourceId][connectionType]) {
					connections[sourceId][connectionType] = newOutputs;
				} else {
					// Merge arrays of connections
					const existingOutputs = connections[sourceId][connectionType];

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

	return {
		...workflow,
		connections,
	};
}

/**
 * Handle 'removeConnection' operation - remove specific connection between nodes
 */
function applyRemoveConnectionOperation(
	workflow: SimpleWorkflow,
	operation: WorkflowOperation,
): SimpleWorkflow {
	if (operation.type !== 'removeConnection') return workflow;

	const { sourceNode, targetNode, connectionType, sourceOutputIndex, targetInputIndex } = operation;

	const connections = { ...workflow.connections };

	// Check if source node has connections
	if (!connections[sourceNode]) {
		return workflow;
	}

	// Check if the connection type exists
	const connectionTypeOutputs = connections[sourceNode][connectionType];
	if (!connectionTypeOutputs || !Array.isArray(connectionTypeOutputs)) {
		return workflow;
	}

	// Check if the output index exists
	if (
		sourceOutputIndex >= connectionTypeOutputs.length ||
		!connectionTypeOutputs[sourceOutputIndex]
	) {
		return workflow;
	}

	const outputConnections = connectionTypeOutputs[sourceOutputIndex];
	if (!Array.isArray(outputConnections)) {
		return workflow;
	}

	// Filter out the specific connection
	const filteredConnections = outputConnections.filter(
		(conn) =>
			!(
				conn.node === targetNode &&
				conn.type === connectionType &&
				conn.index === targetInputIndex
			),
	);

	// Update the connections array
	connectionTypeOutputs[sourceOutputIndex] = filteredConnections;

	// Clean up empty arrays and objects
	if (filteredConnections.length === 0) {
		// Check if all outputs of this type are empty
		const hasAnyConnections = connectionTypeOutputs.some(
			(outputs) => Array.isArray(outputs) && outputs.length > 0,
		);

		// If no connections remain for this type, remove the connection type
		if (!hasAnyConnections) {
			delete connections[sourceNode][connectionType];

			// If no connection types remain, remove the source node entry
			if (Object.keys(connections[sourceNode]).length === 0) {
				delete connections[sourceNode];
			}
		}
	}

	return {
		...workflow,
		connections,
	};
}

/**
 * Handle 'setName' operation - update workflow name
 */
function applySetNameOperation(
	workflow: SimpleWorkflow,
	operation: WorkflowOperation,
): SimpleWorkflow {
	if (operation.type !== 'setName') return workflow;
	return {
		...workflow,
		name: operation.name,
	};
}

/**
 * Handle 'renameNode' operation - rename a node and update all connection references and expressions.
 * Uses the Workflow.renameNode() method to handle all the complexity of updating expressions,
 * connections, and special node types.
 */
function applyRenameNodeOperation(
	workflow: SimpleWorkflow,
	operation: WorkflowOperation,
): SimpleWorkflow {
	if (operation.type !== 'renameNode') return workflow;

	const { oldName, newName } = operation;

	// Create a Workflow instance to leverage its renameNode method
	// We use a minimal nodeTypes mock since renameNode doesn't need the full registry
	const workflowInstance = new Workflow({
		nodes: workflow.nodes,
		connections: workflow.connections,
		nodeTypes: minimalNodeTypes,
		active: false,
	});

	workflowInstance.renameNode(oldName, newName);

	// Convert back to SimpleWorkflow format
	return {
		...workflow,
		nodes: Object.values(workflowInstance.nodes),
		connections: workflowInstance.connectionsBySourceNode,
	};
}

/**
 * Map of operation types to their handler functions
 */
const operationHandlers: Record<WorkflowOperation['type'], OperationHandler> = {
	clear: applyClearOperation,
	removeNode: applyRemoveNodeOperation,
	addNodes: applyAddNodesOperation,
	updateNode: applyUpdateNodeOperation,
	setConnections: applySetConnectionsOperation,
	mergeConnections: applyMergeConnectionsOperation,
	removeConnection: applyRemoveConnectionOperation,
	setName: applySetNameOperation,
	renameNode: applyRenameNodeOperation,
};

/**
 * Apply a list of operations to a workflow
 */
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
		const handler = operationHandlers[operation.type];
		result = handler(result, operation);
	}

	return result;
}

/**
 * Process operations node for the LangGraph workflow
 * This node applies accumulated operations to the workflow state
 */
export function processOperations(state: {
	workflowJSON: SimpleWorkflow;
	workflowOperations?: WorkflowOperation[] | null;
}) {
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
		workflowValidation: null, // Invalidate stale validation results
	};
}
