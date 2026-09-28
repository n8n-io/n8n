import { ResponseError } from '@n8n/backend-services';

export class TransferWorkflowError extends ResponseError {
	constructor(message: string) {
		super(message, 400, 400);
	}
}
