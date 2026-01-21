export interface RateLimiterLimits {
	/**
	 * The maximum number of requests to allow during the `window` before rate limiting the client.
	 * @default 5
	 */
	limit?: number;
	/**
	 * How long we should remember the requests.
	 * @default 300_000 (5 minutes)
	 */
	windowMs?: number;
}

/**
 * Configuration for extracting a key from the request body.
 */
export interface BodyKeyedRateLimiterConfig extends RateLimiterLimits {
	/** How to extract key from request */
	source: 'body';
	/** The field name in the request body to use as the key */
	field: string;
}

/**
 * Configuration for extracting a key from the authenticated user.
 */
export interface UserKeyedRateLimiterConfig extends RateLimiterLimits {
	/** How to extract key from request */
	source: 'user';
}

export type KeyedRateLimiterConfig = BodyKeyedRateLimiterConfig | UserKeyedRateLimiterConfig;

/**
 * Create a body keyed rate limiter configuration. This ends up creating
 * a rate limiter that is keyed by the value of the specified field in the
 * request body.
 *
 * @example
 * createBodyKeyedRateLimiter<LoginRequestDto>({
 *   field: 'email',
 *   limit: 10,
 *   windowMs: 60000,
 * });
 */
export const createBodyKeyedRateLimiter = <T extends object>({
	limit,
	windowMs,
	field,
}: RateLimiterLimits & {
	field: keyof T & string;
}): BodyKeyedRateLimiterConfig => ({
	source: 'body',
	limit,
	windowMs,
	field,
});

/**
 * Create a user keyed rate limiter configuration. This ends up creating
 * a rate limiter that is keyed by the authenticated user's ID.
 *
 * @example
 * createUserKeyedRateLimiter({
 *   limit: 10,
 *   windowMs: 60000,
 * });
 */
export const createUserKeyedRateLimiter = ({
	limit,
	windowMs,
}: RateLimiterLimits): UserKeyedRateLimiterConfig => ({
	source: 'user',
	limit,
	windowMs,
});
