import type { StoredAgentConfig, UpdateAgentVersionDto } from '@n8n/api-types';
import { BaseRepository, TransactionRunner, User, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';

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

const versionSummaryFields = [
	'versionId',
	'agentId',
	'createdAt',
	'updatedAt',
	'author',
	'name',
	'description',
] as const;

@Service()
export class AgentHistoryRepository extends BaseRepository<AgentHistory> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentHistory, dataSource.manager, transactionRunner);
	}

	/** Save attribution stays separate from the optional legacy publishing identity. */
	async saveVersion(
		data: {
			versionId: string;
			agentId: string;
			schema: StoredAgentConfig | null;
			tools: Agent['tools'] | null;
			publishedBy?: User | string;
			savedBy?: User | string;
		},
		ctx: OperationContext = {},
	): Promise<AgentHistory> {
		const { publishedBy } = data;
		const saver = data.savedBy ?? publishedBy ?? 'Unknown';
		const author = typeof saver === 'string' ? saver : renderAuthor(saver);
		const publishedById = !publishedBy || typeof publishedBy === 'string' ? null : publishedBy.id;
		const repo = this.managerFor(ctx).getRepository(AgentHistory);
		// TypeORM's QueryDeepPartialEntity can't express our @JsonColumn shapes
		// (Zod-inferred StoredAgentConfig, the tools `Record<string, …>`, etc.),
		// so each JSON field is cast individually. The non-JSON fields
		// (versionId, agentId, author, publishedById) stay type-checked.
		// The casts are safe at runtime: @JsonColumn serialises the values.
		type InsertShape = QueryDeepPartialEntity<AgentHistory>;
		await repo.insert({
			versionId: data.versionId,
			agentId: data.agentId,
			schema: data.schema as InsertShape['schema'],
			tools: data.tools as InsertShape['tools'],
			author,
			publishedById,
		});
		return await repo.findOneByOrFail({ versionId: data.versionId });
	}

	/** Change labels without changing content or the original save time. */
	async updateMetadata(
		agentId: string,
		versionId: string,
		metadata: UpdateAgentVersionDto,
		ctx: OperationContext = {},
	): Promise<void> {
		if (metadata.name === undefined && metadata.description === undefined) return;
		await this.managerFor(ctx).update(
			AgentHistory,
			{ agentId, versionId },
			{
				...(metadata.name !== undefined ? { name: metadata.name?.trim() || null } : {}),
				...(metadata.description !== undefined
					? { description: metadata.description || null }
					: {}),
				updatedAt: () => '"updatedAt"',
			},
		);
	}

	async recordPublisher(
		versionId: string,
		publishedById: string,
		ctx: OperationContext,
	): Promise<void> {
		await this.managerFor(ctx).update(
			AgentHistory,
			{ versionId },
			{ publishedById, updatedAt: () => '"updatedAt"' },
		);
	}

	async findByVersionAndAgentId(
		versionId: string,
		agentId: string,
		ctx: OperationContext = {},
	): Promise<AgentHistory | null> {
		const repo = this.managerFor(ctx).getRepository(AgentHistory);
		return await repo.findOneBy({ versionId, agentId });
	}

	/**
	 * List saved Agent versions, newest first. `schema`/`tools`/`skills`
	 * are intentionally omitted — the list view only needs metadata.
	 */
	async findByAgentId(agentId: string, take: number, skip: number): Promise<AgentHistory[]> {
		return await this.find({
			where: { agentId },
			take,
			skip,
			order: { createdAt: 'DESC', versionId: 'DESC' },
			select: [...versionSummaryFields],
		});
	}

	async findSummary(agentId: string, versionId: string): Promise<AgentHistory | null> {
		return await this.findOne({ where: { agentId, versionId }, select: [...versionSummaryFields] });
	}

	/** Whether the Agent has saved versions, including drafts. */
	async existsForAgent(agentId: string): Promise<boolean> {
		return await this.existsBy({ agentId });
	}
}
