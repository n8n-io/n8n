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

	/**
	 * Creates or updates the published version snapshot for an agent.
	 * The row uses agentId as its PK (one-to-one), so saving with the same
	 * agentId updates the existing snapshot in place.
	 */
	async savePublishedVersion(data: {
		agentId: string;
		schema: AgentJsonConfig | null;
		model: string | null;
		provider: string | null;
		credentialId: string | null;
		publishedById: string | null;
	}): Promise<AgentPublishedVersion> {
		const existing = await this.findByAgentId(data.agentId);

		const entity = existing
			? Object.assign(existing, { ...data, publishedAt: new Date() })
			: this.create({ ...data, publishedAt: new Date() });

		return await this.save(entity);
	}

	async deleteByAgentId(agentId: string): Promise<void> {
		await this.delete({ agentId });
	}
}
