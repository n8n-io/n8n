import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { JWK } from 'jose';

import type { JwksProvider } from '@/jwks/jwks.registry';

import { OAuthJweKeyService } from './oauth-jwe-key.service';
import { PublicJweJwkSchema } from './oauth-jwe.schemas';

/** Publishes the instance OAuth JWE public keys in the instance JWKS. */
@Service()
export class OAuthJweJwksProvider implements JwksProvider {
	readonly id = 'oauth-jwe';

	constructor(
		private readonly jweKeyService: OAuthJweKeyService,
		private readonly logger: Logger,
	) {}

	async getPublicJwks(): Promise<JWK[]> {
		const jwks = await this.jweKeyService.getPublicJwks();

		return jwks
			.map((key) => PublicJweJwkSchema.safeParse(key))
			.filter((result) => {
				if (!result.success) {
					this.logger.warn('Failed to parse public JWE JWK', { error: result.error });
				}
				return result.success;
			})
			.map((result) => result.data);
	}
}
