import type { ExecutionDataStorageLocation } from '@n8n/db';
import type { IWorkflowBase } from 'n8n-workflow';

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
