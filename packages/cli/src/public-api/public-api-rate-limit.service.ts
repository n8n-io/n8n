import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type { AuthenticatedRequest } from '@n8n/db';
import type { Method, RateLimitTierName } from '@n8n/decorators';
import { Service } from '@n8n/di';
import type { Request, RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';

const apiKeyIdOf = (req: Request) => (req as AuthenticatedRequest).tokenGrant?.apiKeyId;

/**
 * Limits Public API requests for each API key, in two layers: a total across all endpoints, and
 * a limit for each endpoint. Reads and writes have separate limits in both layers.
 */
@Service()
export class PublicApiRateLimitService {
	private readonly globalLimiters = new Map<RateLimitTierName, RequestHandler | undefined>();

	constructor(private readonly globalConfig: GlobalConfig) {}

	/** Call once for each route, when the route is registered. */
	createMiddlewares(method: Method, tierOverride?: RateLimitTierName): RequestHandler[] {
		const config = this.globalConfig.publicApi.rateLimit;
		if (!config.enabled) return [];

		const tier = tierOverride ?? (method === 'get' || method === 'head' ? 'read' : 'write');

		const endpointLimiter =
			tier === 'read'
				? this.createLimiter(config.endpointReadLimit, config.endpointReadWindowSeconds)
				: this.createLimiter(config.endpointWriteLimit, config.endpointWriteWindowSeconds);

		if (!this.globalLimiters.has(tier)) {
			this.globalLimiters.set(
				tier,
				tier === 'read'
					? this.createLimiter(config.globalReadLimit, config.globalReadWindowSeconds)
					: this.createLimiter(config.globalWriteLimit, config.globalWriteWindowSeconds),
			);
		}
		const globalLimiter = this.globalLimiters.get(tier);

		// The endpoint limiter runs first, so a request it blocks does not use the total, and the
		// total's headers are the ones a client sees when both pass.
		return [endpointLimiter, globalLimiter].filter((limiter) => limiter !== undefined);
	}

	private createLimiter(limit: number, windowSeconds: number): RequestHandler | undefined {
		if (limit === 0) return undefined;

		return rateLimit({
			limit,
			windowMs: windowSeconds * Time.seconds.toMilliseconds,
			legacyHeaders: true,
			standardHeaders: false,
			message: { message: 'Too many requests' },
			passOnStoreError: true,
			skip: (req) => apiKeyIdOf(req) === undefined,
			keyGenerator: (req) => apiKeyIdOf(req) ?? '',
		});
	}
}
