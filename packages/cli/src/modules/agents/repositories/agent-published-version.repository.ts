import type { AgentJsonConfig } from '../json-config/agent-json-config';
import { Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { DataSource, Repository } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';

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
	 * Atomically creates or updates the single published snapshot for an agent.
	 * Upserts on `agentId` (the PK) — one row per agent, always overwritten on publish.
	 *
	 * Pass `trx` to execute within an existing transaction.
	 */
	async savePublishedVersion(
		data: {
			agentId: string;
			schema: AgentJsonConfig | null;
			publishedFromVersionId: string;
			model: string | null;
			provider: string | null;
			credentialId: string | null;
			publishedById: string | null;
		},
		trx?: EntityManager,
	): Promise<AgentPublishedVersion> {
		const repo = trx?.getRepository(AgentPublishedVersion) ?? this;
		// TypeORM's _QueryDeepPartialEntity cannot represent Zod-inferred types like
		// AgentJsonConfig. The cast is safe: @JsonColumn serialises the value at runtime.
		await repo.upsert(
			{ ...data, publishedAt: new Date() } as QueryDeepPartialEntity<AgentPublishedVersion>,
			['agentId'],
		);
		return await repo.findOneByOrFail({ agentId: data.agentId });
	}

	async deleteByAgentId(agentId: string): Promise<void> {
		await this.delete({ agentId });
	}
}
