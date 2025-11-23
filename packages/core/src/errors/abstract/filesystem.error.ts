import { ApplicationError } from '@n8n/errors';

export abstract class FileSystemError extends ApplicationError {
	constructor(message: string, filePath: string) {
		super(message, { extra: { filePath } });
	}
}
