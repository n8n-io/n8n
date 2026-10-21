import {
	LIST_API_KEYS_SORT_OPTIONS,
	type ApiKeyAudience,
	type ApiKeyOwnerSummary,
} from '@n8n/api-types';
import { Service } from '@n8n/di';
import type { ApiKeyScope } from '@n8n/permissions';
import { DataSource, In, Raw, type FindOptionsWhere, type SelectQueryBuilder } from '@n8n/typeorm';

import { BaseRepository } from './base-repository';
import { ApiKey } from '../entities';
import { type OperationContext, TransactionRunner } from '../services/transaction';
import { escapeLike, LIKE_ESCAPE_CLAUSE } from '../utils/escape-like';

interface ApiKeyListFilter {
	audience: ApiKeyAudience;
	label?: string;
	userId?: string;
	ownerIds?: string[];
}

@Service()
export class ApiKeyRepository extends BaseRepository<ApiKey> {
	constructor(dataSource: DataSource, txRunner: TransactionRunner) {
		super(ApiKey, dataSource.manager, txRunner);
	}

	async findPageWithOwners(
		filter: ApiKeyListFilter,
		sortBy: string | undefined,
		page: { take?: number; skip?: number },
	) {
		const qb = this.createQueryBuilder('apiKey')
			.leftJoinAndSelect('apiKey.user', 'user')
			.setFindOptions({ where: this.listWhere(filter) });
		this.applyListSort(qb, sortBy);
		qb.take(page.take);
		qb.skip(page.skip);
		return await qb.getManyAndCount();
	}

	async countMineAndAll(
		userId: string,
		filter: ApiKeyListFilter,
		{
			canSeeAll,
			includeOthers,
			pageCount,
		}: { canSeeAll: boolean; includeOthers: boolean; pageCount?: number },
	) {
		const mineWhere = this.listWhere({ ...filter, userId });
		if (!canSeeAll) {
			const count = pageCount ?? (await this.countBy(mineWhere));
			return { mine: count, all: count };
		}
		return {
			mine: pageCount !== undefined && !includeOthers ? pageCount : await this.countBy(mineWhere),
			all:
				pageCount !== undefined && includeOthers
					? pageCount
					: await this.countBy(this.listWhere(filter)),
		};
	}

	async findOwnerSummaries(audience: ApiKeyAudience): Promise<ApiKeyOwnerSummary[]> {
		// Lowercase aliases keep raw result keys stable on both databases.
		const rows = await this.createQueryBuilder('apiKey')
			.innerJoin('apiKey.user', 'user')
			.where('apiKey.audience = :audience', { audience })
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

	async findPublicKeysForUser(userId: string, ctx: OperationContext) {
		return await this.managerFor(ctx).find(ApiKey, {
			where: { userId, audience: 'public-api' },
		});
	}

	async deleteAllPublicKeysForUser(userId: string, ctx: OperationContext) {
		const manager = this.managerFor(ctx);
		const keys = await this.findPublicKeysForUser(userId, ctx);
		return await Promise.all(keys.map(async (key) => await manager.delete(ApiKey, { id: key.id })));
	}

	async updateScopes(id: string, scopes: ApiKeyScope[], ctx: OperationContext) {
		return await this.managerFor(ctx).update(ApiKey, id, { scopes });
	}

	private listWhere(filter: ApiKeyListFilter): FindOptionsWhere<ApiKey> {
		return {
			audience: filter.audience,
			...(filter.label
				? {
						label: Raw((alias) => `LOWER(${alias}) LIKE LOWER(:label) ${LIKE_ESCAPE_CLAUSE}`, {
							label: `%${escapeLike(filter.label)}%`,
						}),
					}
				: {}),
			...(filter.userId
				? { userId: filter.userId }
				: filter.ownerIds?.length
					? { userId: In(filter.ownerIds) }
					: {}),
		};
	}

	private applyListSort(qb: SelectQueryBuilder<ApiKey>, sortBy?: string) {
		// Internal callers can bypass DTO validation.
		const valid =
			sortBy !== undefined && LIST_API_KEYS_SORT_OPTIONS.some((sort) => sort === sortBy);
		if (!valid) {
			qb.addOrderBy('apiKey.createdAt', 'DESC');
			return;
		}

		const [field, order] = sortBy.split(':');
		const direction = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

		if (field === 'scopes') {
			// Postgres stores scopes as JSON. SQLite stores scopes as text.
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
}
