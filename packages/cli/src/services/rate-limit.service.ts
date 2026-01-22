import { Service } from '@n8n/di';
import type { RateLimiterLimits, KeyedRateLimiterConfig } from '@n8n/decorators';
import type { AuthenticatedRequest } from '@n8n/db';
import type { Request, RequestHandler } from 'express';
import { rateLimit as expressRateLimit } from 'express-rate-limit';
import assert from 'node:assert';
import { ErrorReporter } from 'n8n-core';
import { Time } from '@n8n/constants';

const defaultLimits: Required<RateLimiterLimits> = {
	limit: 5,
	windowMs: 5 * Time.minutes.toMilliseconds,
};

/**
 * Service for creating rate limiters for endpoints. We use a 2 layered approach
 * to rate limiting for better balance between security and usability. This helps
 * in situations where multiple users are using the same IP address.
 *
 * Layer 1: IP-based rate limit middleware
 * Layer 2: User-based rate limit middleware
 */
@Service()
export class RateLimitService {
	constructor(private readonly errorReporter: ErrorReporter) {}

	/**
	 * Creates Layer 1: IP-based rate limit middleware
	 * Always runs BEFORE authentication.
	 */
	createIpRateLimitMiddleware(rateLimit: boolean | RateLimiterLimits): RequestHandler {
		if (typeof rateLimit === 'boolean') rateLimit = {};

		return expressRateLimit({
			limit: rateLimit.limit ?? defaultLimits.limit,
			windowMs: rateLimit.windowMs ?? defaultLimits.windowMs,
			message: { message: 'Too many requests' },
		});
	}

	/**
	 * Creates Layer 2: Keyed rate limit middleware
	 * Position (before/after auth) depends on identifier source
	 */
	createKeyedRateLimitMiddleware(config: KeyedRateLimiterConfig): RequestHandler {
		return expressRateLimit({
			limit: config.limit ?? defaultLimits.limit,
			windowMs: config.windowMs ?? defaultLimits.windowMs,
			keyGenerator: (req: Request) => this.extractReqIdentifier(req, config),
			skip: (req: Request) => {
				const identifier = this.extractReqIdentifier(req, config);
				return identifier.startsWith('skip:');
			},
			message: { message: 'Too many requests' },
		});
	}

	private extractReqIdentifier(req: Request, config: KeyedRateLimiterConfig): string {
		const { source } = config;

		if (source === 'body') {
			const body = req.body;
			if (!body) {
				return 'skip:no-body';
			}

			const value = body[config.field];
			if (typeof value !== 'string' && typeof value !== 'number') {
				return 'skip:no-identifier';
			}

			return `body:${value}`;
		}

		if (source === 'user') {
			const authReq = req as AuthenticatedRequest;
			if (!authReq.user) {
				this.errorReporter.error(new Error('Missing user for user-based rate limited endpoint'), {
					extra: {
						request: {
							method: req.method,
							url: req.url,
						},
					},
				});
				return 'skip:not-authenticated';
			}

			return `user:${authReq.user.id}`;
		}

		assert.fail(`Unknown source for keyed rate limiting: ${JSON.stringify(config)}`);
	}
}
