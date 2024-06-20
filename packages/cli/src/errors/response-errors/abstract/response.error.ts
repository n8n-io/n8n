import { ApplicationError } from 'n8n-workflow';

/**
 * Special Error which allows to return also an error code and http status code
 */
export abstract class ResponseError extends ApplicationError {
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
