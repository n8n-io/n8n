import { HttpError, Unauthorized } from 'express-openapi-validator/dist/framework/types';

import { ResponseError, UnexpectedError, UserError } from '@n8n/errors';

export const enum RestErrorKind {
	responseError = 'responseError',
	userError = 'userError',
	unexpectedError = 'unexpectedError',
	httpError = 'httpError',
	serverError = 'serverError',
}

export type RestErrorDescriptor =
	| {
			kind: RestErrorKind.responseError;
			status: number;
			message: string;
			code: number;
			hint?: string;
			meta?: Record<string, unknown>;
	  }
	| {
			kind: RestErrorKind.userError;
			message: string;
	  }
	| {
			kind: RestErrorKind.unexpectedError;
			message: string;
	  }
	| {
			kind: RestErrorKind.httpError;
			status: number;
			message: string;
	  }
	| {
			kind: RestErrorKind.serverError;
			message: string;
	  };

export function isResponseError(error: Error): error is ResponseError {
	if (error instanceof ResponseError) {
		return true;
	}

	if (error instanceof Error) {
		return (
			'httpStatusCode' in error &&
			typeof error.httpStatusCode === 'number' &&
			'errorCode' in error &&
			typeof error.errorCode === 'number'
		);
	}

	return false;
}

export type RestErrorClassifierContext = {
	/** Whether the request carried a session cookie, regardless of whether it was valid. */
	hasSessionCookie?: boolean;
};

export function classifyRestError(
	error: Error,
	context?: RestErrorClassifierContext,
): RestErrorDescriptor {
	if (isResponseError(error)) {
		const descriptor: RestErrorDescriptor & { kind: RestErrorKind.responseError } = {
			kind: RestErrorKind.responseError,
			status: error.httpStatusCode,
			message: error.message ?? 'Unknown error',
			code: error.errorCode,
		};
		if (error.hint) {
			descriptor.hint = error.hint;
		}
		if (error.meta) {
			descriptor.meta = error.meta;
		}
		return descriptor;
	}

	if (error instanceof UserError) {
		return { kind: RestErrorKind.userError, message: error.message };
	}

	if (error instanceof UnexpectedError) {
		return { kind: RestErrorKind.unexpectedError, message: error.message };
	}

	// Replacing express-openapi-validator's 'api key header required' error message
	// for requests that contained a session cookie.
	if (isHttpErrorInstance(error, Unauthorized, ['Unauthorized']) && context?.hasSessionCookie) {
		return { kind: RestErrorKind.httpError, status: 401, message: 'Unauthorized' };
	}

	if (
		isHttpErrorInstance(error, HttpError, [
			'HttpError',
			'NotFound',
			'NotAcceptable',
			'MethodNotAllowed',
			'BadRequest',
			'RequestEntityTooLarge',
			'InternalServerError',
			'UnsupportedMediaType',
			'Unauthorized',
			'Forbidden',
		])
	) {
		return {
			kind: RestErrorKind.httpError,
			status: error.status || 400,
			message: error.message || 'Bad request',
		};
	}

	return { kind: RestErrorKind.serverError, message: error.message ?? 'Unknown error' };
}

function isHttpErrorInstance<T extends Error>(
	error: Error,
	errorClass: new (...args: never[]) => T,
	classNames: string[],
): error is T {
	if (error instanceof errorClass) {
		return true;
	}

	return classNames.includes(error.constructor.name) && hasHttpStatus(error);
}

function hasHttpStatus(error: Error): error is Error & { status: number } {
	return 'status' in error && typeof error.status === 'number';
}
