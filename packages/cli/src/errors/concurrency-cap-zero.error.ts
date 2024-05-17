import { ApplicationError } from 'n8n-workflow';

export class ConcurrencyCapZeroError extends ApplicationError {
	constructor() {
		super('Concurrency cap cannot be set to 0', { level: 'warning' });
	}
}
