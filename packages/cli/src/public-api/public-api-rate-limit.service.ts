import { Time } from '@n8n/constants';
import type { Method, RateLimitAccessName } from '@n8n/decorators';
import { Service } from '@n8n/di';
import type { Request, RequestHandler, Response } from 'express';
import type { AugmentedRequest, RateLimitInfo, Store } from 'express-rate-limit';

import { RateLimitService } from '@/services/rate-limit.service';

import { PublicApiRateLimitSettingsService } from './public-api-rate-limit-settings.service';
import { PublicApiRateLimitStoreFactory } from './public-api-rate-limit-store.factory';

type RequestLimit = { maxRequests: number; windowSeconds: number };

type AccessRequestLimits = { perEndpoint: RequestLimit; allEndpoints: RequestLimit };

/**
 * Counts the requests of one API key against one limit. Each route has two counters: one for
 * its endpoint, and one that all routes with the same access share.
 */
type Counter = {
	requestPropertyName: string;
	storeName: string;
	readLimit: () => RequestLimit;
	limiter?: { windowMs: number; middleware: RequestHandler; store: Store };
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
	private readonly allEndpointsCounters = new Map<RateLimitAccessName, Counter>();

	/**
	 * The store that counted each request, for each counter. A window change replaces a counter's
	 * store, so a blocked request must take its count back from the store that counted it.
	 */
	private readonly countingStores = new WeakMap<Request, Map<Counter, Store>>();

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
		const access = resolveAccess(method, accessFromDecorator);
		const endpoint = `${method.toUpperCase()} ${path}`;

		const counters = [
			this.createEndpointCounter(access, endpoint),
			this.getAllEndpointsCounter(access),
		];

		return [...counters.map((counter) => this.count(counter)), this.enforceLimits(counters)];
	}

	/** Counts the request. Skips it when rate limiting is off or the counter's limit is 0. */
	private count(counter: Counter): RequestHandler {
		return async (req, res, next) => {
			const { maxRequests, windowSeconds } = counter.readLimit();
			if (!this.config.enabled || maxRequests === 0) {
				next();
				return;
			}

			const { middleware, store } = this.getLimiter(
				counter,
				windowSeconds * Time.seconds.toMilliseconds,
			);
			const stores = this.countingStores.get(req) ?? new Map<Counter, Store>();
			stores.set(counter, store);
			this.countingStores.set(req, stores);
			await middleware(req, res, next);
		};
	}

	/**
	 * `express-rate-limit` reads the window once, when it creates a limiter, and cannot change it
	 * later. So when the window changes, this creates a new limiter with a new store. On multi-main,
	 * the new store uses the same Redis keys, so the counts carry over.
	 */
	private getLimiter(counter: Counter, windowMs: number) {
		if (counter.limiter?.windowMs !== windowMs) {
			void counter.limiter?.store.shutdown?.();
			const store = this.storeFactory.create(counter.storeName);
			const middleware = this.rateLimitService.createApiKeyRateLimitMiddleware(
				{ limit: () => counter.readLimit().maxRequests, windowMs },
				{ requestPropertyName: counter.requestPropertyName, store },
			);
			counter.limiter = { windowMs, middleware, store };
		}
		return counter.limiter;
	}

	/**
	 * Runs after the limiters, which only count. Sends a 429 when the request is over any limit.
	 * Otherwise sets the headers from the limit with the fewest requests left.
	 */
	private enforceLimits(counters: Counter[]): RequestHandler {
		return async (req: AugmentedRequest, res, next) => {
			const stores = this.countingStores.get(req);
			const counted = counters.flatMap((counter) => {
				const limit: RateLimitInfo | undefined = req[counter.requestPropertyName];
				const store = stores?.get(counter);
				return limit && store ? [{ store, limit }] : [];
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

	private createEndpointCounter(access: RateLimitAccessName, endpoint: string): Counter {
		return {
			requestPropertyName: ENDPOINT_LIMIT,
			storeName: `endpoint:${access}:${endpoint}`,
			readLimit: () => this.getLimits(access).perEndpoint,
		};
	}

	/** All routes with the same access share one counter. */
	private getAllEndpointsCounter(access: RateLimitAccessName): Counter {
		let counter = this.allEndpointsCounters.get(access);
		if (!counter) {
			counter = {
				requestPropertyName: ALL_ENDPOINTS_LIMIT,
				storeName: `all:${access}`,
				readLimit: () => this.getLimits(access).allEndpoints,
			};
			this.allEndpointsCounters.set(access, counter);
		}
		return counter;
	}

	private getLimits(access: RateLimitAccessName): AccessRequestLimits {
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
}
