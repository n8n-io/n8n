import {
	type BuiltObservationLogStore,
	type BuiltObservationLogTaskLockStore,
	type MemoryDescriptor,
	type NewObservationLogEntry,
	type ObservationCursor,
	type ObservationLogEntry,
	type ObservationLogReadOptions,
	type ObservationLogReflection,
	type ObservationLogReflectionResult,
	type ObservationLogScope,
	type ObservationLogTaskKind,
	type ObservationLogTaskLockHandle,
} from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type {
	AgentDbMessage,
	AgentMessage,
	BuiltMemory,
	Thread,
	ThreadPatch,
} from '@n8n/instance-ai';
import { In, LessThan, Like } from '@n8n/typeorm';

import { TypeORMObservationLogStore } from './typeorm-observation-log-store';
import type { InstanceAiMessage } from '../entities/instance-ai-message.entity';
import type { InstanceAiThread } from '../entities/instance-ai-thread.entity';
import { InstanceAiMessageRepository } from '../repositories/instance-ai-message.repository';
import { InstanceAiObservationCursorRepository } from '../repositories/instance-ai-observation-cursor.repository';
import { InstanceAiObservationLockRepository } from '../repositories/instance-ai-observation-lock.repository';
import { InstanceAiObservationRepository } from '../repositories/instance-ai-observation.repository';
import { InstanceAiResourceRepository } from '../repositories/instance-ai-resource.repository';
import { InstanceAiThreadRepository } from '../repositories/instance-ai-thread.repository';

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

function isPendingUserInputMessage(message: AgentDbMessage): boolean {
	const metadata = 'metadata' in message ? message.metadata : undefined;
	return isRecord(metadata) && metadata.n8nPendingUserInput === true;
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
export class TypeORMAgentMemory
	implements BuiltMemory, BuiltObservationLogStore, BuiltObservationLogTaskLockStore
{
	private readonly threadMutationQueues = new Map<string, Promise<unknown>>();
	private readonly observationLog: TypeORMObservationLogStore;

	constructor(
		private readonly threadRepo: InstanceAiThreadRepository,
		private readonly messageRepo: InstanceAiMessageRepository,
		private readonly resourceRepo: InstanceAiResourceRepository,
		observationRepo: InstanceAiObservationRepository,
		observationCursorRepo: InstanceAiObservationCursorRepository,
		observationLockRepo: InstanceAiObservationLockRepository,
		logger: Logger,
	) {
		this.logger = logger.scoped('instance-ai');
		this.observationLog = new TypeORMObservationLogStore(
			observationRepo,
			observationCursorRepo,
			observationLockRepo,
			this.messageRepo,
			(entity) => this.toAgentMessage(entity),
		);
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
		await this.threadRepo.delete({ id: threadId });
	}

	async deleteThreadsByResourceIdPrefix(resourceIdPrefix: string): Promise<void> {
		const threads = await this.threadRepo.find({
			where: { resourceId: Like(`${resourceIdPrefix}%`) },
		});
		if (threads.length === 0) return;

		const threadIds = threads.map((thread) => thread.id);
		const resourceIds = Array.from(new Set(threads.map((thread) => thread.resourceId)));

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
			return message && !isPendingUserInputMessage(message) ? [message] : [];
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
				return message && !isPendingUserInputMessage(message) ? [message] : [];
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

	async appendObservationLogEntries(
		rows: NewObservationLogEntry[],
	): Promise<ObservationLogEntry[]> {
		return await this.observationLog.appendObservationLogEntries(rows);
	}

	async getActiveObservationLog(
		scope: ObservationLogScope & { limit?: number; order?: 'asc' | 'desc' },
	): Promise<ObservationLogEntry[]> {
		return await this.observationLog.getActiveObservationLog(scope);
	}

	async getObservationLog(opts: ObservationLogReadOptions): Promise<ObservationLogEntry[]> {
		return await this.observationLog.getObservationLog(opts);
	}

	async getMessagesForObservationScope(
		observationScopeId: string,
		opts?: { since?: { sinceCreatedAt: Date; sinceMessageId: string } },
	): Promise<AgentDbMessage[]> {
		return await this.observationLog.getMessagesForObservationScope(observationScopeId, opts);
	}

	async dropObservationLogEntries(ids: string[]): Promise<void> {
		return await this.observationLog.dropObservationLogEntries(ids);
	}

	async supersedeObservationLogEntries(ids: string[], supersededBy: string): Promise<void> {
		return await this.observationLog.supersedeObservationLogEntries(ids, supersededBy);
	}

	async applyObservationLogReflection(
		scope: ObservationLogScope,
		reflection: ObservationLogReflection,
	): Promise<ObservationLogReflectionResult> {
		return await this.observationLog.applyObservationLogReflection(scope, reflection);
	}

	async getCursor(observationScopeId: string): Promise<ObservationCursor | null> {
		return await this.observationLog.getCursor(observationScopeId);
	}

	async setCursor(cursor: ObservationCursor): Promise<void> {
		return await this.observationLog.setCursor(cursor);
	}

	async acquireObservationLogTaskLock(
		observationScopeId: string,
		taskKind: ObservationLogTaskKind,
		opts: { ttlMs: number; holderId: string },
	): Promise<ObservationLogTaskLockHandle | null> {
		return await this.observationLog.acquireObservationLogTaskLock(
			observationScopeId,
			taskKind,
			opts,
		);
	}

	async releaseObservationLogTaskLock(handle: ObservationLogTaskLockHandle): Promise<void> {
		return await this.observationLog.releaseObservationLogTaskLock(handle);
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
