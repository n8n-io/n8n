import { ResponseError, ServiceUnavailableError, TooManyRequestsError } from '@n8n/errors';
import { UserError } from 'n8n-workflow';

import { PromotionGitError, PromotionLocalGitError } from './promotions-git.error';

export type PromotionFailureKind = 'user' | 'git_remote' | 'unexpected';

/** Maps a thrown error to a coarse kind. It never reads the message, which can hold secrets. */
export function classifyPromotionFailure(error: unknown): PromotionFailureKind {
	if (
		error instanceof PromotionGitError ||
		error instanceof ServiceUnavailableError ||
		error instanceof TooManyRequestsError
	) {
		return 'git_remote';
	}
	if (error instanceof PromotionLocalGitError) return 'unexpected';
	if (error instanceof UserError) return 'user';
	if (error instanceof ResponseError && error.httpStatusCode >= 400 && error.httpStatusCode < 500) {
		return 'user';
	}
	return 'unexpected';
}

export type ObservedOperation<T> =
	| { ok: true; result: T; durationMs: number }
	| { ok: false; failureKind: PromotionFailureKind; durationMs: number };

/**
 * Runs an operation, reports how it ended, and returns or rethrows its original outcome.
 * A failing report never changes that outcome.
 */
export async function observePromotion<T>(
	run: () => Promise<T>,
	report: (observed: ObservedOperation<T>) => void,
): Promise<T> {
	const startedAt = Date.now();
	const safeReport = (observed: ObservedOperation<T>) => {
		try {
			report(observed);
		} catch {
			// Telemetry must not change the result of a promotion.
		}
	};
	let result: T;
	try {
		result = await run();
	} catch (error) {
		safeReport({
			ok: false,
			failureKind: classifyPromotionFailure(error),
			durationMs: Date.now() - startedAt,
		});
		throw error;
	}
	safeReport({ ok: true, result, durationMs: Date.now() - startedAt });
	return result;
}
