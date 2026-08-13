import { UserError } from 'n8n-workflow';

export class FileStorageValidationError extends UserError {
	constructor(msg: string) {
		super(`Validation error with file storage request: ${msg}`, {
			level: 'warning',
		});
	}
}
