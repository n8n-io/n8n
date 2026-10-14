import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type { AuthenticatedRequest } from '@n8n/db';
import type { Method, RateLimitAccessName } from '@n8n/decorators';
import { Service } from '@n8n/di';
import type { Request, RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';

const getApiKeyId = (req: Request) => (req as AuthenticatedRequest).tokenGrant?.apiKeyId;

/** The most requests one API key can send in one time window. */
type RequestLimit = { maxRequests: number; windowSeconds: number };

type AccessRequestLimits = { perEndpoint: RequestLimit; allEndpoints: RequestLimit };

const READ_METHODS: ReadonlySet<Method> = new Set(['get', 'head']);

/** `@RateLimitAccess` wins. Without it, `GET` and `HEAD` are reads and all other methods are writes. */
const resolveAccess = (
	method: Method,
	accessFromDecorator?: RateLimitAccessName,
): RateLimitAccessName => accessFromDecorator ?? (READ_METHODS.has(method) ? 'read' : 'write');

/**
 * Limits Public API requests for each API key, in two layers: one limit for each endpoint, and
 * one limit across all endpoints. Reads and writes have separate limits in both layers.
 */
@Service()
export class PublicApiRateLimitService {
	private readonly allEndpointsLimiterCache = new Map<
		RateLimitAccessName,
		RequestHandler | undefined
	>();

	constructor(private readonly globalConfig: GlobalConfig) {}

	private get config() {
		return this.globalConfig.publicApi.rateLimit;
	}

	/** Call once for each route, when the route is registered. */
	createRouteLimiters(method: Method, accessFromDecorator?: RateLimitAccessName): RequestHandler[] {
		if (!this.config.enabled) return [];

		const access = resolveAccess(method, accessFromDecorator);

		// The per-endpoint limiter runs first, so a request it blocks does not count toward the
		// all-endpoints limit, and the all-endpoints headers are the ones a client sees when both pass.
		return [this.createPerEndpointLimiter(access), this.getAllEndpointsLimiter(access)].filter(
			(limiter) => limiter !== undefined,
		);
	}

	private createPerEndpointLimiter(access: RateLimitAccessName) {
		return createRateLimiter(this.getLimitsFromConfig(access).perEndpoint);
	}

	/** All routes with the same access share one limiter, so it is created once and cached. */
	private getAllEndpointsLimiter(access: RateLimitAccessName) {
		if (!this.allEndpointsLimiterCache.has(access)) {
			this.allEndpointsLimiterCache.set(
				access,
				createRateLimiter(this.getLimitsFromConfig(access).allEndpoints),
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
}

/** A limit of 0 turns off that layer. */
function createRateLimiter({
	maxRequests,
	windowSeconds,
}: RequestLimit): RequestHandler | undefined {
	if (maxRequests === 0) return undefined;

	return rateLimit({
		limit: maxRequests,
		windowMs: windowSeconds * Time.seconds.toMilliseconds,
		legacyHeaders: true,
		standardHeaders: false,
		message: { message: 'Too many requests' },
		passOnStoreError: true,
		skip: (req) => getApiKeyId(req) === undefined,
		keyGenerator: (req) => getApiKeyId(req) ?? '',
	});
}
