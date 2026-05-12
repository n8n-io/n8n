import type {
	AgentDbMessage,
	AgentMessage,
	BuiltMemory,
	BuiltObservationLogStore,
	MemoryDescriptor,
	NewObservationLogEntry,
	ObservationCursor,
	ObservationLogEntry,
	ObservationLogReadOptions,
	ObservationLogReflection,
	ObservationLogReflectionResult,
	ObservationLogScope,
	ObservationLogScopeKind,
	ObservationLockHandle,
	Thread,
} from '@n8n/agents';
import { Service } from '@n8n/di';
import type { FindOptionsWhere } from '@n8n/typeorm';
import { Equal, In, IsNull, LessThan, Like, MoreThan } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';
import { UnexpectedError } from 'n8n-workflow';

import type { AgentMessageEntity } from '../entities/agent-message.entity';
import { AgentObservationCursorEntity } from '../entities/agent-observation-cursor.entity';
import { AgentObservationLockEntity } from '../entities/agent-observation-lock.entity';
import { AgentObservationEntity } from '../entities/agent-observation.entity';
import { AgentThreadEntity } from '../entities/agent-thread.entity';
import { AgentMessageRepository } from '../repositories/agent-message.repository';
import { AgentObservationCursorRepository } from '../repositories/agent-observation-cursor.repository';
import { AgentObservationLockRepository } from '../repositories/agent-observation-lock.repository';
import { AgentObservationRepository } from '../repositories/agent-observation.repository';
import { AgentResourceRepository } from '../repositories/agent-resource.repository';
import { AgentThreadRepository } from '../repositories/agent-thread.repository';

const estimateObservationTokens = (text: string) => Math.ceil(text.length / 4);

type ObservationLogTaskKind = 'observer' | 'reflector';

interface ObservationLogTaskLockHandle {
	scopeKind: ObservationLogScopeKind;
	scopeId: string;
	taskKind: ObservationLogTaskKind;
	holderId: string;
	heldUntil: Date;
}

@Service()
export class N8nMemory implements BuiltMemory, BuiltObservationLogStore {
	constructor(
		private readonly threadRepository: AgentThreadRepository,
		private readonly messageRepository: AgentMessageRepository,
		private readonly resourceRepository: AgentResourceRepository,
		private readonly observationRepository: AgentObservationRepository,
		private readonly observationCursorRepository: AgentObservationCursorRepository,
		private readonly observationLockRepository: AgentObservationLockRepository,
	) {}

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
			const scope = { scopeKind: 'thread' as const, scopeId: threadId };
			await trx.delete(AgentObservationEntity, scope);
			await trx.delete(AgentObservationCursorEntity, scope);
			await trx.delete(AgentObservationLockEntity, scope);
			await trx.delete(AgentThreadEntity, { id: threadId });
		});
	}

	async deleteThreadsByPrefix(threadIdPrefix: string): Promise<void> {
		const scopeId = Like(`${threadIdPrefix}%`);
		await this.threadRepository.manager.transaction(async (trx) => {
			const scope = { scopeKind: 'thread' as const, scopeId };
			await trx.delete(AgentObservationEntity, scope);
			await trx.delete(AgentObservationCursorEntity, scope);
			await trx.delete(AgentObservationLockEntity, scope);
			await trx.delete(AgentThreadEntity, { id: scopeId });
		});
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

	// ── Working memory ───────────────────────────────────────────────────

	async getWorkingMemory(params: {
		threadId: string;
		resourceId: string;
		scope: 'resource' | 'thread';
	}): Promise<string | null> {
		void params;
		// Legacy `workingMemory` metadata is intentionally ignored. The new
		// observation-log pipeline will own memory state.
		return null;
	}

	async saveWorkingMemory(
		params: { threadId: string; resourceId: string; scope: 'resource' | 'thread' },
		content: string,
	): Promise<void> {
		void params;
		void content;
		// Legacy `workingMemory` metadata is intentionally ignored. The new
		// observation-log pipeline will own memory state.
	}

	// ── Observation log ──────────────────────────────────────────────────

	async appendObservationLogEntries(
		rows: NewObservationLogEntry[],
	): Promise<ObservationLogEntry[]> {
		if (rows.length === 0) return [];

		const entities: AgentObservationEntity[] = rows.map((row) =>
			this.observationRepository.create({
				scopeKind: row.scopeKind,
				scopeId: row.scopeId,
				marker: row.marker,
				text: row.text,
				parentId: row.parentId ?? null,
				tokenCount: row.tokenCount ?? estimateObservationTokens(row.text),
				status: 'active',
				supersededBy: null,
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
			scopeKind: opts.scopeKind,
			scopeId: opts.scopeId,
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

	async getMessagesForScope(
		scopeKind: ObservationLogScopeKind,
		scopeId: string,
		opts?: { since?: { sinceCreatedAt: Date; sinceMessageId: string } },
	): Promise<AgentDbMessage[]> {
		if (scopeKind !== 'thread') {
			throw new UnexpectedError(
				`getMessagesForScope: scopeKind='${scopeKind}' is not supported in observational memory v1`,
			);
		}

		const baseWhere: FindOptionsWhere<AgentMessageEntity> = { threadId: scopeId };
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
		await this.observationRepository.update(
			{ id: In(ids) },
			{ status: 'dropped', supersededBy: null },
		);
	}

	async supersedeObservationLogEntries(ids: string[], supersededBy: string): Promise<void> {
		if (ids.length === 0) return;
		await this.observationRepository.update(
			{ id: In(ids) },
			{ status: 'superseded', supersededBy },
		);
	}

	async applyObservationLogReflection(
		scope: ObservationLogScope,
		reflection: ObservationLogReflection,
	): Promise<ObservationLogReflectionResult> {
		return await this.observationRepository.manager.transaction(async (trx) => {
			const repo = trx.getRepository(AgentObservationEntity);
			const inserted = reflection.merge.length
				? await repo.save(
						reflection.merge.map((entry) =>
							repo.create({
								scopeKind: scope.scopeKind,
								scopeId: scope.scopeId,
								marker: entry.marker,
								text: entry.text,
								parentId: entry.parentId ?? null,
								tokenCount: entry.tokenCount ?? estimateObservationTokens(entry.text),
								status: 'active',
								supersededBy: null,
								createdAt: entry.createdAt,
							}),
						),
					)
				: [];

			if (reflection.drop.length > 0) {
				await repo.update(
					{ scopeKind: scope.scopeKind, scopeId: scope.scopeId, id: In(reflection.drop) },
					{ status: 'dropped', supersededBy: null },
				);
			}

			for (const [index, merge] of reflection.merge.entries()) {
				const replacement = inserted[index];
				if (replacement && merge.supersedes.length > 0) {
					await repo.update(
						{ scopeKind: scope.scopeKind, scopeId: scope.scopeId, id: In(merge.supersedes) },
						{ status: 'superseded', supersededBy: replacement.id },
					);
				}
			}

			return {
				droppedIds: [...reflection.drop],
				supersededIds: reflection.merge.flatMap((entry) => entry.supersedes),
				inserted: inserted.map((entry) => this.toObservationLogEntry(entry)),
			};
		});
	}

	// ── Observational memory: cursors ────────────────────────────────────

	async getCursor(
		scopeKind: ObservationLogScopeKind,
		scopeId: string,
	): Promise<ObservationCursor | null> {
		const entity = await this.observationCursorRepository.findOneBy({ scopeKind, scopeId });
		if (!entity) return null;
		return {
			scopeKind: entity.scopeKind,
			scopeId: entity.scopeId,
			lastObservedMessageId: entity.lastObservedMessageId,
			lastObservedAt: entity.lastObservedAt,
			updatedAt: entity.updatedAt,
		};
	}

	async setCursor(
		cursor: ObservationCursor & { scopeKind: ObservationLogScopeKind },
	): Promise<void> {
		await this.observationCursorRepository.upsert(
			{
				scopeKind: cursor.scopeKind,
				scopeId: cursor.scopeId,
				lastObservedMessageId: cursor.lastObservedMessageId,
				lastObservedAt: cursor.lastObservedAt,
				updatedAt: cursor.updatedAt,
			},
			{ conflictPaths: ['scopeKind', 'scopeId'], skipUpdateIfNoValuesChanged: false },
		);
	}

	// ── Observational memory: locks ──────────────────────────────────────

	async acquireObservationLock(
		scopeKind: ObservationLogScopeKind,
		scopeId: string,
		opts: { ttlMs: number; holderId: string },
	): Promise<ObservationLockHandle | null> {
		const handle = await this.acquireObservationLogTaskLock(scopeKind, scopeId, 'observer', opts);
		if (!handle) return null;
		return {
			scopeKind: handle.scopeKind,
			scopeId: handle.scopeId,
			holderId: handle.holderId,
			heldUntil: handle.heldUntil,
		};
	}

	async acquireObservationLogTaskLock(
		scopeKind: ObservationLogScopeKind,
		scopeId: string,
		taskKind: ObservationLogTaskKind,
		opts: { ttlMs: number; holderId: string },
	): Promise<ObservationLogTaskLockHandle | null> {
		const now = new Date();
		const heldUntil = new Date(now.getTime() + opts.ttlMs);

		const updateResult = await this.observationLockRepository
			.createQueryBuilder()
			.update(AgentObservationLockEntity)
			.set({ taskKind, holderId: opts.holderId, heldUntil })
			.where('"scopeKind" = :scopeKind')
			.andWhere('"scopeId" = :scopeId')
			.andWhere('("holderId" = :holderId OR "heldUntil" <= :now)')
			.setParameters({ scopeKind, scopeId, holderId: opts.holderId, now })
			.execute();

		if ((updateResult.affected ?? 0) > 0) {
			return { scopeKind, scopeId, taskKind, holderId: opts.holderId, heldUntil };
		}

		await this.observationLockRepository
			.createQueryBuilder()
			.insert()
			.into(AgentObservationLockEntity)
			.values({ scopeKind, scopeId, taskKind, holderId: opts.holderId, heldUntil })
			.orIgnore()
			.execute();

		const claimed = await this.observationLockRepository.findOneBy({
			scopeKind,
			scopeId,
			holderId: opts.holderId,
		});
		if (!claimed) return null;

		return { scopeKind, scopeId, taskKind, holderId: opts.holderId, heldUntil };
	}

	async releaseObservationLock(
		handle: ObservationLockHandle & { scopeKind: ObservationLogScopeKind },
	): Promise<void> {
		await this.releaseScopeLock(handle);
	}

	async releaseObservationLogTaskLock(handle: ObservationLogTaskLockHandle): Promise<void> {
		await this.releaseScopeLock(handle);
	}

	private async releaseScopeLock(
		handle: ObservationLockHandle & { scopeKind: ObservationLogScopeKind },
	): Promise<void> {
		await this.observationLockRepository.delete({
			scopeKind: handle.scopeKind,
			scopeId: handle.scopeId,
			holderId: handle.holderId,
		});
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
			scopeKind: entity.scopeKind,
			scopeId: entity.scopeId,
			marker: entity.marker,
			text: entity.text,
			parentId: entity.parentId,
			tokenCount: Number(entity.tokenCount),
			status: entity.status,
			supersededBy: entity.supersededBy,
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
