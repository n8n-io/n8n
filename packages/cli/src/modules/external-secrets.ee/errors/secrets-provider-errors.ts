import type { Logger } from '@n8n/backend-common';
import { httpStatusFromError, isConnectionRefusedError } from '@n8n/backend-network';

export type SafeContextValue = string | number | boolean | undefined;
type AggregateContextValue = Record<string, number> | string[];
type LogContextValue = SafeContextValue | AggregateContextValue;
export type LogContext = Record<string, LogContextValue>;

export type SecretsProviderOperation =
	| 'initialize'
	| 'connect'
	| 'disconnect'
	| 'update'
	| 'test'
	| 'tokenRefresh';

export type HttpProviderErrorLogContext = LogContext & {
	errorCode?: SafeContextValue;
	statusCode?: number;
};

export const UPDATE_FAILURE_SAMPLE_SIZE = 5;

export function buildHttpProviderErrorContext(error: unknown): HttpProviderErrorLogContext {
	const context: HttpProviderErrorLogContext = {};

	if (isConnectionRefusedError(error)) {
		context.errorCode = 'ECONNREFUSED';
	}

	const statusCode = httpStatusFromError(error);
	if (statusCode !== undefined) {
		context.statusCode = statusCode;
	}

	if (
		context.errorCode === undefined &&
		typeof error === 'object' &&
		error !== null &&
		'code' in error
	) {
		const { code } = error;
		if ((typeof code === 'string' || typeof code === 'number') && code !== statusCode) {
			context.errorCode = code;
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

export function buildFailureSummaryLogContext(
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

type LogSecretsProviderOperationFailureParams = {
	logger: Logger;
	message: string;
	providerName: string;
	providerDisplayName: string;
} & SecretsProviderOperationFailureParams;

export type SecretsProviderOperationFailureParams = {
	operation: SecretsProviderOperation;
	error: unknown;
	context?: LogContext;
};

export function logSecretsProviderOperationFailure({
	logger,
	message,
	providerName,
	providerDisplayName,
	operation,
	error,
	context = {},
}: LogSecretsProviderOperationFailureParams): void {
	logger.warn(message, {
		providerName,
		providerDisplayName,
		operation,
		errorName: error instanceof Error ? error.name : undefined,
		...context,
	});
}
