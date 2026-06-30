import type { Logger } from '@n8n/backend-common';
import { httpStatusFromError, isConnectionRefusedError } from '@n8n/backend-network';

export type SafeContextValue = string | number | boolean | undefined;

export type SecretsProviderOperation =
	| 'initialize'
	| 'connect'
	| 'disconnect'
	| 'update'
	| 'test'
	| 'tokenRefresh';

type SecretsProviderLogContext = {
	providerName: string;
	providerDisplayName: string;
	operation: SecretsProviderOperation;
	errorName?: string;
};

export type HttpProviderErrorLogContext = Pick<
	Record<'errorCode' | 'statusCode', SafeContextValue>,
	'errorCode' | 'statusCode'
>;

export const UPDATE_FAILURE_SAMPLE_SIZE = 5;

export function secretsProviderLogContext({
	providerName,
	providerDisplayName,
	operation,
	errorName,
}: SecretsProviderLogContext) {
	return {
		providerName,
		providerDisplayName,
		operation,
		errorName,
	};
}

export function buildHttpProviderErrorContext(error: unknown): HttpProviderErrorLogContext {
	const context: HttpProviderErrorLogContext = {};

	if (isConnectionRefusedError(error)) {
		context.errorCode = 'ECONNREFUSED';
	}

	const statusCode = httpStatusFromError(error);
	if (statusCode !== undefined) {
		context.statusCode = statusCode;
	}

	if (context.errorCode === undefined) {
		if (typeof error === 'object' && error !== null && 'code' in error) {
			const { code } = error;
			if (typeof code === 'string' || typeof code === 'number') {
				if (code !== statusCode) {
					context.errorCode = code;
				}
			}
		}
	}

	if (
		context.errorCode === undefined &&
		context.statusCode === undefined &&
		error instanceof Error
	) {
		context.errorCode = error.name;
	}

	return context;
}

export function buildUpdateFailureSummary(
	failures: Array<{ name: string; errorCode: SafeContextValue }>,
): {
	failedCount: number;
	errorCodes: Record<string, number>;
	sampleSecretNames: string[];
} | null {
	if (failures.length === 0) {
		return null;
	}

	const errorCodes: Record<string, number> = {};
	for (const failure of failures) {
		const key = String(failure.errorCode ?? 'unknown');
		errorCodes[key] = (errorCodes[key] ?? 0) + 1;
	}

	return {
		failedCount: failures.length,
		errorCodes,
		sampleSecretNames: failures.slice(0, UPDATE_FAILURE_SAMPLE_SIZE).map((failure) => failure.name),
	};
}

type LogProviderFailureParams = {
	logger: Logger;
	message: string;
	providerName: string;
	providerDisplayName: string;
	operation: SecretsProviderOperation;
	error: unknown;
	errorContext?: Record<string, SafeContextValue>;
	settingsContext?: Record<string, SafeContextValue>;
	extra?: Record<string, SafeContextValue>;
};

export function logProviderFailure({
	logger,
	message,
	providerName,
	providerDisplayName,
	operation,
	error,
	errorContext = {},
	settingsContext = {},
	extra = {},
}: LogProviderFailureParams): void {
	logger.warn(message, {
		...secretsProviderLogContext({
			providerName,
			providerDisplayName,
			operation,
			errorName: error instanceof Error ? error.name : undefined,
		}),
		...errorContext,
		...settingsContext,
		...extra,
	});
}
