import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { JWK } from 'jose';

import type { JwksProvider } from '@/jwks/jwks.registry';

import { OAuthSigningKeyService } from './oauth-signing-key.service';
import { PublicSigningJwkSchema } from './oauth-signing-key.schemas';

/** Publishes the OAuth access-token signing keys in the instance JWKS. */
@Service()
export class OAuthSigningJwksProvider implements JwksProvider {
	readonly id = 'oauth-server-signing';

	constructor(
		private readonly signingKeyService: OAuthSigningKeyService,
		private readonly logger: Logger,
	) {}

	async getPublicJwks(): Promise<JWK[]> {
		const jwks = await this.signingKeyService.getPublicJwks();

		return jwks
			.map((key) => PublicSigningJwkSchema.safeParse(key))
			.filter((result) => {
				if (!result.success) {
					this.logger.warn('Failed to parse public signing JWK', { error: result.error });
				}
				return result.success;
			})
			.map((result) => result.data);
	}
}
