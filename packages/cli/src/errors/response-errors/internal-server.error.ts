import { ResponseError } from './abstract/response.error';

export class InternalServerError extends ResponseError {
	constructor(message: string, errorCode = 500) {
		super(message, 500, errorCode);
	}
}
