import { ResponseError } from './abstract/response.error';

export class AuthError extends ResponseError {
	constructor(message: string, errorCode?: number | string) {
		super(message, 401, errorCode);
	}
}
