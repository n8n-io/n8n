import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { AgentMemoryEntryCursorEntity } from '../entities/agent-memory-entry-cursor.entity';

@Service()
export class AgentMemoryEntryCursorRepository extends Repository<AgentMemoryEntryCursorEntity> {
	constructor(dataSource: DataSource) {
		super(AgentMemoryEntryCursorEntity, dataSource.manager);
	}
}
