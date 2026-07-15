import { UserError } from 'n8n-workflow';

/**
 * Raised when the instance-level workflow-reviews policy
 * (`security.workflowReviews.enabled`) is turned off.
 */
export class WorkflowReviewsDisabledError extends UserError {
	constructor() {
		super('Workflow reviews are not enabled for this instance', { level: 'warning' });
	}
}
