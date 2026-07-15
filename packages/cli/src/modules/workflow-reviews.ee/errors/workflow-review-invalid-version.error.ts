import { UserError } from 'n8n-workflow';

// Raised when the pinned version does not belong to the given workflow.
export class WorkflowReviewInvalidVersionError extends UserError {
	constructor(workflowId: string, workflowVersionId: string) {
		super(`Version '${workflowVersionId}' does not exist for workflow '${workflowId}'`, {
			level: 'warning',
		});
	}
}
