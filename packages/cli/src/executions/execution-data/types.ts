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
	delete(ref: ExecutionRef | ExecutionRef[]): Promise<void>;
}
