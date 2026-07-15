import { UserError } from 'n8n-workflow';

/**
 * Raised when the workflow does not exist or the user lacks access to it.
 * The two cases are deliberately indistinguishable so we don't leak the
 * existence of workflows the caller cannot see.
 */
export class WorkflowReviewWorkflowNotFoundError extends UserError {
	constructor(workflowId: string) {
		super(`Could not find the workflow: '${workflowId}'`, { level: 'warning' });
	}
}
