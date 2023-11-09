/**
 * Special Error which allows to return also an error code and http status code
 */
export abstract class ResponseError extends Error {
	/**
	 * Creates an instance of ResponseError.
	 * Must be used inside a block with `ResponseHelper.send()`.
	 */
	constructor(
		message: string,
		// The HTTP status code of  response
		readonly httpStatusCode: number,
		// The error code in the response
		readonly errorCode: number = httpStatusCode,
		// The error hint the response
		readonly hint: string | undefined = undefined,
	) {
		super(message);
		this.name = 'ResponseError';
	}
}

export class BadRequestError extends ResponseError {
	constructor(message: string, errorCode?: number) {
		super(message, 400, errorCode);
	}
}

export class AuthError extends ResponseError {
	constructor(message: string, errorCode?: number) {
		super(message, 401, errorCode);
	}
}

export class UnauthorizedError extends ResponseError {
	constructor(message: string, hint: string | undefined = undefined) {
		super(message, 403, 403, hint);
	}
}

export class NotFoundError extends ResponseError {
	constructor(message: string, hint: string | undefined = undefined) {
		super(message, 404, 404, hint);
	}
}

export class ConflictError extends ResponseError {
	constructor(message: string, hint: string | undefined = undefined) {
		super(message, 409, 409, hint);
	}
}

export class UnprocessableRequestError extends ResponseError {
	constructor(message: string, hint: string | undefined = undefined) {
		super(message, 422, 422, hint);
	}
}

export class InternalServerError extends ResponseError {
	constructor(message: string, errorCode = 500) {
		super(message, 500, errorCode);
	}
}

export class ServiceUnavailableError extends ResponseError {
	constructor(message: string, errorCode = 503) {
		super(message, 503, errorCode);
	}
}
