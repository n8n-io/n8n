import { UserError } from '@n8n/errors';

export class FileUploadError extends UserError {
	constructor(msg: string) {
		super(`Error uploading file: ${msg}`, {
			level: 'warning',
		});
	}
}
