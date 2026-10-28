import { Time } from '@n8n/constants';
import type { Method, RateLimitAccessName } from '@n8n/decorators';
import { Service } from '@n8n/di';
import type { RequestHandler, Response } from 'express';
import type { AugmentedRequest, RateLimitInfo, Store } from 'express-rate-limit';

import { RateLimitService } from '@/services/rate-limit.service';

import { PublicApiRateLimitSettingsService } from './public-api-rate-limit-settings.service';
import { PublicApiRateLimitStoreFactory } from './public-api-rate-limit-store.factory';

type RequestLimit = { maxRequests: number; windowSeconds: number };

type AccessRequestLimits = { perEndpoint: RequestLimit; allEndpoints: RequestLimit };

type CountingLimiter = {
	middleware: RequestHandler;
	store: Store;
	requestPropertyName: string;
};

const ENDPOINT_LIMIT = 'endpointRateLimit';
const ALL_ENDPOINTS_LIMIT = 'allEndpointsRateLimit';

const resetMs = (limit: RateLimitInfo) => limit.resetTime?.getTime() ?? 0;

const setRateLimitHeaders = (res: Response, limit: RateLimitInfo) => {
	res.setHeader('X-RateLimit-Limit', limit.limit.toString());
	res.setHeader('X-RateLimit-Remaining', limit.remaining.toString());
	if (limit.resetTime) {
		const resetSeconds = Math.ceil(resetMs(limit) / Time.seconds.toMilliseconds);
		res.setHeader('X-RateLimit-Reset', resetSeconds.toString());
	}
};

const READ_METHODS: ReadonlySet<Method> = new Set(['get', 'head']);

const resolveAccess = (
	method: Method,
	accessFromDecorator?: RateLimitAccessName,
): RateLimitAccessName => accessFromDecorator ?? (READ_METHODS.has(method) ? 'read' : 'write');

@Service()
export class PublicApiRateLimitService {
	private readonly allEndpointsLimiterCache = new Map<
		RateLimitAccessName,
		CountingLimiter | undefined
	>();

	constructor(
		private readonly rateLimitSettingsService: PublicApiRateLimitSettingsService,
		private readonly rateLimitService: RateLimitService,
		private readonly storeFactory: PublicApiRateLimitStoreFactory,
	) {}

	private get config() {
		return this.rateLimitSettingsService.settings;
	}

	/**
	 * Call once for each route, when the route is registered.
	 * @param path The route template with the API version, for example `/v1/workflows/:id`.
	 */
	createRouteLimiters(
		method: Method,
		path: string,
		accessFromDecorator?: RateLimitAccessName,
	): RequestHandler[] {
		if (!this.config.enabled) return [];

		const access = resolveAccess(method, accessFromDecorator);
		const endpoint = `${method.toUpperCase()} ${path}`;

		const limiters = [
			this.createPerEndpointLimiter(access, endpoint),
			this.getAllEndpointsLimiter(access),
		].filter((limiter) => limiter !== undefined);
		if (limiters.length === 0) return [];

		return [...limiters.map((limiter) => limiter.middleware), this.enforceLimits(limiters)];
	}

	/**
	 * Runs after the limiters, which only count. Sends a 429 when the request is over any limit.
	 * Otherwise sets the headers from the limit with the fewest requests left.
	 */
	private enforceLimits(limiters: CountingLimiter[]): RequestHandler {
		return async (req: AugmentedRequest, res, next) => {
			const counted = limiters.flatMap(({ store, requestPropertyName }) => {
				const limit: RateLimitInfo | undefined = req[requestPropertyName];
				return limit ? [{ store, limit }] : [];
			});
			const limits = counted.map(({ limit }) => limit);

			const exceeded = limits.filter((limit) => limit.used > limit.limit);
			if (exceeded.length > 0) {
				// A blocked request uses no quota. Take it back now, not when the response ends, so a
				// parallel request never sees it.
				await Promise.all(
					counted.map(async ({ store, limit }) => await store.decrement(limit.key)),
				);

				// The client can retry only when every exceeded limit has reset.
				const [lastToReset] = exceeded.sort((a, b) => resetMs(b) - resetMs(a));
				const retryAfterMs = resetMs(lastToReset) - Date.now();
				setRateLimitHeaders(res, lastToReset);
				res.setHeader(
					'Retry-After',
					Math.ceil(Math.max(0, retryAfterMs) / Time.seconds.toMilliseconds).toString(),
				);
				res.status(429).json({ message: 'Too many requests' });
				return;
			}

			// On a tie, the later reset wins, so the reset time is never too early.
			const [fewestLeft] = limits.sort(
				(a, b) => a.remaining - b.remaining || resetMs(b) - resetMs(a),
			);
			if (fewestLeft) setRateLimitHeaders(res, fewestLeft);
			next();
		};
	}

	private createPerEndpointLimiter(access: RateLimitAccessName, endpoint: string) {
		return this.createRateLimiter(
			this.getLimitsFromConfig(access).perEndpoint,
			ENDPOINT_LIMIT,
			`endpoint:${access}:${endpoint}`,
		);
	}

	private getAllEndpointsLimiter(access: RateLimitAccessName) {
		if (!this.allEndpointsLimiterCache.has(access)) {
			this.allEndpointsLimiterCache.set(
				access,
				this.createRateLimiter(
					this.getLimitsFromConfig(access).allEndpoints,
					ALL_ENDPOINTS_LIMIT,
					`all:${access}`,
				),
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
		storeName: string,
	): CountingLimiter | undefined {
		if (maxRequests === 0) return undefined;

		const limits = { limit: maxRequests, windowMs: windowSeconds * Time.seconds.toMilliseconds };
		const store = this.storeFactory.create(storeName);
		const middleware = this.rateLimitService.createApiKeyRateLimitMiddleware(limits, {
			requestPropertyName,
			store,
		});
		return { middleware, store, requestPropertyName };
	}
}
