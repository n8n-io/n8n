import { ResponseError } from '@n8n/backend-services';

export class TransferCredentialError extends ResponseError {
	constructor(message: string) {
		super(message, 400, 400);
	}
}
