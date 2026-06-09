import { ResponseError } from './abstract/response.error.js';

export class ForbiddenError extends ResponseError {
	constructor(message = 'Forbidden', hint?: string) {
		super(message, 403, 403, hint);
	}
}
