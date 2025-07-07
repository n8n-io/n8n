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
 * Create a state update for workflow nodes
 */
export function updateWorkflowNodes(
	state: typeof WorkflowState.State,
	nodes: INode[],
): Partial<typeof WorkflowState.State> {
	return {
		workflowJSON: {
			...state.workflowJSON,
			nodes,
		},
	};
}

/**
 * Create a state update for workflow connections
 */
export function updateWorkflowConnections(
	state: typeof WorkflowState.State,
	connections: SimpleWorkflow['connections'],
): Partial<typeof WorkflowState.State> {
	return {
		workflowJSON: {
			...state.workflowJSON,
			connections,
		},
	};
}

/**
 * Create a state update for both nodes and connections
 */
export function updateWorkflow(
	state: typeof WorkflowState.State,
	updates: {
		nodes?: INode[];
		connections?: SimpleWorkflow['connections'];
	},
): Partial<typeof WorkflowState.State> {
	return {
		workflowJSON: {
			nodes: updates.nodes ?? state.workflowJSON.nodes,
			connections: updates.connections ?? state.workflowJSON.connections,
		},
	};
}

/**
 * Add a node to the workflow state
 */
export function addNodeToWorkflow(
	state: typeof WorkflowState.State,
	node: INode,
): Partial<typeof WorkflowState.State> {
	return updateWorkflowNodes(state, [...state.workflowJSON.nodes, node]);
}

/**
 * Add multiple nodes to the workflow state
 */
export function addNodesToWorkflow(
	state: typeof WorkflowState.State,
	nodes: INode[],
): Partial<typeof WorkflowState.State> {
	return updateWorkflowNodes(state, [...state.workflowJSON.nodes, ...nodes]);
}

/**
 * Remove a node from the workflow state
 */
export function removeNodeFromWorkflow(
	state: typeof WorkflowState.State,
	nodeId: string,
): Partial<typeof WorkflowState.State> {
	const nodes = state.workflowJSON.nodes.filter((n) => n.id !== nodeId);
	const connections = removeNodeConnections(state.workflowJSON.connections, nodeId);

	return updateWorkflow(state, { nodes, connections });
}

/**
 * Remove multiple nodes from the workflow state
 */
export function removeNodesFromWorkflow(
	state: typeof WorkflowState.State,
	nodeIds: string[],
): Partial<typeof WorkflowState.State> {
	const nodeIdSet = new Set(nodeIds);
	const nodes = state.workflowJSON.nodes.filter((n) => !nodeIdSet.has(n.id));
	let connections = state.workflowJSON.connections;

	// Remove connections for all nodes
	for (const nodeId of nodeIds) {
		connections = removeNodeConnections(connections, nodeId);
	}

	return updateWorkflow(state, { nodes, connections });
}

/**
 * Update a node in the workflow state
 */
export function updateNodeInWorkflow(
	state: typeof WorkflowState.State,
	nodeId: string,
	updates: Partial<INode>,
): Partial<typeof WorkflowState.State> {
	const nodes = state.workflowJSON.nodes.map((node) =>
		node.id === nodeId ? { ...node, ...updates } : node,
	);

	return updateWorkflowNodes(state, nodes);
}

/**
 * Add a connection to the workflow state
 */
export function addConnectionToWorkflow(
	state: typeof WorkflowState.State,
	sourceNodeId: string,
	_targetNodeId: string,
	connection: IConnection,
): Partial<typeof WorkflowState.State> {
	const connections = { ...state.workflowJSON.connections };

	// Initialize source node connections if not exists
	if (!connections[sourceNodeId]) {
		connections[sourceNodeId] = {};
	}
	if (!connections[sourceNodeId].main) {
		connections[sourceNodeId].main = [];
	}

	// Add to the first output by default
	connections[sourceNodeId].main[0] ??= [];

	connections[sourceNodeId].main[0].push(connection);

	return updateWorkflowConnections(state, connections);
}

/**
 * Remove all connections for a node
 */
function removeNodeConnections(
	connections: SimpleWorkflow['connections'],
	nodeId: string,
): SimpleWorkflow['connections'] {
	const newConnections = { ...connections };

	// Remove outgoing connections
	delete newConnections[nodeId];

	// Remove incoming connections
	for (const [_sourceId, nodeConnections] of Object.entries(newConnections)) {
		for (const [connectionType, outputs] of Object.entries(nodeConnections)) {
			if (Array.isArray(outputs)) {
				nodeConnections[connectionType] = outputs.map((outputConnections) => {
					if (Array.isArray(outputConnections)) {
						return outputConnections.filter((conn) => conn.node !== nodeId);
					}
					return outputConnections;
				});
			}
		}
	}

	return newConnections;
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
