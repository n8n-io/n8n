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
}
