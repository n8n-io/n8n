import { ResponseError, ServiceUnavailableError } from '@n8n/errors';
import { UserError } from 'n8n-workflow';

import { PromotionGitError } from './promotions-git.error';

export type PromotionFailureKind = 'user' | 'git_remote' | 'unexpected';

/** Maps a thrown error to a coarse kind. It never reads the message, which can hold secrets. */
export function classifyPromotionFailure(error: unknown): PromotionFailureKind {
	if (error instanceof PromotionGitError || error instanceof ServiceUnavailableError) {
		return 'git_remote';
	}
	if (error instanceof UserError) return 'user';
	if (error instanceof ResponseError && error.httpStatusCode >= 400 && error.httpStatusCode < 500) {
		return 'user';
	}
	return 'unexpected';
}

export type ObservedOperation<T> =
	| { ok: true; result: T; durationMs: number }
	| { ok: false; failureKind: PromotionFailureKind; durationMs: number };

/** Runs an operation, reports how it ended, and returns or rethrows its original outcome. */
export async function observePromotion<T>(
	run: () => Promise<T>,
	report: (observed: ObservedOperation<T>) => void,
): Promise<T> {
	const startedAt = Date.now();
	let result: T;
	try {
		result = await run();
	} catch (error) {
		report({
			ok: false,
			failureKind: classifyPromotionFailure(error),
			durationMs: Date.now() - startedAt,
		});
		throw error;
	}
	report({ ok: true, result, durationMs: Date.now() - startedAt });
	return result;
}
