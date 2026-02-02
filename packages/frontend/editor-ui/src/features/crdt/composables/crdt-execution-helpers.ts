/**
 * CRDT Execution Document Helpers
 *
 * Functions for updating the execution CRDT document from push events.
 * The execution document mirrors the push event structure for expression resolution compatibility.
 */

import type { CRDTDoc, CRDTMap, CRDTArray } from '@n8n/crdt';
import { toJSON } from '@n8n/crdt';
import type { ITaskData, ExecutionStatus, WorkflowExecuteMode } from 'n8n-workflow';
import type {
	ExecutionMeta,
	EdgeExecutionState,
	ExecutionStartedPushData,
	NodeExecuteBeforePushData,
	NodeExecuteAfterPushData,
	NodeExecuteAfterDataPushData,
	ExecutionFinishedPushData,
} from '../types/executionDocument.types';

// Type aliases for cleaner code
type TaskDataMap = CRDTMap<unknown>;
type TaskDataArray = CRDTArray<TaskDataMap>;
type EdgeMap = CRDTMap<unknown>;
type NodeMap = CRDTMap<unknown>;

/**
 * Initialize execution document with metadata from executionStarted event.
 * Also builds the nodeId -> nodeName index from the workflow document.
 */
export function handleExecutionStarted(
	executionDoc: CRDTDoc,
	workflowDoc: CRDTDoc,
	data: ExecutionStartedPushData,
): void {
	executionDoc.transact(() => {
		// Initialize meta
		const meta = executionDoc.getMap<unknown>('meta');
		meta.set('executionId', data.executionId);
		meta.set('workflowId', data.workflowId);
		meta.set('status', 'running');
		meta.set('mode', data.mode);
		meta.set('startedAt', Date.parse(data.startedAt));

		// Clear previous execution data
		const runData = executionDoc.getMap<unknown>('runData');
		for (const key of runData.keys()) {
			runData.delete(key);
		}

		const edges = executionDoc.getMap<unknown>('edges');
		for (const key of edges.keys()) {
			edges.delete(key);
		}

		// Build nodeId -> nodeName index from workflow doc (for ID-based lookups)
		const nodeIndex = executionDoc.getMap<unknown>('nodeIndex');
		for (const key of nodeIndex.keys()) {
			nodeIndex.delete(key);
		}

		const workflowNodes = workflowDoc.getMap<unknown>('nodes');
		for (const [nodeId, nodeData] of workflowNodes.entries()) {
			const nodeMap = nodeData as NodeMap;
			const nodeName = nodeMap.get('name') as string;
			if (nodeName) {
				nodeIndex.set(nodeId, nodeName);
			}
		}
	});
}

/**
 * Handle nodeExecuteBefore event - creates initial task data entry.
 */
export function handleNodeExecuteBefore(
	executionDoc: CRDTDoc,
	data: NodeExecuteBeforePushData,
): void {
	executionDoc.transact(() => {
		const runData = executionDoc.getMap<unknown>('runData');

		// Get or create array for this node
		let nodeRuns = runData.get(data.nodeName) as TaskDataArray | undefined;
		if (!nodeRuns) {
			nodeRuns = executionDoc.createArray<TaskDataMap>();
			runData.set(data.nodeName, nodeRuns);
		}

		// Create new task data entry (partial - will be completed by nodeExecuteAfter)
		const taskData = executionDoc.createMap<unknown>();
		taskData.set('startTime', data.data.startTime);
		taskData.set('executionIndex', data.data.executionIndex);
		taskData.set('source', data.data.source); // Keep as-is: { previousNode, ... }
		taskData.set('hints', data.data.hints ?? []);
		taskData.set('executionStatus', 'running'); // Will be updated

		nodeRuns.push(taskData);
	});
}

/**
 * Find the run index by executionIndex within a node's runs array.
 */
function findRunIndexByExecutionIndex(nodeRuns: TaskDataArray, executionIndex: number): number {
	for (let i = 0; i < nodeRuns.length; i++) {
		const run = nodeRuns.get(i) as TaskDataMap | undefined;
		if (run && run.get('executionIndex') === executionIndex) {
			return i;
		}
	}
	return -1;
}

/**
 * Handle nodeExecuteAfter event - updates task data with completion info.
 */
export function handleNodeExecuteAfter(
	executionDoc: CRDTDoc,
	workflowDoc: CRDTDoc,
	data: NodeExecuteAfterPushData,
): void {
	executionDoc.transact(() => {
		const runData = executionDoc.getMap<unknown>('runData');
		const nodeRuns = runData.get(data.nodeName) as TaskDataArray | undefined;

		if (!nodeRuns) {
			return;
		}

		// Find the run by executionIndex
		const runIndex = findRunIndexByExecutionIndex(nodeRuns, data.data.executionIndex);
		if (runIndex === -1) {
			return;
		}

		const taskData = nodeRuns.get(runIndex) as TaskDataMap | undefined;
		if (!taskData) return;

		// Update with completion data
		taskData.set('executionTime', data.data.executionTime);
		taskData.set('executionStatus', data.data.executionStatus);
		if (data.data.error) {
			taskData.set('error', data.data.error);
		}

		// Update edge item counts
		updateEdgeItemCounts(executionDoc, workflowDoc, data.nodeName, data.itemCountByConnectionType);
	});
}

/**
 * Handle nodeExecuteAfterData event - adds the actual output data.
 */
export function handleNodeExecuteAfterData(
	executionDoc: CRDTDoc,
	workflowDoc: CRDTDoc,
	data: NodeExecuteAfterDataPushData,
): void {
	executionDoc.transact(() => {
		const runData = executionDoc.getMap<unknown>('runData');
		const nodeRuns = runData.get(data.nodeName) as TaskDataArray | undefined;

		if (!nodeRuns) {
			return;
		}

		const runIndex = findRunIndexByExecutionIndex(nodeRuns, data.data.executionIndex);
		if (runIndex === -1) {
			return;
		}

		const taskData = nodeRuns.get(runIndex) as TaskDataMap | undefined;
		if (!taskData) return;

		// Add the actual output data
		taskData.set('data', data.data.data);

		// Also update edge item counts (in case nodeExecuteAfter wasn't received)
		updateEdgeItemCounts(executionDoc, workflowDoc, data.nodeName, data.itemCountByConnectionType);
	});
}

/**
 * Handle executionFinished event - updates final status.
 */
export function handleExecutionFinished(
	executionDoc: CRDTDoc,
	data: ExecutionFinishedPushData,
): void {
	executionDoc.transact(() => {
		const meta = executionDoc.getMap<unknown>('meta');
		meta.set('status', data.status);
		meta.set('finishedAt', Date.now());
	});
}

/**
 * Update edge item counts based on a node's output.
 * Finds edges from this source node and updates their execution data.
 */
function updateEdgeItemCounts(
	executionDoc: CRDTDoc,
	workflowDoc: CRDTDoc,
	sourceNodeName: string,
	itemCountByConnectionType: Record<string, number[]>,
): void {
	const execEdges = executionDoc.getMap<unknown>('edges');
	const workflowEdges = workflowDoc.getMap<unknown>('edges');
	const workflowNodes = workflowDoc.getMap<unknown>('nodes');

	for (const [connectionType, counts] of Object.entries(itemCountByConnectionType)) {
		counts.forEach((itemCount, outputIndex) => {
			// Find edges from this source node + output
			for (const [edgeId, edgeValue] of workflowEdges.entries()) {
				const edge = edgeValue as EdgeMap;
				const sourceHandle = edge.get('sourceHandle') as string; // "outputs/main/0"
				const parts = sourceHandle.split('/');
				const type = parts[1];
				const index = parseInt(parts[2] ?? '0', 10);

				if (type === connectionType && index === outputIndex) {
					// Check if source matches
					const sourceNodeId = edge.get('source') as string;
					const sourceNode = workflowNodes.get(sourceNodeId) as NodeMap | undefined;
					if (sourceNode?.get('name') === sourceNodeName) {
						// Update edge execution data
						let edgeExec = execEdges.get(edgeId) as EdgeMap | undefined;
						if (!edgeExec) {
							edgeExec = executionDoc.createMap<unknown>();
							edgeExec.set('edgeId', edgeId);
							edgeExec.set('sourceNodeName', sourceNodeName);
							edgeExec.set('connectionType', connectionType);
							edgeExec.set('outputIndex', outputIndex);
							edgeExec.set('totalItems', 0);
							edgeExec.set('iterations', 0);
							execEdges.set(edgeId, edgeExec);
						}

						const currentTotal = (edgeExec.get('totalItems') as number) ?? 0;
						const currentIterations = (edgeExec.get('iterations') as number) ?? 0;
						edgeExec.set('totalItems', currentTotal + itemCount);
						edgeExec.set('iterations', currentIterations + 1);
					}
				}
			}
		});
	}
}

// --- Read Helpers ---

/**
 * Get execution metadata from the document.
 */
export function getExecutionMeta(executionDoc: CRDTDoc): ExecutionMeta | null {
	const meta = executionDoc.getMap<unknown>('meta');
	const executionId = meta.get('executionId') as string | undefined;
	if (!executionId) return null;

	return {
		executionId,
		workflowId: meta.get('workflowId') as string,
		status: meta.get('status') as ExecutionStatus,
		mode: meta.get('mode') as WorkflowExecuteMode,
		startedAt: meta.get('startedAt') as number,
		finishedAt: meta.get('finishedAt') as number | undefined,
	};
}

/**
 * Get execution data for a node by name.
 */
export function getNodeExecutionByName(
	executionDoc: CRDTDoc,
	nodeName: string,
): ITaskData[] | null {
	const runData = executionDoc.getMap<unknown>('runData');
	const nodeRuns = runData.get(nodeName) as TaskDataArray | undefined;
	if (!nodeRuns) return null;

	// Convert CRDT array to plain array
	const result: ITaskData[] = [];
	for (let i = 0; i < nodeRuns.length; i++) {
		const crdtTask = nodeRuns.get(i) as TaskDataMap | undefined;
		if (crdtTask) {
			result.push(toJSON(crdtTask) as ITaskData);
		}
	}
	return result.length > 0 ? result : null;
}

/**
 * Get execution data for a node by ID (via nodeIndex lookup).
 */
export function getNodeExecutionById(executionDoc: CRDTDoc, nodeId: string): ITaskData[] | null {
	const nodeIndex = executionDoc.getMap<unknown>('nodeIndex');
	const nodeName = nodeIndex.get(nodeId) as string | undefined;
	if (!nodeName) return null;
	return getNodeExecutionByName(executionDoc, nodeName);
}

/**
 * Get edge execution data by edge ID.
 */
export function getEdgeExecution(executionDoc: CRDTDoc, edgeId: string): EdgeExecutionState | null {
	const edges = executionDoc.getMap<unknown>('edges');
	const edgeExec = edges.get(edgeId) as EdgeMap | undefined;
	if (!edgeExec) return null;

	return {
		edgeId: edgeExec.get('edgeId') as string,
		sourceNodeName: edgeExec.get('sourceNodeName') as string,
		targetNodeName: edgeExec.get('targetNodeName') as string | undefined,
		connectionType: edgeExec.get('connectionType') as string,
		outputIndex: edgeExec.get('outputIndex') as number,
		totalItems: edgeExec.get('totalItems') as number,
		iterations: edgeExec.get('iterations') as number,
	};
}

/**
 * Get node names that called this node (from source field).
 */
export function getCallingNodes(executionDoc: CRDTDoc, nodeName: string): string[] {
	const nodeRuns = getNodeExecutionByName(executionDoc, nodeName);
	if (!nodeRuns) return [];

	const callers = new Set<string>();
	for (const run of nodeRuns) {
		for (const source of run.source ?? []) {
			if (source?.previousNode) {
				callers.add(source.previousNode);
			}
		}
	}
	return Array.from(callers);
}

/**
 * Get node name by ID from the nodeIndex.
 */
export function getNodeNameById(executionDoc: CRDTDoc, nodeId: string): string | null {
	const nodeIndex = executionDoc.getMap<unknown>('nodeIndex');
	const nodeName = nodeIndex.get(nodeId) as string | undefined;
	return nodeName ?? null;
}

/**
 * Handle node rename - update execution data keys.
 * Called when a node is renamed after execution completes.
 */
export function handleNodeRename(executionDoc: CRDTDoc, oldName: string, newName: string): void {
	executionDoc.transact(() => {
		const runData = executionDoc.getMap<unknown>('runData');
		const nodeData = runData.get(oldName) as TaskDataArray | undefined;

		if (nodeData) {
			// Move data to new key
			runData.set(newName, nodeData);
			runData.delete(oldName);
		}

		// Update edges that reference this node
		const edges = executionDoc.getMap<unknown>('edges');
		for (const [, edgeValue] of edges.entries()) {
			const edgeExec = edgeValue as EdgeMap;
			if (edgeExec.get('sourceNodeName') === oldName) {
				edgeExec.set('sourceNodeName', newName);
			}
			if (edgeExec.get('targetNodeName') === oldName) {
				edgeExec.set('targetNodeName', newName);
			}
		}

		// Update nodeIndex (reverse lookup)
		const nodeIndex = executionDoc.getMap<unknown>('nodeIndex');
		for (const [nodeId, name] of nodeIndex.entries()) {
			if (name === oldName) {
				nodeIndex.set(nodeId, newName);
				break;
			}
		}
	});
}
