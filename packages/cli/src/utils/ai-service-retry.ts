import { OperationalError } from 'n8n-workflow';

const AI_SERVICE_MAX_ATTEMPTS = 3;
const AI_SERVICE_RETRY_BACKOFF_BASE_MS = 1_000;
const AI_SERVICE_RETRY_BACKOFF_CAP_MS = 5_000;
const AI_SERVICE_UNAVAILABLE_MESSAGE =
	'The AI assistant service is temporarily unavailable. Please try again in a few minutes.';

type RetryLogger = {
	warn: (message: string, metadata?: Record<string, unknown>) => void;
};

type RetryErrorReporter = {
	warn: (error: Error | string) => void;
};

async function sleep(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms));
}

// The AI assistant service SDK carries upstream HTTP status as numeric statusCode;
// gateway HTML bodies and network failures are re-wrapped without one.
function isTransientAiServiceError(error: unknown): boolean {
	if (typeof error !== 'object' || error === null) return false;
	const status = 'statusCode' in error ? error.statusCode : undefined;
	if (typeof status !== 'number') return true;
	return status >= 500 || status === 408 || status === 429;
}

export async function callAiServiceWithRetry<T>(
	label: string,
	call: () => Promise<T>,
	logger?: RetryLogger,
	errorReporter?: RetryErrorReporter,
): Promise<T> {
	for (let attempt = 1; ; attempt++) {
		try {
			return await call();
		} catch (error) {
			if (!isTransientAiServiceError(error)) throw error;
			if (attempt >= AI_SERVICE_MAX_ATTEMPTS) {
				// Warning-level Sentry trail for user-visible exhaustion, without error-level paging.
				errorReporter?.warn(
					new Error(`${label} failed after ${AI_SERVICE_MAX_ATTEMPTS} attempts`, {
						cause: error,
					}),
				);
				throw new OperationalError(AI_SERVICE_UNAVAILABLE_MESSAGE, { cause: error });
			}
			logger?.warn(`${label} hit a transient AI assistant service error; retrying`, {
				attempt,
				error: error instanceof Error ? error.message : String(error),
			});
			await sleep(
				Math.min(
					AI_SERVICE_RETRY_BACKOFF_BASE_MS * 2 ** (attempt - 1),
					AI_SERVICE_RETRY_BACKOFF_CAP_MS,
				),
			);
		}
	}
}
