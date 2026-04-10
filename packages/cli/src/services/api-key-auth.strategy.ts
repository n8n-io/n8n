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
		req.tokenGrant = { scopes: apiKeyRecord.scopes ?? [] };

		return true;
	}
}
