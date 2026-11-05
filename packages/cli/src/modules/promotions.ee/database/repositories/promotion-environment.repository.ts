import type { PromotionDirection, PromotionEnvironmentScope } from '@n8n/api-types';
import {
	BaseRepository,
	isUniqueConstraintError,
	type OperationContext,
	TransactionRunner,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, type FindOptionsWhere } from '@n8n/typeorm';

import { PromotionEnvironment } from '../entities/promotion-environment.entity';
import { PromotionConflictError } from '../promotion-conflict.error';

type NewPromotionEnvironment = Pick<
	PromotionEnvironment,
	'name' | 'scope' | 'providerId' | 'remote' | 'direction' | 'settings'
>;

export type PromotionEnvironmentFilter = {
	scope?: PromotionEnvironmentScope;
	direction?: PromotionDirection;
	providerId?: string;
};

@Service()
export class PromotionEnvironmentRepository extends BaseRepository<PromotionEnvironment> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(PromotionEnvironment, dataSource.manager, transactionRunner);
	}

	/**
	 * Loads the provider alongside the environment in one query, so an edit that
	 * lands between two reads cannot pair old credentials with a new remote.
	 */
	async findByIdWithProvider(id: string): Promise<PromotionEnvironment | null> {
		return await this.findOne({
			where: { id },
			relations: { provider: true },
		});
	}

	async findInstanceEnvironment(
		direction: PromotionDirection,
	): Promise<PromotionEnvironment | null> {
		return await this.findOne({
			where: { scope: 'instance', direction },
			relations: { provider: true },
		});
	}

	/**
	 * Only one instance environment may exist for each direction, so a second one
	 * loses to the partial unique index rather than to a count check.
	 */
	async insertEnvironment(environment: NewPromotionEnvironment): Promise<PromotionEnvironment> {
		try {
			return await this.save(this.create(environment));
		} catch (error) {
			if (isUniqueConstraintError(error)) {
				throw new PromotionConflictError(
					`The instance already has a ${environment.direction} promotion environment`,
				);
			}
			throw error;
		}
	}

	/** A remote must use the provider it was resolved against. */
	async updateEnvironment(
		id: string,
		expectedProviderId: string,
		changes: Partial<Pick<PromotionEnvironment, 'name' | 'providerId' | 'remote' | 'settings'>>,
		ctx: OperationContext,
	): Promise<boolean> {
		const result = await this.managerFor(ctx).update(
			PromotionEnvironment,
			{ id, providerId: expectedProviderId },
			changes,
		);
		return result.affected === 1;
	}

	/** Cascades to this environment's project links only. */
	/** Returns false when no row was deleted, for example after a concurrent delete. */
	async deleteEnvironment(id: string, ctx: OperationContext): Promise<boolean> {
		const result = await this.managerFor(ctx).delete(PromotionEnvironment, { id });
		return (result.affected ?? 0) > 0;
	}

	async countByProviderId(providerId: string): Promise<number> {
		return await this.count({ where: { providerId } });
	}

	async listEnvironments(options: {
		offset: number;
		limit: number;
		filter: PromotionEnvironmentFilter;
	}) {
		const where: FindOptionsWhere<PromotionEnvironment> = {};
		if (options.filter.scope) where.scope = options.filter.scope;
		if (options.filter.direction) where.direction = options.filter.direction;
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
