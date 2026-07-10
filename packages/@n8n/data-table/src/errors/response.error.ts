import { BaseError } from 'n8n-workflow';

/**
 * Base for errors that map to an HTTP response. The cli HTTP layer classifies
 * these by duck typing (numeric `httpStatusCode` + `errorCode`), so they yield
 * the right status without extending cli's `ResponseError`. The `level`
 * assignment mirrors cli so 4xx errors are not reported to Sentry.
 */
export abstract class DataTableResponseError extends BaseError {
	readonly meta?: Record<string, unknown>;

	constructor(
		message: string,
		readonly httpStatusCode: number,
		readonly errorCode: number = httpStatusCode,
		readonly hint: string | undefined = undefined,
		cause?: unknown,
	) {
		super(message, { cause });
		this.name = 'ResponseError';

		if (httpStatusCode >= 400 && httpStatusCode < 500) {
			this.level = 'warning';
		} else if (httpStatusCode >= 502 && httpStatusCode <= 504) {
			this.level = 'info';
		} else {
			this.level = 'error';
		}
	}
}

export class BadRequestError extends DataTableResponseError {
	constructor(message: string, hint?: string) {
		super(message, 400, 400, hint);
	}
}

export class ForbiddenError extends DataTableResponseError {
	constructor(message = 'Forbidden', hint?: string) {
		super(message, 403, 403, hint);
	}
}

export class NotFoundError extends DataTableResponseError {
	constructor(message: string, hint?: string) {
		super(message, 404, 404, hint);
	}
}

export class ConflictError extends DataTableResponseError {
	constructor(message: string, hint?: string) {
		super(message, 409, 409, hint);
	}
}

export class InternalServerError extends DataTableResponseError {
	constructor(message = 'Internal Server Error', cause?: unknown) {
		super(message, 500, 500, undefined, cause);
	}
}
