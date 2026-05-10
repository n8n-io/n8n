import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { AgentMemoryProfileEntity } from '../entities/agent-memory-profile.entity';

@Service()
export class AgentMemoryProfileRepository extends Repository<AgentMemoryProfileEntity> {
	constructor(dataSource: DataSource) {
		super(AgentMemoryProfileEntity, dataSource.manager);
	}
}
