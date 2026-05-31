import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { AgentTask } from '../entities/agent-task.entity';

@Service()
export class AgentTaskRepository extends Repository<AgentTask> {
	constructor(dataSource: DataSource) {
		super(AgentTask, dataSource.manager);
	}
}
