import { ApplicationError } from 'n8n-workflow';

export class InvalidConcurrencyLimitError extends ApplicationError {
	constructor(value: number) {
		super('Concurrency limit set to invalid value', { level: 'warning', extra: { value } });
	}
}
