import { OperationalError } from 'n8n-workflow';

export class FileNotFoundError extends OperationalError {
	constructor(filePath: string) {
		super('File not found', { extra: { filePath } });
	}
}
