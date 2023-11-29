import { ResponseError } from './abstract/response.error';

export class NotFoundError extends ResponseError {
	constructor(message: string, hint: string | undefined = undefined) {
		super(message, 404, 404, hint);
	}
}
