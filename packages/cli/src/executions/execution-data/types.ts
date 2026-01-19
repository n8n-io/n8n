import type { IWorkflowBase } from 'n8n-workflow';

type ExecutionRef = {
	workflowId: string;
	executionId: string;
};

type ExecutionDataPayload = {
	data: string;
	workflowData: IWorkflowBase;
	workflowVersionId: string | null;
};

export interface ExecutionDataManager {
	init?(): Promise<void>;
	write(ref: ExecutionRef, payload: ExecutionDataPayload): Promise<void>;
	read(ref: ExecutionRef): Promise<ExecutionDataPayload>;
	delete(ref: ExecutionRef | ExecutionRef[]): Promise<void>;
}
