import { ApplicationError } from '@n8n/errors';

export class BinaryDataFileNotFoundError extends ApplicationError {
	constructor(fileId: string) {
		super('Binary data file not found', { extra: { fileId } });
	}
}
