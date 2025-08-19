import { UserError } from 'n8n-workflow';

export class DataStoreValidationError extends UserError {
	constructor(msg: string) {
		super(`Validation error with data store request: ${msg}`, {
			level: 'warning',
		});
	}
}
