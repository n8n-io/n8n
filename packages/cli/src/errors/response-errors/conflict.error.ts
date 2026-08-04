import { ResponseError } from './abstract/response.error';

export class ConflictError extends ResponseError {
	constructor(
		message: string,
		hint: string | undefined = undefined,
		readonly meta?: Record<string, unknown>,
	) {
		super(message, 409, 409, hint);
	}
}
