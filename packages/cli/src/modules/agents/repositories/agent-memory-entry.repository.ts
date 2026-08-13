import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { AgentMemoryEntryEntity } from '../entities/agent-memory-entry.entity';

@Service()
export class AgentMemoryEntryRepository extends Repository<AgentMemoryEntryEntity> {
	constructor(dataSource: DataSource) {
		super(AgentMemoryEntryEntity, dataSource.manager);
	}
}
