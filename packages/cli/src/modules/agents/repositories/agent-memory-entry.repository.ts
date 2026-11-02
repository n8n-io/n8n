import {
	activeLifecycleState,
	droppedLifecycleState,
	hashEpisodicMemoryContent,
	hashEpisodicMemoryEvidence,
	normalizeFlatReflectionActions,
	supersededLifecycleState,
	uniqueStrings,
	type EpisodicMemoryReflectionApply,
	type EpisodicMemoryReflectionApplyMerge,
	type EpisodicMemoryStatus,
	type NewEpisodicMemoryEntry,
	type NewEpisodicMemoryEntrySourceForEntry,
} from '@n8n/agents';
import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, type EntityManager, type SelectQueryBuilder } from '@n8n/typeorm';

import { AgentMemoryEntryCandidateEntity } from '../entities/agent-memory-entry-candidate.entity';
import { AgentMemoryEntrySourceEntity } from '../entities/agent-memory-entry-source.entity';
import { AgentMemoryEntryEntity } from '../entities/agent-memory-entry.entity';
import { AgentMessageEntity } from '../entities/agent-message.entity';

export type MemorySourceMessageField = 'channelId' | 'teamId' | 'authorId';

/** Narrows active entries to one source. Every set part must match. */
export interface MemoryEntrySourceFilter {
	/** The scope id is one of these. */
	resourceIds?: string[];
	/** The scope id starts with one of these. */
	resourceIdPrefixes?: string[];
	/** A source message is from the integration. Without one, the scope id starts with a prefix. */
	integration?: { type: string; resourceIdPrefixes: string[] };
	/** A source message of the entry is from the integration and has this value. */
	sourceMessage?: { integrationType: string; field: MemorySourceMessageField; value: string };
}

/** One distinct combination of an entry scope and the context of a source message. */
export interface MemorySourceFacetRow {
	resourceId: string;
	integrationType: string | null;
	conversationKind: string | null;
	channelId: string | null;
	channelName: string | null;
	teamId: string | null;
	teamName: string | null;
	authorId: string | null;
	authorName: string | null;
}

const MESSAGE_JSON_PATHS = {
	integrationType: ['origin', 'integration', 'type'],
	conversationKind: ['origin', 'integration', 'conversationKind'],
	channelId: ['origin', 'integration', 'channelId'],
	channelName: ['origin', 'integration', 'channelName'],
	teamId: ['origin', 'integration', 'teamId'],
	teamName: ['origin', 'integration', 'teamName'],
	authorId: ['author', 'id'],
	authorName: ['author', 'name'],
} as const;

type MessageJsonField = keyof typeof MESSAGE_JSON_PATHS;

/** A merge or drop result, with the replacement entries as stored rows. */
export interface AppliedMemoryReflection {
	droppedIds: string[];
	supersededIds: string[];
	inserted: AgentMemoryEntryEntity[];
}

const userDeletedState = { status: 'deleted', supersededBy: null } as const;

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

	/**
	 * Only the fields that ranking reads. A search ranks every entry of the scope,
	 * so it reads content and metadata only for the entries it returns.
	 */
	async findRankableEntries(
		agentId: string,
		resourceIds: string[],
		statuses: EpisodicMemoryStatus[],
	): Promise<AgentMemoryEntryEntity[]> {
		if (resourceIds.length === 0) return [];
		return await this.find({
			select: [
				'id',
				'resourceId',
				'contentHash',
				'status',
				'supersededBy',
				'embedding',
				'createdAt',
				'updatedAt',
				'lastSeenAt',
			],
			where: { agentId, resourceId: In(resourceIds), status: In(statuses) },
		});
	}

	/** Entries in any status, e.g. to show what a past run recalled. */
	async findInAnyStatus(agentId: string, ids: string[]): Promise<AgentMemoryEntryEntity[]> {
		if (ids.length === 0) return [];
		return await this.findBy({ agentId, id: In(ids) });
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
	 * Stores the delete as `deleted`: recall skips it and the row keeps its text and sources.
	 * Returns false when the agent has no active entry with this id.
	 */
	async markDeleted(agentId: string, entryId: string): Promise<boolean> {
		const result = await this.update({ id: entryId, agentId, status: 'active' }, userDeletedState);
		return (result.affected ?? 0) > 0;
	}

	/**
	 * Saves the entry only after it claims the capture candidates of its sources.
	 * Returns null when a user deleted the candidate.
	 */
	async saveEntryWithSources(
		agentId: string,
		entry: NewEpisodicMemoryEntry,
		sources: NewEpisodicMemoryEntrySourceForEntry[],
		ctx: OperationContext,
	): Promise<AgentMemoryEntryEntity | null> {
		return await this.runInTransaction(ctx, async (_manager, transactionCtx) => {
			if (!(await this.claimCandidates(agentId, sources, transactionCtx))) return null;
			const persisted = await this.upsertEntry(agentId, entry, transactionCtx);
			await this.saveSources(persisted, sources, transactionCtx);
			return persisted;
		});
	}

	/**
	 * Adds sources to an active entry after it claims their capture candidates,
	 * and sets `lastSeenAt`. Returns null when a user deleted a candidate or the
	 * entry is not active.
	 */
	async addSources(
		agentId: string,
		entryId: string,
		sources: NewEpisodicMemoryEntrySourceForEntry[],
		lastSeenAt: Date,
		ctx: OperationContext,
	): Promise<AgentMemoryEntryEntity | null> {
		return await this.runInTransaction(ctx, async (manager, transactionCtx) => {
			if (!(await this.claimCandidates(agentId, sources, transactionCtx))) return null;
			const refreshed = await manager.update(
				AgentMemoryEntryEntity,
				{ agentId, id: entryId, status: 'active' },
				{ lastSeenAt, updatedAt: new Date() },
			);
			if ((refreshed.affected ?? 0) === 0) return null;
			const entry = await manager.findOneByOrFail(AgentMemoryEntryEntity, { agentId, id: entryId });
			await this.saveSources(entry, sources, transactionCtx);
			return entry;
		});
	}

	/**
	 * Drops and merges active entries of one scope. A merge first claims the
	 * capture candidates of its sources and is skipped when a user deleted one.
	 */
	async applyReflection(
		agentId: string,
		resourceId: string,
		reflection: EpisodicMemoryReflectionApply,
		ctx: OperationContext,
	): Promise<AppliedMemoryReflection> {
		return await this.runInTransaction(ctx, async (manager, transactionCtx) => {
			const actionIds = uniqueStrings([
				...reflection.drop,
				...reflection.merge.flatMap((merge) => merge.supersedes),
			]);
			if (actionIds.length === 0) return { droppedIds: [], supersededIds: [], inserted: [] };

			const active = await manager.find(AgentMemoryEntryEntity, {
				select: { id: true },
				where: { agentId, resourceId, id: In(actionIds), status: 'active' },
			});
			const normalized = normalizeFlatReflectionActions({
				activeIds: active.map((entry) => entry.id),
				drop: reflection.drop,
				merge: reflection.merge,
				normalizeMerge: (merge, supersedes) => ({ ...merge, supersedes }),
			});
			const applied: AppliedMemoryReflection = { droppedIds: [], supersededIds: [], inserted: [] };
			for (const merge of normalized.merge) {
				await this.applyMerge(agentId, resourceId, merge, applied, transactionCtx);
			}
			const replacementIds = new Set(applied.inserted.map((entry) => entry.id));
			applied.droppedIds = normalized.drop.filter((id) => !replacementIds.has(id));
			await this.updateActive(
				agentId,
				resourceId,
				applied.droppedIds,
				droppedLifecycleState(),
				transactionCtx,
			);
			return applied;
		});
	}

	/**
	 * Deletes a pending capture candidate, or the result of a completed one.
	 * Returns false when the agent has no pending or completed candidate with this id.
	 */
	async deleteCandidate(
		agentId: string,
		candidateId: string,
		ctx: OperationContext,
	): Promise<boolean> {
		return await this.runInTransaction(ctx, async (manager) => {
			const deleted = await manager.update(
				AgentMemoryEntryCandidateEntity,
				{ agentId, id: candidateId, status: In(['pending', 'completed']) },
				{ status: 'deleted' },
			);
			if ((deleted.affected ?? 0) === 0) return false;
			await this.removeCandidateSources(manager, agentId, candidateId);
			return true;
		});
	}

	/** Removes the candidate's sources and deletes entries left without any source. */
	private async removeCandidateSources(
		manager: EntityManager,
		agentId: string,
		candidateId: string,
	): Promise<void> {
		const sources = await manager.find(AgentMemoryEntrySourceEntity, {
			select: { memoryEntryId: true },
			where: { agentId, candidateId },
		});
		if (sources.length === 0) return;

		const entryIds = [...new Set(sources.map((source) => source.memoryEntryId))];
		await manager.delete(AgentMemoryEntrySourceEntity, { agentId, candidateId });
		const remaining = await manager.find(AgentMemoryEntrySourceEntity, {
			select: { memoryEntryId: true },
			where: { agentId, memoryEntryId: In(entryIds) },
		});
		const withSources = new Set(remaining.map((source) => source.memoryEntryId));
		const orphanedIds = entryIds.filter((id) => !withSources.has(id));
		if (orphanedIds.length === 0) return;

		await manager.update(
			AgentMemoryEntryEntity,
			{ agentId, id: In(orphanedIds), status: 'active' },
			userDeletedState,
		);
	}

	/**
	 * Locks the source candidates unless a user deleted them. The status condition
	 * makes a concurrent delete and capture exclude each other. The capture processor
	 * still marks candidates completed after its batch.
	 */
	private async claimCandidates(
		agentId: string,
		sources: NewEpisodicMemoryEntrySourceForEntry[],
		ctx: OperationContext,
	): Promise<boolean> {
		const candidateIds = sources.flatMap((source) => source.candidateId ?? []);
		if (candidateIds.length === 0) return true;
		const claimed = await this.managerFor(ctx).update(
			AgentMemoryEntryCandidateEntity,
			{ agentId, id: In(candidateIds), status: In(['pending', 'completed']) },
			{ updatedAt: new Date() },
		);
		return (claimed.affected ?? 0) > 0;
	}

	/** Writes the replacement, moves the sources to it, and supersedes the merged entries. */
	private async applyMerge(
		agentId: string,
		resourceId: string,
		merge: EpisodicMemoryReflectionApplyMerge,
		applied: AppliedMemoryReflection,
		ctx: OperationContext,
	): Promise<void> {
		const sources = merge.sources ?? [];
		if (!(await this.claimCandidates(agentId, sources, ctx))) return;
		const replacement = await this.upsertEntry(agentId, { ...merge.entry, resourceId }, ctx, {
			replaceMetadata: true,
		});
		await this.saveSources(
			replacement,
			[...(await this.findSourcesToCopy(agentId, merge.supersedes, ctx)), ...sources],
			ctx,
		);
		const supersededIds = merge.supersedes.filter((id) => id !== replacement.id);
		await this.updateActive(
			agentId,
			resourceId,
			supersededIds,
			supersededLifecycleState(replacement.id),
			ctx,
		);
		applied.inserted.push(replacement);
		applied.supersededIds.push(...supersededIds);
	}

	/** The sources of the given entries, as new sources of a replacement. */
	private async findSourcesToCopy(
		agentId: string,
		entryIds: string[],
		ctx: OperationContext,
	): Promise<NewEpisodicMemoryEntrySourceForEntry[]> {
		const rows = await this.managerFor(ctx).find(AgentMemoryEntrySourceEntity, {
			where: { agentId, memoryEntryId: In(entryIds) },
			order: { createdAt: 'ASC', id: 'ASC' },
		});
		const createdAt = new Date();
		return rows.flatMap((row): NewEpisodicMemoryEntrySourceForEntry[] => {
			const base = { threadId: row.threadId, evidenceText: row.evidenceText, createdAt };
			if (row.observationId) return [{ ...base, observationId: row.observationId }];
			if (row.candidateId) return [{ ...base, candidateId: row.candidateId }];
			return [];
		});
	}

	private async updateActive(
		agentId: string,
		resourceId: string,
		ids: string[],
		state: { status: 'dropped' | 'superseded'; supersededBy: string | null },
		ctx: OperationContext,
	): Promise<void> {
		if (ids.length === 0) return;
		await this.managerFor(ctx).update(
			AgentMemoryEntryEntity,
			{ agentId, resourceId, id: In(ids), status: 'active' },
			state,
		);
	}

	/** Capture keeps the metadata of a stored entry. A merge replaces it when it sets one. */
	private async upsertEntry(
		agentId: string,
		entry: NewEpisodicMemoryEntry,
		ctx: OperationContext,
		{ replaceMetadata = false } = {},
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
		if (replaceMetadata && entry.metadata !== undefined) updateColumns.push('metadata');
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
		if (filter.resourceIds) {
			query.andWhere('entry.resourceId IN (:...resourceIds)', { resourceIds: filter.resourceIds });
		}
		if (filter.resourceIdPrefixes) {
			const patterns = Object.fromEntries(
				filter.resourceIdPrefixes.map((prefix, index) => [`scopePrefix${index}`, `${prefix}%`]),
			);
			const conditions = Object.keys(patterns).map((param) => `entry.resourceId LIKE :${param}`);
			query.andWhere(`(${conditions.join(' OR ')})`, patterns);
		}
		if (filter.integration) this.whereFromIntegration(query, agentId, filter.integration);
		if (filter.sourceMessage) {
			const { integrationType, field, value } = filter.sourceMessage;
			const entryIds = this.sourceMessageEntryIds(query, [
				this.messageFieldEquals('integrationType'),
				this.messageFieldEquals(field),
			]);
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
		const scopeMatches = Object.keys(prefixParams)
			.map((param) => `entry.resourceId LIKE :${param}`)
			.join(' OR ');
		const fromIntegration = this.sourceMessageEntryIds(query, [
			this.messageFieldEquals('integrationType'),
		]);
		const fromAnyIntegration = this.sourceMessageEntryIds(query, [
			`${this.messageJsonText('integrationType')} IS NOT NULL`,
		]);
		// Like the source line, the message decides first. The scope id only counts without one.
		query.andWhere(
			`(entry.id IN ${fromIntegration} OR ((${scopeMatches}) AND entry.id NOT IN ${fromAnyIntegration}))`,
			{
				...prefixParams,
				sourceAgentId: agentId,
				integrationType: type,
			},
		);
	}

	/** Entries with a source message that meets every condition. */
	private sourceMessageEntryIds(
		query: SelectQueryBuilder<AgentMemoryEntryEntity>,
		conditions: string[],
	): string {
		const entryIds = query
			.subQuery()
			.select('source.memoryEntryId')
			.from(AgentMemoryEntrySourceEntity, 'source')
			.innerJoin(AgentMemoryEntryCandidateEntity, 'candidate', 'candidate.id = source.candidateId')
			.innerJoin(AgentMessageEntity, 'message', 'message.id = candidate.sourceMessageId')
			.where('source.agentId = :sourceAgentId');
		for (const condition of conditions) entryIds.andWhere(condition);
		return entryIds.getQuery();
	}

	/** Compares a message field with the query parameter of the same name. */
	private messageFieldEquals(field: MessageJsonField): string {
		return `${this.messageJsonText(field)} = :${field}`;
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
