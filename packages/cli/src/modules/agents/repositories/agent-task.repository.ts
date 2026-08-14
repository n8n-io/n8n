import { Service } from '@n8n/di';
import { DataSource, In, Repository } from '@n8n/typeorm';

import { AgentTask } from '../entities/agent-task.entity';

@Service()
export class AgentTaskRepository extends Repository<AgentTask> {
	constructor(dataSource: DataSource) {
		super(AgentTask, dataSource.manager);
	}

	async findByAgentId(agentId: string): Promise<AgentTask[]> {
		return await this.find({ where: { agentId }, order: { createdAt: 'ASC' } });
	}

	/** Which of the given task ids are already taken, across all agents. */
	async findExistingIds(ids: string[]): Promise<string[]> {
		if (ids.length === 0) return [];
		const rows = await this.find({ where: { id: In(ids) }, select: ['id'] });
		return rows.map((row) => row.id);
	}

	async findByIdAndAgentId(id: string, agentId: string): Promise<AgentTask | null> {
		return await this.findOne({ where: { id, agentId } });
	}
}
