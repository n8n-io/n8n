import { ResponseError } from './abstract/response.error';

export class ConflictError extends ResponseError {
	constructor(message: string, hint: string | undefined = undefined) {
		super(message, 409, 409, hint);
	}
}
