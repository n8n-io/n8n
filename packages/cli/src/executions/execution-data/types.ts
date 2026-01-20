import type { IWorkflowBase } from 'n8n-workflow';

export type ExecutionRef = {
	workflowId: string;
	executionId: string;
};

export type ExecutionDataPayload = {
	data: string;
	workflowData: IWorkflowBase;
	workflowVersionId: string | null;
};

export type ExecutionDataBundle = ExecutionDataPayload & {
	version: number;
};

export interface ExecutionDataStore {
	init?(): Promise<void>;
	write(ref: ExecutionRef, payload: ExecutionDataPayload): Promise<void>;
	read(ref: ExecutionRef): Promise<ExecutionDataBundle | null>;
	delete(ref: ExecutionRef | ExecutionRef[]): Promise<void>;
}
