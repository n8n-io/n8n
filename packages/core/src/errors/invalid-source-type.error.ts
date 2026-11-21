import { UnexpectedError } from '@n8n/errors';

export class InvalidSourceTypeError extends UnexpectedError {
	constructor(sourceType: string) {
		super(`Custom file location with invalid source type: ${sourceType}`);
	}
}
