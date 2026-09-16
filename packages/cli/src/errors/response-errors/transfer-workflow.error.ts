import { ResponseError } from '@n8n/services-common';

export class TransferWorkflowError extends ResponseError {
	constructor(message: string) {
		super(message, 400, 400);
	}
}
