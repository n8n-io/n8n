import { AuthenticationError } from '@azure/identity';

import type { SecretsProviderErrorContext } from '../../errors/secrets-provider-errors';

type AzureHttpLikeError = Error & {
	statusCode?: number;
	code?: string;
};

function isAzureHttpLikeError(error: unknown): error is AzureHttpLikeError {
	if (!(error instanceof Error)) return false;

	const candidate = error as AzureHttpLikeError;
	return (
		error.name === 'RestError' ||
		typeof candidate.statusCode === 'number' ||
		typeof candidate.code === 'string'
	);
}

export function azureErrorContext(error: unknown): SecretsProviderErrorContext {
	if (error instanceof AuthenticationError) {
		return {
			statusCode: error.statusCode,
			errorCode: error.errorResponse?.error,
		};
	}

	if (isAzureHttpLikeError(error)) {
		return {
			statusCode: error.statusCode,
			errorCode: error.code,
		};
	}

	if (error instanceof Error) {
		return { errorCode: error.name };
	}

	return {};
}
