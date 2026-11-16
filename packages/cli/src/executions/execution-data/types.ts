import type { ExecutionDataStorageLocation } from '@n8n/db';
import type { WorkflowDocument } from '@n8n/engine';
import type { IPinData, IWorkflowBase } from 'n8n-workflow';

/** Storage locations served by the execution-data JSON store. `db` is handled natively by `DbStore`. */
export type BlobStorageLocation = Exclude<ExecutionDataStorageLocation, 'db'>;

export type ExecutionRef = {
	workflowId: string;
	executionId: string;
};

export function createExecutionRef(workflowId: string, executionId: string): ExecutionRef {
	return { workflowId, executionId };
}

export type WorkflowSnapshot = Pick<
	IWorkflowBase,
	'id' | 'name' | 'nodes' | 'connections' | 'settings' | 'nodeGroups'
>;

/**
 * Narrows a workflow to what an execution read reports. Every path that serves
 * `IExecutionResponse.workflowData` must use this: the editor renders a v1 and a
 * v2 execution with the same code.
 */
export function toWorkflowSnapshot(workflow: WorkflowSnapshot): WorkflowSnapshot {
	const { id, name, nodes, connections, settings, nodeGroups } = workflow;
	return { id, name, nodes, connections, settings, nodeGroups };
}

/**
 * What the data plane stores beside an engine v2 execution: the snapshot, plus
 * the pin data the run used. The execution read reports that pin data as
 * `resultData.pinData`, as engine v1 does, and keeps it out of `workflowData`.
 */
export type WorkflowRunDocument = WorkflowSnapshot & { pinData?: IPinData };

/**
 * The same projection, shaped for the engine v2 start request. The data plane
 * stores it beside the execution and reports it back, without reading into it,
 * so it crosses the boundary as plain JSON. The cast is unavoidable: the engine
 * has no `n8n-workflow` dependency, and `INode` and friends are interfaces, so
 * they never gain the index signature `JsonObject` asks for.
 */
export function toWorkflowDocument(
	workflow: WorkflowSnapshot,
	pinData?: IPinData,
): WorkflowDocument {
	const document: WorkflowRunDocument = toWorkflowSnapshot(workflow);
	if (pinData !== undefined) document.pinData = pinData;
	return document as unknown as WorkflowDocument;
}

export type ExecutionDataPayload = BundleWorkflowSnapshot & {
	data: string;
};

export function isExecutionDataPayload(x: BundleWorkflowSnapshot): x is ExecutionDataPayload {
	return 'data' in x && typeof x.data === 'string';
}

/** The workflow-snapshot part of a payload, without the run data. */
export type BundleWorkflowSnapshot = {
	workflowData: WorkflowSnapshot;
	workflowVersionId: string | null;
};
