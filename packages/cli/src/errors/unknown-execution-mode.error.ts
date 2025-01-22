import { ApplicationError } from 'n8n-workflow';

export class UnknownExecutionModeError extends ApplicationError {
	constructor(mode: string) {
		super('Unknown execution mode', { extra: { mode } });
	}
}
