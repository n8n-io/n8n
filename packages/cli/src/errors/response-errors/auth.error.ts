import { ResponseError } from './abstract/response.error.js';

export class AuthError extends ResponseError {
	constructor(message: string, errorCode?: number) {
		super(message, 401, errorCode);
	}
}
