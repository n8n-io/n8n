import { ResponseError } from './abstract/response.error.js';

export class LockedError extends ResponseError {
	constructor(message: string, hint: string | undefined = undefined) {
		super(message, 423, 423, hint);
	}
}
