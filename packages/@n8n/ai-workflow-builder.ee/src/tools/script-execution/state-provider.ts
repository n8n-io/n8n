/**
 * State provider for script execution.
 *
 * Provides a read-only snapshot of workflow state and collects
 * operations from tool executions during script runs.
 */

import type { IConnections, INode } from 'n8n-workflow';

import type { SimpleWorkflow, WorkflowOperation } from '@/types/workflow';

import type { WorkflowSnapshot, WorkflowNodeInfo, WorkflowConnectionInfo } from './tool-interfaces';

/**
 * Collector for workflow operations during script execution.
 * Tools append operations to this collector instead of returning them directly.
 */
export class OperationsCollector {
	private operations: WorkflowOperation[] = [];
	private nodeCache = new Map<string, INode>();

	/**
	 * Add an operation to the collection
	 */
	addOperation(operation: WorkflowOperation): void {
		this.operations.push(operation);

		// Update cache for addNodes operations so subsequent lookups work
		if (operation.type === 'addNodes') {
			for (const node of operation.nodes) {
				this.nodeCache.set(node.id, node);
			}
		}
	}

	/**
	 * Get all collected operations
	 */
	getOperations(): WorkflowOperation[] {
		return [...this.operations];
	}

	/**
	 * Get a node from the cache (for nodes added during this script execution)
	 */
	getCachedNode(nodeId: string): INode | undefined {
		return this.nodeCache.get(nodeId);
	}

	/**
	 * Clear all collected operations
	 */
	clear(): void {
		this.operations = [];
		this.nodeCache.clear();
	}

	/**
	 * Get the count of collected operations
	 */
	get count(): number {
		return this.operations.length;
	}
}

/**
 * Convert n8n IConnections to flat connection info array
 */
function flattenConnections(connections: IConnections): WorkflowConnectionInfo[] {
	const result: WorkflowConnectionInfo[] = [];

	for (const [sourceNodeName, nodeConnections] of Object.entries(connections)) {
		for (const [connectionType, outputs] of Object.entries(nodeConnections)) {
			if (!Array.isArray(outputs)) continue;

			outputs.forEach((outputConnections, sourceOutputIndex) => {
				if (!Array.isArray(outputConnections)) return;

				outputConnections.forEach((conn) => {
					result.push({
						sourceNode: sourceNodeName,
						targetNode: conn.node,
						sourceOutput: sourceOutputIndex,
						targetInput: conn.index ?? 0,
						type: connectionType,
					});
				});
			});
		}
	}

	return result;
}

/**
 * Convert INode to WorkflowNodeInfo
 */
function nodeToNodeInfo(node: INode): WorkflowNodeInfo {
	return {
		id: node.id,
		name: node.name,
		type: node.type,
		position: node.position,
		parameters: node.parameters ?? {},
	};
}

/**
 * Create a read-only workflow snapshot from the current workflow state.
 * This snapshot is frozen to prevent accidental modifications.
 */
export function createWorkflowSnapshot(
	workflow: SimpleWorkflow,
	operationsCollector?: OperationsCollector,
): WorkflowSnapshot {
	const nodes = workflow.nodes.map(nodeToNodeInfo);
	const connections = flattenConnections(workflow.connections);

	const snapshot: WorkflowSnapshot = {
		name: workflow.name ?? '',
		nodes: Object.freeze([...nodes]) as WorkflowNodeInfo[],
		connections: Object.freeze([...connections]) as WorkflowConnectionInfo[],

		getNodeById(nodeId: string): WorkflowNodeInfo | undefined {
			// First check nodes from original workflow
			const existingNode = nodes.find((n) => n.id === nodeId);
			if (existingNode) return existingNode;

			// Then check nodes added during this script execution
			if (operationsCollector) {
				const cachedNode = operationsCollector.getCachedNode(nodeId);
				if (cachedNode) {
					return nodeToNodeInfo(cachedNode);
				}
			}

			return undefined;
		},

		getNodeByName(nodeName: string): WorkflowNodeInfo | undefined {
			// First check original nodes
			const existingNode = nodes.find((n) => n.name === nodeName);
			if (existingNode) return existingNode;

			// Then check cached nodes from operations
			if (operationsCollector) {
				for (const op of operationsCollector.getOperations()) {
					if (op.type === 'addNodes') {
						const addedNode = op.nodes.find((n) => n.name === nodeName);
						if (addedNode) return nodeToNodeInfo(addedNode);
					}
				}
			}

			return undefined;
		},

		getNodesByType(nodeType: string): WorkflowNodeInfo[] {
			const result = nodes.filter((n) => n.type === nodeType);

			// Also include nodes added during script execution
			if (operationsCollector) {
				for (const op of operationsCollector.getOperations()) {
					if (op.type === 'addNodes') {
						for (const node of op.nodes) {
							if (node.type === nodeType) {
								result.push(nodeToNodeInfo(node));
							}
						}
					}
				}
			}

			return result;
		},
	};

	return Object.freeze(snapshot) as WorkflowSnapshot;
}

/**
 * State provider that maintains workflow state for script execution.
 * Provides immutable snapshot access and operation collection.
 */
export class ScriptStateProvider {
	private snapshot: WorkflowSnapshot;
	private collector: OperationsCollector;

	constructor(workflow: SimpleWorkflow) {
		this.collector = new OperationsCollector();
		this.snapshot = createWorkflowSnapshot(workflow, this.collector);
	}

	/**
	 * Get the read-only workflow snapshot
	 */
	getWorkflowSnapshot(): WorkflowSnapshot {
		return this.snapshot;
	}

	/**
	 * Get the operations collector for tools to use
	 */
	getOperationsCollector(): OperationsCollector {
		return this.collector;
	}

	/**
	 * Get all operations collected during script execution
	 */
	getCollectedOperations(): WorkflowOperation[] {
		return this.collector.getOperations();
	}

	/**
	 * Get a fresh view of a node by ID (checks both original and newly added)
	 */
	getNodeById(nodeId: string): INode | undefined {
		// Check the cached nodes first (for nodes added during script)
		const cachedNode = this.collector.getCachedNode(nodeId);
		if (cachedNode) return cachedNode;

		// Then check the original snapshot
		const snapshotNode = this.snapshot.getNodeById(nodeId);
		if (snapshotNode) {
			// Convert back to INode format
			return {
				id: snapshotNode.id,
				name: snapshotNode.name,
				type: snapshotNode.type,
				position: snapshotNode.position,
				parameters: snapshotNode.parameters,
				typeVersion: 1, // Will be overridden by actual lookup
			};
		}

		return undefined;
	}
}
