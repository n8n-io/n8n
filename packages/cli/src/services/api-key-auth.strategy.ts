import type { AuthenticatedRequest, TokenGrant } from '@n8n/db';
import { ApiKeyRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { TokenExpiredError } from 'jsonwebtoken';

import type { AuthStrategy, AuthStrategyOptions } from './auth-strategy.types';
import { JwtService } from './jwt.service';
import { API_KEY_AUDIENCE, API_KEY_ISSUER, PREFIX_LEGACY_API_KEY } from './public-api-key.service';

const API_KEY_HEADER = 'x-n8n-api-key';

@Service()
export class ApiKeyAuthStrategy implements AuthStrategy {
	constructor(
		private readonly apiKeyRepository: ApiKeyRepository,
		private readonly jwtService: JwtService,
	) {}

	async buildTokenGrant(
		token: string,
		options?: AuthStrategyOptions,
	): Promise<TokenGrant | false | null> {
		if (typeof token !== 'string' || !token) return null;

		const issuer = options?.issuer ?? API_KEY_ISSUER;
		const audience = options?.audience ?? API_KEY_AUDIENCE;

		// Abstain from non-API-key JWTs so other strategies (e.g. ScopedJwtStrategy) can handle them.
		// Legacy keys (PREFIX_LEGACY_API_KEY prefix) are never JWTs — skip the decode for them.
		// A null decode means the string is not a structurally valid JWT — reject authentication.
		if (!token.startsWith(PREFIX_LEGACY_API_KEY)) {
			const decoded = this.jwtService.decode<{ iss?: string }>(token);
			// Note: JwtService.decode casts its return as T, but jwt.decode() can still return null at runtime.
			if (decoded === null) return false;
			if (decoded.iss !== issuer) return null;
		}

		const apiKeyRecord = await this.apiKeyRepository.findOne({
			where: { apiKey: token, audience },
			relations: { user: { role: true } },
		});

		if (!apiKeyRecord?.user) return false;

		if (apiKeyRecord.user.disabled) return false;

		if (!token.startsWith(PREFIX_LEGACY_API_KEY)) {
			try {
				this.jwtService.verify(token, {
					issuer,
					audience,
				});
			} catch (e) {
				if (e instanceof TokenExpiredError) return false;
				throw e;
			}
		}

		return {
			scopes: apiKeyRecord.user.role.scopes.map((s) => s.slug),
			subject: apiKeyRecord.user,
			apiKeyScopes: apiKeyRecord.scopes ?? [],
		};
	}

	async authenticate(req: AuthenticatedRequest): Promise<boolean | null> {
		const providedApiKey = req.headers[API_KEY_HEADER];

		if (typeof providedApiKey !== 'string' || !providedApiKey) return null;

		const tokenGrant = await this.buildTokenGrant(providedApiKey);

		if (tokenGrant === false || tokenGrant === null) {
			return tokenGrant;
		}

		req.user = tokenGrant.subject;
		req.tokenGrant = tokenGrant;

		return true;
	}
}
