import { httpStatusFromError, isConnectionRefusedError } from '@n8n/backend-network';

export type OnePasswordProviderLogContext = {
	serverUrl?: string;
	endpoint?: string;
	errorCode?: string | number;
	statusCode?: number;
};

export function getOnePasswordHttpStatus(error: unknown): number | undefined {
	return httpStatusFromError(error);
}

export function getOnePasswordErrorCode(error: unknown): string | number | undefined {
	if (isConnectionRefusedError(error)) {
		return 'ECONNREFUSED';
	}

	const statusCode = getOnePasswordHttpStatus(error);
	if (statusCode !== undefined) {
		return statusCode;
	}

	if (typeof error === 'object' && error !== null && 'code' in error) {
		const { code } = error;
		if (typeof code === 'string' || typeof code === 'number') {
			return code;
		}
	}

	if (error instanceof Error) {
		return error.name;
	}

	return undefined;
}

export function onePasswordErrorContext(
	error: unknown,
): Pick<OnePasswordProviderLogContext, 'errorCode' | 'statusCode'> {
	const context: Pick<OnePasswordProviderLogContext, 'errorCode' | 'statusCode'> = {};

	const statusCode = getOnePasswordHttpStatus(error);
	if (statusCode !== undefined) {
		context.statusCode = statusCode;
	}

	const errorCode = getOnePasswordErrorCode(error);
	if (errorCode !== undefined) {
		context.errorCode = errorCode;
	}

	return context;
}
