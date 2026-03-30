import { HttpErrorKind, type HttpErrorDescriptor } from '@/errors/http-error-classifier';

const GENERIC_PUBLIC_MESSAGE = 'Internal server error';

export type InternalRestErrorBody = {
	code: number;
	message: string;
	hint?: string;
	stacktrace?: string;
	meta?: Record<string, unknown>;
};

export function serializePublicApiError(descriptor: HttpErrorDescriptor): {
	status: number;
	body: { message: string };
} {
	switch (descriptor.kind) {
		case HttpErrorKind.ResponseError:
			return {
				status: descriptor.status,
				body: { message: descriptor.message },
			};
		case HttpErrorKind.UserError:
			return {
				status: 400,
				body: { message: descriptor.message },
			};
		case HttpErrorKind.UnexpectedError:
		case HttpErrorKind.ServerError:
			return {
				status: 500,
				body: { message: GENERIC_PUBLIC_MESSAGE },
			};
		case HttpErrorKind.HttpError:
			return {
				status: descriptor.status,
				body: { message: descriptor.message },
			};
	}
}

export function serializeInternalRestError(descriptor: HttpErrorDescriptor): {
	status: number;
	body: InternalRestErrorBody;
} {
	switch (descriptor.kind) {
		case HttpErrorKind.ResponseError: {
			const body: InternalRestErrorBody = {
				code: descriptor.code,
				message: descriptor.message,
			};
			if (descriptor.hint) {
				body.hint = descriptor.hint;
			}
			if (descriptor.meta) {
				body.meta = descriptor.meta;
			}
			return { status: descriptor.status, body };
		}
		case HttpErrorKind.UserError:
			return {
				status: 400,
				body: { code: 0, message: descriptor.message },
			};
		case HttpErrorKind.UnexpectedError:
		case HttpErrorKind.ServerError:
			return {
				status: 500,
				body: { code: 0, message: descriptor.message },
			};
		case HttpErrorKind.HttpError:
			return {
				status: descriptor.status,
				body: { code: 0, message: descriptor.message },
			};
	}
}
