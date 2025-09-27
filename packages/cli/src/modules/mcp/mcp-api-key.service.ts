import { ApiKeyRepository, AuthenticatedRequest, User, UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { NextFunction, Response } from 'express';

import { JwtService } from '@/services/jwt.service';

const API_KEY_AUDIENCE = 'mcp-server-api';
const API_KEY_ISSUER = 'n8n';

@Service()
export class McpServerApiKeyService {
	constructor(
		private readonly apiKeyRepository: ApiKeyRepository,
		private readonly jwtService: JwtService,
		private readonly userRepository: UserRepository,
	) {}

	async createMcpServerApiKey(user: User) {
		const apiKey = this.jwtService.sign({
			sub: user.id,
			iss: API_KEY_ISSUER,
			aud: API_KEY_AUDIENCE,
		});

		await this.apiKeyRepository.insert(
			// @ts-ignore CAT-957
			this.apiKeyRepository.create({
				userId: user.id,
				apiKey,
				audience: API_KEY_AUDIENCE,
				scopes: [],
			}),
		);

		return await this.apiKeyRepository.findOneByOrFail({ apiKey });
	}

	async findServerApiKeyForUser(user: User) {
		return await this.apiKeyRepository.findOneBy({
			userId: user.id,
			audience: API_KEY_AUDIENCE,
		});
	}

	private async getUserForApiKey(apiKey: string) {
		return await this.userRepository.findOne({
			where: {
				apiKeys: {
					apiKey,
				},
			},
			relations: ['role'],
		});
	}

	async deleteApiKeyForUser(user: User) {
		await this.apiKeyRepository.delete({
			userId: user.id,
			audience: API_KEY_AUDIENCE,
		});
	}

	getAuthMiddleware() {
		return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
			const authHeader = req.headers.authorization;
			const apiKey = authHeader?.split(' ')[1];

			if (!apiKey) {
				this.responseWithUnauthorized(res);
				return;
			}

			const user = await this.getUserForApiKey(apiKey);

			if (!user) {
				this.responseWithUnauthorized(res);
				return;
			}

			try {
				this.jwtService.verify(apiKey, {
					issuer: API_KEY_ISSUER,
					audience: API_KEY_AUDIENCE,
				});
			} catch (e) {
				this.responseWithUnauthorized(res);
				return;
			}

			req.user = user;

			next();
		};
	}

	private responseWithUnauthorized(res: Response) {
		res.status(401).send({ message: 'Unauthorized' });
	}
}
