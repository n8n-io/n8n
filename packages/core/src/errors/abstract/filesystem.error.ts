import { OperationalError } from 'n8n-workflow';

export abstract class FileSystemError extends OperationalError {
	constructor(message: string, filePath: string) {
		super(message, { extra: { filePath } });
	}
}
