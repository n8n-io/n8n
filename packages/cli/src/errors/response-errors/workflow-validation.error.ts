import { WorkflowActivationBadRequestError } from './workflow-activation-bad-request.error';

/**
 * Error thrown when a workflow fails validation before activation.
 */
export class WorkflowValidationError extends WorkflowActivationBadRequestError {
	constructor(message: string, meta: { nodeId?: string; description?: string } = {}) {
		super(message, { ...meta, validationError: true });
		this.name = 'WorkflowValidationError';
	}
}
