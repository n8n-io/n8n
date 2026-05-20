import { ResponseError } from './abstract/response.error';

export class AuthError extends ResponseError {
	constructor(
		message: string,
		errorCode?: number,
		readonly meta?: Record<string, unknown>,
	) {
		super(message, 401, errorCode);
	}
}
