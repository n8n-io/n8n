import { UnexpectedError } from 'n8n-workflow';

export class WorkflowNotFoundError extends UnexpectedError {
	constructor(readonly workflowId: string) {
		super(`Workflow ${workflowId} not found or not accessible`);
	}
}

export function isWorkflowNotFoundError(error: unknown): boolean {
	if (error instanceof WorkflowNotFoundError) return true;
	return error instanceof Error && error.cause instanceof WorkflowNotFoundError;
}
