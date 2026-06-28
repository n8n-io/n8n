import type {
	ApiKeyAudience,
	ApiKeyOwnerSummary,
	CreateApiKeyRequestDto,
	UnixTimestamp,
	UpdateApiKeyRequestDto,
} from '@n8n/api-types';
import { LIST_API_KEYS_SORT_OPTIONS } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { ApiKey, ApiKeyRepository, withTransaction } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ApiKeyScope, AuthPrincipal } from '@n8n/permissions';
import { getApiKeyScopesForRole, getOwnerOnlyApiKeyScopes, hasGlobalScope } from '@n8n/permissions';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import {
	In,
	Raw,
	type EntityManager,
	type FindOptionsWhere,
	type SelectQueryBuilder,
} from '@n8n/typeorm';
import { randomUUID } from 'crypto';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { UserManagementMailer } from '@/user-management/email';

import { JwtService } from './jwt.service';

export const API_KEY_AUDIENCE: ApiKeyAudience = 'public-api';
export const API_KEY_ISSUER = 'n8n';
const REDACT_API_KEY_REVEAL_COUNT = 4;
const REDACT_API_KEY_MAX_LENGTH = 10;
export const PREFIX_LEGACY_API_KEY = 'n8n_api_';

// Pair with `ESCAPE '\\'` on the SQL side to keep `%`/`_`/`\` literal in user input.
const escapeLikePattern = (value: string): string => value.replace(/[\\%_]/g, '\\$&');

@Service()
export class PublicApiKeyService {
	constructor(
		private readonly apiKeyRepository: ApiKeyRepository,
		private readonly jwtService: JwtService,
		private readonly mailer: UserManagementMailer,
		private readonly logger: Logger,
	) {}

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
		const ownFilter = { userId: caller.id };
		const labelFilter = options.label
			? {
					label: Raw((alias) => `LOWER(${alias}) LIKE LOWER(:label) ESCAPE '\\'`, {
						label: `%${escapeLikePattern(options.label)}%`,
					}),
				}
			: {};
		// The owner filter only narrows the `all` view; it's meaningless for `mine`
		// and ignored for callers who can't see other users' keys.
		const ownerIds = includeOthers && options.ownerIds?.length ? options.ownerIds : undefined;
		const ownerIdsFilter = ownerIds ? { userId: In(ownerIds) } : {};
		const baseWhere = { audience: API_KEY_AUDIENCE, ...labelFilter };
		const pageWhere = includeOthers
			? { ...baseWhere, ...ownerIdsFilter }
			: { ...baseWhere, ...ownFilter };

		const qb = this.apiKeyRepository
			.createQueryBuilder('apiKey')
			.leftJoinAndSelect('apiKey.user', 'user')
			.setFindOptions({ where: pageWhere });
		this.applyApiKeyListSort(qb, options.sortBy);
		qb.take(options.take);
		qb.skip(options.skip);

		const [apiKeys, count] = await qb.getManyAndCount();

		// `totals` ignore the label and owner filters so tab badges + empty-state
		// CTA render against the true population; recompute only when a filter is
		// active, otherwise they equal `counts`. The counts, totals and owner list
		// are independent reads, so run them together.
		const hasNarrowing = !!options.label || !!ownerIds;
		const [counts, narrowedTotals, owners] = await Promise.all([
			this.countApiKeys(
				caller,
				{ ...baseWhere, ...ownFilter },
				{ ...baseWhere, ...ownerIdsFilter },
				{ canSeeAll, includeOthers, pageCount: count },
			),
			hasNarrowing
				? this.countApiKeys(
						caller,
						{ audience: API_KEY_AUDIENCE, ...ownFilter },
						{ audience: API_KEY_AUDIENCE },
						{ canSeeAll, includeOthers, pageCount: undefined },
					)
				: Promise.resolve(null),
			canSeeAll ? this.getApiKeyOwners() : Promise.resolve([]),
		]);

		return {
			items: apiKeys.map((apiKeyRecord) => this.toRedactedApiKey(apiKeyRecord)),
			counts,
			totals: narrowedTotals ?? counts,
			owners,
		};
	}

	// Distinct owners holding at least one key in the `all` population, with
	// their key counts, used to populate the owner filter. Ignores label/owner
	// narrowing on purpose so the option list stays stable as the caller toggles
	// the filter.
	private async getApiKeyOwners(): Promise<ApiKeyOwnerSummary[]> {
		// Aggregate in SQL rather than loading every key row to dedupe in JS.
		// Lowercase aliases keep the raw result keys stable across Postgres and
		// sqlite.
		const rows = await this.apiKeyRepository
			.createQueryBuilder('apiKey')
			.innerJoin('apiKey.user', 'user')
			.where('apiKey.audience = :audience', { audience: API_KEY_AUDIENCE })
			.select('user.id', 'id')
			.addSelect('user.firstName', 'first_name')
			.addSelect('user.lastName', 'last_name')
			.addSelect('user.email', 'email')
			.addSelect('COUNT(apiKey.id)', 'key_count')
			.groupBy('user.id')
			.addGroupBy('user.firstName')
			.addGroupBy('user.lastName')
			.addGroupBy('user.email')
			.getRawMany<{
				id: string;
				first_name: string | null;
				last_name: string | null;
				email: string;
				key_count: string | number;
			}>();

		return rows.map((row) => ({
			id: row.id,
			firstName: row.first_name ?? null,
			lastName: row.last_name ?? null,
			email: row.email,
			keyCount: Number(row.key_count),
		}));
	}

	// For non-admins the two counts are identical; the page total can be reused
	// when it matches the shape we'd otherwise query separately.
	private async countApiKeys(
		_caller: User,
		mineWhere: FindOptionsWhere<ApiKey>,
		allWhere: FindOptionsWhere<ApiKey>,
		{
			canSeeAll,
			includeOthers,
			pageCount,
		}: { canSeeAll: boolean; includeOthers: boolean; pageCount?: number },
	) {
		if (!canSeeAll) {
			const count = pageCount ?? (await this.apiKeyRepository.countBy(mineWhere));
			return { mine: count, all: count };
		}
		return {
			mine:
				pageCount !== undefined && !includeOthers
					? pageCount
					: await this.apiKeyRepository.countBy(mineWhere),
			all:
				pageCount !== undefined && includeOthers
					? pageCount
					: await this.apiKeyRepository.countBy(allWhere),
		};
	}

	// `sortBy` is validated by the DTO; the allow-list here keeps the SQL safe
	// against bypasses (tests, internal callers) that build options by hand.
	private applyApiKeyListSort(qb: SelectQueryBuilder<ApiKey>, sortBy?: string) {
		const allowList = LIST_API_KEYS_SORT_OPTIONS as readonly string[];
		const valid = sortBy !== undefined && allowList.includes(sortBy);
		if (!valid) {
			qb.addOrderBy('apiKey.createdAt', 'DESC');
			return;
		}

		const [field, order] = sortBy.split(':');
		const direction = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

		if (field === 'scopes') {
			// Raw expressions aren't auto-quoted, and `scopes` is `json` on Postgres
			// but text-backed on sqlite — quote the alias and cast through text on PG.
			const isPostgres = qb.connection.options.type === 'postgres';
			const scopesText = isPostgres ? '"apiKey"."scopes"::text' : 'apiKey.scopes';
			const scopesCountExpr = `CASE WHEN ${scopesText} = '[]' THEN 0 ELSE LENGTH(${scopesText}) - LENGTH(REPLACE(${scopesText}, ',', '')) + 1 END`;
			qb.addSelect(scopesCountExpr, 'scopes_count');
			qb.addOrderBy('scopes_count', direction);
		} else {
			qb.addOrderBy(`apiKey.${field}`, direction);
		}

		if (field !== 'createdAt') qb.addOrderBy('apiKey.createdAt', 'DESC');
	}

	// 404 (not 403) when the caller can't delete the key so they can't probe
	// for the existence of another user's keys.
	async deleteApiKey(caller: User, apiKeyId: string) {
		const canDeleteAny = hasGlobalScope(caller, 'apiKey:manage');
		const apiKey = await this.apiKeyRepository.findOne({
			where: {
				id: apiKeyId,
				audience: API_KEY_AUDIENCE,
				...(canDeleteAny ? {} : { userId: caller.id }),
			},
			relations: { user: true },
		});
		if (!apiKey) throw new NotFoundError('API key not found');

		const result = await this.apiKeyRepository.delete({ id: apiKey.id });
		if (!result.affected) throw new NotFoundError('API key not found');

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

	// Owner-only: re-issues the secret in place, keeping the same id, label, scopes
	// and expiry. Replacing the stored token invalidates the previous one, since
	// auth matches on the token string.
	async rotateApiKey(user: User, apiKeyId: string) {
		const apiKey = await this.apiKeyRepository.findOne({
			where: { id: apiKeyId, userId: user.id, audience: API_KEY_AUDIENCE },
		});
		if (!apiKey) throw new NotFoundError('API key not found');

		const expiresAt = this.getApiKeyExpiration(apiKey.apiKey);
		if (expiresAt !== null && expiresAt <= Math.floor(Date.now() / 1000)) {
			throw new BadRequestError('Cannot rotate an expired API key');
		}

		const newApiKey = this.generateApiKey(user, expiresAt);
		await this.apiKeyRepository.update(
			{ id: apiKey.id, userId: user.id },
			{ apiKey: newApiKey, lastUsedAt: null },
		);

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
			{ sub: user.id, iss: API_KEY_ISSUER, aud: API_KEY_AUDIENCE, jti: randomUUID() },
			{ ...(expiresAt && { expiresIn: expiresAt - nowInSeconds }) },
		);
	}

	getApiKeyExpiration = (apiKey: string) => {
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
