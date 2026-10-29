import { ResponseError } from './response.error';

export class UnauthenticatedError extends ResponseError {
	constructor(message = 'Unauthenticated', hint?: string) {
		super(message, 401, 401, hint);
	}
}
