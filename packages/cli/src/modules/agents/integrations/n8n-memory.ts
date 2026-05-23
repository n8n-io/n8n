import {
	activeLifecycleState,
	droppedLifecycleState,
	normalizeObservationLogReflection,
	hashEpisodicMemoryContent,
	hashEpisodicMemoryEvidence,
	markLifecycleActive,
	normalizeFlatReflectionActions,
	rankEpisodicMemoryEntries,
	supersededLifecycleState,
	uniqueStrings,
	type AgentDbMessage,
	type AgentMessage,
	type BuiltEpisodicMemoryStore,
	type BuiltMemory,
	type BuiltObservationLogStore,
	type BuiltObservationLogTaskLockStore,
	type EpisodicMemoryCursor,
	type EpisodicMemoryEntry,
	type EpisodicMemoryEntrySource,
	type EpisodicMemoryMethods,
	type EpisodicMemoryReflectionApply,
	type EpisodicMemoryReflectionResult,
	type EpisodicMemoryScope,
	type EpisodicMemorySearchOptions,
	type EpisodicMemoryTaskLockHandle,
	type MemoryDescriptor,
	type NewEpisodicMemoryCursor,
	type NewEpisodicMemoryEntry,
	type NewEpisodicMemoryEntrySourceForEntry,
	type NewObservationLogEntry,
	type ObservationCursor,
	type ObservationLogEntry,
	type ObservationLogReadOptions,
	type ObservationLogReflection,
	type ObservationLogReflectionResult,
	type ObservationLogScope,
	type ObservationLogTaskKind,
	type ObservationLogTaskLockHandle,
	type RetrievedEpisodicMemoryEntry,
	type Thread,
} from '@n8n/agents';
import { Service } from '@n8n/di';
import type { EntityManager, FindOperator, FindOptionsWhere } from '@n8n/typeorm';
import { Equal, In, IsNull, LessThan, Like, MoreThan } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';

import { isUniqueConstraintError } from '@/response-helper';

import { AgentMemoryEntryCursorEntity } from '../entities/agent-memory-entry-cursor.entity';
import { AgentMemoryEntryEntity } from '../entities/agent-memory-entry.entity';
import { AgentMemoryEntryLockEntity } from '../entities/agent-memory-entry-lock.entity';
import { AgentMemoryEntrySourceEntity } from '../entities/agent-memory-entry-source.entity';
import type { AgentMessageEntity } from '../entities/agent-message.entity';
import { AgentObservationCursorEntity } from '../entities/agent-observation-cursor.entity';
import { AgentObservationLockEntity } from '../entities/agent-observation-lock.entity';
import { AgentObservationEntity } from '../entities/agent-observation.entity';
import { AgentThreadEntity } from '../entities/agent-thread.entity';
import { AgentMessageRepository } from '../repositories/agent-message.repository';
import { AgentMemoryEntryCursorRepository } from '../repositories/agent-memory-entry-cursor.repository';
import { AgentMemoryEntryLockRepository } from '../repositories/agent-memory-entry-lock.repository';
import { AgentMemoryEntrySourceRepository } from '../repositories/agent-memory-entry-source.repository';
import { AgentMemoryEntryRepository } from '../repositories/agent-memory-entry.repository';
import { AgentObservationCursorRepository } from '../repositories/agent-observation-cursor.repository';
import { AgentObservationLockRepository } from '../repositories/agent-observation-lock.repository';
import { AgentObservationRepository } from '../repositories/agent-observation.repository';
import { AgentResourceRepository } from '../repositories/agent-resource.repository';
import { AgentThreadRepository } from '../repositories/agent-thread.repository';

const estimateObservationTokens = (text: string) => Math.ceil(text.length / 4);

@Service()
export class N8nMemory {
	constructor(
		private readonly threadRepository: AgentThreadRepository,
		private readonly messageRepository: AgentMessageRepository,
		private readonly resourceRepository: AgentResourceRepository,
		private readonly observationRepository: AgentObservationRepository,
		private readonly observationCursorRepository: AgentObservationCursorRepository,
		private readonly observationLockRepository: AgentObservationLockRepository,
		private readonly memoryEntryRepository: AgentMemoryEntryRepository,
		private readonly memoryEntryLockRepository: AgentMemoryEntryLockRepository,
		private readonly memoryEntrySourceRepository: AgentMemoryEntrySourceRepository,
		private readonly memoryEntryCursorRepository: AgentMemoryEntryCursorRepository,
	) {}

	getImplementation(agentId: string) {
		return new N8nMemoryImpl(
			agentId,
			this.threadRepository,
			this.messageRepository,
			this.resourceRepository,
			this.observationRepository,
			this.observationCursorRepository,
			this.observationLockRepository,
			this.memoryEntryRepository,
			this.memoryEntryLockRepository,
			this.memoryEntrySourceRepository,
			this.memoryEntryCursorRepository,
		);
	}
}

export class N8nMemoryImpl
	implements
		BuiltMemory,
		BuiltObservationLogStore,
		BuiltObservationLogTaskLockStore,
		BuiltEpisodicMemoryStore
{
	constructor(
		private readonly agentId: string,
		private readonly threadRepository: AgentThreadRepository,
		private readonly messageRepository: AgentMessageRepository,
		private readonly resourceRepository: AgentResourceRepository,
		private readonly observationRepository: AgentObservationRepository,
		private readonly observationCursorRepository: AgentObservationCursorRepository,
		private readonly observationLockRepository: AgentObservationLockRepository,
		private readonly memoryEntryRepository: AgentMemoryEntryRepository,
		private readonly memoryEntryLockRepository: AgentMemoryEntryLockRepository,
		private readonly memoryEntrySourceRepository: AgentMemoryEntrySourceRepository,
		private readonly memoryEntryCursorRepository: AgentMemoryEntryCursorRepository,
	) {}

	readonly episodic: EpisodicMemoryMethods = {
		saveEntryWithSources: async (entry, sources) =>
			await this.saveEpisodicMemoryEntryWithSources(entry, sources),
		searchEntries: async (scope, query, opts) =>
			await this.searchEpisodicMemoryEntries(scope, query, opts),
		getEntrySources: async (entryIds) => await this.getEpisodicMemoryEntrySources(entryIds),
		applyReflection: async (scope, reflection) =>
			await this.applyEpisodicMemoryReflection(scope, reflection),
		getCursor: async (scope) => await this.getEpisodicMemoryCursor(scope),
		setCursor: async (cursor) => await this.setEpisodicMemoryCursor(cursor),
		taskLock: {
			acquire: async (resourceId, opts) =>
				await this.acquireEpisodicMemoryTaskLock(resourceId, opts),
			release: async (handle) => await this.releaseEpisodicMemoryTaskLock(handle),
		},
	};

	// ── Thread management ────────────────────────────────────────────────

	async getThread(threadId: string): Promise<Thread | null> {
		const entity = await this.threadRepository.findOneBy({ id: threadId });
		if (!entity) return null;
		return this.toThread(entity);
	}

	async saveThread(thread: Omit<Thread, 'createdAt' | 'updatedAt'>): Promise<Thread> {
		await this.ensureResource(thread.resourceId);

		const existing = await this.threadRepository.findOneBy({ id: thread.id });

		if (existing) {
			// `resourceId` is treated as immutable on existing threads. Some thread
			// IDs can receive messages from more than one resource; overwriting the
			// column on each save would make ownership depend on the last writer.
			// Per-user scoping is enforced at the message level via resourceId.
			if (thread.title !== undefined) existing.title = thread.title;
			if (thread.metadata !== undefined) {
				existing.metadata = thread.metadata ? JSON.stringify(thread.metadata) : null;
			}
			const saved = await this.threadRepository.save(existing);
			return this.toThread(saved);
		}

		const entity = this.threadRepository.create({
			id: thread.id,
			resourceId: thread.resourceId,
			title: thread.title ?? null,
			metadata: thread.metadata ? JSON.stringify(thread.metadata) : null,
		});
		const saved = await this.threadRepository.save(entity);
		return this.toThread(saved);
	}

	private async ensureResource(resourceId: string): Promise<void> {
		const exists = await this.resourceRepository.existsBy({ id: resourceId });
		if (!exists) {
			await this.resourceRepository.save(
				this.resourceRepository.create({ id: resourceId, metadata: null }),
			);
		}
	}

	async deleteThread(threadId: string): Promise<void> {
		await this.threadRepository.manager.transaction(async (trx) => {
			await this.dropEpisodicEntriesWithoutSources(trx, threadId);
			const observationScope = { agentId: this.agentId, observationScopeId: threadId };
			await trx.delete(AgentObservationEntity, observationScope);
			await trx.delete(AgentObservationCursorEntity, observationScope);
			await trx.delete(AgentObservationLockEntity, observationScope);
			await trx.delete(AgentMemoryEntryCursorEntity, observationScope);
			await trx.delete(AgentThreadEntity, { id: threadId });
		});
	}

	async deleteThreadsByPrefix(threadIdPrefix: string): Promise<void> {
		const observationScopeId = Like(`${threadIdPrefix}%`);
		await this.threadRepository.manager.transaction(async (trx) => {
			await this.dropEpisodicEntriesWithoutSources(trx, observationScopeId);
			const observationScope = { agentId: this.agentId, observationScopeId };
			await trx.delete(AgentObservationEntity, observationScope);
			await trx.delete(AgentObservationCursorEntity, observationScope);
			await trx.delete(AgentObservationLockEntity, observationScope);
			await trx.delete(AgentMemoryEntryCursorEntity, observationScope);
			await trx.delete(AgentThreadEntity, { id: observationScopeId });
		});
	}

	private async dropEpisodicEntriesWithoutSources(
		trx: EntityManager,
		threadId: string | FindOperator<string>,
	): Promise<void> {
		const sourceRepo = trx.getRepository(AgentMemoryEntrySourceEntity);
		const entryRepo = trx.getRepository(AgentMemoryEntryEntity);
		const affectedSources = await sourceRepo.find({
			select: { memoryEntryId: true },
			where: { agentId: this.agentId, threadId },
		});
		const affectedEntryIds = uniqueStrings(affectedSources.map((source) => source.memoryEntryId));
		if (affectedEntryIds.length === 0) return;

		await trx.delete(AgentMemoryEntrySourceEntity, {
			agentId: this.agentId,
			threadId,
		});

		const remainingSources = await sourceRepo.find({
			select: { memoryEntryId: true },
			where: { agentId: this.agentId, memoryEntryId: In(affectedEntryIds) },
		});
		const entriesWithSources = new Set(remainingSources.map((source) => source.memoryEntryId));
		const orphanedEntryIds = affectedEntryIds.filter((id) => !entriesWithSources.has(id));
		if (orphanedEntryIds.length === 0) return;

		await entryRepo.update(
			{ agentId: this.agentId, id: In(orphanedEntryIds), status: 'active' },
			droppedLifecycleState(),
		);
	}

	// ── Message persistence ──────────────────────────────────────────────

	async getMessages(
		threadId: string,
		opts?: { limit?: number; before?: Date; resourceId?: string },
	): Promise<AgentDbMessage[]> {
		// `resourceId` is the per-user scope for any thread that carries messages
		// for more than one resource. Use an explicit `!== undefined` check — a
		// falsy (empty-string) value would otherwise drop the filter and leak other
		// users' messages.
		const where: FindOptionsWhere<AgentMessageEntity> = {
			threadId,
			...(opts?.before && { createdAt: LessThan(opts.before) }),
			...(opts?.resourceId !== undefined && { resourceId: opts.resourceId }),
		};

		const entities = await this.messageRepository.find({
			where,
			order: { createdAt: opts?.limit !== undefined ? 'DESC' : 'ASC' },
			...(opts?.limit !== undefined && { take: opts.limit }),
		});
		if (opts?.limit !== undefined) {
			entities.reverse();
		}

		return entities.map((e) => this.toAgentDbMessage(e));
	}

	async saveMessages(args: {
		threadId: string;
		resourceId: string;
		messages: AgentDbMessage[];
	}): Promise<void> {
		if (args.messages.length === 0) return;

		// Upsert by id — bulk INSERT … ON CONFLICT (id) DO UPDATE avoids the
		// per-row SELECT that save() performs. createdAt is passed explicitly so
		// the column is preserved on conflict; updatedAt is set manually because
		// the @BeforeUpdate hook does not fire during upsert.
		const now = new Date();
		const entities = args.messages.map((dbMsg) => {
			const role = 'role' in dbMsg ? (dbMsg.role as string) : 'custom';
			const type = 'type' in dbMsg ? (dbMsg.type as string) : null;
			return {
				id: dbMsg.id,
				threadId: args.threadId,
				resourceId: args.resourceId,
				role,
				type: type ?? null,
				content: dbMsg as unknown as Record<string, unknown>,
				createdAt: dbMsg.createdAt,
				updatedAt: now,
			} as QueryDeepPartialEntity<AgentMessageEntity>;
		});

		await this.messageRepository.upsert(entities, ['id']);
	}

	async deleteMessages(messageIds: string[]): Promise<void> {
		if (messageIds.length === 0) return;
		await this.messageRepository.delete(messageIds);
	}

	async deleteMessagesByThread(threadId: string, resourceId?: string): Promise<void> {
		// Mirrors `getMessages`: explicit `!== undefined` check so that a falsy
		// (empty-string) `resourceId` cannot accidentally delete every user's
		// messages on a shared thread.
		await this.messageRepository.delete({
			threadId,
			...(resourceId !== undefined && { resourceId }),
		});
	}

	// ── Observation log ──────────────────────────────────────────────────

	async appendObservationLogEntries(
		rows: NewObservationLogEntry[],
	): Promise<ObservationLogEntry[]> {
		if (rows.length === 0) return [];

		const entities: AgentObservationEntity[] = rows.map((row) =>
			this.observationRepository.create({
				agentId: this.agentId,
				observationScopeId: row.observationScopeId,
				marker: row.marker,
				text: row.text,
				parentId: row.parentId ?? null,
				tokenCount: row.tokenCount ?? estimateObservationTokens(row.text),
				...activeLifecycleState(),
				createdAt: row.createdAt,
			}),
		);

		const saved = await this.observationRepository.save(entities);
		return saved.map((e) => this.toObservationLogEntry(e));
	}

	async getActiveObservationLog(
		scope: ObservationLogScope & { limit?: number; order?: 'asc' | 'desc' },
	): Promise<ObservationLogEntry[]> {
		return await this.getObservationLog({ ...scope, status: 'active' });
	}

	async getObservationLog(opts: ObservationLogReadOptions): Promise<ObservationLogEntry[]> {
		const baseWhere: FindOptionsWhere<AgentObservationEntity> = {
			agentId: this.agentId,
			observationScopeId: opts.observationScopeId,
			...(opts.status !== undefined && { status: opts.status }),
			...(opts.parentId !== undefined && { parentId: opts.parentId ?? IsNull() }),
		};

		const entities = await this.observationRepository.find({
			where: [baseWhere],
			order: {
				createdAt: opts.order === 'desc' ? 'DESC' : 'ASC',
				id: opts.order === 'desc' ? 'DESC' : 'ASC',
			},
			...(opts.limit !== undefined && { take: opts.limit }),
		});
		return entities.map((e) => this.toObservationLogEntry(e));
	}

	async getMessagesForObservationScope(
		observationScopeId: string,
		opts?: { since?: { sinceCreatedAt: Date; sinceMessageId: string } },
	): Promise<AgentDbMessage[]> {
		const baseWhere: FindOptionsWhere<AgentMessageEntity> = {
			threadId: observationScopeId,
		};
		const where: FindOptionsWhere<AgentMessageEntity>[] = opts?.since
			? [
					{ ...baseWhere, createdAt: MoreThan(opts.since.sinceCreatedAt) },
					{
						...baseWhere,
						createdAt: Equal(opts.since.sinceCreatedAt),
						id: MoreThan(opts.since.sinceMessageId),
					},
				]
			: [baseWhere];

		const entities = await this.messageRepository.find({
			where,
			order: { createdAt: 'ASC', id: 'ASC' },
		});
		return entities.map((e) => this.toAgentDbMessage(e));
	}

	async dropObservationLogEntries(ids: string[]): Promise<void> {
		if (ids.length === 0) return;
		await this.observationRepository.update({ id: In(ids) }, droppedLifecycleState());
	}

	async supersedeObservationLogEntries(ids: string[], supersededBy: string): Promise<void> {
		if (ids.length === 0) return;
		await this.observationRepository.update(
			{ id: In(ids) },
			supersededLifecycleState(supersededBy),
		);
	}

	async applyObservationLogReflection(
		scope: ObservationLogScope,
		reflection: ObservationLogReflection,
	): Promise<ObservationLogReflectionResult> {
		return await this.observationRepository.manager.transaction(async (trx) => {
			const repo = trx.getRepository(AgentObservationEntity);
			const activeEntries = await repo.find({
				where: {
					agentId: this.agentId,
					observationScopeId: scope.observationScopeId,
					status: 'active',
				},
				order: { createdAt: 'ASC', id: 'ASC' },
			});
			const normalized = normalizeObservationLogReflection(
				activeEntries.map((entry) => this.toObservationLogEntry(entry)),
				reflection,
			);
			const inserted = normalized.merge.length
				? await repo.save(
						normalized.merge.map((entry) =>
							repo.create({
								agentId: this.agentId,
								observationScopeId: scope.observationScopeId,
								marker: entry.marker,
								text: entry.text,
								parentId: entry.parentId ?? null,
								tokenCount: entry.tokenCount ?? estimateObservationTokens(entry.text),
								...activeLifecycleState(),
								createdAt: entry.createdAt,
							}),
						),
					)
				: [];

			if (normalized.drop.length > 0) {
				await repo.update(
					{
						agentId: this.agentId,
						observationScopeId: scope.observationScopeId,
						id: In(normalized.drop),
					},
					droppedLifecycleState(),
				);
			}

			for (const [index, merge] of normalized.merge.entries()) {
				const replacement = inserted[index];
				if (replacement && merge.supersedes.length > 0) {
					await repo.update(
						{
							agentId: this.agentId,
							observationScopeId: scope.observationScopeId,
							id: In(merge.supersedes),
						},
						supersededLifecycleState(replacement.id),
					);
				}
			}

			return {
				droppedIds: [...normalized.drop],
				supersededIds: normalized.merge.flatMap((entry) => entry.supersedes),
				inserted: inserted.map((entry) => this.toObservationLogEntry(entry)),
			};
		});
	}

	// ── Observational memory: cursors ────────────────────────────────────

	async getCursor(observationScopeId: string): Promise<ObservationCursor | null> {
		const entity = await this.observationCursorRepository.findOneBy({
			agentId: this.agentId,
			observationScopeId,
		});
		if (!entity) return null;
		return {
			observationScopeId: entity.observationScopeId,
			lastObservedMessageId: entity.lastObservedMessageId,
			lastObservedAt: entity.lastObservedAt,
			updatedAt: entity.updatedAt,
		};
	}

	async setCursor(cursor: ObservationCursor): Promise<void> {
		await this.observationCursorRepository.upsert(
			{
				agentId: this.agentId,
				observationScopeId: cursor.observationScopeId,
				lastObservedMessageId: cursor.lastObservedMessageId,
				lastObservedAt: cursor.lastObservedAt,
				updatedAt: cursor.updatedAt,
			},
			{
				conflictPaths: ['agentId', 'observationScopeId'],
				skipUpdateIfNoValuesChanged: false,
			},
		);
	}

	// ── Observation log: locks ───────────────────────────────────────────

	async acquireObservationLogTaskLock(
		observationScopeId: string,
		taskKind: ObservationLogTaskKind,
		opts: { ttlMs: number; holderId: string },
	): Promise<ObservationLogTaskLockHandle | null> {
		const now = new Date();
		const heldUntil = new Date(now.getTime() + opts.ttlMs);

		// FIXME: This persisted lock is per task kind. In multi-main mode, observer
		// and reflector tasks for the same scope can still overlap across servers.
		const updateResult = await this.observationLockRepository
			.createQueryBuilder()
			.update(AgentObservationLockEntity)
			.set({ taskKind, holderId: opts.holderId, heldUntil })
			.where('"agentId" = :agentId')
			.andWhere('"observationScopeId" = :observationScopeId')
			.andWhere('"taskKind" = :taskKind')
			.andWhere('("holderId" = :holderId OR "heldUntil" <= :now)')
			.setParameters({
				agentId: this.agentId,
				observationScopeId,
				taskKind,
				holderId: opts.holderId,
				now,
			})
			.execute();

		if ((updateResult.affected ?? 0) > 0) {
			return { observationScopeId, taskKind, holderId: opts.holderId, heldUntil };
		}

		await this.observationLockRepository
			.createQueryBuilder()
			.insert()
			.into(AgentObservationLockEntity)
			.values({
				agentId: this.agentId,
				observationScopeId,
				taskKind,
				holderId: opts.holderId,
				heldUntil,
			})
			.orIgnore()
			.execute();

		const claimed = await this.observationLockRepository.findOneBy({
			agentId: this.agentId,
			observationScopeId,
			taskKind,
			holderId: opts.holderId,
		});
		if (!claimed) return null;

		return { observationScopeId, taskKind, holderId: opts.holderId, heldUntil };
	}

	async releaseObservationLogTaskLock(handle: ObservationLogTaskLockHandle): Promise<void> {
		await this.releaseScopeLock(handle);
	}

	private async releaseScopeLock(handle: ObservationLogTaskLockHandle): Promise<void> {
		await this.observationLockRepository.delete({
			agentId: this.agentId,
			observationScopeId: handle.observationScopeId,
			taskKind: handle.taskKind,
			holderId: handle.holderId,
		});
	}

	// ── Episodic memory ──────────────────────────────────────────────────

	private async acquireEpisodicMemoryTaskLock(
		resourceId: string,
		opts: { ttlMs: number; holderId: string },
	): Promise<EpisodicMemoryTaskLockHandle | null> {
		await this.ensureResource(resourceId);

		const now = new Date();
		const heldUntil = new Date(now.getTime() + opts.ttlMs);
		const updateResult = await this.memoryEntryLockRepository
			.createQueryBuilder()
			.update(AgentMemoryEntryLockEntity)
			.set({ holderId: opts.holderId, heldUntil })
			.where('"agentId" = :agentId')
			.andWhere('"resourceId" = :resourceId')
			.andWhere('("holderId" = :holderId OR "heldUntil" <= :now)')
			.setParameters({
				agentId: this.agentId,
				resourceId,
				holderId: opts.holderId,
				now,
			})
			.execute();

		if ((updateResult.affected ?? 0) > 0) {
			return { resourceId, holderId: opts.holderId, heldUntil };
		}

		await this.memoryEntryLockRepository
			.createQueryBuilder()
			.insert()
			.into(AgentMemoryEntryLockEntity)
			.values({ agentId: this.agentId, resourceId, holderId: opts.holderId, heldUntil })
			.orIgnore()
			.execute();

		const claimed = await this.memoryEntryLockRepository.findOneBy({
			agentId: this.agentId,
			resourceId,
			holderId: opts.holderId,
		});
		if (!claimed) return null;

		return { resourceId, holderId: opts.holderId, heldUntil };
	}

	private async releaseEpisodicMemoryTaskLock(handle: EpisodicMemoryTaskLockHandle): Promise<void> {
		await this.memoryEntryLockRepository.delete({
			agentId: this.agentId,
			resourceId: handle.resourceId,
			holderId: handle.holderId,
		});
	}

	private async saveEpisodicMemoryEntryWithSources(
		entry: NewEpisodicMemoryEntry,
		sources: NewEpisodicMemoryEntrySourceForEntry[],
	): Promise<EpisodicMemoryEntry | null> {
		await this.ensureResource(entry.resourceId);
		return await this.memoryEntryRepository.manager.transaction(async (trx) => {
			const entryRepo = trx.getRepository(AgentMemoryEntryEntity);
			const sourceRepo = trx.getRepository(AgentMemoryEntrySourceEntity);
			const contentHash = entry.contentHash ?? hashEpisodicMemoryContent(entry.content);
			const now = new Date();
			const entity = entryRepo.create({
				agentId: this.agentId,
				resourceId: entry.resourceId,
				content: entry.content,
				contentHash,
				...activeLifecycleState(),
				embeddingModel: entry.embeddingModel ?? null,
				embedding: entry.embedding ?? null,
				metadata: entry.metadata ?? null,
				createdAt: entry.createdAt ?? now,
				lastSeenAt: entry.lastSeenAt ?? now,
			});

			let persisted: AgentMemoryEntryEntity | null = null;
			try {
				const [saved] = await entryRepo.save([entity]);
				persisted = saved ?? null;
			} catch (error) {
				if (!(error instanceof Error) || !isUniqueConstraintError(error)) throw error;
				const existing = await entryRepo.findOneBy({
					agentId: this.agentId,
					resourceId: entry.resourceId,
					contentHash,
				});
				if (!existing) throw error;
				markLifecycleActive(existing);
				existing.lastSeenAt = entry.lastSeenAt ?? now;
				existing.updatedAt = now;
				const [saved] = await entryRepo.save([existing]);
				persisted = saved ?? existing;
			}

			if (!persisted) return null;

			for (const source of sources) {
				const evidenceHash = hashEpisodicMemoryEvidence(source.evidenceText);
				const sourceEntity = sourceRepo.create({
					agentId: this.agentId,
					memoryEntryId: persisted.id,
					observationId: source.observationId,
					threadId: source.threadId,
					evidenceHash,
					evidenceText: source.evidenceText,
					createdAt: source.createdAt,
				});
				try {
					await sourceRepo.save([sourceEntity]);
				} catch (error) {
					if (!(error instanceof Error) || !isUniqueConstraintError(error)) throw error;
					const existing = await sourceRepo.findOneBy({
						agentId: this.agentId,
						memoryEntryId: persisted.id,
						observationId: source.observationId,
						evidenceHash,
					});
					if (!existing) throw error;
				}
			}

			return this.toEpisodicMemoryEntry(persisted);
		});
	}

	private async searchEpisodicMemoryEntries(
		scope: EpisodicMemoryScope,
		query: string,
		opts?: EpisodicMemorySearchOptions,
	): Promise<RetrievedEpisodicMemoryEntry[]> {
		const statuses = opts?.includeStatuses ?? ['active'];
		const entities = await this.memoryEntryRepository.find({
			where: { agentId: this.agentId, resourceId: scope.resourceId, status: In(statuses) },
		});
		return rankEpisodicMemoryEntries(
			entities.map((entity) => this.toEpisodicMemoryEntry(entity)),
			query,
			opts,
		);
	}

	private async getEpisodicMemoryEntrySources(
		entryIds: string[],
	): Promise<EpisodicMemoryEntrySource[]> {
		if (entryIds.length === 0) return [];
		const entities = await this.memoryEntrySourceRepository.find({
			where: { agentId: this.agentId, memoryEntryId: In(entryIds) },
			order: { createdAt: 'ASC', id: 'ASC' },
		});
		return entities.map((entity) => this.toEpisodicMemoryEntrySource(entity));
	}

	private async applyEpisodicMemoryReflection(
		scope: EpisodicMemoryScope,
		reflection: EpisodicMemoryReflectionApply,
	): Promise<EpisodicMemoryReflectionResult> {
		return await this.memoryEntryRepository.manager.transaction(async (trx) => {
			const entryRepo = trx.getRepository(AgentMemoryEntryEntity);
			const sourceRepo = trx.getRepository(AgentMemoryEntrySourceEntity);
			const actionIds = uniqueStrings([
				...reflection.drop,
				...reflection.merge.flatMap((merge) => merge.supersedes),
			]);
			if (actionIds.length === 0) return { droppedIds: [], supersededIds: [], inserted: [] };

			const activeEntries = await entryRepo.find({
				where: {
					agentId: this.agentId,
					resourceId: scope.resourceId,
					id: In(actionIds),
					status: 'active',
				},
			});
			const activeIds = new Set(activeEntries.map((entry) => entry.id));
			const normalized = normalizeFlatReflectionActions({
				activeIds,
				drop: reflection.drop,
				merge: reflection.merge,
				normalizeMerge: (entry, supersedes) => ({ ...entry, supersedes }),
			});

			const now = new Date();
			const replacementHashes = uniqueStrings(
				normalized.merge.map(
					(item) => item.entry.contentHash ?? hashEpisodicMemoryContent(item.entry.content),
				),
			);
			const existingReplacements = replacementHashes.length
				? await entryRepo.find({
						where: {
							agentId: this.agentId,
							resourceId: scope.resourceId,
							contentHash: In(replacementHashes),
						},
					})
				: [];
			const existingByHash = new Map(
				existingReplacements.map((entry) => [entry.contentHash, entry]),
			);
			const replacements: AgentMemoryEntryEntity[] = [];
			for (const item of normalized.merge) {
				const contentHash = item.entry.contentHash ?? hashEpisodicMemoryContent(item.entry.content);
				const existing = existingByHash.get(contentHash);
				const update: QueryDeepPartialEntity<AgentMemoryEntryEntity> = {
					...activeLifecycleState(),
					lastSeenAt: item.entry.lastSeenAt ?? now,
					updatedAt: now,
				};
				if (item.entry.embedding !== undefined) update.embedding = item.entry.embedding;
				if (item.entry.embeddingModel !== undefined) {
					update.embeddingModel = item.entry.embeddingModel;
				}
				if (item.entry.metadata !== undefined) update.metadata = item.entry.metadata;

				if (existing) {
					await entryRepo.update(
						{ agentId: this.agentId, resourceId: scope.resourceId, id: existing.id },
						update,
					);
					replacements.push({
						...existing,
						...update,
					} as AgentMemoryEntryEntity);
					continue;
				}

				const entity = entryRepo.create({
					agentId: this.agentId,
					resourceId: scope.resourceId,
					content: item.entry.content,
					contentHash,
					...activeLifecycleState(),
					embeddingModel: item.entry.embeddingModel ?? null,
					embedding: item.entry.embedding ?? null,
					metadata: item.entry.metadata ?? null,
					createdAt: item.entry.createdAt ?? now,
					lastSeenAt: item.entry.lastSeenAt ?? now,
				});
				try {
					const [persisted] = await entryRepo.save([entity]);
					if (persisted) {
						existingByHash.set(contentHash, persisted);
						replacements.push(persisted);
					}
				} catch (error) {
					if (!(error instanceof Error) || !isUniqueConstraintError(error)) throw error;
					const persisted = await entryRepo.findOneBy({
						agentId: this.agentId,
						resourceId: scope.resourceId,
						contentHash,
					});
					if (!persisted) throw error;
					await entryRepo.update(
						{ agentId: this.agentId, resourceId: scope.resourceId, id: persisted.id },
						update,
					);
					existingByHash.set(contentHash, persisted);
					replacements.push({
						...persisted,
						...update,
					} as AgentMemoryEntryEntity);
				}
			}
			const replacementIds = new Set(replacements.map((entry) => entry.id));
			const effectiveDrop = normalized.drop.filter((id) => !replacementIds.has(id));

			if (effectiveDrop.length > 0) {
				await entryRepo.update(
					{
						agentId: this.agentId,
						resourceId: scope.resourceId,
						id: In(effectiveDrop),
						status: 'active',
					},
					droppedLifecycleState(),
				);
			}

			const supersededIds: string[] = [];
			for (const [index, item] of normalized.merge.entries()) {
				const replacement = replacements[index];
				if (!replacement) continue;
				const sourceRows = await sourceRepo.find({
					where: { agentId: this.agentId, memoryEntryId: In(item.supersedes) },
					order: { createdAt: 'ASC', id: 'ASC' },
				});
				const existingReplacementSources = await sourceRepo.find({
					where: { agentId: this.agentId, memoryEntryId: replacement.id },
				});
				const existingKeys = new Set(
					existingReplacementSources.map(
						(source) => `${source.observationId}\n${source.evidenceHash}`,
					),
				);
				const copiedSources = sourceRows.flatMap((source) => {
					const key = `${source.observationId}\n${source.evidenceHash}`;
					if (existingKeys.has(key)) return [];
					existingKeys.add(key);
					return [
						sourceRepo.create({
							agentId: this.agentId,
							memoryEntryId: replacement.id,
							observationId: source.observationId,
							threadId: source.threadId,
							evidenceHash: source.evidenceHash,
							evidenceText: source.evidenceText,
							createdAt: now,
						}),
					];
				});
				if (copiedSources.length > 0) await sourceRepo.save(copiedSources);
				const itemSupersededIds = item.supersedes.filter((id) => id !== replacement.id);
				if (itemSupersededIds.length > 0) {
					await entryRepo.update(
						{
							agentId: this.agentId,
							resourceId: scope.resourceId,
							id: In(itemSupersededIds),
							status: 'active',
						},
						supersededLifecycleState(replacement.id),
					);
					supersededIds.push(...itemSupersededIds);
				}
			}

			return {
				droppedIds: effectiveDrop,
				supersededIds,
				inserted: replacements.map((entry) => this.toEpisodicMemoryEntry(entry)),
			};
		});
	}

	private async getEpisodicMemoryCursor(
		scope: ObservationLogScope,
	): Promise<EpisodicMemoryCursor | null> {
		const entity = await this.memoryEntryCursorRepository.findOneBy({
			agentId: this.agentId,
			observationScopeId: scope.observationScopeId,
		});
		if (!entity) return null;
		return {
			observationScopeId: entity.observationScopeId,
			lastIndexedObservationId: entity.lastIndexedObservationId,
			lastIndexedObservationCreatedAt: entity.lastIndexedObservationCreatedAt,
			updatedAt: entity.updatedAt,
		};
	}

	private async setEpisodicMemoryCursor(cursor: NewEpisodicMemoryCursor): Promise<void> {
		const cursorRow: QueryDeepPartialEntity<AgentMemoryEntryCursorEntity> = {
			agentId: this.agentId,
			observationScopeId: cursor.observationScopeId,
			lastIndexedObservationId: cursor.lastIndexedObservationId,
			lastIndexedObservationCreatedAt: cursor.lastIndexedObservationCreatedAt,
			updatedAt: cursor.updatedAt ?? new Date(),
		};

		await this.memoryEntryCursorRepository
			.createQueryBuilder()
			.insert()
			.into(AgentMemoryEntryCursorEntity)
			.values(cursorRow)
			.orIgnore()
			.execute();

		await this.memoryEntryCursorRepository
			.createQueryBuilder()
			.update(AgentMemoryEntryCursorEntity)
			.set(cursorRow)
			.where('"agentId" = :agentId')
			.andWhere('"observationScopeId" = :observationScopeId')
			.andWhere(
				'("lastIndexedObservationCreatedAt" < :lastIndexedObservationCreatedAt OR ("lastIndexedObservationCreatedAt" = :lastIndexedObservationCreatedAt AND "lastIndexedObservationId" < :lastIndexedObservationId))',
			)
			.setParameters({
				agentId: this.agentId,
				observationScopeId: cursor.observationScopeId,
				lastIndexedObservationId: cursor.lastIndexedObservationId,
				lastIndexedObservationCreatedAt: cursor.lastIndexedObservationCreatedAt,
			})
			.execute();
	}

	// ── Descriptor ───────────────────────────────────────────────────────

	describe(): MemoryDescriptor {
		return { name: 'n8n', connectionParams: {}, constructorName: this.constructor.name };
	}

	// ── Helpers ──────────────────────────────────────────────────────────

	private toAgentDbMessage(entity: AgentMessageEntity): AgentDbMessage {
		const msg = entity.content as AgentMessage & { id?: string; createdAt?: Date };
		msg.id = entity.id;
		msg.createdAt = entity.createdAt;
		return msg as AgentDbMessage;
	}

	private toObservationLogEntry(entity: AgentObservationEntity): ObservationLogEntry {
		return {
			id: entity.id,
			observationScopeId: entity.observationScopeId,
			marker: entity.marker,
			text: entity.text,
			parentId: entity.parentId,
			tokenCount: Number(entity.tokenCount),
			status: entity.status,
			supersededBy: entity.supersededBy,
			createdAt: entity.createdAt,
		};
	}

	private toEpisodicMemoryEntry(entity: AgentMemoryEntryEntity): EpisodicMemoryEntry {
		return {
			id: entity.id,
			resourceId: entity.resourceId,
			content: entity.content,
			contentHash: entity.contentHash,
			status: entity.status,
			supersededBy: entity.supersededBy,
			...(entity.embedding ? { embedding: entity.embedding } : {}),
			...(entity.embeddingModel ? { embeddingModel: entity.embeddingModel } : {}),
			metadata: entity.metadata,
			createdAt: entity.createdAt,
			updatedAt: entity.updatedAt,
			lastSeenAt: entity.lastSeenAt,
		};
	}

	private toEpisodicMemoryEntrySource(
		entity: AgentMemoryEntrySourceEntity,
	): EpisodicMemoryEntrySource {
		return {
			id: entity.id,
			memoryEntryId: entity.memoryEntryId,
			observationId: entity.observationId,
			threadId: entity.threadId,
			evidenceText: entity.evidenceText,
			createdAt: entity.createdAt,
		};
	}

	private toThread(entity: AgentThreadEntity): Thread {
		let metadata: Record<string, unknown> | undefined;
		if (entity.metadata) {
			try {
				metadata = JSON.parse(entity.metadata) as Record<string, unknown>;
			} catch {
				metadata = undefined;
			}
		}
		return {
			id: entity.id,
			resourceId: entity.resourceId,
			title: entity.title ?? undefined,
			metadata,
			createdAt: entity.createdAt,
			updatedAt: entity.updatedAt,
		};
	}
}
