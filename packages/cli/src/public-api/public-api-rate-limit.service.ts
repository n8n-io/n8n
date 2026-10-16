import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type { Method, RateLimitAccessName } from '@n8n/decorators';
import { Service } from '@n8n/di';
import type { RequestHandler } from 'express';
import type { AugmentedRequest, RateLimitInfo } from 'express-rate-limit';

import { RateLimitService } from '@/services/rate-limit.service';

type RequestLimit = { maxRequests: number; windowSeconds: number };

type AccessRequestLimits = { perEndpoint: RequestLimit; allEndpoints: RequestLimit };

const ENDPOINT_LIMIT = 'endpointRateLimit';
const ALL_ENDPOINTS_LIMIT = 'allEndpointsRateLimit';

const READ_METHODS: ReadonlySet<Method> = new Set(['get', 'head']);

const resolveAccess = (
	method: Method,
	accessFromDecorator?: RateLimitAccessName,
): RateLimitAccessName => accessFromDecorator ?? (READ_METHODS.has(method) ? 'read' : 'write');

@Service()
export class PublicApiRateLimitService {
	private readonly allEndpointsLimiterCache = new Map<
		RateLimitAccessName,
		RequestHandler | undefined
	>();

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly rateLimitService: RateLimitService,
	) {}

	private get config() {
		return this.globalConfig.publicApi.rateLimit;
	}

	/** Call once for each route, when the route is registered. */
	createRouteLimiters(method: Method, accessFromDecorator?: RateLimitAccessName): RequestHandler[] {
		if (!this.config.enabled) return [];

		const access = resolveAccess(method, accessFromDecorator);

		const limiters = [
			this.createPerEndpointLimiter(access),
			this.getAllEndpointsLimiter(access),
		].filter((limiter) => limiter !== undefined);
		if (limiters.length === 0) return [];

		return [...limiters, this.showLowestRemainingLimit];
	}

	/**
	 * Runs only when every limiter let the request pass. Each limiter writes its own headers, so the
	 * last one would win. This shows the limit with the fewest requests left instead.
	 */
	private readonly showLowestRemainingLimit: RequestHandler = (
		req: AugmentedRequest,
		res,
		next,
	) => {
		const limits = [req[ENDPOINT_LIMIT], req[ALL_ENDPOINTS_LIMIT]].filter(
			(limit?: RateLimitInfo) => limit !== undefined,
		);
		const lowest = limits.sort((a, b) => a.remaining - b.remaining)[0];

		if (lowest) {
			res.setHeader('X-RateLimit-Limit', lowest.limit.toString());
			res.setHeader('X-RateLimit-Remaining', lowest.remaining.toString());
			if (lowest.resetTime) {
				const resetSeconds = Math.ceil(lowest.resetTime.getTime() / Time.seconds.toMilliseconds);
				res.setHeader('X-RateLimit-Reset', resetSeconds.toString());
			}
		}
		next();
	};

	private createPerEndpointLimiter(access: RateLimitAccessName) {
		return this.createRateLimiter(this.getLimitsFromConfig(access).perEndpoint, ENDPOINT_LIMIT);
	}

	private getAllEndpointsLimiter(access: RateLimitAccessName) {
		if (!this.allEndpointsLimiterCache.has(access)) {
			this.allEndpointsLimiterCache.set(
				access,
				this.createRateLimiter(this.getLimitsFromConfig(access).allEndpoints, ALL_ENDPOINTS_LIMIT),
			);
		}
		return this.allEndpointsLimiterCache.get(access);
	}

	private getLimitsFromConfig(access: RateLimitAccessName): AccessRequestLimits {
		const { config } = this;
		const limits: Record<RateLimitAccessName, AccessRequestLimits> = {
			read: {
				perEndpoint: {
					maxRequests: config.endpointReadLimit,
					windowSeconds: config.endpointReadWindowSeconds,
				},
				allEndpoints: {
					maxRequests: config.globalReadLimit,
					windowSeconds: config.globalReadWindowSeconds,
				},
			},
			write: {
				perEndpoint: {
					maxRequests: config.endpointWriteLimit,
					windowSeconds: config.endpointWriteWindowSeconds,
				},
				allEndpoints: {
					maxRequests: config.globalWriteLimit,
					windowSeconds: config.globalWriteWindowSeconds,
				},
			},
		};
		return limits[access];
	}

	private createRateLimiter(
		{ maxRequests, windowSeconds }: RequestLimit,
		requestPropertyName: string,
	) {
		if (maxRequests === 0) return undefined;

		return this.rateLimitService.createApiKeyRateLimitMiddleware(
			{ limit: maxRequests, windowMs: windowSeconds * Time.seconds.toMilliseconds },
			requestPropertyName,
		);
	}
}
