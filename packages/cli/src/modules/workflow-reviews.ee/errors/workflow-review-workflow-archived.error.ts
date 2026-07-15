import { UserError } from 'n8n-workflow';

// Raised when a review is requested for an archived workflow.
export class WorkflowReviewWorkflowArchivedError extends UserError {
	constructor(workflowId: string) {
		super(`The workflow '${workflowId}' is archived and cannot be submitted for review`, {
			level: 'warning',
		});
	}
}
