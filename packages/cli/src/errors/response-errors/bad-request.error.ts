import { ResponseError } from './abstract/response.error';

export class BadRequestError extends ResponseError {
	constructor(message: string, errorCode?: number | string) {
		super(message, 400, errorCode);
	}
}
