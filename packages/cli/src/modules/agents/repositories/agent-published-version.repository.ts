import type { AgentJsonConfig } from '../json-config/agent-json-config';
import { Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
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
	 * Atomically creates or replaces the published version snapshot for an agent.
	 *
	 * Uses an upsert keyed by `agentId` (the PK) so concurrent publish calls for
	 * the same agent do not race on a read-then-insert — only one write wins and
	 * the other silently updates in place.
	 *
	 * Pass `trx` to execute within an existing transaction.
	 */
	async savePublishedVersion(
		data: {
			agentId: string;
			schema: AgentJsonConfig | null;
			model: string | null;
			provider: string | null;
			credentialId: string | null;
			publishedById: string | null;
		},
		trx?: EntityManager,
	): Promise<AgentPublishedVersion> {
		const repo = trx?.getRepository(AgentPublishedVersion) ?? this;
		await repo.upsert({ ...data, publishedAt: new Date() }, ['agentId']);
		return await repo.findOneByOrFail({ agentId: data.agentId });
	}

	async deleteByAgentId(agentId: string): Promise<void> {
		await this.delete({ agentId });
	}
}
