import type { AgentJsonConfig } from '../json-config/agent-json-config';
import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { AgentPublishedVersion } from '../entities/agent-published-version.entity';

@Service()
export class AgentPublishedVersionRepository extends Repository<AgentPublishedVersion> {
	constructor(dataSource: DataSource) {
		super(AgentPublishedVersion, dataSource.manager);
	}

	async findByAgentId(agentId: string): Promise<AgentPublishedVersion | null> {
		return await this.findOneBy({ agentId });
	}

	async savePublishedVersion(data: {
		agentId: string;
		schema: AgentJsonConfig | null;
		model: string | null;
		provider: string | null;
		credentialId: string | null;
		publishedById: string | null;
	}): Promise<AgentPublishedVersion> {
		const entity = this.create({
			agentId: data.agentId,
			schema: data.schema,
			model: data.model,
			provider: data.provider,
			credentialId: data.credentialId,
			publishedById: data.publishedById,
			publishedAt: new Date(),
		});

		return await this.save(entity);
	}

	async deleteByAgentId(agentId: string): Promise<void> {
		await this.delete({ agentId });
	}
}
