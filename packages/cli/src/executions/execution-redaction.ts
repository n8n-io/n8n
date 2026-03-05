import type { ExecutionRedactionQueryDto } from '@n8n/api-types';
import type { User } from '@n8n/db';
import type { IRunExecutionData, IWorkflowBase, WorkflowExecuteMode } from 'n8n-workflow';

export type RedactableExecution = {
	id?: string;
	mode: WorkflowExecuteMode;
	workflowId: string;
	data: IRunExecutionData;
	workflowData: Pick<IWorkflowBase, 'settings'>;
};

export type ExecutionRedactionOptions = {
	user: User;
	ipAddress?: string;
	userAgent?: string;
} & Pick<ExecutionRedactionQueryDto, 'redactExecutionData'>;

export interface ExecutionRedaction {
	processExecution(
		execution: RedactableExecution,
		options: ExecutionRedactionOptions,
	): Promise<RedactableExecution>;

	processExecutions(
		executions: RedactableExecution[],
		options: ExecutionRedactionOptions,
	): Promise<void>;
}
