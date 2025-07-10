import type { BaseMessage } from '@langchain/core/messages';
import { Annotation, messagesStateReducer } from '@langchain/langgraph';
import type { IRunExecutionData, INode } from 'n8n-workflow';

import type { SimpleWorkflow } from './types';

/**
 * Special workflow update type for removal operations
 */
export type WorkflowRemovalUpdate = {
	_operation: 'remove';
	_nodeIds: string[];
};

/**
 * Special workflow update type for clearing the entire workflow
 */
export type WorkflowClearUpdate = {
	_operation: 'clear';
};

/**
 * Workflow update type that can be either a regular update, removal operation, or clear operation
 */
export type WorkflowUpdate = SimpleWorkflow | WorkflowRemovalUpdate | WorkflowClearUpdate;

/**
 * Type for the workflowJSON field in state updates
 * This allows passing either a SimpleWorkflow or a WorkflowUpdate operation
 */
export type WorkflowStateUpdate = WorkflowUpdate;

/**
 * Type guard to check if a WorkflowUpdate is a removal operation
 */
export function isWorkflowRemovalUpdate(update: WorkflowUpdate): update is WorkflowRemovalUpdate {
	return '_operation' in update && update._operation === 'remove';
}

/**
 * Type guard to check if a WorkflowUpdate is a clear operation
 */
export function isWorkflowClearUpdate(update: WorkflowUpdate): update is WorkflowClearUpdate {
	return '_operation' in update && update._operation === 'clear';
}

/**
 * Type guard to check if a WorkflowUpdate is a SimpleWorkflow
 */
export function isSimpleWorkflow(update: WorkflowUpdate): update is SimpleWorkflow {
	return !('_operation' in update);
}

/**
 * Custom reducer for merging workflow JSON updates from parallel tool executions.
 * This reducer intelligently merges nodes and connections from multiple updates
 * while handling special cases like node removals and parameter updates.
 */
// eslint-disable-next-line complexity
function workflowJSONReducer(
	current: SimpleWorkflow,
	update: WorkflowUpdate | null | undefined,
): SimpleWorkflow {
	// Handle null/undefined updates
	if (!update) {
		return current;
	}

	// Check for clear marker in nodes
	if (
		'nodes' in update &&
		update.nodes.length === 1 &&
		update.nodes[0].type === CLEAR_WORKFLOW_MARKER
	) {
		return { nodes: [], connections: {} };
	}

	// Handle special clear operation
	if (isWorkflowClearUpdate(update)) {
		return { nodes: [], connections: {} };
	}

	// Handle special removal operations
	if (isWorkflowRemovalUpdate(update)) {
		const nodesToRemove = new Set(update._nodeIds);

		// Filter out removed nodes
		const remainingNodes = current.nodes.filter((node) => !nodesToRemove.has(node.id));

		// Clean up connections
		const cleanedConnections = { ...current.connections };

		// Remove connections where removed nodes are the source
		nodesToRemove.forEach((nodeId) => {
			delete cleanedConnections[nodeId];
		});

		// Remove connections where removed nodes are the target
		for (const [_sourceId, nodeConnections] of Object.entries(cleanedConnections)) {
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

		return {
			nodes: remainingNodes,
			connections: cleanedConnections,
		};
	}

	// Regular workflow update - merge nodes and connections
	const workflowUpdate = update;

	// Merge nodes by ID - newer updates override older ones for the same node
	const nodeMap = new Map<string, INode>();

	// Add current nodes
	current.nodes.forEach((node) => {
		nodeMap.set(node.id, node);
	});

	// Update or add new nodes
	if (workflowUpdate.nodes) {
		workflowUpdate.nodes.forEach((node) => {
			nodeMap.set(node.id, node);
		});
	}

	// Merge connections additively
	const mergedConnections = { ...current.connections };

	if (workflowUpdate.connections) {
		for (const [sourceId, nodeConnections] of Object.entries(workflowUpdate.connections)) {
			if (!mergedConnections[sourceId]) {
				mergedConnections[sourceId] = nodeConnections;
			} else {
				// Merge connections for this source node
				for (const [connectionType, newOutputs] of Object.entries(nodeConnections)) {
					if (!mergedConnections[sourceId][connectionType]) {
						mergedConnections[sourceId][connectionType] = newOutputs;
					} else {
						// Merge arrays of connections
						const existingOutputs = mergedConnections[sourceId][connectionType];

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
	}

	return {
		nodes: Array.from(nodeMap.values()),
		connections: mergedConnections,
	};
}

export const WorkflowState = Annotation.Root({
	messages: Annotation<BaseMessage[]>({
		reducer: messagesStateReducer,
		default: () => [],
	}),
	// The original prompt from the user.
	prompt: Annotation<string>({ reducer: (x, y) => y ?? x ?? '' }),
	// The JSON representation of the workflow being built.
	workflowJSON: Annotation<SimpleWorkflow>({
		reducer: workflowJSONReducer as (
			current: SimpleWorkflow,
			update: WorkflowUpdate | null | undefined,
		) => SimpleWorkflow,
		default: () => ({ nodes: [], connections: {} }),
	}),
	// Whether the user prompt is a workflow prompt.
	isWorkflowPrompt: Annotation<boolean>({ reducer: (x, y) => y ?? x ?? false }),
	// The execution data from the last workflow run.
	executionData: Annotation<IRunExecutionData['resultData'] | undefined>({
		reducer: (x, y) => y ?? x ?? undefined,
	}),
});

/**
 * Special marker node to signal a clear operation
 */
export const CLEAR_WORKFLOW_MARKER = '__CLEAR_WORKFLOW__';

/**
 * Type for partial state updates that can include WorkflowUpdate operations
 */
export type WorkflowStatePartialUpdate = Partial<
	Omit<typeof WorkflowState.State, 'workflowJSON'>
> & {
	workflowJSON?: WorkflowStateUpdate;
};
