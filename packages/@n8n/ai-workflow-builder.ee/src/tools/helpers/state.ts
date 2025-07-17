import { getCurrentTaskInput } from '@langchain/langgraph';
import type { INode, IConnection } from 'n8n-workflow';

import type { SimpleWorkflow } from '../../types/workflow';
import type { WorkflowState } from '../../workflow-state';

/**
 * Get the current workflow from state in a type-safe manner
 */
export function getCurrentWorkflow(state: typeof WorkflowState.State): SimpleWorkflow {
	return state.workflowJSON;
}

export function getWorkflowState(): typeof WorkflowState.State {
	return getCurrentTaskInput();
}

/**
 * Get the current workflow from task input
 */
export function getCurrentWorkflowFromTaskInput(): SimpleWorkflow {
	const state = getWorkflowState();
	return getCurrentWorkflow(state);
}

/**
 * Create a state update for workflow connections
 */
export function updateWorkflowConnections(
	connections: SimpleWorkflow['connections'],
): Partial<typeof WorkflowState.State> {
	// Return an operation to merge connections (not replace them)
	return {
		workflowOperations: [{ type: 'mergeConnections', connections }],
	};
}

/**
 * Add a node to the workflow state
 */
export function addNodeToWorkflow(node: INode): Partial<typeof WorkflowState.State> {
	return addNodesToWorkflow([node]);
}

/**
 * Add multiple nodes to the workflow state
 */
export function addNodesToWorkflow(nodes: INode[]): Partial<typeof WorkflowState.State> {
	// Return an operation to add nodes
	return {
		workflowOperations: [{ type: 'addNodes', nodes }],
	};
}

/**
 * Remove a node from the workflow state
 */
export function removeNodeFromWorkflow(nodeId: string): Partial<typeof WorkflowState.State> {
	// Return an operation to remove nodes
	return {
		workflowOperations: [{ type: 'removeNode', nodeIds: [nodeId] }],
	};
}

/**
 * Remove multiple nodes from the workflow state
 */
export function removeNodesFromWorkflow(nodeIds: string[]): Partial<typeof WorkflowState.State> {
	// Return an operation to remove nodes
	return {
		workflowOperations: [{ type: 'removeNode', nodeIds }],
	};
}

/**
 * Update a node in the workflow state
 */
export function updateNodeInWorkflow(
	state: typeof WorkflowState.State,
	nodeId: string,
	updates: Partial<INode>,
): Partial<typeof WorkflowState.State> {
	const existingNode = state.workflowJSON.nodes.find((n) => n.id === nodeId);
	if (!existingNode) {
		return {};
	}

	// Return an operation to update the node
	return {
		workflowOperations: [{ type: 'updateNode', nodeId, updates }],
	};
}

/**
 * Add a connection to the workflow state
 */
export function addConnectionToWorkflow(
	sourceNodeId: string,
	_targetNodeId: string,
	connection: IConnection,
): Partial<typeof WorkflowState.State> {
	return {
		workflowOperations: [
			{
				type: 'mergeConnections',
				connections: {
					[sourceNodeId]: {
						main: [[connection]],
					},
				},
			},
		],
	};
}
