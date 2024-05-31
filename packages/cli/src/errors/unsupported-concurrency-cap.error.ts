import { ApplicationError } from 'n8n-workflow';

export class UnsupportedConcurrencyCapError extends ApplicationError {
	constructor(value: number) {
		super('Concurrency cap cannot be set to this value', { level: 'warning', extra: { value } });
	}
}
