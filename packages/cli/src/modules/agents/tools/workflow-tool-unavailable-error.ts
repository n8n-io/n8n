import { UserError } from 'n8n-workflow';

/**
 * The referenced workflow cannot back a tool right now: it is gone, out of
 * reach, not published, or does not fit the tool contract. Runtime construction
 * swaps in a stub that reports the reason when called; any other error still
 * fails the build.
 *
 * Lives apart from the factory so the runtime builder can check it without
 * loading the factory eagerly.
 */
export class WorkflowToolUnavailableError extends UserError {
	constructor(
		readonly reason: 'not_found' | 'not_published' | 'incompatible',
		message: string,
	) {
		super(message);
	}
}
