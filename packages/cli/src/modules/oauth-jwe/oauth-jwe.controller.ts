import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { Get, RestController } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Response } from 'express';

import { AuthlessRequest } from '@/requests';

import { OAuthJweKeyService } from './oauth-jwe-key.service';
import { OAuthJweConfig } from './oauth-jwe.config';
import { type JwksResponse, PublicJweJwkSchema } from './oauth-jwe.schemas';

const configService = Container.get(OAuthJweConfig);

@RestController('/.well-known')
export class OAuthJweController {
	constructor(
		private readonly jweKeyService: OAuthJweKeyService,
		private readonly logger: Logger,
	) {}

	@Get('/jwks.json', {
		skipAuth: true,
		ipRateLimit: {
			limit: configService.rateLimitJwksPerMinute,
			windowMs: 1 * Time.minutes.toMilliseconds,
		},
	})
	async getKeys(_req: AuthlessRequest, res: Response): Promise<void> {
		const jwks = await this.jweKeyService.getPublicJwks();

		const keys = jwks
			.map((key) => PublicJweJwkSchema.safeParse(key))
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
