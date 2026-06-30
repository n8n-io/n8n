import { httpStatusFromError, isConnectionRefusedError } from '@n8n/backend-network';

import type { SecretsProviderErrorContext } from '../../errors/secrets-provider-errors';

export function vaultErrorContext(error: unknown): SecretsProviderErrorContext {
	const statusCode = httpStatusFromError(error);
	const context: SecretsProviderErrorContext = {};

	if (statusCode !== undefined) {
		context.statusCode = statusCode;
	}

	if (isConnectionRefusedError(error)) {
		context.errorCode = 'ECONNREFUSED';
	} else if (typeof error === 'object' && error !== null && 'code' in error) {
		const { code } = error as { code?: unknown };
		if (typeof code === 'string') {
			context.errorCode = code;
		}
	} else if (error instanceof Error) {
		context.errorCode = error.name;
	}

	return context;
}
