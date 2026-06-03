import type {
	ApiKeyAudience,
	CreateApiKeyRequestDto,
	UnixTimestamp,
	UpdateApiKeyRequestDto,
} from '@n8n/api-types';
import { LIST_API_KEYS_SORT_OPTIONS } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { ApiKey, ApiKeyRepository, withTransaction } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ApiKeyScope, AuthPrincipal } from '@n8n/permissions';
import { getApiKeyScopesForRole, getOwnerOnlyApiKeyScopes, hasGlobalScope } from '@n8n/permissions';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import {
	Raw,
	type EntityManager,
	type FindOptionsWhere,
	type SelectQueryBuilder,
} from '@n8n/typeorm';
import { randomUUID } from 'crypto';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

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
		const baseWhere = { audience: API_KEY_AUDIENCE, ...labelFilter };

		const qb = this.apiKeyRepository
			.createQueryBuilder('apiKey')
			.leftJoinAndSelect('apiKey.user', 'user')
			.setFindOptions({ where: { ...baseWhere, ...(includeOthers ? {} : ownFilter) } });
		this.applyApiKeyListSort(qb, options.sortBy);
		qb.take(options.take);
		qb.skip(options.skip);

		const [apiKeys, count] = await qb.getManyAndCount();
		const counts = await this.countApiKeys(caller, { ...baseWhere, ...ownFilter }, baseWhere, {
			canSeeAll,
			includeOthers,
			pageCount: count,
		});
		// `totals` equal `counts` without a label filter; otherwise issue the
		// unfiltered counts so tab badges + empty-state CTA can render against
		// the true population.
		const totals = options.label
			? await this.countApiKeys(
					caller,
					{ audience: API_KEY_AUDIENCE, ...ownFilter },
					{ audience: API_KEY_AUDIENCE },
					{ canSeeAll, includeOthers, pageCount: undefined },
				)
			: counts;

		return {
			items: apiKeys.map((apiKeyRecord) => this.toRedactedApiKey(apiKeyRecord)),
			counts,
			totals,
		};
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
