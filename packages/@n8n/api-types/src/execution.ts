import type { ExecutionStatus } from '@n8n/constants';
import type { WorkflowExecuteMode, IRunExecutionData, IWorkflowBase } from 'n8n-workflow';

// Data in regular format with references
export interface IExecutionDb extends IExecutionBase {
	data: IRunExecutionData;
	workflowData: IWorkflowBase;
}

/** Payload for creating an execution. */
export type CreateExecutionPayload = Omit<IExecutionDb, 'id' | 'createdAt' | 'startedAt'>;

export interface IExecutionBase {
	id: string;
	mode: WorkflowExecuteMode;
	createdAt: Date; // set by DB
	startedAt: Date;
	stoppedAt?: Date; // empty value means execution is still running
	workflowId: string;

	/**
	 * @deprecated Use `status` instead
	 */
	finished: boolean;
	retryOf?: string; // If it is a retry, the id of the execution it is a retry of.
	retrySuccessId?: string; // If it failed and a retry did succeed. The id of the successful retry.
	status: ExecutionStatus;
	waitTill?: Date | null;
}

export interface IExecutionFlattedDb extends IExecutionBase {
	id: string;
	data: string;
	workflowData: Omit<IWorkflowBase, 'pinData'>;
	customData: Record<string, string>;
}

export interface ITagBase {
	id: string;
	name: string;
}
