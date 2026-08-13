import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { AgentThreadEntity } from '../entities/agent-thread.entity';

@Service()
export class AgentThreadRepository extends Repository<AgentThreadEntity> {
	constructor(dataSource: DataSource) {
		super(AgentThreadEntity, dataSource.manager);
	}
}
