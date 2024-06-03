import { ApplicationError } from 'n8n-workflow';

export class InvalidConcurrencyCapError extends ApplicationError {
	constructor(value: number) {
		super('Concurrency cap set to invalid value', { level: 'warning', extra: { value } });
	}
}
