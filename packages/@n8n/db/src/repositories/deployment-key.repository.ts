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
	 * On a unique-index conflict (e.g. concurrent multi-main startup), the insert is
	 * silently ignored and null is returned so the caller can read the winner's value.
	 */
	async insertOrIgnore(
		entityData: Pick<DeploymentKey, 'type' | 'value' | 'status' | 'algorithm'>,
	): Promise<Pick<DeploymentKey, 'value'> | null> {
		const entity = this.create(entityData);
		const result = await this.createQueryBuilder()
			.insert()
			.values(entity)
			.orIgnore()
			.returning('*')
			.execute();
		const row: unknown = result.raw[0];
		if (
			typeof row === 'object' &&
			row !== null &&
			'value' in row &&
			typeof row.value === 'string'
		) {
			return { value: row.value };
		}
		return null;
	}
}
