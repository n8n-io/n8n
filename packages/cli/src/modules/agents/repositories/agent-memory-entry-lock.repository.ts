import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { AgentMemoryEntryLockEntity } from '../entities/agent-memory-entry-lock.entity';

@Service()
export class AgentMemoryEntryLockRepository extends Repository<AgentMemoryEntryLockEntity> {
	constructor(dataSource: DataSource) {
		super(AgentMemoryEntryLockEntity, dataSource.manager);
	}
}
