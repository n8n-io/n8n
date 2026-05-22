import { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { DataSource, Repository } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';

import type { AgentJsonConfig } from '@n8n/api-types';
import { AgentHistory } from '../entities/agent-history.entity';
import type { Agent } from '../entities/agent.entity';

/**
 * Render a User's display name for the snapshot `author` column. Treats
 * either missing name part gracefully — `firstName='Foo', lastName=null`
 * yields `'Foo'` rather than `'Foo null'`. Falls back to `'Unknown'` when
 * neither part is populated. Exported for unit-test coverage; the migration
 * backfill mirrors this logic in SQL with COALESCE + TRIM + NULLIF.
 */
export function renderAuthor(user: User): string {
	const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
	return name || 'Unknown';
}

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
		const author = typeof publishedBy === 'string' ? publishedBy : renderAuthor(publishedBy);
		const publishedById = typeof publishedBy === 'string' ? null : publishedBy.id;
		const repo = trx?.getRepository(AgentHistory) ?? this;
		// TypeORM's QueryDeepPartialEntity can't express our @JsonColumn shapes
		// (Zod-inferred AgentJsonConfig, the tools `Record<string, …>`, etc.),
		// so each JSON field is cast individually. The non-JSON fields
		// (versionId, agentId, author, publishedById) stay type-checked.
		// The casts are safe at runtime: @JsonColumn serialises the values.
		type InsertShape = QueryDeepPartialEntity<AgentHistory>;
		await repo.insert({
			versionId: data.versionId,
			agentId: data.agentId,
			schema: data.schema as InsertShape['schema'],
			tools: data.tools as InsertShape['tools'],
			skills: data.skills as InsertShape['skills'],
			author,
			publishedById,
		});
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

	/**
	 * List an agent's publish history, newest first. `schema`/`tools`/`skills`
	 * are intentionally omitted — the list view only needs metadata.
	 */
	async findByAgentId(agentId: string, take: number, skip: number): Promise<AgentHistory[]> {
		return await this.find({
			where: { agentId },
			take,
			skip,
			order: { createdAt: 'DESC' },
			select: {
				versionId: true,
				agentId: true,
				createdAt: true,
				updatedAt: true,
				author: true,
			},
		});
	}
}
