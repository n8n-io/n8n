import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { AgentTask } from '../entities/agent-task.entity';

@Service()
export class AgentTaskRepository extends Repository<AgentTask> {
	constructor(dataSource: DataSource) {
		super(AgentTask, dataSource.manager);
	}

	async findByAgent(projectId: string, agentId: string): Promise<AgentTask[]> {
		return await this.find({
			where: { projectId, agentId },
			order: { createdAt: 'ASC' },
		});
	}

	async findByIdAndAgent(
		projectId: string,
		agentId: string,
		taskId: string,
	): Promise<AgentTask | null> {
		return await this.findOne({
			where: { id: taskId, projectId, agentId },
			relations: { agent: { publishedVersion: true } },
		});
	}

	async findActiveWithAgents(): Promise<AgentTask[]> {
		return await this.find({
			where: { active: true },
			relations: { agent: { publishedVersion: true } },
		});
	}

	async findWithAgent(taskId: string): Promise<AgentTask | null> {
		return await this.findOne({
			where: { id: taskId },
			relations: { agent: { publishedVersion: true } },
		});
	}
}
