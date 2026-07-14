import { ResponseError } from './abstract/response.error.js';

export class ContentTooLargeError extends ResponseError {
	constructor(message: string, hint: string | undefined = undefined) {
		super(message, 413, 413, hint);
	}
}
