import { BadRequestError } from './bad-request.error';

/**
 * Error thrown when a workflow fails to activate due to a node-level error.
 * Includes the node ID in meta so the frontend can identify the failing node.
 */
export class WorkflowActivationBadRequestError extends BadRequestError {
	constructor(
		message: string,
		readonly meta: { nodeId?: string; validationError?: boolean; description?: string } = {},
	) {
		super(message);
		this.name = 'WorkflowActivationBadRequestError';
	}
}
