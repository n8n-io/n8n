import { UserError } from '@n8n/errors';

export class InvalidConcurrencyLimitError extends UserError {
	constructor(value: number) {
		super('Concurrency limit set to invalid value', { extra: { value } });
	}
}
