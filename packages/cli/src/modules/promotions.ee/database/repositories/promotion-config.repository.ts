import type { PromotionConfigSettings, PromotionDirection } from '@n8n/api-types';
import {
	BaseRepository,
	isUniqueConstraintError,
	type OperationContext,
	TransactionRunner,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In } from '@n8n/typeorm';

import { PromotionConfig } from '../entities/promotion-config.entity';
import { PromotionConflictError } from '../promotion-conflict.error';

type NewPromotionConfig = Pick<PromotionConfig, 'connectionId' | 'name' | 'direction' | 'settings'>;

@Service()
export class PromotionConfigRepository extends BaseRepository<PromotionConfig> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(PromotionConfig, dataSource.manager, transactionRunner);
	}

	/**
	 * Loads a config with its connection and provider in one query, so an edit that
	 * lands between two reads cannot pair old credentials with a new target.
	 */
	async findResolved(
		connectionId: string,
		direction: PromotionDirection,
		ctx: OperationContext = {},
	): Promise<PromotionConfig | null> {
		return await this.managerFor(ctx).findOne(PromotionConfig, {
			where: { connectionId, direction },
			relations: { connection: { provider: true } },
		});
	}

	async findById(id: string, ctx: OperationContext = {}): Promise<PromotionConfig | null> {
		return await this.managerFor(ctx).findOne(PromotionConfig, { where: { id } });
	}

	async findByConnectionAndDirection(
		connectionId: string,
		direction: PromotionDirection,
		ctx: OperationContext = {},
	): Promise<PromotionConfig | null> {
		return await this.managerFor(ctx).findOne(PromotionConfig, {
			where: { connectionId, direction },
		});
	}

	async findByConnectionIds(
		connectionIds: string[],
		ctx: OperationContext = {},
	): Promise<PromotionConfig[]> {
		if (connectionIds.length === 0) return [];
		return await this.managerFor(ctx).find(PromotionConfig, {
			where: { connectionId: In(connectionIds) },
			order: { direction: 'ASC' },
		});
	}

	/**
	 * Two clients can both find no config and both insert. The unique index on
	 * (connectionId, direction) rejects the second one.
	 */
	async insertConfig(
		config: NewPromotionConfig,
		ctx: OperationContext = {},
	): Promise<PromotionConfig> {
		try {
			return await this.managerFor(ctx).save(PromotionConfig, this.create(config));
		} catch (error) {
			if (isUniqueConstraintError(error)) {
				throw new PromotionConflictError(
					'config-direction',
					`This connection already has a ${config.direction} configuration`,
				);
			}
			throw error;
		}
	}

	/** A write replaces the whole config, so both fields are always supplied. */
	async replaceConfig(
		id: string,
		changes: { name: string; settings: PromotionConfigSettings },
		ctx: OperationContext = {},
	): Promise<void> {
		await this.managerFor(ctx).update(PromotionConfig, { id }, changes);
	}

	async deleteConfig(id: string): Promise<void> {
		await this.delete({ id });
	}
}
