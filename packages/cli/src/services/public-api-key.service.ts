import type { CreateApiKeyRequestDto, UnixTimestamp, UpdateApiKeyRequestDto } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { ApiKey, ApiKeyRepository, withTransaction } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ApiKeyScope, AuthPrincipal } from '@n8n/permissions';
import { getApiKeyScopesForRole, getOwnerOnlyApiKeyScopes, hasGlobalScope } from '@n8n/permissions';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import type { EntityManager } from '@n8n/typeorm';
import { randomUUID } from 'crypto';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { JwtService } from './jwt.service';

export const API_KEY_AUDIENCE = 'public-api';
export const API_KEY_ISSUER = 'n8n';
const REDACT_API_KEY_REVEAL_COUNT = 4;
const REDACT_API_KEY_MAX_LENGTH = 10;
export const PREFIX_LEGACY_API_KEY = 'n8n_api_';

@Service()
export class PublicApiKeyService {
	constructor(
		private readonly apiKeyRepository: ApiKeyRepository,
		private readonly jwtService: JwtService,
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
			this.apiKeyRepository.create({
				userId: user.id,
				apiKey,
				label,
				scopes,
				audience: API_KEY_AUDIENCE,
			}),
		);

		return await this.apiKeyRepository.findOneByOrFail({ apiKey });
	}

	/**
	 * Retrieves a page of redacted API keys for a given user, ordered by
	 * `createdAt` descending. `count` is the total across all pages.
	 */
	async getRedactedApiKeysForUser(user: User, options: { take?: number; skip?: number } = {}) {
		const [apiKeys, count] = await this.apiKeyRepository.findAndCount({
			where: { userId: user.id, audience: API_KEY_AUDIENCE },
			relations: { user: true },
			order: { createdAt: 'DESC' },
			take: options.take,
			skip: options.skip,
		});
		return {
			items: apiKeys.map((apiKeyRecord) => this.toRedactedApiKey(apiKeyRecord)),
			count,
		};
	}

	/**
	 * Retrieves a page of every public API key on the instance, redacted,
	 * with the owner attached, ordered by `createdAt` descending. Gate
	 * callers with `apiKey:manage` at the controller layer — this method
	 * does not enforce authorization.
	 */
	async getAllRedactedApiKeys(options: { take?: number; skip?: number } = {}) {
		const [apiKeys, count] = await this.apiKeyRepository.findAndCount({
			where: { audience: API_KEY_AUDIENCE },
			relations: { user: true },
			order: { createdAt: 'DESC' },
			take: options.take,
			skip: options.skip,
		});
		return {
			items: apiKeys.map((apiKeyRecord) => this.toRedactedApiKey(apiKeyRecord)),
			count,
		};
	}

	/**
	 * Deletes an API key. The caller must either own the key or hold the
	 * `apiKey:manage` global scope (granted to owners and admins).
	 */
	async deleteApiKey(caller: User, apiKeyId: string) {
		const apiKey = await this.apiKeyRepository.findOne({
			where: { id: apiKeyId, audience: API_KEY_AUDIENCE },
		});
		if (!apiKey) throw new NotFoundError('API key not found');

		const isOwner = apiKey.userId === caller.id;
		if (!isOwner && !hasGlobalScope(caller, 'apiKey:manage')) {
			throw new ForbiddenError('Cannot delete an API key owned by another user');
		}

		await this.apiKeyRepository.delete({ id: apiKeyId });
	}

	async deleteAllApiKeysForUser(user: User, tx?: EntityManager) {
		return await withTransaction(this.apiKeyRepository.manager, tx, async (em) => {
			const userApiKeys = await em.find(ApiKey, {
				where: { userId: user.id, audience: API_KEY_AUDIENCE },
			});

			return await Promise.all(
				userApiKeys.map(async (apiKey) => await em.delete(ApiKey, { id: apiKey.id })),
			);
		});
	}

	async updateApiKeyForUser(
		user: User,
		apiKeyId: string,
		{ label, scopes }: UpdateApiKeyRequestDto,
	) {
		await this.apiKeyRepository.update({ id: apiKeyId, userId: user.id }, { label, scopes });
	}

	private toRedactedApiKey(apiKeyRecord: ApiKey) {
		const { user, ...rest } = apiKeyRecord;
		return {
			...rest,
			apiKey: this.redactApiKey(apiKeyRecord.apiKey),
			expiresAt: this.getApiKeyExpiration(apiKeyRecord.apiKey),
			owner: {
				id: user.id,
				firstName: user.firstName ?? null,
				lastName: user.lastName ?? null,
				email: user.email,
			},
		};
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

	private generateApiKey(user: User, expiresAt: UnixTimestamp) {
		const nowInSeconds = Math.floor(Date.now() / 1000);

		return this.jwtService.sign(
			{ sub: user.id, iss: API_KEY_ISSUER, aud: API_KEY_AUDIENCE, jti: randomUUID() },
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
			where: { apiKey, audience: API_KEY_AUDIENCE },
			select: { scopes: true },
		});
		if (!apiKeyData) return false;

		return apiKeyData.scopes.includes(endpointScope);
	}

	async removeOwnerOnlyScopesFromApiKeys(user: User, tx?: EntityManager) {
		const manager = tx ?? this.apiKeyRepository.manager;

		const ownerOnlyScopes = getOwnerOnlyApiKeyScopes();

		const userApiKeys = await manager.find(ApiKey, {
			where: { userId: user.id, audience: API_KEY_AUDIENCE },
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
