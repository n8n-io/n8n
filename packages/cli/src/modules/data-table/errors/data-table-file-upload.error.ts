import { UserError } from 'n8n-workflow';

export class FileUploadError extends UserError {
	constructor(msg: string) {
		super(`Error uploading file: ${msg}`, {
			level: 'warning',
		});
	}
}
