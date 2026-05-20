import {
	normalizeObservationLogReflection,
	type AgentDbMessage,
	type AgentMessage,
	type BuiltMemory,
	type BuiltObservationLogStore,
	type MemoryDescriptor,
	type NewObservationLogEntry,
	type ObservationCursor,
	type ObservationLogEntry,
	type ObservationLogReadOptions,
	type ObservationLogReflection,
	type ObservationLogReflectionResult,
	type ObservationLogScope,
	type ObservationLogScopeKind,
	type ObservationLogTaskLockHandle,
	type Thread,
} from '@n8n/agents';
import type { ThreadPatch } from '@n8n/instance-ai';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { FindOptionsWhere } from '@n8n/typeorm';
import { Equal, In, IsNull, LessThan, Like, MoreThan } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';

import type { InstanceAiMessage } from '../entities/instance-ai-message.entity';
import type { InstanceAiThread } from '../entities/instance-ai-thread.entity';
import { InstanceAiObservationEntity } from '../entities/instance-ai-observation.entity';
import { InstanceAiObservationLockEntity } from '../entities/instance-ai-observation-lock.entity';
import { InstanceAiMessageRepository } from '../repositories/instance-ai-message.repository';
import { InstanceAiObservationCursorRepository } from '../repositories/instance-ai-observation-cursor.repository';
import { InstanceAiObservationLockRepository } from '../repositories/instance-ai-observation-lock.repository';
import { InstanceAiObservationRepository } from '../repositories/instance-ai-observation.repository';
import { InstanceAiResourceRepository } from '../repositories/instance-ai-resource.repository';
import { InstanceAiThreadRepository } from '../repositories/instance-ai-thread.repository';

const estimateObservationTokens = (text: string) => Math.ceil(text.length / 4);

type ObservationLogTaskKind = 'observer' | 'reflector';

function parseJsonSafe(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return undefined;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isAgentMessage(value: unknown): value is AgentMessage {
	if (!isRecord(value)) return false;

	if (value.type === 'custom') {
		return 'data' in value;
	}

	return typeof value.role === 'string' && Array.isArray(value.content);
}

function toThread(entity: InstanceAiThread): Thread {
	return {
		id: entity.id,
		resourceId: entity.resourceId,
		title: entity.title || undefined,
		createdAt: entity.createdAt,
		updatedAt: entity.updatedAt,
		metadata: entity.metadata ?? undefined,
	};
}

function getMessageRole(message: AgentDbMessage): string {
	return 'role' in message ? message.role : 'custom';
}

function getMessageType(message: AgentDbMessage): string | null {
	if (message.type === 'custom') return 'custom';
	if (message.type === 'llm') return 'llm';
	return null;
}

function toAgentMessage(entity: InstanceAiMessage): AgentDbMessage | undefined {
	const parsed = parseJsonSafe(entity.content);
	if (!isAgentMessage(parsed)) return undefined;
	return { ...parsed, id: entity.id, createdAt: entity.createdAt };
}

function workingMemoryKey(params: {
	threadId: string;
	resourceId: string;
	scope: 'resource' | 'thread';
}): string {
	return params.scope === 'thread' ? `thread:${params.threadId}` : params.resourceId;
}

const PATCH_ONLY_METADATA_KEYS = new Set([
	'instanceAiIterationLog',
	'instanceAiPlannedTasks',
	'instanceAiTasks',
	'instanceAiTerminalOutcomes',
	'instanceAiWorkflowLoop',
]);

function cloneThreadForPatch(thread: Thread): Thread {
	return {
		...thread,
		metadata: { ...(thread.metadata ?? {}) },
	};
}

function mergeSaveThreadMetadata(
	current: Record<string, unknown> | null | undefined,
	incoming: Record<string, unknown>,
): Record<string, unknown> {
	const safeIncoming = { ...incoming };
	for (const key of PATCH_ONLY_METADATA_KEYS) {
		delete safeIncoming[key];
	}
	return {
		...(current ?? {}),
		...safeIncoming,
	};
}

@Service()
export class TypeORMAgentMemory implements BuiltMemory, BuiltObservationLogStore {
	private readonly threadMutationQueues = new Map<string, Promise<unknown>>();

	constructor(
		private readonly threadRepo: InstanceAiThreadRepository,
		private readonly messageRepo: InstanceAiMessageRepository,
		private readonly resourceRepo: InstanceAiResourceRepository,
		private readonly observationRepo: InstanceAiObservationRepository,
		private readonly observationCursorRepo: InstanceAiObservationCursorRepository,
		private readonly observationLockRepo: InstanceAiObservationLockRepository,
		logger: Logger,
	) {
		this.logger = logger.scoped('instance-ai');
	}

	private readonly logger: Logger;

	describe(): MemoryDescriptor {
		return {
			name: 'typeorm-agent-memory',
			constructorName: this.constructor.name,
			connectionParams: null,
		};
	}

	async getThread(threadId: string): Promise<Thread | null> {
		const thread = await this.threadRepo.findOneBy({ id: threadId });
		return thread ? toThread(thread) : null;
	}

	async listThreads(args: {
		filter?: { resourceId?: string };
		perPage?: number;
		page?: number;
		orderBy?: { field: 'createdAt' | 'updatedAt'; direction: 'ASC' | 'DESC' };
	}): Promise<{ threads: Thread[]; total: number; page: number; hasMore: boolean }> {
		const perPage = args.perPage ?? 100;
		const page = args.page ?? 0;
		const field = args.orderBy?.field ?? 'updatedAt';
		const direction = args.orderBy?.direction ?? 'DESC';
		const [threads, total] = await this.threadRepo.findAndCount({
			where: args.filter?.resourceId ? { resourceId: args.filter.resourceId } : {},
			order: { [field]: direction, id: direction },
			take: perPage,
			skip: page * perPage,
		});

		return {
			threads: threads.map(toThread),
			total,
			page,
			hasMore: (page + 1) * perPage < total,
		};
	}

	async saveThread(thread: Omit<Thread, 'createdAt' | 'updatedAt'>): Promise<Thread> {
		return await this.serializeThreadMutation(thread.id, async () => {
			const existing = await this.threadRepo.findOneBy({ id: thread.id });
			if (existing) {
				existing.resourceId = thread.resourceId;
				if (thread.title !== undefined) existing.title = thread.title;
				if (thread.metadata !== undefined) {
					existing.metadata = mergeSaveThreadMetadata(existing.metadata, thread.metadata);
				}
				return toThread(await this.threadRepo.save(existing));
			}

			const saved = await this.threadRepo.save(
				this.threadRepo.create({
					id: thread.id,
					resourceId: thread.resourceId,
					title: thread.title ?? '',
					metadata: thread.metadata ?? null,
				}),
			);
			return toThread(saved);
		});
	}

	async patchThread(args: {
		threadId: string;
		update: (current: Thread) => ThreadPatch | null | undefined;
	}): Promise<Thread | null> {
		return await this.serializeThreadMutation(args.threadId, async () => {
			const existing = await this.threadRepo.findOneBy({ id: args.threadId });
			if (!existing) return null;

			const current = toThread(existing);
			const patch = args.update(cloneThreadForPatch(current));
			if (!patch) return current;

			if (patch.title !== undefined) existing.title = patch.title;
			if (patch.metadata !== undefined) existing.metadata = patch.metadata;
			return toThread(await this.threadRepo.save(existing));
		});
	}

	async deleteThread(threadId: string): Promise<void> {
		await this.deleteObservationLogForThread(threadId);
		await this.threadRepo.delete({ id: threadId });
	}

	async deleteThreadsByResourceIdPrefix(resourceIdPrefix: string): Promise<void> {
		const threads = await this.threadRepo.find({
			where: { resourceId: Like(`${resourceIdPrefix}%`) },
		});
		if (threads.length === 0) return;

		const threadIds = threads.map((thread) => thread.id);
		const resourceIds = Array.from(new Set(threads.map((thread) => thread.resourceId)));

		for (const threadId of threadIds) {
			await this.deleteObservationLogForThread(threadId);
		}

		await this.resourceRepo.delete({ id: In(resourceIds) });
		await this.resourceRepo.delete({
			id: In(threadIds.map((threadId) => `thread:${threadId}`)),
		});
		await this.threadRepo.delete({ id: In(threadIds) });
	}

	async getMessages(
		threadId: string,
		opts?: { limit?: number; before?: Date },
	): Promise<AgentDbMessage[]> {
		const where = opts?.before ? { threadId, createdAt: LessThan(opts.before) } : { threadId };

		const entities = await this.messageRepo.find({
			where,
			order: opts?.limit ? { createdAt: 'DESC', id: 'DESC' } : { createdAt: 'ASC', id: 'ASC' },
			...(opts?.limit ? { take: opts.limit } : {}),
		});

		const ordered = opts?.limit ? entities.reverse() : entities;
		return ordered.flatMap((entity) => {
			const message = this.toAgentMessage(entity);
			return message ? [message] : [];
		});
	}

	async listMessages(args: {
		threadId: string;
		limit?: number;
		page?: number;
	}): Promise<{ messages: AgentDbMessage[] }> {
		const limit = args.limit ?? 50;
		const page = args.page ?? 0;
		const entities = await this.messageRepo.find({
			where: { threadId: args.threadId },
			order: { createdAt: 'DESC', id: 'DESC' },
			take: limit,
			skip: page * limit,
		});

		return {
			messages: entities.reverse().flatMap((entity) => {
				const message = this.toAgentMessage(entity);
				return message ? [message] : [];
			}),
		};
	}

	async saveMessages(args: {
		threadId: string;
		resourceId: string;
		messages: AgentDbMessage[];
	}): Promise<void> {
		if (args.messages.length === 0) return;

		const entities = args.messages.map((message) =>
			this.messageRepo.create({
				id: message.id,
				threadId: args.threadId,
				content: JSON.stringify(message),
				role: getMessageRole(message),
				type: getMessageType(message),
				resourceId: args.resourceId,
				createdAt: message.createdAt,
				updatedAt: message.createdAt,
			}),
		);

		await this.messageRepo.save(entities);
	}

	async deleteMessages(messageIds: string[]): Promise<void> {
		if (messageIds.length === 0) return;
		await this.messageRepo.delete({ id: In(messageIds) });
	}

	async getWorkingMemory(params: {
		threadId: string;
		resourceId: string;
		scope: 'resource' | 'thread';
	}): Promise<string | null> {
		const resource = await this.resourceRepo.findOneBy({ id: workingMemoryKey(params) });
		return resource?.workingMemory ?? null;
	}

	async saveWorkingMemory(
		params: { threadId: string; resourceId: string; scope: 'resource' | 'thread' },
		content: string,
	): Promise<void> {
		const id = workingMemoryKey(params);
		const existing = await this.resourceRepo.findOneBy({ id });
		if (existing) {
			existing.workingMemory = content;
			await this.resourceRepo.save(existing);
			return;
		}

		await this.resourceRepo.save(
			this.resourceRepo.create({
				id,
				workingMemory: content,
				metadata: { scope: params.scope },
			}),
		);
	}

	// ── Observation log ──────────────────────────────────────────────────

	async appendObservationLogEntries(
		rows: NewObservationLogEntry[],
	): Promise<ObservationLogEntry[]> {
		if (rows.length === 0) return [];

		const entities = rows.map((row) =>
			this.observationRepo.create({
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

		const saved = await this.observationRepo.save(entities);
		return saved.map((entity) => this.toObservationLogEntry(entity));
	}

	async getActiveObservationLog(
		scope: ObservationLogScope & { limit?: number; order?: 'asc' | 'desc' },
	): Promise<ObservationLogEntry[]> {
		return await this.getObservationLog({ ...scope, status: 'active' });
	}

	async getObservationLog(opts: ObservationLogReadOptions): Promise<ObservationLogEntry[]> {
		const baseWhere: FindOptionsWhere<InstanceAiObservationEntity> = {
			scopeKind: opts.scopeKind,
			scopeId: opts.scopeId,
			...(opts.status !== undefined && { status: opts.status }),
			...(opts.parentId !== undefined && { parentId: opts.parentId ?? IsNull() }),
		};

		const entities = await this.observationRepo.find({
			where: [baseWhere],
			order: {
				createdAt: opts.order === 'desc' ? 'DESC' : 'ASC',
				id: opts.order === 'desc' ? 'DESC' : 'ASC',
			},
			...(opts.limit !== undefined && { take: opts.limit }),
		});
		return entities.map((entity) => this.toObservationLogEntry(entity));
	}

	async getMessagesForScope(
		scopeKind: ObservationLogScopeKind,
		scopeId: string,
		opts?: { since?: { sinceCreatedAt: Date; sinceMessageId: string }; resourceId?: string },
	): Promise<AgentDbMessage[]> {
		if (scopeKind !== 'thread') {
			throw new UnexpectedError(
				`getMessagesForScope: scopeKind='${scopeKind}' is not supported in observational memory v1`,
			);
		}

		const baseWhere: FindOptionsWhere<InstanceAiMessage> = {
			threadId: scopeId,
			...(opts?.resourceId !== undefined && { resourceId: opts.resourceId }),
		};
		const where: FindOptionsWhere<InstanceAiMessage>[] = opts?.since
			? [
					{ ...baseWhere, createdAt: MoreThan(opts.since.sinceCreatedAt) },
					{
						...baseWhere,
						createdAt: Equal(opts.since.sinceCreatedAt),
						id: MoreThan(opts.since.sinceMessageId),
					},
				]
			: [baseWhere];

		const entities = await this.messageRepo.find({
			where,
			order: { createdAt: 'ASC', id: 'ASC' },
		});
		return entities.flatMap((entity) => {
			const message = this.toAgentMessage(entity);
			return message ? [message] : [];
		});
	}

	async dropObservationLogEntries(ids: string[]): Promise<void> {
		if (ids.length === 0) return;
		await this.observationRepo.update({ id: In(ids) }, { status: 'dropped', supersededBy: null });
	}

	async supersedeObservationLogEntries(ids: string[], supersededBy: string): Promise<void> {
		if (ids.length === 0) return;
		await this.observationRepo.update({ id: In(ids) }, { status: 'superseded', supersededBy });
	}

	async applyObservationLogReflection(
		scope: ObservationLogScope,
		reflection: ObservationLogReflection,
	): Promise<ObservationLogReflectionResult> {
		return await this.observationRepo.manager.transaction(async (trx) => {
			const repo = trx.getRepository(InstanceAiObservationEntity);
			const activeEntries = await repo.find({
				where: {
					scopeKind: scope.scopeKind,
					scopeId: scope.scopeId,
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

			if (normalized.drop.length > 0) {
				await repo.update(
					{ scopeKind: scope.scopeKind, scopeId: scope.scopeId, id: In(normalized.drop) },
					{ status: 'dropped', supersededBy: null },
				);
			}

			for (const [index, merge] of normalized.merge.entries()) {
				const replacement = inserted[index];
				if (replacement && merge.supersedes.length > 0) {
					await repo.update(
						{ scopeKind: scope.scopeKind, scopeId: scope.scopeId, id: In(merge.supersedes) },
						{ status: 'superseded', supersededBy: replacement.id },
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

	async getCursor(
		scopeKind: ObservationLogScopeKind,
		scopeId: string,
	): Promise<ObservationCursor | null> {
		const entity = await this.observationCursorRepo.findOneBy({ scopeKind, scopeId });
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
		await this.observationCursorRepo.upsert(
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

	async acquireObservationLogTaskLock(
		scopeKind: ObservationLogScopeKind,
		scopeId: string,
		taskKind: ObservationLogTaskKind,
		opts: { ttlMs: number; holderId: string },
	): Promise<ObservationLogTaskLockHandle | null> {
		const now = new Date();
		const heldUntil = new Date(now.getTime() + opts.ttlMs);

		const updateResult = await this.observationLockRepo
			.createQueryBuilder()
			.update(InstanceAiObservationLockEntity)
			.set({ taskKind, holderId: opts.holderId, heldUntil })
			.where('"scopeKind" = :scopeKind')
			.andWhere('"scopeId" = :scopeId')
			.andWhere('"taskKind" = :taskKind')
			.andWhere('("holderId" = :holderId OR "heldUntil" <= :now)')
			.setParameters({ scopeKind, scopeId, taskKind, holderId: opts.holderId, now })
			.execute();

		if ((updateResult.affected ?? 0) > 0) {
			return { scopeKind, scopeId, taskKind, holderId: opts.holderId, heldUntil };
		}

		await this.observationLockRepo
			.createQueryBuilder()
			.insert()
			.into(InstanceAiObservationLockEntity)
			.values({ scopeKind, scopeId, taskKind, holderId: opts.holderId, heldUntil })
			.orIgnore()
			.execute();

		const claimed = await this.observationLockRepo.findOneBy({
			scopeKind,
			scopeId,
			taskKind,
			holderId: opts.holderId,
		});
		if (!claimed) return null;

		return { scopeKind, scopeId, taskKind, holderId: opts.holderId, heldUntil };
	}

	async releaseObservationLogTaskLock(handle: ObservationLogTaskLockHandle): Promise<void> {
		await this.observationLockRepo.delete({
			scopeKind: handle.scopeKind,
			scopeId: handle.scopeId,
			taskKind: handle.taskKind,
			holderId: handle.holderId,
		});
	}

	private async deleteObservationLogForThread(threadId: string): Promise<void> {
		const scope = { scopeKind: 'thread' as const, scopeId: threadId };
		await this.observationRepo.delete(scope);
		await this.observationCursorRepo.delete(scope);
		await this.observationLockRepo.delete(scope);
	}

	private async serializeThreadMutation<T>(
		threadId: string,
		mutation: () => Promise<T>,
	): Promise<T> {
		const previous = this.threadMutationQueues.get(threadId) ?? Promise.resolve();
		const next = previous.catch(() => undefined).then(mutation);
		this.threadMutationQueues.set(threadId, next);

		try {
			return await next;
		} finally {
			if (this.threadMutationQueues.get(threadId) === next) {
				this.threadMutationQueues.delete(threadId);
			}
		}
	}

	private toObservationLogEntry(entity: InstanceAiObservationEntity): ObservationLogEntry {
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

	private toAgentMessage(entity: InstanceAiMessage): AgentDbMessage | undefined {
		const message = toAgentMessage(entity);
		if (!message) {
			this.logger.warn('Skipping invalid Instance AI message row', {
				messageId: entity.id,
				threadId: entity.threadId,
				resourceId: entity.resourceId,
				role: entity.role,
				type: entity.type,
			});
		}
		return message;
	}
}
