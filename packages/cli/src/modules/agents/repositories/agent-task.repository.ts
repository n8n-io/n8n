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
	 * Which of the given ids already have a row, regardless of owning agent.
	 * `id` is a global primary key, so this is used to detect collisions before
	 * inserting a row backfilled from an imported task ref.
	 */
	async findExistingIds(ids: string[]): Promise<Set<string>> {
		if (ids.length === 0) return new Set();
		const rows = await this.find({ where: { id: In(ids) }, select: ['id'] });
		return new Set(rows.map((row) => row.id));
	}
}
