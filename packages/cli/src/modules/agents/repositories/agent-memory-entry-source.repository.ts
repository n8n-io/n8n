import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { AgentMemoryEntrySourceEntity } from '../entities/agent-memory-entry-source.entity';

@Service()
export class AgentMemoryEntrySourceRepository extends Repository<AgentMemoryEntrySourceEntity> {
	constructor(dataSource: DataSource) {
		super(AgentMemoryEntrySourceEntity, dataSource.manager);
	}
}
