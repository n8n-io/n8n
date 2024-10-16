import { ResponseError } from './abstract/response.error';

export class UnprocessableRequestError extends ResponseError {
	constructor(message: string, hint: string | undefined = undefined) {
		super(message, 422, 422, hint);
	}
}
