import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { AgentMessageEntity } from '../entities/agent-message.entity';

@Service()
export class AgentMessageRepository extends Repository<AgentMessageEntity> {
	constructor(dataSource: DataSource) {
		super(AgentMessageEntity, dataSource.manager);
	}
}
