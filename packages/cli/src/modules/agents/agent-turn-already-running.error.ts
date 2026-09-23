import { UserError } from 'n8n-workflow';

/** Another turn holds the lease of the session. */
export class AgentTurnAlreadyRunningError extends UserError {
	constructor() {
		super('A turn is already running in this conversation.');
	}
}
