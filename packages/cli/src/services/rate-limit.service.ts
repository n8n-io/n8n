import { Time } from '@n8n/constants';
import type { AuthenticatedRequest } from '@n8n/db';
import type { RateLimiterLimits, UserKeyedRateLimiterConfig } from '@n8n/decorators';
import { BodyKeyedRateLimiterConfig } from '@n8n/decorators';
import { Service } from '@n8n/di';
import type { Request, RequestHandler } from 'express';
import { rateLimit as expressRateLimit } from 'express-rate-limit';
import assert from 'node:assert';
import type { ZodTypeAny } from 'zod';
import type { ZodClass } from 'zod-class';

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
	createBodyKeyedRateLimitMiddleware(
		bodyDtoClass: ZodClass,
		config: BodyKeyedRateLimiterConfig,
	): RequestHandler {
		const fieldName = config.field;
		const bodyFieldSchema = bodyDtoClass.shape[fieldName];
		assert(bodyFieldSchema, `Missing field ${fieldName} in DTO schema`);

		return expressRateLimit({
			limit: config.limit ?? defaultLimits.limit,
			windowMs: config.windowMs ?? defaultLimits.windowMs,
			keyGenerator: (req: Request) =>
				this.extractBodyIdentifier(req.body, fieldName, bodyFieldSchema),
			skip: (req: Request) => {
				const identifier = this.extractBodyIdentifier(req.body, fieldName, bodyFieldSchema);
				return identifier.startsWith('skip:');
			},
		});
	}

	createUserKeyedRateLimitMiddleware(config: UserKeyedRateLimiterConfig): RequestHandler {
		return expressRateLimit({
			limit: config.limit ?? defaultLimits.limit,
			windowMs: config.windowMs ?? defaultLimits.windowMs,
			keyGenerator: (req: AuthenticatedRequest) => this.extractUserIdentifier(req),
			skip: (req: AuthenticatedRequest) => {
				const identifier = this.extractUserIdentifier(req);
				return identifier.startsWith('skip:');
			},
		});
	}

	private extractBodyIdentifier(body: unknown, fieldName: string, fieldSchema: ZodTypeAny): string {
		if (!body || typeof body !== 'object') {
			return 'skip:empty-body';
		}

		const value = (body as Record<string, unknown>)[fieldName];
		if (typeof value !== 'string' && typeof value !== 'number') {
			return 'skip:unsupported-type';
		}

		const parseResult = fieldSchema.safeParse(value);
		if (!parseResult.success) {
			return 'skip:validation-failed';
		}

		return `body:${value}`;
	}

	private extractUserIdentifier(req: AuthenticatedRequest): string {
		return `user:${req.user.id}`;
	}
}
