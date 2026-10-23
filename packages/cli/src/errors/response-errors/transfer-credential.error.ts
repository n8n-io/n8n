import { ResponseError } from '@n8n/errors';

export class TransferCredentialError extends ResponseError {
	constructor(message: string) {
		super(message, 400, 400);
	}
}
