import {
	activeLifecycleState,
	hashEpisodicMemoryContent,
	hashEpisodicMemoryEvidence,
	type NewEpisodicMemoryEntry,
	type NewEpisodicMemoryEntrySourceForEntry,
} from '@n8n/agents';
import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, type SelectQueryBuilder } from '@n8n/typeorm';

import { AgentMemoryEntryCandidateEntity } from '../entities/agent-memory-entry-candidate.entity';
import { AgentMemoryEntrySourceEntity } from '../entities/agent-memory-entry-source.entity';
import { AgentMemoryEntryEntity } from '../entities/agent-memory-entry.entity';
import { AgentMessageEntity } from '../entities/agent-message.entity';

export type MemorySourceMessageField = 'channelId' | 'teamId' | 'authorId';

/** Narrows active entries to one source. Every set part must match. */
export interface MemoryEntrySourceFilter {
	resourceId?: string;
	resourceIdPrefix?: string;
	/** The scope id starts with one of the prefixes, or a source message is from the integration. */
	integration?: { type: string; resourceIdPrefixes: string[] };
	/** A source message of the entry is from the integration and has this value. */
	sourceMessage?: { integrationType: string; field: MemorySourceMessageField; value: string };
}

/** One distinct combination of an entry scope and the context of a source message. */
export interface MemorySourceFacetRow {
	resourceId: string;
	integrationType: string | null;
	channelId: string | null;
	channelName: string | null;
	teamId: string | null;
	teamName: string | null;
	authorId: string | null;
	authorName: string | null;
}

const MESSAGE_JSON_PATHS = {
	integrationType: ['origin', 'integration', 'type'],
	channelId: ['origin', 'integration', 'channelId'],
	channelName: ['origin', 'integration', 'channelName'],
	teamId: ['origin', 'integration', 'teamId'],
	teamName: ['origin', 'integration', 'teamName'],
	authorId: ['author', 'id'],
	authorName: ['author', 'name'],
} as const;

type MessageJsonField = keyof typeof MESSAGE_JSON_PATHS;

@Service()
export class AgentMemoryEntryRepository extends BaseRepository<AgentMemoryEntryEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentMemoryEntryEntity, dataSource.manager, transactionRunner);
	}

	async findByContentHashes(
		agentId: string,
		resourceId: string,
		contentHashes: string[],
	): Promise<AgentMemoryEntryEntity[]> {
		if (contentHashes.length === 0) return [];
		return await this.find({ where: { agentId, resourceId, contentHash: In(contentHashes) } });
	}

	/** Newest first. `after` is the last entry of the previous page. */
	async listActiveByAgent(
		agentId: string,
		limit: number,
		after?: { createdAt: Date; id: string },
		filter: MemoryEntrySourceFilter = {},
	): Promise<AgentMemoryEntryEntity[]> {
		const query = this.activeEntriesQuery(agentId, filter)
			.orderBy('entry.createdAt', 'DESC')
			.addOrderBy('entry.id', 'DESC')
			.take(limit);
		if (after) {
			query.andWhere(
				'(entry.createdAt < :afterCreatedAt OR (entry.createdAt = :afterCreatedAt AND entry.id < :afterId))',
				{ afterCreatedAt: after.createdAt, afterId: after.id },
			);
		}
		return await query.getMany();
	}

	async countActiveByAgent(agentId: string, filter: MemoryEntrySourceFilter = {}): Promise<number> {
		return await this.activeEntriesQuery(agentId, filter).getCount();
	}

	/** Distinct source contexts of the active entries. Entries without a source message give one row with null fields. */
	async findSourceFacetRows(agentId: string): Promise<MemorySourceFacetRow[]> {
		const query = this.createQueryBuilder('entry')
			.leftJoin(AgentMemoryEntrySourceEntity, 'source', 'source.memoryEntryId = entry.id')
			.leftJoin(AgentMemoryEntryCandidateEntity, 'candidate', 'candidate.id = source.candidateId')
			.leftJoin(AgentMessageEntity, 'message', 'message.id = candidate.sourceMessageId')
			.select('entry.resourceId', 'resourceId')
			.distinct(true)
			.where('entry.agentId = :agentId', { agentId })
			.andWhere('entry.status = :status', { status: 'active' });
		for (const field of Object.keys(MESSAGE_JSON_PATHS) as MessageJsonField[]) {
			query.addSelect(this.messageJsonText(field), field);
		}
		return await query.getRawMany<MemorySourceFacetRow>();
	}

	/**
	 * Stores the delete as `dropped`: recall skips it and the row keeps its text and sources.
	 * Returns false when the agent has no active entry with this id.
	 */
	async markDeleted(agentId: string, entryId: string): Promise<boolean> {
		const result = await this.update(
			{ id: entryId, agentId, status: 'active' },
			{ status: 'dropped' },
		);
		return (result.affected ?? 0) > 0;
	}

	async saveEntryWithSources(
		agentId: string,
		entry: NewEpisodicMemoryEntry,
		sources: NewEpisodicMemoryEntrySourceForEntry[],
		ctx: OperationContext,
	): Promise<AgentMemoryEntryEntity> {
		return await this.runInTransaction(ctx, async (_manager, transactionCtx) => {
			const persisted = await this.upsertEntry(agentId, entry, transactionCtx);
			await this.saveSources(persisted, sources, transactionCtx);
			return persisted;
		});
	}

	private async upsertEntry(
		agentId: string,
		entry: NewEpisodicMemoryEntry,
		ctx: OperationContext,
	): Promise<AgentMemoryEntryEntity> {
		const repository = this.managerFor(ctx).getRepository(AgentMemoryEntryEntity);
		const contentHash = entry.contentHash ?? hashEpisodicMemoryContent(entry.content);
		const now = new Date();
		const entity = repository.create({
			agentId,
			resourceId: entry.resourceId,
			content: entry.content,
			contentHash,
			...activeLifecycleState(),
			embeddingModel: entry.embeddingModel ?? null,
			embedding: entry.embedding ?? null,
			metadata: entry.metadata ?? null,
			createdAt: entry.createdAt ?? now,
			updatedAt: now,
			lastSeenAt: entry.lastSeenAt ?? now,
		});
		const updateColumns = ['status', 'supersededBy', 'lastSeenAt', 'updatedAt'];
		if (entry.embedding !== undefined) updateColumns.push('embedding');
		if (entry.embeddingModel !== undefined) updateColumns.push('embeddingModel');
		await repository
			.createQueryBuilder()
			.insert()
			.values(entity)
			.orUpdate(updateColumns, ['agentId', 'resourceId', 'contentHash'])
			.execute();
		return await repository.findOneByOrFail({ agentId, resourceId: entry.resourceId, contentHash });
	}

	private async saveSources(
		entry: AgentMemoryEntryEntity,
		sources: NewEpisodicMemoryEntrySourceForEntry[],
		ctx: OperationContext,
	): Promise<void> {
		if (sources.length === 0) return;
		const repository = this.managerFor(ctx).getRepository(AgentMemoryEntrySourceEntity);
		const entities = sources.map((source) =>
			repository.create({
				agentId: entry.agentId,
				memoryEntryId: entry.id,
				observationId: source.observationId ?? null,
				candidateId: source.candidateId ?? null,
				threadId: source.threadId,
				evidenceHash: hashEpisodicMemoryEvidence(source.evidenceText),
				evidenceText: source.evidenceText,
				createdAt: source.createdAt,
			}),
		);
		await repository.createQueryBuilder().insert().values(entities).orIgnore().execute();
	}

	private activeEntriesQuery(
		agentId: string,
		filter: MemoryEntrySourceFilter,
	): SelectQueryBuilder<AgentMemoryEntryEntity> {
		const query = this.createQueryBuilder('entry')
			.where('entry.agentId = :agentId', { agentId })
			.andWhere('entry.status = :status', { status: 'active' });
		if (filter.resourceId !== undefined) {
			query.andWhere('entry.resourceId = :resourceId', { resourceId: filter.resourceId });
		}
		if (filter.resourceIdPrefix !== undefined) {
			query.andWhere('entry.resourceId LIKE :resourceIdPattern', {
				resourceIdPattern: `${filter.resourceIdPrefix}%`,
			});
		}
		if (filter.integration) this.whereFromIntegration(query, agentId, filter.integration);
		if (filter.sourceMessage) {
			const { integrationType, field, value } = filter.sourceMessage;
			const entryIds = this.sourceMessageEntryIds(query, ['integrationType', field]);
			query.andWhere(`entry.id IN ${entryIds}`, {
				sourceAgentId: agentId,
				integrationType,
				[field]: value,
			});
		}
		return query;
	}

	private whereFromIntegration(
		query: SelectQueryBuilder<AgentMemoryEntryEntity>,
		agentId: string,
		{ type, resourceIdPrefixes }: NonNullable<MemoryEntrySourceFilter['integration']>,
	): void {
		const prefixParams = Object.fromEntries(
			resourceIdPrefixes.map((prefix, index) => [`integrationScope${index}`, `${prefix}%`]),
		);
		const conditions = [
			...Object.keys(prefixParams).map((param) => `entry.resourceId LIKE :${param}`),
			`entry.id IN ${this.sourceMessageEntryIds(query, ['integrationType'])}`,
		];
		query.andWhere(`(${conditions.join(' OR ')})`, {
			...prefixParams,
			sourceAgentId: agentId,
			integrationType: type,
		});
	}

	/** Entries with a source message whose fields equal the parameters of the same name. */
	private sourceMessageEntryIds(
		query: SelectQueryBuilder<AgentMemoryEntryEntity>,
		fields: MessageJsonField[],
	): string {
		const entryIds = query
			.subQuery()
			.select('source.memoryEntryId')
			.from(AgentMemoryEntrySourceEntity, 'source')
			.innerJoin(AgentMemoryEntryCandidateEntity, 'candidate', 'candidate.id = source.candidateId')
			.innerJoin(AgentMessageEntity, 'message', 'message.id = candidate.sourceMessageId')
			.where('source.agentId = :sourceAgentId');
		for (const field of fields) entryIds.andWhere(`${this.messageJsonText(field)} = :${field}`);
		return entryIds.getQuery();
	}

	/** A text field from the `message` JSON columns, for SQLite and Postgres. */
	private messageJsonText(field: MessageJsonField): string {
		const [column, ...path] = MESSAGE_JSON_PATHS[field];
		if (this.manager.connection.options.type === 'postgres') {
			const parents = path.slice(0, -1).map((key) => `->'${key}'`);
			return `message.${column}${parents.join('')}->>'${path.at(-1)}'`;
		}
		return `json_extract(message.${column}, '$.${path.join('.')}')`;
	}
}
