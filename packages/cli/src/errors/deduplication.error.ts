import { UnexpectedError } from '@n8n/errors';

export class DeduplicationError extends UnexpectedError {
	constructor(message: string) {
		super(`Deduplication Failed: ${message}`);
	}
}
