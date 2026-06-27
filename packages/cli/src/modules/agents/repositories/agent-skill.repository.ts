import { Service } from '@n8n/di';
import { DataSource, In, Repository, type EntityManager } from '@n8n/typeorm';

import { AgentSkillDefinition } from '../entities/agent-skill.entity';

@Service()
export class AgentSkillRepository extends Repository<AgentSkillDefinition> {
	constructor(dataSource: DataSource) {
		super(AgentSkillDefinition, dataSource.manager);
	}

	async findByAgentId(agentId: string): Promise<AgentSkillDefinition[]> {
		return await this.find({ where: { agentId }, order: { createdAt: 'ASC' } });
	}

	async findByIdAndAgentId(id: string, agentId: string): Promise<AgentSkillDefinition | null> {
		return await this.findOne({ where: { id, agentId } });
	}

	async deleteByAgentIdAndIds(agentId: string, ids: string[], trx?: EntityManager): Promise<void> {
		if (ids.length === 0) return;
		const repo = trx?.getRepository(AgentSkillDefinition) ?? this;
		await repo.delete({ agentId, id: In(ids) });
	}
}
