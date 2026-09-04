import { UserError } from 'n8n-workflow';

/**
 * Thrown when `workflow.preExecute` refuses the run. The original hook error
 * is kept as `cause` so HTTP and parent-workflow callers still see it.
 */
export class PreExecuteBlockedError extends UserError {
	override readonly cause: Error;

	constructor(cause: Error) {
		super(cause.message, { cause });
		this.cause = cause;
	}

	static unwrap(error: unknown): unknown {
		return error instanceof PreExecuteBlockedError ? error.cause : error;
	}
}
