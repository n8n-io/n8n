import { HttpError } from 'express-openapi-validator/dist/framework/types';
import { UnexpectedError, UserError } from 'n8n-workflow';

import { ResponseError } from '@/errors/response-errors/abstract/response.error';

export const HttpErrorKind = {
	ResponseError: 'responseError',
	UserError: 'userError',
	UnexpectedError: 'unexpectedError',
	HttpError: 'httpError',
	ServerError: 'serverError',
} as const;

export type HttpErrorKind = (typeof HttpErrorKind)[keyof typeof HttpErrorKind];

export type HttpErrorDescriptor =
	| {
			kind: typeof HttpErrorKind.ResponseError;
			status: number;
			message: string;
			code: number;
			hint?: string;
			meta?: Record<string, unknown>;
	  }
	| {
			kind: typeof HttpErrorKind.UserError;
			message: string;
	  }
	| {
			kind: typeof HttpErrorKind.UnexpectedError;
			message: string;
	  }
	| {
			kind: typeof HttpErrorKind.HttpError;
			status: number;
			message: string;
	  }
	| {
			kind: typeof HttpErrorKind.ServerError;
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
		const descriptor: HttpErrorDescriptor & { kind: typeof HttpErrorKind.ResponseError } = {
			kind: HttpErrorKind.ResponseError,
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
		return { kind: HttpErrorKind.UserError, message: error.message };
	}

	if (error instanceof UnexpectedError) {
		return { kind: HttpErrorKind.UnexpectedError, message: error.message };
	}

	if (error instanceof HttpError) {
		return {
			kind: HttpErrorKind.HttpError,
			status: error.status || 400,
			message: error.message || 'Bad request',
		};
	}

	return { kind: HttpErrorKind.ServerError, message: error.message ?? 'Unknown error' };
}
