import { ResponseError } from './abstract/response.error';

export class NotFoundError extends ResponseError {
	static isDefinedAndNotNull<T>(
		value: T | undefined | null,
		message: string,
		hint?: string,
	): asserts value is T {
		if (value === undefined || value === null) {
			throw new NotFoundError(message, hint);
		}
	}

	constructor(message: string, hint: string | undefined = undefined) {
		super(message, 404, 404, hint);
	}
}
