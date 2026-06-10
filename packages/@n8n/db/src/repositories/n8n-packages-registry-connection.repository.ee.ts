import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { N8nPackagesRegistryConnection } from '../entities';

@Service()
export class N8nPackagesRegistryConnectionRepository extends Repository<N8nPackagesRegistryConnection> {
	constructor(dataSource: DataSource) {
		super(N8nPackagesRegistryConnection, dataSource.manager);
	}

	async findEnabled(): Promise<N8nPackagesRegistryConnection[]> {
		return await this.find({
			where: { isEnabled: true },
			order: { name: 'ASC' },
		});
	}

	async findEnabledById(id: string): Promise<N8nPackagesRegistryConnection | null> {
		return await this.findOne({
			where: { id, isEnabled: true },
		});
	}
}
