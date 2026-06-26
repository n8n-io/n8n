import { z } from 'zod';

import { Config, Env } from '../decorators';

/** An invalid multiplier (0, negative or non-numeric) falls back to `1`, i.e. no scaling. */
const multiplierSchema = z.number({ coerce: true }).positive();

/**
 * Global escape hatch for IP-based (Layer 1) rate limiting. Keyed (Layer 2) limiters
 * are deliberately unaffected, so auth-flow protection holds when IP limits are relaxed.
 */
@Config
export class RateLimitConfig {
	/** Scales the count of every IP rate limit (window unchanged). Default `1` = no scaling. */
	@Env('N8N_RATE_LIMIT_MULTIPLIER', multiplierSchema)
	multiplier: number = 1;

	/** When `true`, IP-based rate limiting is skipped entirely. Keyed (auth) limiters still apply. */
	@Env('N8N_RATE_LIMIT_DISABLED')
	disabled: boolean = false;
}
