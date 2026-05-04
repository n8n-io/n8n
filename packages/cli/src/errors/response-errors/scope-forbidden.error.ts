import { ResponseError } from './abstract/response.error';

export class ScopeForbiddenError extends ResponseError {
	constructor(
		message: string,
		readonly meta: { errorCode: string; requiredScope: string },
		hint?: string,
	) {
		super(message, 403, 403, hint);
		this.name = 'ScopeForbiddenError';
	}
}
