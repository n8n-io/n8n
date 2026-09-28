import { BadRequestError } from '@n8n/backend-services';

/**
 * Error thrown when a workflow fails to deactivate, e.g. because a
 * `workflow.deactivate` external hook rejected the operation.
 */
export class WorkflowDeactivationBadRequestError extends BadRequestError {
	constructor(
		message: string,
		readonly meta: { description?: string } = {},
	) {
		super(message);
		this.name = 'WorkflowDeactivationBadRequestError';
	}
}
