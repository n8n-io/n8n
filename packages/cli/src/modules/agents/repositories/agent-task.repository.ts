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

	async findByIdAndAgentId(id: string, agentId: string): Promise<AgentTask | null> {
		return await this.findOne({ where: { id, agentId } });
	}

	/**
	 * Return the owning agent for each of these task ids, across all agents.
	 * The task id is the only primary key of the table. Writers that accept
	 * external ids (config import) use this method to find ids that another
	 * agent already owns.
	 */
	async findOwningAgentIds(ids: string[]): Promise<Map<string, string>> {
		if (ids.length === 0) return new Map();

		const rows = await this.find({ where: { id: In(ids) }, select: ['id', 'agentId'] });
		return new Map(rows.map((row) => [row.id, row.agentId]));
	}
}
