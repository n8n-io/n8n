import type { CreateApiKeyRequestDto, UnixTimestamp, UpdateApiKeyRequestDto } from '@n8n/api-types';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { ApiKey, ApiKeyRepository, UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ApiKeyScope, AuthPrincipal } from '@n8n/permissions';
import { getApiKeyScopesForRole, getOwnerOnlyApiKeyScopes } from '@n8n/permissions';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import type { EntityManager } from '@n8n/typeorm';
import type { NextFunction, Request, Response } from 'express';
import { TokenExpiredError } from 'jsonwebtoken';
import type { OpenAPIV3 } from 'openapi-types';

import { EventService } from '@/events/event.service';

import { JwtService } from './jwt.service';
import { LastActiveAtService } from './last-active-at.service';

const API_KEY_AUDIENCE = 'public-api';
const API_KEY_ISSUER = 'n8n';
const REDACT_API_KEY_REVEAL_COUNT = 4;
const REDACT_API_KEY_MAX_LENGTH = 10;
const PREFIX_LEGACY_API_KEY = 'n8n_api_';

@Service()
export class PublicApiKeyService {
	constructor(
		private readonly apiKeyRepository: ApiKeyRepository,
		private readonly userRepository: UserRepository,
		private readonly jwtService: JwtService,
		private readonly eventService: EventService,
		private readonly lastActiveAtService: LastActiveAtService,
	) {}

	/**
	 * Creates a new public API key for the specified user.
	 * @param user - The user for whom the API key is being created.
	 */
	async createPublicApiKeyForUser(
		user: User,
		{ label, expiresAt, scopes }: CreateApiKeyRequestDto,
	) {
		const apiKey = this.generateApiKey(user, expiresAt);
		await this.apiKeyRepository.insert(
			// @ts-ignore CAT-957
			this.apiKeyRepository.create({
				userId: user.id,
				apiKey,
				label,
				scopes,
			}),
		);

		return await this.apiKeyRepository.findOneByOrFail({ apiKey });
	}

	/**
	 * Retrieves and redacts API keys for a given user.
	 * @param user - The user for whom to retrieve and redact API keys.
	 */
	async getRedactedApiKeysForUser(user: User) {
		const apiKeys = await this.apiKeyRepository.findBy({ userId: user.id });
		return apiKeys.map((apiKeyRecord) => ({
			...apiKeyRecord,
			apiKey: this.redactApiKey(apiKeyRecord.apiKey),
			expiresAt: this.getApiKeyExpiration(apiKeyRecord.apiKey),
		}));
	}

	async deleteApiKeyForUser(user: User, apiKeyId: string) {
		await this.apiKeyRepository.delete({ userId: user.id, id: apiKeyId });
	}

	async updateApiKeyForUser(
		user: User,
		apiKeyId: string,
		{ label, scopes }: UpdateApiKeyRequestDto,
	) {
		await this.apiKeyRepository.update({ id: apiKeyId, userId: user.id }, { label, scopes });
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

	/**
	 * Redacts an API key by replacing a portion of it with asterisks.
	 *
	 * @example
	 * ```typescript
	 * const redactedKey = PublicApiKeyService.redactApiKey('12345-abcdef-67890');
	 * console.log(redactedKey); // Output: '*****-67890'
	 * ```
	 */
	redactApiKey(apiKey: string) {
		const visiblePart = apiKey.slice(-REDACT_API_KEY_REVEAL_COUNT);
		const redactedPart = '*'.repeat(
			Math.max(0, REDACT_API_KEY_MAX_LENGTH - REDACT_API_KEY_REVEAL_COUNT),
		);

		return redactedPart + visiblePart;
	}

	getAuthMiddleware(version: string) {
		return async (
			req: AuthenticatedRequest,
			_scopes: unknown,
			schema: OpenAPIV3.ApiKeySecurityScheme,
		): Promise<boolean> => {
			const providedApiKey = req.headers[schema.name.toLowerCase()] as string;

			const user = await this.getUserForApiKey(providedApiKey);

			if (!user) return false;

			if (user.disabled) return false;

			// Legacy API keys are not JWTs and do not need to be verified.
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

			this.eventService.emit('public-api-invoked', {
				userId: user.id,
				path: req.path,
				method: req.method,
				apiVersion: version,
			});

			req.user = user;

			// TODO: ideally extract that to a dedicated middleware, but express-openapi-validator
			// does not support middleware between authentication and operators
			void this.lastActiveAtService.updateLastActiveIfStale(user.id);

			return true;
		};
	}

	private generateApiKey(user: User, expiresAt: UnixTimestamp) {
		const nowInSeconds = Math.floor(Date.now() / 1000);

		return this.jwtService.sign(
			{ sub: user.id, iss: API_KEY_ISSUER, aud: API_KEY_AUDIENCE },
			{ ...(expiresAt && { expiresIn: expiresAt - nowInSeconds }) },
		);
	}

	private getApiKeyExpiration = (apiKey: string) => {
		const decoded = this.jwtService.decode(apiKey);
		return decoded?.exp ?? null;
	};

	apiKeyHasValidScopesForRole(role: AuthPrincipal, apiKeyScopes: ApiKeyScope[]) {
		const scopesForRole = getApiKeyScopesForRole(role);
		return apiKeyScopes.every((scope) => scopesForRole.includes(scope));
	}

	async apiKeyHasValidScopes(apiKey: string, endpointScope: ApiKeyScope) {
		const apiKeyData = await this.apiKeyRepository.findOne({
			where: { apiKey },
			select: { scopes: true },
		});
		if (!apiKeyData) return false;

		return apiKeyData.scopes.includes(endpointScope);
	}

	getApiKeyScopeMiddleware(endpointScope: ApiKeyScope) {
		return async (req: Request, res: Response, next: NextFunction) => {
			const apiKey = req.headers['x-n8n-api-key'];

			if (apiKey === undefined || typeof apiKey !== 'string') {
				res.status(401).json({ message: 'Unauthorized' });
				return;
			}

			const valid = await this.apiKeyHasValidScopes(apiKey, endpointScope);

			if (!valid) {
				res.status(403).json({ message: 'Forbidden' });
				return;
			}
			next();
		};
	}

	async removeOwnerOnlyScopesFromApiKeys(user: User, tx?: EntityManager) {
		const manager = tx ?? this.apiKeyRepository.manager;

		const ownerOnlyScopes = getOwnerOnlyApiKeyScopes();

		const userApiKeys = await manager.find(ApiKey, {
			where: { userId: user.id },
		});

		const keysWithOwnerScopes = userApiKeys.filter((apiKey) =>
			apiKey.scopes.some((scope) => ownerOnlyScopes.includes(scope)),
		);

		return await Promise.all(
			keysWithOwnerScopes.map(
				async (currentApiKey) =>
					await manager.update(ApiKey, currentApiKey.id, {
						scopes: currentApiKey.scopes.filter((scope) => !ownerOnlyScopes.includes(scope)),
					}),
			),
		);
	}
}
