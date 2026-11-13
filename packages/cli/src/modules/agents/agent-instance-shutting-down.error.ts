import { OperationalError } from '@n8n/errors';

/** This process is shutting down and does not start new agent turns. */
export class AgentInstanceShuttingDownError extends OperationalError {
	constructor() {
		super('n8n is shutting down. Try again in a moment.');
	}
}
