import type { WorkflowPublishBlockedDetails, WorkflowPublishBlockedReason } from '@n8n/api-types';

import { ConflictError } from './conflict.error';

const messages: Record<WorkflowPublishBlockedReason, string> = {
	review_pending:
		"Workflow can't be published while its review is open. Submit this version to the review, or wait for the review to close.",
	changes_requested:
		"Workflow can't be published because its review has requested changes. Submit this version to the review, or wait for the review to close.",
	insufficient_api_key_scope:
		"Your change was saved as a draft. It wasn't published because this API key does not have the workflow:activate scope.",
	insufficient_permissions:
		"Your change was saved as a draft. It wasn't published because you do not have permission to publish this workflow. Ask the owner to publish it for you.",
};

export class WorkflowPublishBlockedError extends ConflictError {
	constructor(readonly details: WorkflowPublishBlockedDetails) {
		super(messages[details.reason], undefined, {
			...details,
			validationError: true,
		});
	}
}
