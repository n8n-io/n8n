import type {
	ApiKeyAudience,
	CreateApiKeyRequestDto,
	UnixTimestamp,
	UpdateApiKeyRequestDto,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import { ApiKey, ApiKeyRepository, withTransaction } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ApiKeyScope, AuthPrincipal } from '@n8n/permissions';
import { getApiKeyScopesForRole, getOwnerOnlyApiKeyScopes, hasGlobalScope } from '@n8n/permissions';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { Raw, type EntityManager } from '@n8n/typeorm';
import { randomUUID } from 'crypto';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { JwtService } from './jwt.service';

export const API_KEY_AUDIENCE: ApiKeyAudience = 'public-api';
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
	 * Retrieves a page of redacted API keys with owner info attached, ordered
	 * by `createdAt` descending. Returns every key on the instance for callers
	 * with `apiKey:manage` (owners and admins); otherwise scopes to the
	 * caller's own keys. Admins can narrow to their own keys with
	 * `ownership: 'mine'`. `counts` carries the cross-page totals for both
	 * ownership filters — `counts[ownership]` is the total for the requested
	 * page, and the other lets callers render Mine/All tab badges without a
	 * second request.
	 */
	async getRedactedApiKeys(
		caller: User,
		options: {
			take?: number;
			skip?: number;
			ownership?: 'mine' | 'all';
			label?: string;
		} = {},
	) {
		const canSeeAll = hasGlobalScope(caller, 'apiKey:manage');
		const includeOthers = canSeeAll && options.ownership !== 'mine';
		const ownFilter = { userId: caller.id };
		const labelFilter = options.label
			? {
					label: Raw((alias) => `LOWER(${alias}) LIKE LOWER(:label)`, {
						label: `%${options.label}%`,
					}),
				}
			: {};
		const baseWhere = { audience: API_KEY_AUDIENCE, ...labelFilter };

		const [apiKeys, count] = await this.apiKeyRepository.findAndCount({
			where: { ...baseWhere, ...(includeOthers ? {} : ownFilter) },
			relations: { user: true },
			order: { createdAt: 'DESC' },
			take: options.take,
			skip: options.skip,
		});

		// For non-admins the `mine` and `all` totals are identical, so we
		// reuse `count` and skip the extra COUNT query.
		const counts = canSeeAll
			? {
					mine: includeOthers
						? await this.apiKeyRepository.countBy({ ...baseWhere, ...ownFilter })
						: count,
					all: includeOthers ? count : await this.apiKeyRepository.countBy(baseWhere),
				}
			: { mine: count, all: count };

		return {
			items: apiKeys.map((apiKeyRecord) => this.toRedactedApiKey(apiKeyRecord)),
			counts,
		};
	}

	/**
	 * Deletes an API key. The caller must either own the key or hold the
	 * `apiKey:manage` global scope (granted to owners and admins). When
	 * neither condition matches we return 404 rather than 403 so the caller
	 * cannot probe for the existence of another user's key.
	 */
	async deleteApiKey(caller: User, apiKeyId: string) {
		const canDeleteAny = hasGlobalScope(caller, 'apiKey:manage');
		const result = await this.apiKeyRepository.delete({
			id: apiKeyId,
			audience: API_KEY_AUDIENCE,
			...(canDeleteAny ? {} : { userId: caller.id }),
		});
		if (!result.affected) throw new NotFoundError('API key not found');
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
