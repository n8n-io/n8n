import { ResponseError } from './abstract/response.error';

export class UnauthenticatedError extends ResponseError {
	constructor(message = 'Unauthenticated', hint?: string) {
		super(message, 401, 401, hint);
	}
}
