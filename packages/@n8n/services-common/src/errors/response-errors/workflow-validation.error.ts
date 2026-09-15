import { WorkflowActivationBadRequestError } from './workflow-activation-bad-request.error';

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
