import { UnexpectedError } from '@n8n/errors';

export class BinaryDataFileNotFoundError extends UnexpectedError {
	constructor(fileId: string) {
		super('Binary data file not found', { extra: { fileId } });
	}
}
