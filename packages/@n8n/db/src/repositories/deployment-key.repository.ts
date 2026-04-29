import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { DeploymentKey } from '../entities/deployment-key';

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
