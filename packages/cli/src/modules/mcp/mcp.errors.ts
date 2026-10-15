import { Time } from '@n8n/constants';
import { OperationalError, UserError } from 'n8n-workflow';

import type { WorkflowNotFoundReason } from './mcp.types';

/**
 * Error thrown when MCP workflow execution times out
 */
export class McpExecutionTimeoutError extends UserError {
	executionId: string | null;
	timeoutMs: number;

	constructor(executionId: string | null, timeoutMs: number) {
		const timeoutSeconds = timeoutMs * Time.milliseconds.toSeconds;
		super(`Workflow execution timed out after ${timeoutSeconds} seconds`);

		this.name = 'McpExecutionTimeoutError';
		this.executionId = executionId;
		this.timeoutMs = timeoutMs;
	}
}

/**
 * Error thrown when workflow access fails during MCP execution.
 * Includes a reason for better error messages and telemetry.
 */
export class WorkflowAccessError extends UserError {
	readonly reason: WorkflowNotFoundReason;

	constructor(message: string, reason: WorkflowNotFoundReason) {
		super(message);
		this.name = 'WorkflowAccessError';
		this.reason = reason;
	}
}

export const WORKFLOW_CONFLICT_ERROR_CODE = 'WORKFLOW_CONFLICT';

/**
 * Thrown when an MCP workflow save loses optimistic concurrency: the workflow
 * changed after the client read it. The editor, n8n Assistant, and other MCP
 * clients can all edit the same workflow, so the client must re-read it before
 * it retries.
 */
export class WorkflowUpdateConflictError extends OperationalError {
	readonly errorCode = WORKFLOW_CONFLICT_ERROR_CODE;

	constructor(workflowId: string) {
		super(
			`Workflow ${workflowId} was modified after you last read it (in the editor, by n8n Assistant, or by another MCP client). Nothing was saved. Call get_workflow_details to read the current workflow and its checksum, re-apply your changes to that version, then call update_workflow again with the new checksum as expectedChecksum.`,
			{ level: 'warning' },
		);
		this.name = 'WorkflowUpdateConflictError';
	}
}
