import { ApplicationError } from 'n8n-workflow';

export class DeduplicationError extends ApplicationError {
	constructor(message: string) {
		super(`Deduplication Failed: ${message}`);
	}
}
