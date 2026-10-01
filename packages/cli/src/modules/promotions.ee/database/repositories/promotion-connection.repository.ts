import type { PromotionConnectionScope } from '@n8n/api-types';
import {
	BaseRepository,
	isUniqueConstraintError,
	type OperationContext,
	TransactionRunner,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, type FindOptionsWhere } from '@n8n/typeorm';

import { PromotionConnection } from '../entities/promotion-connection.entity';
import { PromotionConflictError } from '../promotion-conflict.error';

type NewPromotionConnection = Pick<PromotionConnection, 'name' | 'scope' | 'providerId' | 'target'>;

export type PromotionConnectionFilter = {
	scope?: PromotionConnectionScope;
	providerId?: string;
};

@Service()
export class PromotionConnectionRepository extends BaseRepository<PromotionConnection> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(PromotionConnection, dataSource.manager, transactionRunner);
	}

	/** Loads the provider alongside the connection, so callers never lazy-load it. */
	async findByIdWithProvider(
		id: string,
		ctx: OperationContext = {},
	): Promise<PromotionConnection | null> {
		return await this.managerFor(ctx).findOne(PromotionConnection, {
			where: { id },
			relations: { provider: true },
		});
	}

	async findInstanceConnection(ctx: OperationContext = {}): Promise<PromotionConnection | null> {
		return await this.managerFor(ctx).findOne(PromotionConnection, {
			where: { scope: 'instance' },
			relations: { provider: true },
		});
	}

	/**
	 * Only one instance connection may exist, so a second one loses to the partial
	 * unique index rather than to a count check.
	 */
	async insertConnection(
		connection: NewPromotionConnection,
		ctx: OperationContext = {},
	): Promise<PromotionConnection> {
		try {
			return await this.managerFor(ctx).save(PromotionConnection, this.create(connection));
		} catch (error) {
			if (isUniqueConstraintError(error)) {
				throw new PromotionConflictError(
					'instance-connection',
					'An instance promotion connection already exists',
				);
			}
			throw error;
		}
	}

	/** Scope is immutable, so it is not accepted here. */
	async updateConnection(
		id: string,
		changes: Partial<Pick<PromotionConnection, 'name' | 'providerId' | 'target'>>,
	): Promise<void> {
		await this.update({ id }, changes);
	}

	/** Cascades to this connection's configs and project links only. */
	async deleteConnection(id: string): Promise<void> {
		await this.delete({ id });
	}

	async countByProviderId(providerId: string): Promise<number> {
		return await this.count({ where: { providerId } });
	}

	async listConnections(options: {
		offset: number;
		limit: number;
		filter: PromotionConnectionFilter;
	}) {
		const where: FindOptionsWhere<PromotionConnection> = {};
		if (options.filter.scope) where.scope = options.filter.scope;
		if (options.filter.providerId) where.providerId = options.filter.providerId;

		// TypeORM omits the LIMIT clause when `take` is falsy, so `take: 0` would
		// return every row instead of none. Short-circuit to honor the limit.
		if (options.limit <= 0) return { count: await this.count({ where }), data: [] };

		const [data, count] = await this.findAndCount({
			where,
			relations: { provider: true },
			order: { id: 'ASC' },
			skip: options.offset,
			take: options.limit,
		});
		return { count, data };
	}
}
