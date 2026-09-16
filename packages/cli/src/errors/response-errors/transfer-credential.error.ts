import { ResponseError } from '@n8n/services-common';

export class TransferCredentialError extends ResponseError {
	constructor(message: string) {
		super(message, 400, 400);
	}
}
