import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type { Method } from '@n8n/decorators';
import { Service } from '@n8n/di';
import type { RequestHandler } from 'express';

import { RateLimitService } from '@/services/rate-limit.service';

type RequestLimit = { maxRequests: number; windowSeconds: number };

type AccessRequestLimits = { perEndpoint: RequestLimit; allEndpoints: RequestLimit };

const READ_METHODS: ReadonlySet<Method> = new Set(['get', 'head']);

type Access = 'read' | 'write';

const resolveAccess = (method: Method): Access => (READ_METHODS.has(method) ? 'read' : 'write');

@Service()
export class PublicApiRateLimitService {
	private readonly allEndpointsLimiterCache = new Map<Access, RequestHandler | undefined>();

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly rateLimitService: RateLimitService,
	) {}

	private get config() {
		return this.globalConfig.publicApi.rateLimit;
	}

	/** Call once for each route, when the route is registered. */
	createRouteLimiters(method: Method): RequestHandler[] {
		if (!this.config.enabled) return [];

		const access = resolveAccess(method);

		// The all-endpoints limiter runs last, so its headers are the ones a client sees when both pass.
		return [this.createPerEndpointLimiter(access), this.getAllEndpointsLimiter(access)].filter(
			(limiter) => limiter !== undefined,
		);
	}

	private createPerEndpointLimiter(access: Access) {
		return this.createRateLimiter(this.getLimitsFromConfig(access).perEndpoint);
	}

	private getAllEndpointsLimiter(access: Access) {
		if (!this.allEndpointsLimiterCache.has(access)) {
			this.allEndpointsLimiterCache.set(
				access,
				this.createRateLimiter(this.getLimitsFromConfig(access).allEndpoints),
			);
		}
		return this.allEndpointsLimiterCache.get(access);
	}

	private getLimitsFromConfig(access: Access): AccessRequestLimits {
		const { config } = this;
		const limits: Record<Access, AccessRequestLimits> = {
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

	private createRateLimiter({ maxRequests, windowSeconds }: RequestLimit) {
		if (maxRequests === 0) return undefined;

		return this.rateLimitService.createApiKeyRateLimitMiddleware({
			limit: maxRequests,
			windowMs: windowSeconds * Time.seconds.toMilliseconds,
		});
	}
}
