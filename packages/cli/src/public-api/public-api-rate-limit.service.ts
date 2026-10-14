import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type { AuthenticatedRequest } from '@n8n/db';
import type { Method, RateLimitTierName } from '@n8n/decorators';
import { Service } from '@n8n/di';
import type { Request, RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';

const getApiKeyId = (req: Request) => (req as AuthenticatedRequest).tokenGrant?.apiKeyId;

/** The most requests one API key can send in one time window. */
type RequestLimit = { maxRequests: number; windowSeconds: number };

type TierRequestLimits = { perEndpoint: RequestLimit; allEndpoints: RequestLimit };

const READ_METHODS: ReadonlySet<Method> = new Set(['get', 'head']);

/** A tier is the read or write group of a request. Each tier has its own limits. */
const tierFor = (method: Method, tierFromDecorator?: RateLimitTierName): RateLimitTierName =>
	tierFromDecorator ?? (READ_METHODS.has(method) ? 'read' : 'write');

/**
 * Limits Public API requests for each API key, in two layers: one limit for each endpoint, and
 * one limit across all endpoints. Reads and writes have separate limits in both layers.
 */
@Service()
export class PublicApiRateLimitService {
	private readonly allEndpointsLimiters = new Map<RateLimitTierName, RequestHandler | undefined>();

	constructor(private readonly globalConfig: GlobalConfig) {}

	private get config() {
		return this.globalConfig.publicApi.rateLimit;
	}

	/** Call once for each route, when the route is registered. */
	createRouteLimiters(method: Method, tierFromDecorator?: RateLimitTierName): RequestHandler[] {
		if (!this.config.enabled) return [];

		const tier = tierFor(method, tierFromDecorator);

		// The per-endpoint limiter runs first, so a request it blocks does not count toward the
		// all-endpoints limit, and the all-endpoints headers are the ones a client sees when both pass.
		return [
			createLimiter(this.requestLimitsFor(tier).perEndpoint),
			this.allEndpointsLimiterFor(tier),
		].filter((limiter) => limiter !== undefined);
	}

	/** Every route in a tier shares one all-endpoints limiter. */
	private allEndpointsLimiterFor(tier: RateLimitTierName) {
		if (!this.allEndpointsLimiters.has(tier)) {
			this.allEndpointsLimiters.set(tier, createLimiter(this.requestLimitsFor(tier).allEndpoints));
		}
		return this.allEndpointsLimiters.get(tier);
	}

	private requestLimitsFor(tier: RateLimitTierName): TierRequestLimits {
		const { config } = this;
		const limits: Record<RateLimitTierName, TierRequestLimits> = {
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
		return limits[tier];
	}
}

/** A limit of 0 turns off that layer. */
function createLimiter({ maxRequests, windowSeconds }: RequestLimit): RequestHandler | undefined {
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
