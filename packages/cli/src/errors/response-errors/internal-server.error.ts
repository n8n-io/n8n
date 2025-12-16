import { ResponseError } from './abstract/response.error';

export class InternalServerError extends ResponseError {
	constructor(message?: string, cause?: unknown) {
		super(message ? message : 'Internal Server Error', 500, 500, undefined, cause);
	}
}
