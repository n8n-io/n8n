import { ResponseError } from './abstract/response.error';

export class BadRequestError extends ResponseError {
	constructor(message: string, errorCode?: number, hint?: string, cause?: unknown) {
		super(message, 400, errorCode, hint, cause);
	}

	static wrap(message: string, cause: unknown): BadRequestError {
		return new BadRequestError(message, undefined, undefined, cause);
	}
}
