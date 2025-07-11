import type { BaseMessage } from '@langchain/core/messages';
import { Annotation, messagesStateReducer } from '@langchain/langgraph';
import type { IRunExecutionData, INode, IConnections } from 'n8n-workflow';

import type { SimpleWorkflow } from './types';

/**
 * Workflow operation types that can be applied to the workflow state
 */
export type WorkflowOperation =
	| { type: 'clear' }
	| { type: 'removeNodes'; nodeIds: string[] }
	| { type: 'addNodes'; nodes: INode[] }
	| { type: 'updateNode'; nodeId: string; updates: Partial<INode> }
	| { type: 'setConnections'; connections: IConnections }
	| { type: 'mergeConnections'; connections: IConnections };

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
 * Reducer for collecting workflow operations from parallel tool executions.
 * This reducer intelligently merges operations, avoiding duplicates and handling special cases.
 */
function operationsReducer(
	current: WorkflowOperation[] | null,
	update: WorkflowOperation[] | null | undefined,
): WorkflowOperation[] {
	if (update === null) {
		return [];
	}

	if (!update || update.length === 0) {
		return current ?? [];
	}

	// For clear operations, we can reset everything
	if (update.some((op) => op.type === 'clear')) {
		return update.filter((op) => op.type === 'clear').slice(-1); // Keep only the last clear
	}

	if (!current && !update) {
		return [];
	}
	// Otherwise, append new operations
	return [...(current ?? []), ...update];
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

	// Handle special clear operation
	if (isWorkflowClearUpdate(update)) {
		return { nodes: [], connections: {} };
	}

	// This is a reducer override operation
	// Return the update as-is
	if ((update as SimpleWorkflow)?.__reducer_operation === 'override') {
		delete (update as SimpleWorkflow)['__reducer_operation'];
		return update as SimpleWorkflow;
	}

	// Check if update has empty nodes and connections - treat as replacement
	if (
		'nodes' in update &&
		'connections' in update &&
		update.nodes.length === 0 &&
		Object.keys(update.connections).length === 0
	) {
		// This is a clear operation followed by replacement
		// Return the update as-is (empty workflow)
		return update;
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

	// Regular workflow update
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
	// Operations to apply to the workflow - processed by a separate node
	workflowOperations: Annotation<WorkflowOperation[] | null>({
		reducer: operationsReducer,
		default: () => [],
	}),
	// Whether the user prompt is a workflow prompt.
	isWorkflowPrompt: Annotation<boolean>({ reducer: (x, y) => y ?? x ?? false }),
	// The execution data from the last workflow run.
	executionData: Annotation<IRunExecutionData['resultData'] | undefined>({
		reducer: (x, y) => (y === undefined ? undefined : (y ?? x ?? undefined)),
	}),
});

/**
 * Type for partial state updates that can include WorkflowUpdate operations
 */
export type WorkflowStatePartialUpdate = Partial<
	Omit<typeof WorkflowState.State, 'workflowJSON'>
> & {
	workflowJSON?: WorkflowStateUpdate;
};
