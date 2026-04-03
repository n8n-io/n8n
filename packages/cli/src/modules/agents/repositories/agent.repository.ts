import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { Agent } from '../entities/agent.entity';

@Service()
export class AgentRepository extends Repository<Agent> {
	constructor(dataSource: DataSource) {
		super(Agent, dataSource.manager);
	}

	async findByProjectId(projectId: string): Promise<Agent[]> {
		return await this.find({
			where: { projectId },
			order: { updatedAt: 'DESC' },
		});
	}

	async findByIdAndProjectId(id: string, projectId: string): Promise<Agent | null> {
		return await this.findOneBy({ id, projectId });
	}
}
