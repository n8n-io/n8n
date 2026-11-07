import type {
	ApiKeyAudience,
	CreateApiKeyRequestDto,
	UnixTimestamp,
	UpdateApiKeyRequestDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { ApiKey, OperationContext, User } from '@n8n/db';
import { ApiKeyRepository, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ApiKeyScope, AuthPrincipal } from '@n8n/permissions';
import { getApiKeyScopesForRole, getOwnerOnlyApiKeyScopes, hasGlobalScope } from '@n8n/permissions';
import { randomUUID } from 'crypto';

import { BadRequestError, NotFoundError } from '@n8n/errors';
import { UserManagementMailer } from '@/user-management/email';

import { JwtService } from '@n8n/backend-services';

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
		private readonly mailer: UserManagementMailer,
		private readonly logger: Logger,
		private readonly txRunner: TransactionRunner,
	) {}

	async createPublicApiKeyForUser(
		user: User,
		{ label, expiresAt, scopes }: CreateApiKeyRequestDto,
	) {
		const apiKey = this.generateApiKey(user, expiresAt);
		return await this.apiKeyRepository.createKey({
			userId: user.id,
			apiKey,
			label,
			scopes,
			audience: API_KEY_AUDIENCE,
		});
	}

	async getRedactedApiKeys(
		caller: User,
		options: {
			take?: number;
			skip?: number;
			ownership?: 'mine' | 'all';
			label?: string;
			ownerIds?: string[];
			sortBy?: string;
		} = {},
	) {
		const canSeeAll = hasGlobalScope(caller, 'apiKey:manage');
		const includeOthers = canSeeAll && options.ownership !== 'mine';
		// The owner filter only narrows the `all` view; it's meaningless for `mine`
		// and ignored for callers who can't see other users' keys.
		const ownerIds = includeOthers && options.ownerIds?.length ? options.ownerIds : undefined;
		const filter = { audience: API_KEY_AUDIENCE, label: options.label, ownerIds };
		const [apiKeys, count] = await this.apiKeyRepository.findPageWithOwners(
			{ ...filter, ...(!includeOthers ? { userId: caller.id } : {}) },
			options.sortBy,
			{ take: options.take, skip: options.skip },
		);

		// `totals` ignore the label and owner filters so tab badges + empty-state
		// CTA render against the true population; recompute only when a filter is
		// active, otherwise they equal `counts`. The counts, totals and owner list
		// are independent reads, so run them together.
		const hasNarrowing = !!options.label || !!ownerIds;
		const [counts, narrowedTotals, owners] = await Promise.all([
			this.apiKeyRepository.countMineAndAll(caller.id, filter, {
				canSeeAll,
				includeOthers,
				pageCount: count,
			}),
			hasNarrowing
				? this.apiKeyRepository.countMineAndAll(
						caller.id,
						{ audience: API_KEY_AUDIENCE },
						{ canSeeAll, includeOthers, pageCount: undefined },
					)
				: Promise.resolve(null),
			canSeeAll ? this.apiKeyRepository.findOwnerSummaries(API_KEY_AUDIENCE) : Promise.resolve([]),
		]);

		return {
			items: apiKeys.map((apiKeyRecord) => this.toRedactedApiKey(apiKeyRecord)),
			counts,
			totals: narrowedTotals ?? counts,
			owners,
		};
	}

	// 404 (not 403) when the caller can't delete the key so they can't probe
	// for the existence of another user's keys.
	async deleteApiKey(caller: User, apiKeyId: string) {
		const canDeleteAny = hasGlobalScope(caller, 'apiKey:manage');
		const apiKey = await this.apiKeyRepository.findWithOwner(
			apiKeyId,
			API_KEY_AUDIENCE,
			canDeleteAny ? undefined : caller.id,
		);
		if (!apiKey) throw new NotFoundError('API key not found');

		const { deleted } = await this.apiKeyRepository.deleteById(apiKey.id);
		if (!deleted) throw new NotFoundError('API key not found');

		const isOwn = apiKey.userId === caller.id;

		if (!isOwn) {
			this.mailer.notifyApiKeyRevoked({ apiKey, revoker: caller }).catch((e) => {
				this.logger.error('Failed to send API key revocation email', {
					apiKeyId: apiKey.id,
					ownerId: apiKey.userId,
					error: e instanceof Error ? e.message : String(e),
				});
			});
		}

		return { isOwn };
	}

	async deleteAllApiKeysForUser(user: User, ctx: OperationContext = {}) {
		return await this.txRunner.run(ctx, async (ctx) => {
			await this.apiKeyRepository.deleteAllForUser(user.id, API_KEY_AUDIENCE, ctx);
		});
	}

	async updateApiKeyForUser(
		user: User,
		apiKeyId: string,
		{ label, scopes }: UpdateApiKeyRequestDto,
	) {
		await this.apiKeyRepository.updateOwnedKey(apiKeyId, user.id, { label, scopes });
	}

	// Owner-only: re-issues the secret in place, keeping the same id, label, scopes
	// and expiry. Replacing the stored token invalidates the previous one, since
	// auth matches on the token string.
	async rotateApiKey(user: User, apiKeyId: string) {
		const apiKey = await this.apiKeyRepository.findOwnedById(apiKeyId, user.id, API_KEY_AUDIENCE);
		if (!apiKey) throw new NotFoundError('API key not found');

		const expiresAt = this.getApiKeyExpiration(apiKey.apiKey);
		if (expiresAt !== null && expiresAt <= Math.floor(Date.now() / 1000)) {
			throw new BadRequestError('Cannot rotate an expired API key');
		}

		const newApiKey = this.generateApiKey(user, expiresAt);
		await this.apiKeyRepository.updateOwnedKey(apiKey.id, user.id, {
			apiKey: newApiKey,
			lastUsedAt: null,
		});

		apiKey.apiKey = newApiKey;
		apiKey.lastUsedAt = null;
		return apiKey;
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
			'publicApiKey',
			{ sub: user.id, iss: API_KEY_ISSUER, jti: randomUUID() },
			{ ...(expiresAt && { expiresIn: expiresAt - nowInSeconds }) },
		);
	}

	getApiKeyExpiration = (apiKey: string) => {
		const decoded = this.jwtService.decodeUnverified(apiKey);
		return decoded?.exp ?? null;
	};

	apiKeyHasValidScopesForRole(role: AuthPrincipal, apiKeyScopes: ApiKeyScope[]) {
		const scopesForRole = getApiKeyScopesForRole(role);
		return apiKeyScopes.every((scope) => scopesForRole.includes(scope));
	}

	async apiKeyHasValidScopes(apiKey: string, endpointScope: ApiKeyScope) {
		const scopes = await this.apiKeyRepository.findScopesByKey(apiKey, API_KEY_AUDIENCE);
		return scopes?.includes(endpointScope) ?? false;
	}

	async removeOwnerOnlyScopesFromApiKeys(user: User, ctx: OperationContext = {}) {
		return await this.txRunner.run(ctx, async (ctx) => {
			const ownerOnlyScopes = getOwnerOnlyApiKeyScopes();
			const userApiKeys = await this.apiKeyRepository.findAllForUser(
				user.id,
				API_KEY_AUDIENCE,
				ctx,
			);
			const keysWithOwnerScopes = userApiKeys.filter((apiKey) =>
				apiKey.scopes.some((scope) => ownerOnlyScopes.includes(scope)),
			);

			return await Promise.all(
				keysWithOwnerScopes.map(
					async (currentApiKey) =>
						await this.apiKeyRepository.updateScopes(
							currentApiKey.id,
							currentApiKey.scopes.filter((scope) => !ownerOnlyScopes.includes(scope)),
							ctx,
						),
				),
			);
		});
	}
}
