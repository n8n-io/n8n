import { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { DataSource, Repository } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';

import type { AgentJsonConfig } from '@n8n/api-types';
import { AgentHistory } from '../entities/agent-history.entity';
import type { Agent } from '../entities/agent.entity';

@Service()
export class AgentHistoryRepository extends Repository<AgentHistory> {
	constructor(dataSource: DataSource) {
		super(AgentHistory, dataSource.manager);
	}

	/**
	 * Insert an immutable snapshot for the agent at `versionId`. Pass `trx`
	 * to participate in an existing transaction.
	 *
	 * `publishedBy` accepts either the publishing `User` (renders both the
	 * `author` display string and the `publishedById` runtime pointer) or a
	 * literal string for system actors (e.g. future `'system'` snapshots),
	 * in which case `publishedById` is null. Mirrors
	 * `WorkflowHistoryService.saveVersion`'s `user: User | string` shape.
	 */
	async saveVersion(
		data: {
			versionId: string;
			agentId: string;
			schema: AgentJsonConfig | null;
			tools: Agent['tools'] | null;
			skills: Agent['skills'] | null;
			publishedBy: User | string;
		},
		trx?: EntityManager,
	): Promise<AgentHistory> {
		const { publishedBy } = data;
		const author =
			typeof publishedBy === 'string'
				? publishedBy
				: `${publishedBy.firstName} ${publishedBy.lastName}`;
		const publishedById = typeof publishedBy === 'string' ? null : publishedBy.id;
		const repo = trx?.getRepository(AgentHistory) ?? this;
		// TypeORM's QueryDeepPartialEntity cannot represent Zod-inferred types
		// like AgentJsonConfig. The cast is safe: @JsonColumn serialises the
		// value at runtime.
		await repo.insert({
			versionId: data.versionId,
			agentId: data.agentId,
			schema: data.schema,
			tools: data.tools,
			skills: data.skills,
			author,
			publishedById,
		} as QueryDeepPartialEntity<AgentHistory>);
		return await repo.findOneByOrFail({ versionId: data.versionId });
	}

	async findByVersionAndAgentId(
		versionId: string,
		agentId: string,
		trx?: EntityManager,
	): Promise<AgentHistory | null> {
		const repo = trx?.getRepository(AgentHistory) ?? this;
		return await repo.findOneBy({ versionId, agentId });
	}
}
