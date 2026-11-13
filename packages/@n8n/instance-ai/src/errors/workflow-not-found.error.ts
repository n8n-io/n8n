import { OperationalError } from '@n8n/errors';

export class WorkflowNotFoundError extends OperationalError {
	constructor(readonly workflowId: string) {
		super(`Workflow ${workflowId} not found or not accessible`, { level: 'warning' });
	}
}

export function isWorkflowNotFoundError(error: unknown): boolean {
	if (error instanceof WorkflowNotFoundError) return true;
	return error instanceof Error && error.cause instanceof WorkflowNotFoundError;
}
