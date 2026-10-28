import {
	activeLifecycleState,
	droppedLifecycleState,
	estimateObservationTokens,
	normalizeObservationLogReflection,
	rankEpisodicMemoryEntries,
	supersededLifecycleState,
	uniqueStrings,
	type AgentDbMessage,
	type BuiltEpisodicMemoryCaptureStore,
	type BuiltEpisodicMemoryStore,
	type BuiltMemory,
	type BuiltObservationLogStore,
	type BuiltObservationLogTaskLockStore,
	type EpisodicMemoryCaptureCandidate,
	type EpisodicMemoryEntry,
	type EpisodicMemoryEntrySource,
	type EpisodicMemoryReflectionApply,
	type EpisodicMemoryReflectionResult,
	type EpisodicMemoryScope,
	type EpisodicMemorySearchOptions,
	type EpisodicMemoryStatus,
	type EpisodicMemoryTaskLockHandle,
	type MemoryDescriptor,
	type NewEpisodicMemoryCaptureCandidate,
	type NewEpisodicMemoryEntry,
	type NewEpisodicMemoryEntrySourceForEntry,
	type NewObservationLogEntry,
	type ObservationCursor,
	type ObservationLogBatch,
	type ObservationLogBatchCommitResult,
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
import type { AgentMessageAuthor } from '@n8n/api-types';
import type { OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import type { EntityManager, FindOperator, FindOptionsWhere } from '@n8n/typeorm';
import { In, IsNull, Like } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';

import { AgentMemoryEntryCandidateEntity } from '../entities/agent-memory-entry-candidate.entity';
import { AgentMemoryEntryLockEntity } from '../entities/agent-memory-entry-lock.entity';
import { AgentMemoryEntrySourceEntity } from '../entities/agent-memory-entry-source.entity';
import { AgentMemoryEntryEntity } from '../entities/agent-memory-entry.entity';
import type { AgentMessageEntity, AgentMessageOrigin } from '../entities/agent-message.entity';
import { AgentObservationCursorEntity } from '../entities/agent-observation-cursor.entity';
import { AgentObservationLockEntity } from '../entities/agent-observation-lock.entity';
import { AgentObservationEntity } from '../entities/agent-observation.entity';
import { AgentThreadEntity } from '../entities/agent-thread.entity';
import { AgentMemoryEntryCandidateRepository } from '../repositories/agent-memory-entry-candidate.repository';
import { AgentMemoryEntryLockRepository } from '../repositories/agent-memory-entry-lock.repository';
import { AgentMemoryEntrySourceRepository } from '../repositories/agent-memory-entry-source.repository';
import { AgentMemoryEntryRepository } from '../repositories/agent-memory-entry.repository';
import { AgentMessageRepository } from '../repositories/agent-message.repository';
import { AgentObservationCursorRepository } from '../repositories/agent-observation-cursor.repository';
import { AgentObservationLockRepository } from '../repositories/agent-observation-lock.repository';
import { AgentObservationRepository } from '../repositories/agent-observation.repository';
import { AgentResourceRepository } from '../repositories/agent-resource.repository';
import { AgentThreadRepository } from '../repositories/agent-thread.repository';
import { EXECUTION_METADATA_KEY } from '../types/agent-queued-message';
import { isIntegrationMemoryResourceId } from '../utils/agent-memory-scope';

/**
 * Integration chats are shared conversations, so each channel resolves its own
 * scope. A turn on an integration resource without one has no owner: it must
 * not capture, and it recalls nothing. Other runs keep their resource as scope.
 */
function episodicWriteScopeId(scope: Pick<EpisodicMemoryScope, 'resourceId' | 'episodic'>): string {
	if (scope.episodic) return scope.episodic.writeScopeId;
	if (isIntegrationMemoryResourceId(scope.resourceId)) {
		throw new UnexpectedError('An integration turn needs a resolved episodic memory scope');
	}
	return scope.resourceId;
}

/** The write scope as a list: empty when the turn has no owner, so reads stay empty. */
function episodicWriteScopeIds(scope: EpisodicMemoryScope): string[] {
	const hasOwner = scope.episodic !== undefined || !isIntegrationMemoryResourceId(scope.resourceId);
	return hasOwner ? [episodicWriteScopeId(scope)] : [];
}

function episodicReadScopeIds(scope: EpisodicMemoryScope): string[] {
	if (scope.episodic) return scope.episodic.readScopeIds;
	return isIntegrationMemoryResourceId(scope.resourceId) ? [] : [scope.resourceId];
}

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
		private readonly memoryEntryCandidateRepository: AgentMemoryEntryCandidateRepository,
		private readonly memoryEntryLockRepository: AgentMemoryEntryLockRepository,
		private readonly memoryEntrySourceRepository: AgentMemoryEntrySourceRepository,
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
			this.memoryEntryCandidateRepository,
			this.memoryEntryLockRepository,
			this.memoryEntrySourceRepository,
		);
	}
}

export type EpisodicMemorySourceWithMessageContext = EpisodicMemoryEntrySource & {
	author?: AgentMessageAuthor;
	origin?: AgentMessageOrigin;
};

export class N8nMemoryImpl
	implements
		BuiltMemory,
		BuiltObservationLogStore,
		BuiltObservationLogTaskLockStore,
		BuiltEpisodicMemoryStore,
		BuiltEpisodicMemoryCaptureStore
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
		private readonly memoryEntryCandidateRepository: AgentMemoryEntryCandidateRepository,
		private readonly memoryEntryLockRepository: AgentMemoryEntryLockRepository,
		private readonly memoryEntrySourceRepository: AgentMemoryEntrySourceRepository,
	) {}

	readonly episodic: BuiltEpisodicMemoryCaptureStore['episodic'] = {
		getEntriesByContentHashes: async (scope, contentHashes) =>
			await this.getEpisodicMemoryEntriesByContentHashes(scope, contentHashes),
		saveEntryWithSources: async (entry, sources) =>
			await this.saveEpisodicMemoryEntryWithSources(entry, sources),
		// Ranking uses the query embedding in `opts`, not the query text.
		searchEntries: async (scope, _query, opts) =>
			await this.searchEpisodicMemoryEntries(scope, opts),
		getEntrySources: async (entryIds) => await this.getEpisodicMemoryEntrySources(entryIds),
		applyReflection: async (scope, reflection) =>
			await this.applyEpisodicMemoryReflection(scope, reflection),
		enqueueCaptureCandidate: async (candidate) =>
			await this.enqueueEpisodicMemoryCaptureCandidate(candidate),
		getPendingCaptureCandidates: async (scope, opts) =>
			await this.getPendingEpisodicMemoryCaptureCandidates(scope, opts),
		completeCaptureCandidates: async (ids) =>
			await this.completeEpisodicMemoryCaptureCandidates(ids),
		recordCaptureCandidateFailure: async (ids, maxAttempts) =>
			await this.recordEpisodicMemoryCaptureCandidateFailure(ids, maxAttempts),
		findSimilarEntries: async (scope, embeddings, opts) =>
			await this.findSimilarEpisodicMemoryEntries(scope, embeddings, opts),
		addEntrySources: async (entryId, sources, lastSeenAt) =>
			await this.addEpisodicMemoryEntrySources(entryId, sources, lastSeenAt),
		taskLock: {
			acquire: async (scope, opts) => await this.acquireEpisodicMemoryTaskLock(scope, opts),
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
		await this.resourceRepository.ensureExists(thread.resourceId);

		// `resourceId` is treated as immutable on existing threads. Some thread
		// IDs can receive messages from more than one resource; overwriting the
		// column on each save would make ownership depend on the last writer.
		// Per-user scoping is enforced at the message level via resourceId.
		// The merge runs on the locked row, so a save cannot revert a concurrent
		// `patchThread`.
		const updated = await this.threadRepository.patchThread(
			thread.id,
			(row) => {
				if (thread.title === undefined && thread.metadata === undefined) return null;
				return {
					title: thread.title,
					// Thread metadata carries runtime-owned keys such as integration
					// message context, so caller updates merge into the existing blob.
					metadata:
						thread.metadata === undefined
							? undefined
							: this.mergeThreadMetadata(row.metadata, thread.metadata),
				};
			},
			{},
		);
		if (updated) return this.toThread(updated);

		const entity = this.threadRepository.create({
			id: thread.id,
			resourceId: thread.resourceId,
			title: thread.title ?? null,
			metadata: thread.metadata ? JSON.stringify(thread.metadata) : null,
		});
		const saved = await this.threadRepository.save(entity);
		return this.toThread(saved);
	}

	/**
	 * Read, update and write one thread in one transaction. Unlike `saveThread`,
	 * the update replaces the metadata, so a caller can remove keys. Concurrent
	 * patches do not lose updates: see `AgentThreadRepository.patchThread`.
	 *
	 * When `update` returns `null` or `undefined`, nothing is written and the
	 * current thread is returned. Returns `null` when the thread does not exist.
	 */
	async patchThread(
		args: {
			threadId: string;
			update: (
				current: Thread,
			) => { title?: string; metadata?: Record<string, unknown> } | null | undefined;
		},
		ctx: OperationContext = {},
	): Promise<Thread | null> {
		const row = await this.threadRepository.patchThread(
			args.threadId,
			(locked) => {
				const patch = args.update(this.toThread(locked));
				if (!patch) return null;
				return {
					title: patch.title,
					metadata: patch.metadata === undefined ? undefined : JSON.stringify(patch.metadata),
				};
			},
			ctx,
		);
		return row ? this.toThread(row) : null;
	}

	async deleteThread(threadId: string, ctx: OperationContext = {}): Promise<void> {
		await this.threadRepository.runInTransaction(ctx, async (trx) => {
			await this.dropEpisodicEntriesWithoutSources(trx, threadId);
			const observationScope = { agentId: this.agentId, observationScopeId: threadId };
			await trx.delete(AgentObservationEntity, observationScope);
			await trx.delete(AgentObservationCursorEntity, observationScope);
			await trx.delete(AgentObservationLockEntity, observationScope);
			await trx.delete(AgentThreadEntity, { id: threadId });
		});
	}

	async deleteThreadsByPrefix(threadIdPrefix: string): Promise<void> {
		await this.deleteThreadsMatching(Like(`${threadIdPrefix}%`));
	}

	/** Delete many threads and their thread-scoped state in one transaction. */
	async deleteThreads(threadIds: string[]): Promise<void> {
		if (threadIds.length === 0) return;
		await this.deleteThreadsMatching(In(threadIds));
	}

	private async deleteThreadsMatching(observationScopeId: FindOperator<string>): Promise<void> {
		await this.threadRepository.manager.transaction(async (trx) => {
			await this.dropEpisodicEntriesWithoutSources(trx, observationScopeId);
			const observationScope = { agentId: this.agentId, observationScopeId };
			await trx.delete(AgentObservationEntity, observationScope);
			await trx.delete(AgentObservationCursorEntity, observationScope);
			await trx.delete(AgentObservationLockEntity, observationScope);
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
		// Integration threads are shared conversations. Other threads remain
		// isolated by resource, including when the resource id is an empty string.
		const filterByResource =
			opts?.resourceId !== undefined && !isIntegrationMemoryResourceId(opts.resourceId);
		const entities = await this.messageRepository.findRuntimeMessages(
			{ threadId, ...(filterByResource && { resourceId: opts?.resourceId }) },
			opts,
		);

		return entities.map((e) => this.toAgentDbMessage(e));
	}

	async saveMessages(args: Parameters<BuiltMemory['saveMessages']>[0]): Promise<void> {
		const executionId = args.hostMetadata?.[EXECUTION_METADATA_KEY];
		await this.messageRepository.saveRuntimeMessages({
			threadId: args.threadId,
			resourceId: args.resourceId,
			messages: args.messages,
			...(typeof executionId === 'string' && { executionId }),
		});
	}

	async deleteMessages(messageIds: string[]): Promise<void> {
		await this.messageRepository.discardRuntimeInput(messageIds);
	}

	// ── Observation log ──────────────────────────────────────────────────

	async commitObservationLogBatch(
		batch: ObservationLogBatch,
	): Promise<ObservationLogBatchCommitResult> {
		return await this.observationRepository.commitObservationLogBatch(this.agentId, batch);
	}

	async appendObservationLogEntries(
		rows: NewObservationLogEntry[],
	): Promise<ObservationLogEntry[]> {
		if (rows.length === 0) return [];

		const entities: AgentObservationEntity[] = await Promise.all(
			rows.map(async (row) =>
				this.observationRepository.create({
					agentId: this.agentId,
					observationScopeId: row.observationScopeId,
					marker: row.marker,
					text: row.text,
					parentId: row.parentId ?? null,
					tokenCount: row.tokenCount ?? (await estimateObservationTokens(row.text)),
					...activeLifecycleState(),
					createdAt: row.createdAt,
				}),
			),
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
		const entities = await this.messageRepository.findRuntimeMessages(
			{ threadId: observationScopeId },
			opts,
		);
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
						await Promise.all(
							normalized.merge.map(async (entry) =>
								repo.create({
									agentId: this.agentId,
									observationScopeId: scope.observationScopeId,
									marker: entry.marker,
									text: entry.text,
									parentId: entry.parentId ?? null,
									tokenCount: entry.tokenCount ?? (await estimateObservationTokens(entry.text)),
									...activeLifecycleState(),
									createdAt: entry.createdAt,
								}),
							),
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

	private async enqueueEpisodicMemoryCaptureCandidate(
		candidate: NewEpisodicMemoryCaptureCandidate,
	): Promise<EpisodicMemoryCaptureCandidate> {
		const resourceId = episodicWriteScopeId(candidate);
		await this.resourceRepository.ensureExists(resourceId);
		const { episodic: _episodic, ...candidateData } = candidate;
		const entity = await this.memoryEntryCandidateRepository.enqueueCandidate({
			agentId: this.agentId,
			...candidateData,
			resourceId,
		});
		return this.toEpisodicMemoryCaptureCandidate(entity);
	}

	private async getPendingEpisodicMemoryCaptureCandidates(
		scope: EpisodicMemoryScope,
		opts?: { limit?: number },
	): Promise<EpisodicMemoryCaptureCandidate[]> {
		const entities = await this.memoryEntryCandidateRepository.findPendingForResource(
			this.agentId,
			episodicWriteScopeId(scope),
			opts?.limit ?? 100,
		);
		return entities.map((entity) => this.toEpisodicMemoryCaptureCandidate(entity));
	}

	private async completeEpisodicMemoryCaptureCandidates(ids: string[]): Promise<void> {
		await this.memoryEntryCandidateRepository.markCandidatesCompleted(this.agentId, ids);
	}

	private async recordEpisodicMemoryCaptureCandidateFailure(
		ids: string[],
		maxAttempts: number,
	): Promise<void> {
		await this.memoryEntryCandidateRepository.recordCandidateFailure(
			this.agentId,
			ids,
			maxAttempts,
		);
	}

	private async acquireEpisodicMemoryTaskLock(
		scope: EpisodicMemoryScope,
		opts: { ttlMs: number; holderId: string },
	): Promise<EpisodicMemoryTaskLockHandle | null> {
		const resourceId = episodicWriteScopeId(scope);
		await this.resourceRepository.ensureExists(resourceId);

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

	private async getEpisodicMemoryEntriesByContentHashes(
		scope: EpisodicMemoryScope,
		contentHashes: string[],
	): Promise<EpisodicMemoryEntry[]> {
		const entities = await this.memoryEntryRepository.findByContentHashes(
			this.agentId,
			episodicWriteScopeId(scope),
			contentHashes,
		);
		return entities.map((entity) => this.toEpisodicMemoryEntry(entity));
	}

	private async saveEpisodicMemoryEntryWithSources(
		entry: NewEpisodicMemoryEntry,
		sources: NewEpisodicMemoryEntrySourceForEntry[],
	): Promise<EpisodicMemoryEntry | null> {
		const { episodic: _episodic, ...entryData } = entry;
		const resourceId = episodicWriteScopeId(entry);
		await this.resourceRepository.ensureExists(resourceId);

		const persisted = await this.memoryEntryRepository.saveEntryWithSources(
			this.agentId,
			{ ...entryData, resourceId },
			sources,
			{},
		);
		return persisted ? this.toEpisodicMemoryEntry(persisted) : null;
	}

	private async searchEpisodicMemoryEntries(
		scope: EpisodicMemoryScope,
		opts?: EpisodicMemorySearchOptions,
	): Promise<RetrievedEpisodicMemoryEntry[]> {
		// Lifecycle changes must not pull entries from other scopes into a shared thread.
		const resourceIds = opts?.writeScopeOnly
			? episodicWriteScopeIds(scope)
			: episodicReadScopeIds(scope);
		const entries = await this.loadNewestEpisodicMemoryEntries(
			resourceIds,
			opts?.includeStatuses ?? ['active'],
		);
		return rankEpisodicMemoryEntries(entries, opts);
	}

	private async findSimilarEpisodicMemoryEntries(
		scope: EpisodicMemoryScope,
		embeddings: number[][],
		opts: Pick<EpisodicMemorySearchOptions, 'topK' | 'minSimilarity'>,
	): Promise<RetrievedEpisodicMemoryEntry[][]> {
		const entries = await this.loadNewestEpisodicMemoryEntries(episodicWriteScopeIds(scope), [
			'active',
		]);
		return embeddings.map((queryEmbedding) =>
			rankEpisodicMemoryEntries(entries, { ...opts, queryEmbedding }),
		);
	}

	/** The same fact told in two threads is one memory to the reader. */
	private async loadNewestEpisodicMemoryEntries(
		resourceIds: string[],
		statuses: EpisodicMemoryStatus[],
	): Promise<EpisodicMemoryEntry[]> {
		if (resourceIds.length === 0) return [];
		const entities = await this.memoryEntryRepository.find({
			where: {
				agentId: this.agentId,
				resourceId: In(resourceIds),
				status: In(statuses),
			},
		});
		const newestByContent = new Map<string, AgentMemoryEntryEntity>();
		for (const entity of entities) {
			const key = `${entity.status}\n${entity.contentHash}`;
			const seen = newestByContent.get(key);
			if (!seen || entity.lastSeenAt > seen.lastSeenAt) newestByContent.set(key, entity);
		}
		return [...newestByContent.values()].map((entity) => this.toEpisodicMemoryEntry(entity));
	}

	private async addEpisodicMemoryEntrySources(
		entryId: string,
		sources: NewEpisodicMemoryEntrySourceForEntry[],
		lastSeenAt: Date,
	): Promise<EpisodicMemoryEntry | null> {
		const entry = await this.memoryEntryRepository.addSources(
			this.agentId,
			entryId,
			sources,
			lastSeenAt,
			{},
		);
		return entry ? this.toEpisodicMemoryEntry(entry) : null;
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

	/**
	 * Memory sources with the author and origin of the message each one quoted.
	 * Observation-backed sources, and sources whose message is gone, carry neither.
	 */
	async getEntrySourcesWithMessageContext(
		entryIds: string[],
	): Promise<EpisodicMemorySourceWithMessageContext[]> {
		const sources = await this.getEpisodicMemoryEntrySources(entryIds);
		const sourceMessages = await this.memoryEntryCandidateRepository.findSourceMessages(
			this.agentId,
			sources.flatMap(({ candidateId }) => candidateId ?? []),
		);
		return sources.map((source) => {
			const message = source.candidateId ? sourceMessages.get(source.candidateId) : undefined;
			return {
				...source,
				...(message?.author ? { author: message.author } : {}),
				...(message?.origin ? { origin: message.origin } : {}),
			};
		});
	}

	private async applyEpisodicMemoryReflection(
		scope: EpisodicMemoryScope,
		reflection: EpisodicMemoryReflectionApply,
	): Promise<EpisodicMemoryReflectionResult> {
		// Recall spans several scopes; lifecycle changes stay inside the one being written.
		const applied = await this.memoryEntryRepository.applyReflection(
			this.agentId,
			episodicWriteScopeId(scope),
			reflection,
			{},
		);
		return {
			...applied,
			inserted: applied.inserted.map((entry) => this.toEpisodicMemoryEntry(entry)),
		};
	}

	// ── Descriptor ───────────────────────────────────────────────────────

	describe(): MemoryDescriptor {
		return { name: 'n8n', connectionParams: {}, constructorName: this.constructor.name };
	}

	// ── Helpers ──────────────────────────────────────────────────────────

	private toAgentDbMessage(entity: AgentMessageEntity): AgentDbMessage {
		return {
			...(entity.modelContent ?? entity.content),
			id: entity.id,
			createdAt: entity.modelContextAt ?? entity.createdAt,
		};
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

	private toEpisodicMemoryCaptureCandidate(
		entity: AgentMemoryEntryCandidateEntity,
	): EpisodicMemoryCaptureCandidate {
		return {
			id: entity.id,
			resourceId: entity.resourceId,
			threadId: entity.threadId,
			sourceMessageId: entity.sourceMessageId,
			runId: entity.runId,
			toolCallId: entity.toolCallId,
			content: entity.content,
			evidenceText: entity.evidenceText,
			kind: entity.kind,
			status: entity.status,
			attemptCount: entity.attemptCount,
			createdAt: entity.createdAt,
			updatedAt: entity.updatedAt,
		};
	}

	private toEpisodicMemoryEntrySource(
		entity: AgentMemoryEntrySourceEntity,
	): EpisodicMemoryEntrySource {
		const source = {
			id: entity.id,
			memoryEntryId: entity.memoryEntryId,
			threadId: entity.threadId,
			evidenceText: entity.evidenceText,
			createdAt: entity.createdAt,
		};
		if (entity.observationId) return { ...source, observationId: entity.observationId };
		if (entity.candidateId) return { ...source, candidateId: entity.candidateId };
		throw new UnexpectedError('Episodic memory entry source has no provenance');
	}

	private mergeThreadMetadata(
		existingMetadata: string | null | undefined,
		nextMetadata: Record<string, unknown>,
	): string {
		return JSON.stringify({
			...this.parseThreadMetadata(existingMetadata),
			...nextMetadata,
		});
	}

	private parseThreadMetadata(
		value: string | null | undefined,
	): Record<string, unknown> | undefined {
		if (!value) return undefined;
		try {
			return JSON.parse(value) as Record<string, unknown>;
		} catch {
			return undefined;
		}
	}

	private toThread(entity: AgentThreadEntity): Thread {
		return {
			id: entity.id,
			resourceId: entity.resourceId,
			title: entity.title ?? undefined,
			metadata: this.parseThreadMetadata(entity.metadata),
			createdAt: entity.createdAt,
			updatedAt: entity.updatedAt,
		};
	}
}
