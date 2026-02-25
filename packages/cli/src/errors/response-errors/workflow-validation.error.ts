import { BadRequestError } from './bad-request.error';

/**
 * Error thrown when a workflow fails validation before activation.
 */
export class WorkflowValidationError extends BadRequestError {
	readonly meta = { validationError: true as const };

	constructor(message: string) {
		super(message);
		this.name = 'WorkflowValidationError';
	}
}
