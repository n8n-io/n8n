import { ResponseError } from './abstract/response.error';

export class PaymentRequiredError extends ResponseError {
	constructor(message = 'Payment required', hint?: string) {
		super(message, 402, 402, hint);
	}
}
