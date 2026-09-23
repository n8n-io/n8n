import { OperationalError } from 'n8n-workflow';

/** The main could not renew the session lease, so another main can take over the session. */
export class AgentSessionLeaseLostError extends OperationalError {
	constructor() {
		super('The agent session lease was lost.');
	}
}
