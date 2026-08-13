import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { DeploymentKey } from '../entities/deployment-key';

export type DeploymentKeySortField = 'createdAt' | 'updatedAt' | 'status';
export type DeploymentKeySortDirection = 'ASC' | 'DESC';

export type ListDeploymentKeysOptions = {
	type?: string;
	sortField: DeploymentKeySortField;
	sortDirection: DeploymentKeySortDirection;
	skip: number;
	take: number;
	createdAtFrom?: Date;
	createdAtTo?: Date;
};

@Service()
export class DeploymentKeyRepository extends Repository<DeploymentKey> {
	constructor(dataSource: DataSource) {
		super(DeploymentKey, dataSource.manager);
	}

	async findActiveByType(type: string): Promise<DeploymentKey | null> {
		return await this.findOne({ where: { type, status: 'active' } });
	}

	async findAllByType(type: string): Promise<DeploymentKey[]> {
		return await this.find({ where: { type } });
	}

	async findAndCountForList(
		opts: ListDeploymentKeysOptions,
	): Promise<{ items: DeploymentKey[]; count: number }> {
		const qb = this.createQueryBuilder('deploymentKey');

		if (opts.type) {
			qb.andWhere('deploymentKey.type = :type', { type: opts.type });
		}

		if (opts.createdAtFrom && opts.createdAtTo) {
			qb.andWhere('deploymentKey.createdAt BETWEEN :from AND :to', {
				from: opts.createdAtFrom,
				to: opts.createdAtTo,
			});
		} else if (opts.createdAtFrom) {
			qb.andWhere('deploymentKey.createdAt >= :from', { from: opts.createdAtFrom });
		} else if (opts.createdAtTo) {
			qb.andWhere('deploymentKey.createdAt <= :to', { to: opts.createdAtTo });
		}

		qb.orderBy(`deploymentKey.${opts.sortField}`, opts.sortDirection);

		// Stable secondary sort so pagination is deterministic when ties occur.
		if (opts.sortField !== 'createdAt') {
			qb.addOrderBy('deploymentKey.createdAt', 'DESC');
		}
		qb.addOrderBy('deploymentKey.id', 'ASC');

		qb.skip(opts.skip).take(opts.take);

		const [items, count] = await qb.getManyAndCount();
		return { items, count };
	}

	/**
	 * Inserts the entity if no active row with that type exists yet.
	 * On a unique-index conflict (concurrent multi-main startup), the insert
	 * is silently ignored. The caller should read the winner's value afterwards.
	 */
	async insertOrIgnore(
		entityData: Pick<DeploymentKey, 'type' | 'value' | 'status' | 'algorithm'>,
	): Promise<void> {
		const entity = this.create(entityData);
		await this.createQueryBuilder().insert().values(entity).orIgnore().execute();
	}

	/** Atomically deactivates any existing active key of the same type, then saves the given entity as active. */
	async insertAsActive(entity: DeploymentKey & { status: 'active' }): Promise<DeploymentKey> {
		return await this.manager.transaction(async (tx) => {
			await tx.update(
				DeploymentKey,
				{ type: entity.type, status: 'active' },
				{ status: 'inactive' },
			);
			return await tx.save(DeploymentKey, entity);
		});
	}

	/** Atomically deactivates any existing active key of the given type, then sets the target key as active. */
	async promoteToActive(id: string, type: string): Promise<void> {
		await this.manager.transaction(async (tx) => {
			const target = await tx.findOne(DeploymentKey, { where: { id, type } });
			if (!target) {
				throw new Error(`Deployment key '${id}' of type '${type}' not found`);
			}
			await tx.update(DeploymentKey, { type, status: 'active' }, { status: 'inactive' });
			await tx.update(DeploymentKey, { id, type }, { status: 'active' });
		});
	}
}
