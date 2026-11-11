import type { WorkflowReviewBlockedDetails } from '@n8n/api-types';

import { ConflictError } from '@n8n/errors';

export type WorkflowApprovalRequiredDetails = { reason: 'approval_required' };

type WorkflowPublishBlockedErrorDetails =
	| WorkflowReviewBlockedDetails
	| WorkflowApprovalRequiredDetails;

const messages: Record<WorkflowPublishBlockedErrorDetails['reason'], string> = {
	review_pending:
		"Workflow can't be published while its review is open. Submit this version to the review, or wait for the review to close.",
	changes_requested:
		"Workflow can't be published because its review has requested changes. Submit this version to the review, or wait for the review to close.",
	approval_required:
		"Workflow can't be published until a reviewer approves this version. Submit it for review first.",
};

export class WorkflowPublishBlockedError extends ConflictError {
	constructor(readonly details: WorkflowPublishBlockedErrorDetails) {
		super(messages[details.reason], undefined, {
			...details,
			validationError: true,
		});
	}
}
