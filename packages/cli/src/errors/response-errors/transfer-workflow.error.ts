import { ResponseError } from './abstract/response.error.js';

export class TransferWorkflowError extends ResponseError {
	constructor(message: string) {
		super(message, 400, 400);
	}
}
