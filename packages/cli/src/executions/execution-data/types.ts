import type { ExecutionDataStorageLocation } from '@n8n/db';
import type { IWorkflowBase } from 'n8n-workflow';

/** Storage locations served by {@link ExecutionDataStore} implementations. `db` is handled natively by `DbStore`. */
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

export type ExecutionDataBundle = ExecutionDataPayload & {
	version: 1;
};

/** The workflow-snapshot part of a payload, without the run data. */
export type BundleWorkflowSnapshot = Pick<
	ExecutionDataPayload,
	'workflowData' | 'workflowVersionId'
>;

/**
 * Persistence operations for execution data bundles kept in
 * blob storage (filesystem, S3, Azure Blob Storage).
 */
export interface ExecutionDataStore {
	init?(): Promise<void>;
	/** Persist a bundle and return the number of bytes it occupies in this store. */
	write(ref: ExecutionRef, payload: ExecutionDataPayload): Promise<number>;
	read(ref: ExecutionRef): Promise<ExecutionDataBundle | null>;
	/** Read multiple bundles by ref. Returns a map keyed by `executionId`; missing entries are omitted. */
	readMany(refs: ExecutionRef[]): Promise<Map<string, ExecutionDataBundle>>;
	delete(ref: ExecutionRef | ExecutionRef[]): Promise<void>;
}
