import { ApiKey, ApiKeyRepository, User, UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { EntityManager } from '@n8n/typeorm';
import { randomUUID } from 'crypto';
import { ApiKeyAudience, ensureError } from 'n8n-workflow';

import { AccessTokenRepository } from './database/repositories/oauth-access-token.repository';
import { UserWithContext } from './mcp.types';

import { JwtService } from '@/services/jwt.service';

const API_KEY_AUDIENCE: ApiKeyAudience = 'mcp-server-api';
const API_KEY_ISSUER = 'n8n';
const REDACT_API_KEY_REVEAL_COUNT = 4;
const REDACT_API_KEY_MAX_LENGTH = 10;
const API_KEY_LABEL = 'MCP Server API Key';
const REDACT_API_KEY_MIN_HIDDEN_CHARS = 6;

/**
 * Service for managing MCP server API keys, including creation, retrieval, deletion, and authentication middleware.
 */
@Service()
export class McpServerApiKeyService {
	constructor(
		private readonly apiKeyRepository: ApiKeyRepository,
		private readonly jwtService: JwtService,
		private readonly userRepository: UserRepository,
		private readonly accessTokenRepository: AccessTokenRepository,
	) {}

	async createMcpServerApiKey(user: User, trx?: EntityManager) {
		const manager = trx ?? this.apiKeyRepository.manager;

		const apiKey = this.jwtService.sign({
			sub: user.id,
			iss: API_KEY_ISSUER,
			aud: API_KEY_AUDIENCE,
			jti: randomUUID(),
		});

		const apiKeyEntity = this.apiKeyRepository.create({
			userId: user.id,
			apiKey,
			audience: API_KEY_AUDIENCE,
			scopes: [],
			label: API_KEY_LABEL,
		});

		await manager.insert(ApiKey, apiKeyEntity);

		return await manager.findOneByOrFail(ApiKey, { apiKey });
	}

	async findServerApiKeyForUser(user: User, { redact = true } = {}) {
		const apiKey = await this.apiKeyRepository.findOne({
			where: {
				userId: user.id,
				audience: API_KEY_AUDIENCE,
			},
		});

		if (apiKey && redact) {
			apiKey.apiKey = this.redactApiKey(apiKey.apiKey);
		}

		return apiKey;
	}

	async getUserForApiKey(apiKey: string) {
		return await this.userRepository.findOne({
			where: {
				apiKeys: {
					apiKey,
					audience: API_KEY_AUDIENCE,
				},
			},
			relations: ['role'],
		});
	}

	async verifyApiKey(apiKey: string): Promise<UserWithContext> {
		try {
			this.jwtService.verify(apiKey, {
				issuer: API_KEY_ISSUER,
				audience: API_KEY_AUDIENCE,
			});

			const user = await this.getUserForApiKey(apiKey);
			if (!user) {
				return {
					user: null,
					context: {
						reason: 'user_not_found',
						auth_type: 'api_key',
					},
				};
			}
			return { user };
		} catch (error) {
			const errorForSure = ensureError(error);
			return {
				user: null,
				context: {
					reason: errorForSure.name === 'JsonWebTokenError' ? 'invalid_token' : 'unknown_error',
					auth_type: 'api_key',
					error_details: errorForSure.message,
				},
			};
		}
	}

	async getUserForAccessToken(token: string) {
		const accessToken = await this.accessTokenRepository.findOne({
			where: {
				token,
			},
		});

		if (!accessToken) {
			return null;
		}

		return await this.userRepository.findOne({
			where: {
				id: accessToken.userId,
			},
			relations: ['role'],
		});
	}

	async deleteAllMcpApiKeysForUser(user: User, trx?: EntityManager) {
		const manager = trx ?? this.apiKeyRepository.manager;

		await manager.delete(ApiKey, {
			userId: user.id,
			audience: API_KEY_AUDIENCE,
		});
	}

	private redactApiKey(apiKey: string) {
		if (REDACT_API_KEY_REVEAL_COUNT >= apiKey.length - REDACT_API_KEY_MIN_HIDDEN_CHARS) {
			return '*'.repeat(apiKey.length);
		}

		const visiblePart = apiKey.slice(-REDACT_API_KEY_REVEAL_COUNT);
		const redactedPart = '*'.repeat(
			Math.max(0, REDACT_API_KEY_MAX_LENGTH - REDACT_API_KEY_REVEAL_COUNT),
		);

		return redactedPart + visiblePart;
	}

	async getOrCreateApiKey(user: User) {
		const apiKey = await this.apiKeyRepository.findOne({
			where: {
				userId: user.id,
				audience: API_KEY_AUDIENCE,
			},
		});

		if (apiKey) {
			apiKey.apiKey = this.redactApiKey(apiKey.apiKey);
			return apiKey;
		}

		return await this.createMcpServerApiKey(user);
	}

	async rotateMcpServerApiKey(user: User) {
		return await this.apiKeyRepository.manager.transaction(async (trx) => {
			await this.deleteAllMcpApiKeysForUser(user, trx);
			return await this.createMcpServerApiKey(user, trx);
		});
	}
}
