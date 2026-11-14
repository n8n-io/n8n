import { OperationalError } from '@n8n/errors';

/** The turn ran longer than `N8N_AGENTS_TURN_TIMEOUT` allows, so n8n stopped it. */
export class AgentTurnTimeoutError extends OperationalError {
	constructor(timeoutSeconds: number) {
		super(
			`Agent execution stopped because it ran longer than the limit of ${timeoutSeconds} seconds.`,
		);
	}
}
