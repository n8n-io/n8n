import { ResponseError } from './abstract/response.error.js';

export class NotImplementedError extends ResponseError {
	constructor(message: string, hint: string | undefined = undefined) {
		super(message, 501, 501, hint);
	}
}
