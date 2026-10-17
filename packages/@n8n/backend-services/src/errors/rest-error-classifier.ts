import { ResponseError, UnexpectedError, UserError } from '@n8n/errors';

export const enum RestErrorKind {
	responseError = 'responseError',
	userError = 'userError',
	unexpectedError = 'unexpectedError',
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

export function classifyRestError(error: Error): RestErrorDescriptor {
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

	return { kind: RestErrorKind.serverError, message: error.message ?? 'Unknown error' };
}
