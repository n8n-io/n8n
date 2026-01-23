import { BaseError } from 'n8n-workflow';

/**
 * Special Error which allows to return also an error code and http status code
 */
export abstract class ResponseError extends BaseError {
	/**
	 * Optional metadata to be included in the error response.
	 * This allows errors to include additional structured data beyond the standard
	 * message, code, and hint fields. For example, LicenseEulaRequiredError uses
	 * this to include the EULA URL that must be accepted.
	 */
	readonly meta?: Record<string, unknown>;

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
		cause?: unknown,
	) {
		super(message, { cause });
		this.name = 'ResponseError';

		if (httpStatusCode >= 400 && httpStatusCode < 500) {
			this.level = 'warning'; // client errors (4xx)
		} else if (httpStatusCode >= 502 && httpStatusCode <= 504) {
			this.level = 'info'; // transient errors (502, 503, 504)
		} else {
			this.level = 'error'; // other 5xx
		}
	}
}
