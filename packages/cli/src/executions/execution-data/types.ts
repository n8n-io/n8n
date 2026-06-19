import type { EntityManager } from '@n8n/db';
import type { IWorkflowBase } from 'n8n-workflow';

export type ExecutionRef = {
	workflowId: string;
	executionId: string;
};

export function createExecutionRef(workflowId: string, executionId: string): ExecutionRef {
	return { workflowId, executionId };
}

export type WorkflowSnapshot = Pick<
	IWorkflowBase,
	'id' | 'name' | 'nodes' | 'connections' | 'settings'
>;

export type ExecutionDataPayload = {
	data: string;
	workflowData: WorkflowSnapshot;
	workflowVersionId: string | null;
};

export type ExecutionDataBundle = ExecutionDataPayload & {
	version: 1;
};

/** The workflow-snapshot part of a bundle, without the run data. */
export type BundleWorkflowSnapshot = Pick<
	ExecutionDataBundle,
	'workflowData' | 'workflowVersionId'
>;

/**
 * Persistence operations for execution data bundles. Methods which accept an
 * optional `tx` (`EntityManager`) do so for transactional participation:
 * `DbStore` uses it; `FsStore` ignores it (the filesystem is not transactional).
 */
export interface ExecutionDataStore {
	init?(): Promise<void>;
	/** Persist a bundle and return the number of bytes it occupies in this store. */
	write(ref: ExecutionRef, payload: ExecutionDataPayload, tx?: EntityManager): Promise<number>;
	read(ref: ExecutionRef, tx?: EntityManager): Promise<ExecutionDataBundle | null>;
	/** Read multiple bundles by ref. Returns a map keyed by `executionId`; missing entries are omitted. */
	readMany(refs: ExecutionRef[]): Promise<Map<string, ExecutionDataBundle>>;
	/**
	 * Read only the workflow snapshot, skipping the run data. Optional — only stores that keep the
	 * two separately (DB columns) implement it; blob stores omit it and callers fall back.
	 */
	readWorkflowData?(ref: ExecutionRef, tx?: EntityManager): Promise<BundleWorkflowSnapshot | null>;
	/**
	 * Cheap size of the stored run data, without loading it. Lets the size guard reject legacy
	 * rows (`jsonSizeBytes === 0`) before reading. Optional — stores that can't size without
	 * loading omit it, and callers fall back to measuring after read.
	 */
	getDataByteSize?(ref: ExecutionRef, tx?: EntityManager): Promise<number | null>;
	delete(ref: ExecutionRef | ExecutionRef[]): Promise<void>;
}
