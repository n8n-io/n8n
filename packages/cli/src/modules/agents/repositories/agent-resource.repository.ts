import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { AgentResourceEntity } from '../entities/agent-resource.entity';

@Service()
export class AgentResourceRepository extends Repository<AgentResourceEntity> {
	constructor(dataSource: DataSource) {
		super(AgentResourceEntity, dataSource.manager);
	}

	async ensureExists(resourceId: string): Promise<void> {
		// Concurrent callers can create the same resource. Keep the first row.
		await this.createQueryBuilder()
			.insert()
			.into(AgentResourceEntity)
			.values({ id: resourceId, metadata: null })
			.orIgnore()
			.execute();
	}
}
