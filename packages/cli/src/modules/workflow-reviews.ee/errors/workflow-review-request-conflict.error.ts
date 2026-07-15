import { UserError } from 'n8n-workflow';

/**
 * Raised when an open review request already exists for the workflow.
 * Carries the id of the conflicting request so the caller can point the
 * user at it (surfaced as `meta` on the 409 response).
 */
export class WorkflowReviewRequestConflictError extends UserError {
	constructor(readonly conflictingRequestId: string) {
		super('An open review request already exists for this workflow', { level: 'warning' });
	}
}
