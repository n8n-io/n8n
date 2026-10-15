import type { ZodClass } from '@n8n/api-types';
import { Time } from '@n8n/constants';
import { AuthenticatedRequest } from '@n8n/db';
import type { RateLimiterLimits, UserKeyedRateLimiterConfig } from '@n8n/decorators';
import { BodyKeyedRateLimiterConfig } from '@n8n/decorators';
import { Service } from '@n8n/di';
import type { Request, RequestHandler, Response } from 'express';
import { rateLimit as expressRateLimit } from 'express-rate-limit';
import type { AugmentedRequest, RateLimitInfo } from 'express-rate-limit';
import assert from 'node:assert';
import type { ZodTypeAny } from 'zod';

const defaultLimits: Required<RateLimiterLimits> = {
	limit: 5,
	windowMs: 5 * Time.minutes.toMilliseconds,
};

const API_KEY_RATE_LIMIT_PROPERTY = 'apiKeyRateLimit';

const secondsUntil = (date: Date) =>
	Math.max(0, Math.ceil((date.getTime() - Date.now()) / Time.seconds.toMilliseconds));

const setRateLimitHeaders = (res: Response, info: RateLimitInfo) => {
	res.setHeader('X-RateLimit-Limit', info.limit.toString());
	res.setHeader('X-RateLimit-Remaining', info.remaining.toString());
	if (info.resetTime) {
		res.setHeader(
			'X-RateLimit-Reset',
			Math.ceil(info.resetTime.getTime() / Time.seconds.toMilliseconds).toString(),
		);
	}
};

const isTighter = (info: RateLimitInfo, shown: RateLimitInfo) =>
	info.remaining < shown.remaining ||
	(info.remaining === shown.remaining &&
		(info.resetTime?.getTime() ?? 0) > (shown.resetTime?.getTime() ?? 0));

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
		const bodyFieldSchema = bodyDtoClass.schema.shape[fieldName];
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

	/** The rate limit that each response reports in its headers. */
	private readonly shownApiKeyRateLimits = new WeakMap<Response, RateLimitInfo>();

	/**
	 * Creates a rate limit middleware keyed by API key.
	 * Runs AFTER authentication. Requests without an API key are not counted.
	 * When several of these limiters pass a request, the headers show the one with the fewest
	 * requests left. When one blocks a request, the headers show that one.
	 */
	createApiKeyRateLimitMiddleware(limits: Required<RateLimiterLimits>): RequestHandler {
		const limiter = expressRateLimit({
			limit: limits.limit,
			windowMs: limits.windowMs,
			legacyHeaders: false,
			standardHeaders: false,
			requestPropertyName: API_KEY_RATE_LIMIT_PROPERTY,
			passOnStoreError: true,
			// Only a 429 is uncounted, so a request one limiter blocks uses no quota of another limiter.
			// Other error responses still count.
			skipFailedRequests: true,
			requestWasSuccessful: (_req, res) => res.statusCode !== 429,
			skip: (req: AuthenticatedRequest): boolean => req.tokenGrant?.apiKeyId === undefined,
			keyGenerator: (req: AuthenticatedRequest) => `apiKey:${req.tokenGrant?.apiKeyId}`,
			handler: (req: AugmentedRequest, res: Response) => {
				const info = req[API_KEY_RATE_LIMIT_PROPERTY];
				setRateLimitHeaders(res, info);
				res.setHeader(
					'Retry-After',
					(info.resetTime
						? secondsUntil(info.resetTime)
						: Math.ceil(limits.windowMs / Time.seconds.toMilliseconds)
					).toString(),
				);
				res.status(429).json({ message: 'Too many requests' });
			},
		});

		return async (req: AugmentedRequest, res, next) => {
			await limiter(req, res, (error?: unknown) => {
				if (error === undefined) this.showTightestApiKeyRateLimit(req, res);
				next(error);
			});
		};
	}

	private showTightestApiKeyRateLimit(req: AugmentedRequest, res: Response) {
		const info: RateLimitInfo | undefined = req[API_KEY_RATE_LIMIT_PROPERTY];
		if (!info) return;

		const shown = this.shownApiKeyRateLimits.get(res);
		if (shown && !isTighter(info, shown)) return;

		this.shownApiKeyRateLimits.set(res, info);
		setRateLimitHeaders(res, info);
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
