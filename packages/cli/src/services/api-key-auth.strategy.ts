import type { AuthenticatedRequest } from '@n8n/db';
import { ApiKeyRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { TokenExpiredError } from 'jsonwebtoken';

import type { AuthStrategy } from './auth-strategy.types';
import { JwtService } from './jwt.service';
import { API_KEY_AUDIENCE, API_KEY_ISSUER, PREFIX_LEGACY_API_KEY } from './public-api-key.service';

const API_KEY_HEADER = 'x-n8n-api-key';

@Service()
export class ApiKeyAuthStrategy implements AuthStrategy {
	constructor(
		private readonly apiKeyRepository: ApiKeyRepository,
		private readonly jwtService: JwtService,
	) {}

	async authenticate(req: AuthenticatedRequest): Promise<boolean | null> {
		const providedApiKey = req.headers[API_KEY_HEADER];

		if (typeof providedApiKey !== 'string' || !providedApiKey) return null;

		// Abstain from non-API-key JWTs so other strategies (e.g. ScopedJwtStrategy) can handle them.
		// Legacy keys (PREFIX_LEGACY_API_KEY prefix) are never JWTs — skip the decode for them.
		// A null decode means the string is not a structurally valid JWT — reject authentication.
		if (!providedApiKey.startsWith(PREFIX_LEGACY_API_KEY)) {
			const decoded = this.jwtService.decode<{ iss?: string }>(providedApiKey);
			// Note: JwtService.decode casts its return as T, but jwt.decode() can still return null at runtime.
			if (decoded === null) return false;
			if (decoded.iss !== API_KEY_ISSUER) return null;
		}

		const apiKeyRecord = await this.apiKeyRepository.findOne({
			where: { apiKey: providedApiKey, audience: API_KEY_AUDIENCE },
			relations: { user: { role: true } },
		});

		if (!apiKeyRecord?.user) return false;

		if (apiKeyRecord.user.disabled) return false;

		if (!providedApiKey.startsWith(PREFIX_LEGACY_API_KEY)) {
			try {
				this.jwtService.verify(providedApiKey, {
					issuer: API_KEY_ISSUER,
					audience: API_KEY_AUDIENCE,
				});
			} catch (e) {
				if (e instanceof TokenExpiredError) return false;
				throw e;
			}
		}

		req.user = apiKeyRecord.user;
		req.tokenGrant = {
			scopes: apiKeyRecord.user.role.scopes.map((s) => s.slug),
			subject: apiKeyRecord.user,
			apiKeyScopes: apiKeyRecord.scopes ?? [],
		};

		return true;
	}
}
