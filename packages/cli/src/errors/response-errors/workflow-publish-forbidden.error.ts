import type {
	WorkflowPublishForbiddenDetails,
	WorkflowPublishForbiddenReason,
} from '@n8n/api-types';

import { ForbiddenError } from './forbidden.error';

const messages: Record<WorkflowPublishForbiddenReason, string> = {
	insufficient_api_key_scope:
		"Your change was saved as a draft. It wasn't published because this API key does not have the workflow:activate scope.",
	insufficient_permissions:
		"Your change was saved as a draft. It wasn't published because you do not have permission to publish this workflow. Ask the owner to publish it for you.",
};

/**
 * The caller may write a draft version but not release it. `validationError` marks the published
 * version as untouched, so the editor does not flip the workflow to inactive on the client.
 */
export class WorkflowPublishForbiddenError extends ForbiddenError {
	override readonly meta: Record<string, unknown>;

	constructor(readonly details: WorkflowPublishForbiddenDetails) {
		super(messages[details.reason]);
		this.meta = { ...this.details, validationError: true };
	}
}
