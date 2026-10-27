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
 * One counter, for example the per-endpoint reads of one route. It reads its limit for each
 * request, so a saved change applies without a restart.
 */
type Layer = {
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
	private readonly allEndpointsLayers = new Map<RateLimitAccessName, Layer>();

	/**
	 * The store that counted each request in each layer. A window change can replace a layer's
	 * store while a request is in flight, and the count must be taken back from the store that made it.
	 */
	private readonly countingStores = new WeakMap<Request, Map<Layer, Store>>();

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

		const layers = [
			this.createPerEndpointLayer(access, endpoint),
			this.getAllEndpointsLayer(access),
		];

		return [...layers.map((layer) => this.countRequests(layer)), this.enforceLimits(layers)];
	}

	/** Counts the request, unless rate limiting is off or the layer's limit is 0. */
	private countRequests(layer: Layer): RequestHandler {
		return async (req, res, next) => {
			const { maxRequests, windowSeconds } = layer.readLimit();
			if (!this.config.enabled || maxRequests === 0) {
				next();
				return;
			}

			const { middleware, store } = this.getLimiter(
				layer,
				windowSeconds * Time.seconds.toMilliseconds,
			);
			const stores = this.countingStores.get(req) ?? new Map<Layer, Store>();
			stores.set(layer, store);
			this.countingStores.set(req, stores);
			await middleware(req, res, next);
		};
	}

	/**
	 * `express-rate-limit` fixes the window when it creates a limiter, so a new window needs a new
	 * limiter and a new store. On multi-main the new store shares the old Redis keys.
	 */
	private getLimiter(layer: Layer, windowMs: number) {
		if (layer.limiter?.windowMs !== windowMs) {
			void layer.limiter?.store.shutdown?.();
			const store = this.storeFactory.create(layer.storeName);
			const middleware = this.rateLimitService.createApiKeyRateLimitMiddleware(
				{ limit: () => layer.readLimit().maxRequests, windowMs },
				{ requestPropertyName: layer.requestPropertyName, store },
			);
			layer.limiter = { windowMs, middleware, store };
		}
		return layer.limiter;
	}

	/**
	 * Runs after the limiters, which only count. Sends a 429 when the request is over any limit.
	 * Otherwise sets the headers from the limit with the fewest requests left.
	 */
	private enforceLimits(layers: Layer[]): RequestHandler {
		return async (req: AugmentedRequest, res, next) => {
			const stores = this.countingStores.get(req);
			const counted = layers.flatMap((layer) => {
				const limit: RateLimitInfo | undefined = req[layer.requestPropertyName];
				const store = stores?.get(layer);
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

	private createPerEndpointLayer(access: RateLimitAccessName, endpoint: string): Layer {
		return {
			requestPropertyName: ENDPOINT_LIMIT,
			storeName: `endpoint:${access}:${endpoint}`,
			readLimit: () => this.getLimits(access).perEndpoint,
		};
	}

	/** All routes with the same access share one layer, so they share one count. */
	private getAllEndpointsLayer(access: RateLimitAccessName): Layer {
		let layer = this.allEndpointsLayers.get(access);
		if (!layer) {
			layer = {
				requestPropertyName: ALL_ENDPOINTS_LIMIT,
				storeName: `all:${access}`,
				readLimit: () => this.getLimits(access).allEndpoints,
			};
			this.allEndpointsLayers.set(access, layer);
		}
		return layer;
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
