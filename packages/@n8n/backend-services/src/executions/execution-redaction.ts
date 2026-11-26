import type { ExecutionRedactionQueryDto } from '@n8n/api-types';
import type { IExecutionBase, OperationContext, User } from '@n8n/db';
import type { IRunExecutionData, IWorkflowBase, WorkflowExecuteMode } from 'n8n-workflow';

export type ExecutionRedactionOptions = {
	user: User;
	ipAddress?: string;
	userAgent?: string;
	/** When true, the original execution is never mutated. If redaction is needed,
	 *  a structuredClone is created and returned. If no redaction is needed, the
	 *  original is returned as-is (caller can check referential equality).
	 *  The proxy still deletes the push session fields in place. */
	keepOriginal?: boolean;
	/** Operation context of the request, for the audit events. */
	ctx?: OperationContext;
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
	data: Pick<
		IRunExecutionData,
		'resultData' | 'executionData' | 'redactionInfo' | 'pushRef' | 'pushRefUserId'
	>;
	workflowData: Pick<IWorkflowBase, 'settings' | 'nodes'>;
	/** Highlighted data. Redaction clears it together with the run data. */
	customData?: Record<string, string>;
	/** True when the read skipped the run data because it is too large to display. */
	dataTooLargeToDisplay?: boolean;
	/** Where the run data is stored: `'db'`, or a blob store such as `'fs'` or `'s3'`. */
	storedAt?: string;
};

/** Narrows a loaded execution to one the redaction strategies can process. */
export function isRedactableExecution(
	execution: IExecutionBase,
): execution is IExecutionBase & RedactableExecution {
	return 'data' in execution && 'workflowData' in execution;
}
