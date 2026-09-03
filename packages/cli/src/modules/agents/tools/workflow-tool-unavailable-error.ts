import { UserError } from 'n8n-workflow';

/**
 * The referenced workflow cannot back a tool right now: it is gone, out of
 * reach, or does not fit the tool contract. Runtime construction drops the
 * tool and keeps the agent running; any other error still fails the build.
 *
 * Lives apart from the factory so the runtime builder can check it without
 * loading the factory eagerly.
 */
export class WorkflowToolUnavailableError extends UserError {
	constructor(
		readonly reason: 'not_found' | 'incompatible',
		message: string,
	) {
		super(message);
	}
}
