import { UserError } from 'n8n-workflow';

export class AgentTurnAlreadyRunningError extends UserError {
	constructor() {
		super('A turn is already running in this conversation.');
	}
}
