/**
 * Custom error class for workflow generation failures that preserves captured logs.
 * When the one-shot agent fails to produce a workflow, this error carries the logs
 * that were captured during execution, allowing them to be saved to disk for debugging.
 */
export class WorkflowGenerationError extends Error {
	constructor(
		message: string,
		public readonly logs?: string,
	) {
		super(message);
		this.name = 'WorkflowGenerationError';
	}
}
