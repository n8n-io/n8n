import { httpStatusFromError, isConnectionRefusedError } from '@n8n/backend-network';

export type InfisicalProviderLogContext = {
	siteURL?: string;
	projectId?: string;
	environment?: string;
	secretPath?: string;
	authMethod?: string;
	endpoint?: string;
	errorCode?: string | number;
	statusCode?: number;
};

export function getInfisicalHttpStatus(error: unknown): number | undefined {
	return httpStatusFromError(error);
}

export function getInfisicalErrorCode(error: unknown): string | number | undefined {
	if (isConnectionRefusedError(error)) {
		return 'ECONNREFUSED';
	}

	const statusCode = getInfisicalHttpStatus(error);
	if (statusCode !== undefined) {
		return statusCode;
	}

	if (error instanceof Error) {
		return error.name;
	}

	return undefined;
}

export function infisicalErrorContext(
	error: unknown,
): Pick<InfisicalProviderLogContext, 'errorCode' | 'statusCode'> {
	const context: Pick<InfisicalProviderLogContext, 'errorCode' | 'statusCode'> = {};

	const statusCode = getInfisicalHttpStatus(error);
	if (statusCode !== undefined) {
		context.statusCode = statusCode;
	}

	const errorCode = getInfisicalErrorCode(error);
	if (errorCode !== undefined) {
		context.errorCode = errorCode;
	}

	return context;
}
