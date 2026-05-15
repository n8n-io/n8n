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

export interface ExecutionDataStore {
	init?(): Promise<void>;
	/**
	 * @param tx - Optional `EntityManager` for transactional writes.
	 *   Used by `DbStore` to participate in a wrapping transaction.
	 *   Ignored by `FsStore` (the filesystem is not transactional).
	 */
	write(ref: ExecutionRef, payload: ExecutionDataPayload, tx?: EntityManager): Promise<void>;
	read(ref: ExecutionRef): Promise<ExecutionDataBundle | null>;
	delete(ref: ExecutionRef | ExecutionRef[]): Promise<void>;
}
