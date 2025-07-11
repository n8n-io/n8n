import { getCurrentTaskInput } from '@langchain/langgraph';
import type { INode, IConnection } from 'n8n-workflow';

import type { SimpleWorkflow } from '../../types';
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
 * Note: This now uses mergeConnections to support parallel execution
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
 * Returns operations for the new architecture
 */
export function addNodesToWorkflow(nodes: INode[]): Partial<typeof WorkflowState.State> {
	// Return an operation to add nodes
	return {
		workflowOperations: [{ type: 'addNodes', nodes }],
	};
}

/**
 * Remove a node from the workflow state
 * Returns operations for the new architecture
 */
export function removeNodeFromWorkflow(nodeId: string): Partial<typeof WorkflowState.State> {
	// Return an operation to remove nodes
	return {
		workflowOperations: [{ type: 'removeNodes', nodeIds: [nodeId] }],
	};
}

/**
 * Remove multiple nodes from the workflow state
 * Returns operations for the new architecture
 */
export function removeNodesFromWorkflow(nodeIds: string[]): Partial<typeof WorkflowState.State> {
	// Return an operation to remove nodes
	return {
		workflowOperations: [{ type: 'removeNodes', nodeIds }],
	};
}

/**
 * Update a node in the workflow state
 * Returns operations for the new architecture
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
	// Use mergeConnections operation to add the new connection
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

/**
 * Get all node IDs from the workflow
 */
export function getNodeIds(workflow: SimpleWorkflow): string[] {
	return workflow.nodes.map((n) => n.id);
}

/**
 * Get all node names from the workflow
 */
export function getNodeNames(workflow: SimpleWorkflow): string[] {
	return workflow.nodes.map((n) => n.name);
}

/**
 * Check if workflow is empty
 */
export function isWorkflowEmpty(workflow: SimpleWorkflow): boolean {
	return workflow.nodes.length === 0;
}

/**
 * Create an empty workflow
 */
export function createEmptyWorkflow(): SimpleWorkflow {
	return {
		nodes: [],
		connections: {},
	};
}
