import { UserError } from 'n8n-workflow';

/**
 * The referenced workflow cannot run as a callable right now: it is gone, out
 * of reach, not published, or does not fit the callable contract. Agent tools
 * swap in a stub that reports the reason. App bindings return it to the app.
 *
 * Lives apart from the other helpers so callers can check it without loading them.
 */
export class CallableWorkflowUnavailableError extends UserError {
	constructor(
		readonly reason: 'not_found' | 'not_published' | 'incompatible',
		message: string,
	) {
		super(message);
	}
}
