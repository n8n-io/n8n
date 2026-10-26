import {
	activeLifecycleState,
	hashEpisodicMemoryContent,
	hashEpisodicMemoryEvidence,
	type NewEpisodicMemoryEntry,
	type NewEpisodicMemoryEntrySourceForEntry,
} from '@n8n/agents';
import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, LessThan } from '@n8n/typeorm';

import { AgentMemoryEntrySourceEntity } from '../entities/agent-memory-entry-source.entity';
import { AgentMemoryEntryEntity } from '../entities/agent-memory-entry.entity';

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
	): Promise<AgentMemoryEntryEntity[]> {
		const where = { agentId, status: 'active' as const };
		return await this.find({
			where: after
				? [
						{ ...where, createdAt: LessThan(after.createdAt) },
						{ ...where, createdAt: after.createdAt, id: LessThan(after.id) },
					]
				: where,
			order: { createdAt: 'DESC', id: 'DESC' },
			take: limit,
		});
	}

	async countActiveByAgent(agentId: string): Promise<number> {
		return await this.count({ where: { agentId, status: 'active' } });
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
}
