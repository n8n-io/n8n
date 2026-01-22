import type { IWorkflowBase } from 'n8n-workflow';

export type ExecutionRef = {
	workflowId: string;
	executionId: string;
};

export function createExecutionRef(workflowId: string, executionId: string): ExecutionRef {
	return { workflowId, executionId };
}

export type ExecutionDataPayload = {
	data: string;
	workflowData: IWorkflowBase;
	workflowVersionId: string | null;
};

export type ExecutionDataBundle = ExecutionDataPayload & {
	version: 1;
};

export interface ExecutionDataStore {
	init?(): Promise<void>;
	write(ref: ExecutionRef, payload: ExecutionDataPayload): Promise<void>;
	read(ref: ExecutionRef): Promise<ExecutionDataBundle | null>;
	delete(ref: ExecutionRef | ExecutionRef[]): Promise<void>;
}
