import { z } from 'zod';

export const positiveIntSchema = z.number({ coerce: true }).int().positive();
export const nonnegativeIntSchema = z.number({ coerce: true }).int().nonnegative();

/**
 * A concurrency cap: a positive integer, or `-1` for unlimited — the convention already
 * used by `N8N_CONCURRENCY_PRODUCTION_LIMIT`.
 *
 * `0` is rejected rather than read as unlimited, since it would otherwise be ambiguous
 * with "admit nothing". An invalid value warns and falls back to the field's default.
 */
export const concurrencyLimitSchema = z
	.number({ coerce: true })
	.int()
	.refine((n) => n === -1 || n > 0, {
		message: 'must be a positive integer, or -1 for unlimited',
	});
