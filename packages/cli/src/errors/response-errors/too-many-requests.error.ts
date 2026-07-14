import { ResponseError } from './abstract/response.error.js';

export class TooManyRequestsError extends ResponseError {
	constructor(message: string, hint: string | undefined = undefined) {
		super(message, 429, 429, hint);
	}
}
