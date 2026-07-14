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

export type ExecutionDataPayload = {
	data: string;
	workflowData: WorkflowSnapshot;
	workflowVersionId: string | null;
};

/** The workflow-snapshot part of a payload, without the run data. */
export type BundleWorkflowSnapshot = Pick<
	ExecutionDataPayload,
	'workflowData' | 'workflowVersionId'
>;
