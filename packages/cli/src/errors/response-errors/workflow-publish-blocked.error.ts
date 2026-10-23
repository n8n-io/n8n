import type { WorkflowReviewBlockedDetails, WorkflowReviewBlockedReason } from '@n8n/api-types';

import { ConflictError } from '@n8n/errors';

const messages: Record<WorkflowReviewBlockedReason, string> = {
	review_pending:
		"Workflow can't be published while its review is open. Submit this version to the review, or wait for the review to close.",
	changes_requested:
		"Workflow can't be published because its review has requested changes. Submit this version to the review, or wait for the review to close.",
};

export class WorkflowPublishBlockedError extends ConflictError {
	constructor(readonly details: WorkflowReviewBlockedDetails) {
		super(messages[details.reason], undefined, {
			...details,
			validationError: true,
		});
	}
}
