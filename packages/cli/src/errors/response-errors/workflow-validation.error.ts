import { WorkflowActivationBadRequestError } from './workflow-activation-bad-request.error.js';

/**
 * Error thrown when a workflow fails validation before activation.
 */
export class WorkflowValidationError extends WorkflowActivationBadRequestError {
	override readonly meta = { validationError: true as const };

	constructor(message: string) {
		super(message);
		this.name = 'WorkflowValidationError';
	}
}
