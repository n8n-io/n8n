import { BadRequestError } from './bad-request.error';

export type WorkflowActivationErrorMeta = {
	nodeId?: string;
	validationError?: boolean;
	description?: string;
	/**
	 * `message` with links, for clients that render HTML. `message` itself stays
	 * plain: the Public API, the MCP tools and Instance AI all read it as text.
	 */
	messageHtml?: string;
};

/**
 * Error thrown when a workflow fails to activate due to a node-level error.
 * Includes the node ID in meta so the frontend can identify the failing node.
 */
export class WorkflowActivationBadRequestError extends BadRequestError {
	constructor(
		message: string,
		readonly meta: WorkflowActivationErrorMeta = {},
	) {
		super(message);
		this.name = 'WorkflowActivationBadRequestError';
	}
}
