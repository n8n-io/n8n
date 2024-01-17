import { ResponseError } from './abstract/response.error';

export class UnauthorizedError extends ResponseError {
	constructor(message: string, hint: string | undefined = undefined) {
		super(message, 403, 403, hint);
	}
}
