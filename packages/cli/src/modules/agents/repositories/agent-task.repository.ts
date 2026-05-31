import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { AgentTask } from '../entities/agent-task.entity';

@Service()
export class AgentTaskRepository extends Repository<AgentTask> {
	constructor(dataSource: DataSource) {
		super(AgentTask, dataSource.manager);
	}

	async findByAgentId(agentId: string): Promise<AgentTask[]> {
		return await this.find({ where: { agentId }, order: { createdAt: 'ASC' } });
	}

	async findByIdAndAgentId(id: string, agentId: string): Promise<AgentTask | null> {
		return await this.findOne({ where: { id, agentId } });
	}

	/** Enabled tasks whose agent is published — the set the leader registers cron jobs for. */
	async findSchedulable(): Promise<AgentTask[]> {
		return await this.createQueryBuilder('task')
			.innerJoin('task.agent', 'agent')
			.where('task.enabled = :enabled', { enabled: true })
			.andWhere('agent.activeVersionId IS NOT NULL')
			.getMany();
	}
}
