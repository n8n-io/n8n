import { HttpError } from 'express-openapi-validator/dist/framework/types';
import { UnexpectedError, UserError } from 'n8n-workflow';

import { ResponseError } from '@/errors/response-errors/abstract/response.error';

export const enum HttpErrorKind {
	responseError = 'responseError',
	userError = 'userError',
	unexpectedError = 'unexpectedError',
	httpError = 'httpError',
	serverError = 'serverError',
}

export type HttpErrorDescriptor =
	| {
			kind: HttpErrorKind.responseError;
			status: number;
			message: string;
			code: number;
			hint?: string;
			meta?: Record<string, unknown>;
	  }
	| {
			kind: HttpErrorKind.userError;
			message: string;
	  }
	| {
			kind: HttpErrorKind.unexpectedError;
			message: string;
	  }
	| {
			kind: HttpErrorKind.httpError;
			status: number;
			message: string;
	  }
	| {
			kind: HttpErrorKind.serverError;
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

export function classifyHttpError(error: Error): HttpErrorDescriptor {
	if (isResponseError(error)) {
		const descriptor: HttpErrorDescriptor & { kind: HttpErrorKind.responseError } = {
			kind: HttpErrorKind.responseError,
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
		return { kind: HttpErrorKind.userError, message: error.message };
	}

	if (error instanceof UnexpectedError) {
		return { kind: HttpErrorKind.unexpectedError, message: error.message };
	}

	if (error instanceof HttpError) {
		return {
			kind: HttpErrorKind.httpError,
			status: error.status || 400,
			message: error.message || 'Bad request',
		};
	}

	return { kind: HttpErrorKind.serverError, message: error.message ?? 'Unknown error' };
}
