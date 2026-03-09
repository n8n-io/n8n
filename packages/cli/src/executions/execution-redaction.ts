import type { ExecutionRedactionQueryDto } from '@n8n/api-types';
import type { User } from '@n8n/db';
import type { IRunExecutionData, IWorkflowBase, WorkflowExecuteMode } from 'n8n-workflow';

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

/**
 * Minimal structural type for execution data that needs redaction processing.
 * Decouples redaction strategies from `IExecutionDb` so they can be tested
 * and reused without a full database entity.
 *
 * `workflowData.nodes` is required so strategies can look up per-node
 * `sensitiveOutputFields` declarations from the node type registry.
 */
export type RedactableExecution = {
	id?: string;
	mode: WorkflowExecuteMode;
	workflowId: string;
	data: IRunExecutionData;
	workflowData: Pick<IWorkflowBase, 'settings' | 'nodes'>;
};
