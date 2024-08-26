import { ApplicationError } from 'n8n-workflow';

export class MissingScopedLoggerError extends ApplicationError {
	constructor(scope: string) {
		super('Failed to find scoped logger', { extra: { scope } });
	}
}
