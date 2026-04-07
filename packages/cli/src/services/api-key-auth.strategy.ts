import type { AuthenticatedRequest } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { TokenExpiredError } from 'jsonwebtoken';

import type { AuthStrategy } from './auth-strategy.types';
import { JwtService } from './jwt.service';
import { API_KEY_AUDIENCE, API_KEY_ISSUER, PREFIX_LEGACY_API_KEY } from './public-api-key.service';

const API_KEY_HEADER = 'x-n8n-api-key';

@Service()
export class ApiKeyAuthStrategy implements AuthStrategy {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly jwtService: JwtService,
	) {}

	async authenticate(req: AuthenticatedRequest): Promise<boolean | null> {
		const providedApiKey = req.headers[API_KEY_HEADER];

		if (typeof providedApiKey !== 'string' || !providedApiKey) return null;

		const user = await this.userRepository.findOne({
			where: {
				apiKeys: {
					apiKey: providedApiKey,
					audience: API_KEY_AUDIENCE,
				},
			},
			relations: ['role'],
		});

		if (!user) return false;

		if (user.disabled) return false;

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

		req.user = user;

		return true;
	}
}
