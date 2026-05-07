import type {
	AgentDbMessage,
	AgentMessage,
	BuiltMemory,
	Thread,
	ThreadPatch,
} from '@n8n/instance-ai';
import type { MemoryDescriptor } from '@n8n/agents';
import { Service } from '@n8n/di';
import { In, LessThan } from '@n8n/typeorm';

import type { InstanceAiMessage } from '../entities/instance-ai-message.entity';
import type { InstanceAiThread } from '../entities/instance-ai-thread.entity';
import { InstanceAiMessageRepository } from '../repositories/instance-ai-message.repository';
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
	'instanceAiConversationSummary',
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
export class TypeORMAgentMemory implements BuiltMemory {
	private readonly threadMutationQueues = new Map<string, Promise<unknown>>();

	constructor(
		private readonly threadRepo: InstanceAiThreadRepository,
		private readonly messageRepo: InstanceAiMessageRepository,
		private readonly resourceRepo: InstanceAiResourceRepository,
	) {}

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

	async getThreadById({ threadId }: { threadId: string }): Promise<Thread | null> {
		return await this.getThread(threadId);
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
			const message = toAgentMessage(entity);
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
				const message = toAgentMessage(entity);
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

	private async serializeThreadMutation<T>(threadId: string, mutation: () => Promise<T>): Promise<T> {
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
}
