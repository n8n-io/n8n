/**
 * @TODO Below to be moved to `@n8n/errors`
 */

import { BaseError, UnexpectedError } from 'n8n-workflow';

export type TestCaseExecutionErrorCode =
	| 'MOCKED_NODE_DOES_NOT_EXIST'
	| 'TRIGGER_NO_LONGER_EXISTS'
	| 'FAILED_TO_EXECUTE_WORKFLOW'
	| 'EVALUATION_WORKFLOW_DOES_NOT_EXIST'
	| 'FAILED_TO_EXECUTE_EVALUATION_WORKFLOW'
	| 'INVALID_METRICS'
	| 'PAYLOAD_LIMIT_EXCEEDED'
	| 'UNKNOWN_ERROR';

export class TestCaseExecutionError extends UnexpectedError {
	readonly code: TestCaseExecutionErrorCode;

	constructor(code: TestCaseExecutionErrorCode, extra: Record<string, unknown> = {}) {
		super('Test Case execution failed with code ' + code, { extra });

		this.code = code;
	}
}

export type TestRunErrorCode =
	| 'PAST_EXECUTIONS_NOT_FOUND'
	| 'EVALUATION_WORKFLOW_NOT_FOUND'
	| 'INTERRUPTED'
	| 'UNKNOWN_ERROR';

export class TestRunError extends UnexpectedError {
	readonly code: TestRunErrorCode;

	constructor(code: TestRunErrorCode, extra: Record<string, unknown> = {}) {
		super('Test Run failed with code ' + code, { extra });

		this.code = code;
	}
}

export class PostgresLiveRowsRetrievalError extends UnexpectedError {
	constructor(rows: unknown) {
		super('Failed to retrieve live execution rows in Postgres', { extra: { rows } });
	}
}

/**
 * @TODO The three errors below are duplicates
 */

/**
 * Special Error which allows to return also an error code and http status code
 */
export abstract class ResponseError extends BaseError {
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

export class ForbiddenError extends ResponseError {
	constructor(message = 'Forbidden', hint?: string) {
		super(message, 403, 403, hint);
	}
}
