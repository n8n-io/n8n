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

export type NewApiKey = Pick<ApiKey, 'userId' | 'apiKey' | 'label' | 'scopes' | 'audience'>;

export type ApiKeyChanges = Partial<Pick<ApiKey, 'label' | 'scopes' | 'apiKey' | 'lastUsedAt'>>;

// Private to this file. Only the table touches the TypeORM manager.
class ApiKeyTable extends BaseRepository<ApiKey> {
	constructor(dataSource: DataSource, txRunner: TransactionRunner) {
		super(ApiKey, dataSource.manager, txRunner);
	}

	override managerFor(ctx: OperationContext) {
		return super.managerFor(ctx);
	}
}

@Service()
export class ApiKeyRepository {
	private readonly table: ApiKeyTable;

	constructor(dataSource: DataSource, txRunner: TransactionRunner) {
		this.table = new ApiKeyTable(dataSource, txRunner);
	}

	/** Inserts an entity instance so the `@BeforeInsert` id generator runs. */
	async createKey(key: NewApiKey, ctx: OperationContext = {}): Promise<ApiKey> {
		const manager = this.table.managerFor(ctx);
		await manager.insert(ApiKey, this.table.create(key));
		return await manager.findOneByOrFail(ApiKey, { apiKey: key.apiKey });
	}

	async findByIdOrFail(id: string, ctx: OperationContext = {}): Promise<ApiKey> {
		return await this.table.managerFor(ctx).findOneByOrFail(ApiKey, { id });
	}

	async findByUserId(userId: string, ctx: OperationContext = {}): Promise<ApiKey[]> {
		return await this.table.managerFor(ctx).findBy(ApiKey, { userId });
	}

	async findByUserAndAudience(
		userId: string,
		audience: ApiKeyAudience,
		ctx: OperationContext = {},
	): Promise<ApiKey | null> {
		return await this.table.managerFor(ctx).findOneBy(ApiKey, { userId, audience });
	}

	async findAllForUser(
		userId: string,
		audience: ApiKeyAudience,
		ctx: OperationContext = {},
	): Promise<ApiKey[]> {
		return await this.table.managerFor(ctx).findBy(ApiKey, { userId, audience });
	}

	/** The key with its owner loaded. `ownerId` narrows the lookup to that user's keys. */
	async findWithOwner(
		id: string,
		audience: ApiKeyAudience,
		ownerId?: string,
		ctx: OperationContext = {},
	): Promise<ApiKey | null> {
		return await this.table.managerFor(ctx).findOne(ApiKey, {
			where: { id, audience, ...(ownerId ? { userId: ownerId } : {}) },
			relations: { user: true },
		});
	}

	async findOwnedById(
		id: string,
		userId: string,
		audience: ApiKeyAudience,
		ctx: OperationContext = {},
	): Promise<ApiKey | null> {
		return await this.table.managerFor(ctx).findOneBy(ApiKey, { id, userId, audience });
	}

	/** The key with its owner and the owner's role loaded, for authentication. */
	async findByKeyWithUser(
		apiKey: string,
		audience: ApiKeyAudience,
		ctx: OperationContext = {},
	): Promise<ApiKey | null> {
		return await this.table.managerFor(ctx).findOne(ApiKey, {
			where: { apiKey, audience },
			relations: { user: { role: true } },
		});
	}

	async findScopesByKey(
		apiKey: string,
		audience: ApiKeyAudience,
		ctx: OperationContext = {},
	): Promise<ApiKeyScope[] | null> {
		const key = await this.table.managerFor(ctx).findOne(ApiKey, {
			where: { apiKey, audience },
			select: { scopes: true },
		});
		return key?.scopes ?? null;
	}

	async findPageWithOwners(
		filter: ApiKeyListFilter,
		sortBy: string | undefined,
		page: { take?: number; skip?: number },
		ctx: OperationContext = {},
	) {
		const qb = this.table
			.managerFor(ctx)
			.createQueryBuilder(ApiKey, 'apiKey')
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
		ctx: OperationContext = {},
	) {
		const manager = this.table.managerFor(ctx);
		const mineWhere = this.listWhere({ ...filter, userId });
		if (!canSeeAll) {
			const count = pageCount ?? (await manager.countBy(ApiKey, mineWhere));
			return { mine: count, all: count };
		}
		return {
			mine:
				pageCount !== undefined && !includeOthers
					? pageCount
					: await manager.countBy(ApiKey, mineWhere),
			all:
				pageCount !== undefined && includeOthers
					? pageCount
					: await manager.countBy(ApiKey, this.listWhere(filter)),
		};
	}

	async findOwnerSummaries(
		audience: ApiKeyAudience,
		ctx: OperationContext = {},
	): Promise<ApiKeyOwnerSummary[]> {
		// Lowercase aliases keep raw result keys stable on both databases.
		const rows = await this.table
			.managerFor(ctx)
			.createQueryBuilder(ApiKey, 'apiKey')
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

	async updateOwnedKey(
		id: string,
		userId: string,
		changes: ApiKeyChanges,
		ctx: OperationContext = {},
	): Promise<void> {
		await this.table.managerFor(ctx).update(ApiKey, { id, userId }, changes);
	}

	async updateLastUsedAt(id: string, lastUsedAt: Date, ctx: OperationContext = {}) {
		await this.table.managerFor(ctx).update(ApiKey, { id }, { lastUsedAt });
	}

	async updateScopes(id: string, scopes: ApiKeyScope[], ctx: OperationContext = {}) {
		await this.table.managerFor(ctx).update(ApiKey, id, { scopes });
	}

	async deleteById(id: string, ctx: OperationContext = {}): Promise<{ deleted: number }> {
		const result = await this.table.managerFor(ctx).delete(ApiKey, { id });
		return { deleted: result.affected ?? 0 };
	}

	async deleteAllForUser(
		userId: string,
		audience: ApiKeyAudience,
		ctx: OperationContext = {},
	): Promise<void> {
		await this.table.managerFor(ctx).delete(ApiKey, { userId, audience });
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
