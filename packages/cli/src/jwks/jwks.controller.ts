import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { Get, RestController } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Response } from 'express';

import { AuthlessRequest } from '@/requests';

import { JwksConfig } from './jwks.config';
import { JwksRegistry } from './jwks.registry';
import { type JwksResponse, PublicJwkSchema } from './jwks.schemas';

const jwksConfig = Container.get(JwksConfig);

@RestController('/.well-known')
export class JwksController {
	constructor(
		private readonly jwksRegistry: JwksRegistry,
		private readonly logger: Logger,
	) {}

	@Get('/jwks.json', {
		skipAuth: true,
		ipRateLimit: {
			limit: jwksConfig.rateLimitJwksPerMinute,
			windowMs: 1 * Time.minutes.toMilliseconds,
		},
	})
	async getKeys(_req: AuthlessRequest, res: Response): Promise<void> {
		const jwks = await this.jwksRegistry.getPublicJwks();

		const keys = jwks
			.map((key) => PublicJwkSchema.safeParse(key))
			.filter((result) => {
				if (!result.success) {
					this.logger.warn('Failed to parse public JWK', { error: result.error });
				}
				return result.success;
			})
			.map((result) => result.data);

		const response: JwksResponse = { keys };

		res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
		res.json(response);
	}
}
