import { retryabilityFromError } from '@n8n/backend-network';
import { sleep } from '@n8n/utils/sleep';
import { OperationalError } from 'n8n-workflow';

const AI_SERVICE_MAX_ATTEMPTS = 3;
const AI_SERVICE_RETRY_BACKOFF_BASE_MS = 1_000;
const AI_SERVICE_RETRY_BACKOFF_CAP_MS = 5_000;
// Small control-plane JSON calls only; 3 attempts + backoff stays inside Cloudflare's ~100s budget.
const AI_SERVICE_CALL_TIMEOUT_MS = 30_000;
const AI_SERVICE_UNAVAILABLE_MESSAGE =
	'The AI assistant service is temporarily unavailable. Please try again in a few minutes.';

type RetryLogger = {
	warn: (message: string, metadata?: Record<string, unknown>) => void;
};

type RetryErrorReporter = {
	warn: (error: Error | string) => void;
};

type RetryOptions = {
	retryOnTimeout?: boolean;
};

class AiServiceCallTimeoutError extends Error {}

// The SDK's fetch calls carry no timeout, so a stalled connection would hang the caller
// forever and never reach the retry loop; the race unblocks the caller (the underlying
// request cannot be aborted without SDK AbortSignal support).
async function callWithTimeout<T>(call: () => Promise<T>, label: string): Promise<T> {
	let timer: NodeJS.Timeout | undefined;
	const pending = call();
	// Keep a handler attached so a late rejection after losing the race stays handled.
	pending.catch(() => {});
	try {
		return await Promise.race([
			pending,
			new Promise<never>((_, reject) => {
				timer = setTimeout(
					() =>
						reject(
							new AiServiceCallTimeoutError(
								`${label} timed out after ${AI_SERVICE_CALL_TIMEOUT_MS}ms`,
							),
						),
					AI_SERVICE_CALL_TIMEOUT_MS,
				);
			}),
		]);
	} finally {
		if (timer) clearTimeout(timer);
	}
}

// The AI service SDK re-wraps gateway bodies and network failures without a status.
// Those status-less failures are treated as transient here.
function isTransientAiServiceError(error: unknown): boolean {
	if (typeof error !== 'object' || error === null) return false;
	const { retryable, status } = retryabilityFromError(error);
	return retryable === 'yes' || (retryable === 'unknown' && status === undefined);
}

export async function callAiServiceWithRetry<T>(
	label: string,
	call: () => Promise<T>,
	logger?: RetryLogger,
	errorReporter?: RetryErrorReporter,
	options: RetryOptions = {},
): Promise<T> {
	for (let attempt = 1; ; attempt++) {
		try {
			return await callWithTimeout(call, label);
		} catch (error) {
			if (error instanceof AiServiceCallTimeoutError && options.retryOnTimeout === false) {
				errorReporter?.warn(
					new Error(`${label} failed after ${attempt} ${attempt === 1 ? 'attempt' : 'attempts'}`, {
						cause: error,
					}),
				);
				throw new OperationalError(AI_SERVICE_UNAVAILABLE_MESSAGE, { cause: error });
			}
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
