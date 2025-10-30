import { ApiKey, ApiKeyRepository, AuthenticatedRequest, User, UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { EntityManager } from '@n8n/typeorm';
import { randomUUID } from 'crypto';
import { NextFunction, Response, Request } from 'express';
import { ApiKeyAudience } from 'n8n-workflow';

import { USER_CONNECTED_TO_MCP_EVENT, UNAUTHORIZED_ERROR_MESSAGE } from './mcp.constants';
import { getClientInfo } from './mcp.utils';
import { AccessTokenRepository } from './oauth-access-token.repository';

import { AuthError } from '@/errors/response-errors/auth.error';
import { JwtService } from '@/services/jwt.service';
import { Telemetry } from '@/telemetry';

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
		private readonly telemetry: Telemetry,
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

	private async getUserForApiKey(apiKey: string) {
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

	private async getUserForAccessToken(token: string) {
		const accessToken = await this.accessTokenRepository.findOne({
			where: {
				token,
				revoked: false,
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
				this.responseWithUnauthorized(res, req);
				return;
			}

			const token = this.extractAPIKeyFromHeader(authorizationHeader);

			if (!token) {
				this.responseWithUnauthorized(res, req);
				return;
			}

			// Try to validate as API key first
			let user = await this.getUserForApiKey(token);

			if (user) {
				// Validate JWT for API key
				try {
					this.jwtService.verify(token, {
						issuer: API_KEY_ISSUER,
						audience: API_KEY_AUDIENCE,
					});
					(req as AuthenticatedRequest).user = user;
					next();
					return;
				} catch (e) {
					// JWT verification failed, continue to try OAuth token
				}
			}

			// Try to validate as OAuth access token
			user = await this.getUserForAccessToken(token);

			if (!user) {
				this.responseWithUnauthorized(res, req);
				return;
			}

			(req as AuthenticatedRequest).user = user;

			next();
		};
	}

	private responseWithUnauthorized(res: Response, req: Request) {
		this.trackUnauthorizedEvent(req);
		res.status(401).send({ message: UNAUTHORIZED_ERROR_MESSAGE });
	}

	private trackUnauthorizedEvent(req: Request) {
		const clientInfo = getClientInfo(req);
		this.telemetry.track(USER_CONNECTED_TO_MCP_EVENT, {
			mcp_connection_status: 'error',
			error: UNAUTHORIZED_ERROR_MESSAGE,
			client_name: clientInfo?.name,
			client_version: clientInfo?.version,
		});
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
