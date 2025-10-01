import { ApiKeyRepository, User, UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { NextFunction, Response, Request } from 'express';

import { AuthError } from '@/errors/response-errors/auth.error';
import { JwtService } from '@/services/jwt.service';

const API_KEY_AUDIENCE = 'mcp-server-api';
const API_KEY_ISSUER = 'n8n';
const REDACT_API_KEY_REVEAL_COUNT = 4;
const REDACT_API_KEY_MAX_LENGTH = 10;
const API_KEY_LABEL = 'MCP Server API Key';

/**
 * Service for managing MCP server API keys, including creation, retrieval, deletion, and authentication middleware.
 */
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
				label: API_KEY_LABEL,
			}),
		);

		return await this.apiKeyRepository.findOneByOrFail({ apiKey });
	}

	async findServerApiKeyForUser(user: User, { redact = true } = {}) {
		const apiKey = await this.apiKeyRepository.findOneBy({
			userId: user.id,
			audience: API_KEY_AUDIENCE,
		});

		if (apiKey && redact) {
			apiKey.apiKey = this.redactApiKey(apiKey.apiKey);
		}

		return apiKey;
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

	private redactApiKey(apiKey: string) {
		const visiblePart = apiKey.slice(-REDACT_API_KEY_REVEAL_COUNT);
		const redactedPart = '*'.repeat(
			Math.max(0, REDACT_API_KEY_MAX_LENGTH - REDACT_API_KEY_REVEAL_COUNT),
		);

		return redactedPart + visiblePart;
	}

	private extractAPIKeyFromHeader(headerValue: string) {
		if (!headerValue.startsWith('Bearer')) {
			throw new AuthError('Invalid authorization header format');
		}
		const apiKeyMatch = headerValue.match(/^Bearer\s+(.+)$/i);
		if (apiKeyMatch) {
			return apiKeyMatch[1];
		}
		throw new AuthError('Invalid authorization header format');
	}

	getAuthMiddleware() {
		return async (req: Request, res: Response, next: NextFunction) => {
			const authorizationHeader = req.header('authorization');

			if (!authorizationHeader) {
				this.responseWithUnauthorized(res);
				return;
			}

			const apiKey = this.extractAPIKeyFromHeader(authorizationHeader);

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

			// @ts-ignore
			req.user = user;

			next();
		};
	}

	private responseWithUnauthorized(res: Response) {
		res.status(401).send({ message: 'Unauthorized' });
	}
}
