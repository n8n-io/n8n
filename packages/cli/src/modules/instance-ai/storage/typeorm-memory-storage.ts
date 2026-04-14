import { randomUUID } from 'node:crypto';

import type { MastraMessageContentV2 } from '@mastra/core/agent';
import type { MastraDBMessage, StorageThreadType } from '@mastra/core/memory';
import type {
	BufferedObservationChunk,
	CreateObservationalMemoryInput,
	CreateReflectionGenerationInput,
	ObservationalMemoryRecord,
	StorageCloneThreadInput,
	StorageCloneThreadOutput,
	StorageListMessagesByResourceIdInput,
	StorageListMessagesInput,
	StorageListMessagesOutput,
	StorageListThreadsInput,
	StorageListThreadsOutput,
	StorageResourceType,
	SwapBufferedReflectionToActiveInput,
	SwapBufferedToActiveInput,
	SwapBufferedToActiveResult,
	UpdateBufferedReflectionInput,
	UpdateBufferedObservationsInput,
	UpdateActiveObservationsInput,
} from '@mastra/core/storage';
import { MemoryStorage } from '@mastra/core/storage';
import { Service } from '@n8n/di';
import { withCurrentTraceSpan } from '@n8n/instance-ai';
import { In } from '@n8n/typeorm';
import { generateNanoId } from '@n8n/utils';
import { jsonParse } from 'n8n-workflow';

import type { InstanceAiMessage } from '../entities/instance-ai-message.entity';
import type { InstanceAiObservationalMemory } from '../entities/instance-ai-observational-memory.entity';
import type { InstanceAiThread } from '../entities/instance-ai-thread.entity';
import { InstanceAiMessageRepository } from '../repositories/instance-ai-message.repository';
import { InstanceAiObservationalMemoryRepository } from '../repositories/instance-ai-observational-memory.repository';
import { InstanceAiResourceRepository } from '../repositories/instance-ai-resource.repository';
import { InstanceAiThreadRepository } from '../repositories/instance-ai-thread.repository';

/** Metadata keys that must only be mutated via patchThread (atomic read-modify-write). */
const PATCH_ONLY_METADATA_KEYS = ['instanceAiPlannedTasks', 'instanceAiTasks'] as const;

function countLines(value: string): number {
	return value === '' ? 0 : value.split(/\r?\n/u).length;
}

function buildResourceTraceMetadata(resourceId: string): Record<string, unknown> {
	const separatorIndex = resourceId.indexOf(':');

	return {
		resource_id: resourceId,
		memory_scope: separatorIndex === -1 ? 'user' : 'user-role',
		...(separatorIndex !== -1 && separatorIndex < resourceId.length - 1
			? { memory_role: resourceId.slice(separatorIndex + 1) }
			: {}),
	};
}

function summarizeLoadedResource(resource: StorageResourceType | null): Record<string, unknown> {
	const workingMemory = resource?.workingMemory;

	return {
		found: resource !== null,
		has_working_memory: typeof workingMemory === 'string' && workingMemory.length > 0,
		working_memory_chars: typeof workingMemory === 'string' ? workingMemory.length : 0,
		working_memory_lines: typeof workingMemory === 'string' ? countLines(workingMemory) : 0,
		metadata_keys: resource?.metadata ? Object.keys(resource.metadata).length : 0,
	};
}

@Service()
export class TypeORMMemoryStorage extends MemoryStorage {
	readonly supportsObservationalMemory = true;
	private static readonly threadMutationQueues = new Map<string, Promise<void>>();

	constructor(
		private readonly threadRepo: InstanceAiThreadRepository,
		private readonly messageRepo: InstanceAiMessageRepository,
		private readonly resourceRepo: InstanceAiResourceRepository,
		private readonly omRepo: InstanceAiObservationalMemoryRepository,
	) {
		super();
	}

	async dangerouslyClearAll(): Promise<void> {
		await this.omRepo.clear();
		await this.messageRepo.clear();
		await this.threadRepo.clear();
		await this.resourceRepo.clear();
	}

	// Thread operations

	async getThreadById({ threadId }: { threadId: string }): Promise<StorageThreadType | null> {
		const entity = await this.threadRepo.findOneBy({ id: threadId });
		if (!entity) return null;
		return this.toStorageThread(entity);
	}

	async listThreads(args: StorageListThreadsInput): Promise<StorageListThreadsOutput> {
		const page = args.page ?? 0;
		const perPageInput = args.perPage;
		const perPage = perPageInput === false ? Number.MAX_SAFE_INTEGER : (perPageInput ?? 100);
		const { field, direction } = this.parseOrderBy(args.orderBy);

		const where: Record<string, unknown> = {};
		if (args.filter?.resourceId) where.resourceId = args.filter.resourceId;

		const metadataFilter = args.filter?.metadata;
		const hasMetadataFilter = metadataFilter && Object.keys(metadataFilter).length > 0;

		if (hasMetadataFilter) {
			this.validateMetadataKeys(metadataFilter);

			// Metadata filtering must happen in-memory (JSON queries vary by DB),
			// so fetch all matching threads, filter, then paginate the result.
			const allEntities = await this.threadRepo.find({
				where,
				order: { [field]: direction },
			});

			const allThreads: StorageThreadType[] = allEntities
				.map((e) => ({
					id: e.id,
					title: e.title,
					resourceId: e.resourceId,
					metadata: e.metadata ?? undefined,
					createdAt: e.createdAt,
					updatedAt: e.updatedAt,
				}))
				.filter((t) => {
					if (!t.metadata) return false;
					return Object.entries(args.filter!.metadata!).every(([k, v]) => t.metadata![k] === v);
				});

			const total = allThreads.length;
			const offset = page * perPage;
			const paged = allThreads.slice(offset, offset + perPage);

			return {
				threads: paged,
				total,
				page,
				perPage: perPageInput ?? 100,
				hasMore: offset + perPage < total,
			};
		}

		const [entities, total] = await this.threadRepo.findAndCount({
			where,
			order: { [field]: direction },
			skip: page * perPage,
			take: perPage,
		});

		const threads: StorageThreadType[] = entities.map((e) => ({
			id: e.id,
			title: e.title,
			resourceId: e.resourceId,
			metadata: e.metadata ?? undefined,
			createdAt: e.createdAt,
			updatedAt: e.updatedAt,
		}));

		return {
			threads,
			total,
			page,
			perPage: perPageInput ?? 100,
			hasMore: (page + 1) * perPage < total,
		};
	}

	async saveThread({
		thread,
	}: {
		thread: StorageThreadType;
	}): Promise<StorageThreadType> {
		return await this.serializeThreadMutation(thread.id, async () => {
			const existing = await this.threadRepo.findOneBy({ id: thread.id });

			if (existing) {
				// Strip patch-only keys so stale caller snapshots can't clobber
				// state that must only be mutated through patchThread.
				const safeIncoming = { ...(thread.metadata ?? {}) };
				for (const key of PATCH_ONLY_METADATA_KEYS) {
					delete safeIncoming[key];
				}

				existing.title = thread.title ?? existing.title;
				existing.resourceId = thread.resourceId ?? existing.resourceId;
				existing.metadata = {
					...(existing.metadata ?? {}),
					...safeIncoming,
				};
				const saved = await this.threadRepo.save(existing);
				return this.toStorageThread(saved);
			}

			const entity = this.threadRepo.create({
				id: thread.id,
				resourceId: thread.resourceId,
				title: thread.title ?? '',
				metadata: thread.metadata ?? null,
			});
			const saved = await this.threadRepo.save(entity);
			return this.toStorageThread(saved);
		});
	}

	async updateThread({
		id,
		title,
		metadata,
	}: {
		id: string;
		title: string;
		metadata: Record<string, unknown>;
	}): Promise<StorageThreadType> {
		return await this.serializeThreadMutation(id, async () => {
			const entity = await this.threadRepo.findOneByOrFail({ id });

			// Strip patch-only keys so stale caller snapshots can't clobber
			// state that must only be mutated through patchThread.
			const safeIncoming = { ...metadata };
			for (const key of PATCH_ONLY_METADATA_KEYS) {
				delete safeIncoming[key];
			}

			entity.title = title;
			entity.metadata = {
				...(entity.metadata ?? {}),
				...safeIncoming,
			};
			const updated = await this.threadRepo.save(entity);
			return this.toStorageThread(updated);
		});
	}

	async patchThread({
		threadId,
		update,
	}: {
		threadId: string;
		update: (
			current: StorageThreadType,
		) => { title?: string; metadata?: Record<string, unknown> } | null | undefined;
	}): Promise<StorageThreadType | null> {
		return await this.serializeThreadMutation(threadId, async () => {
			const entity = await this.threadRepo.findOneBy({ id: threadId });
			if (!entity) return null;

			const current = this.toStorageThread(entity);
			const patch = update({
				...current,
				metadata: { ...(current.metadata ?? {}) },
			});
			if (!patch) return current;

			if (patch.title !== undefined) {
				entity.title = patch.title;
			}
			if (patch.metadata !== undefined) {
				entity.metadata = patch.metadata;
			}

			const updated = await this.threadRepo.save(entity);
			return this.toStorageThread(updated);
		});
	}

	async deleteThread({ threadId }: { threadId: string }): Promise<void> {
		await this.threadRepo.delete(threadId);
		// Messages cascade via FK
	}

	private toStorageThread(entity: InstanceAiThread): StorageThreadType {
		return {
			id: entity.id,
			title: entity.title,
			resourceId: entity.resourceId,
			metadata: entity.metadata ?? undefined,
			createdAt: entity.createdAt,
			updatedAt: entity.updatedAt,
		};
	}

	private async serializeThreadMutation<T>(
		threadId: string,
		mutation: () => Promise<T>,
	): Promise<T> {
		const queues = TypeORMMemoryStorage.threadMutationQueues;
		const previous = queues.get(threadId) ?? Promise.resolve();
		const previousSettled = previous.catch(() => {});
		let releaseCurrent!: () => void;
		const current = new Promise<void>((resolve) => {
			releaseCurrent = resolve;
		});
		const queued = previousSettled.then(async () => await current);
		queues.set(threadId, queued);

		await previousSettled;

		try {
			return await mutation();
		} finally {
			releaseCurrent();
			if (queues.get(threadId) === queued) {
				queues.delete(threadId);
			}
		}
	}

	// Message operations

	async listMessages(args: StorageListMessagesInput): Promise<StorageListMessagesOutput> {
		// Handle include (anchor-based contextual retrieval) separately
		if (args.include?.length) {
			const included = await this.getIncludedMessages(args);
			return {
				messages: included,
				total: included.length,
				page: 0,
				perPage: false,
				hasMore: false,
			};
		}

		const threadIds = Array.isArray(args.threadId) ? args.threadId : [args.threadId];
		const page = args.page ?? 0;
		const perPageInput = args.perPage;
		const perPage = perPageInput === false ? Number.MAX_SAFE_INTEGER : (perPageInput ?? 40);

		const qb = this.messageRepo
			.createQueryBuilder('m')
			.where('m.threadId IN (:...threadIds)', { threadIds });

		if (args.resourceId) {
			qb.andWhere('m.resourceId = :resourceId', {
				resourceId: args.resourceId,
			});
		}
		if (args.filter?.dateRange?.start) {
			const op = args.filter.dateRange.startExclusive ? '>' : '>=';
			qb.andWhere(`m.createdAt ${op} :start`, {
				start: args.filter.dateRange.start,
			});
		}
		if (args.filter?.dateRange?.end) {
			const op = args.filter.dateRange.endExclusive ? '<' : '<=';
			qb.andWhere(`m.createdAt ${op} :end`, {
				end: args.filter.dateRange.end,
			});
		}

		const { field = 'createdAt', direction = 'ASC' } = args.orderBy ?? {};
		qb.orderBy(`m.${field}`, direction);

		const total = await qb.getCount();
		qb.skip(page * perPage).take(perPage);
		const entities = await qb.getMany();

		const messages = entities.map((e) => this.entityToMessage(e));

		return {
			messages,
			total,
			page,
			perPage: perPageInput ?? 40,
			hasMore: (page + 1) * perPage < total,
		};
	}

	/**
	 * Fetch messages around anchor messages using createdAt as cursor.
	 * For each anchor in `include`, fetches the anchor itself plus
	 * `withPreviousMessages` before and `withNextMessages` after.
	 * Deduplicates and returns in chronological order.
	 */
	private async getIncludedMessages(args: StorageListMessagesInput): Promise<MastraDBMessage[]> {
		const seen = new Set<string>();
		const result: MastraDBMessage[] = [];
		const threadIds = Array.isArray(args.threadId) ? args.threadId : [args.threadId];

		for (const inc of args.include ?? []) {
			const anchorThreadIds = inc.threadId ? [inc.threadId] : threadIds;
			const anchor = await this.messageRepo.findOneBy({ id: inc.id });
			if (!anchor) continue;

			const collected: MastraDBMessage[] = [];

			// Messages before the anchor
			if (inc.withPreviousMessages && inc.withPreviousMessages > 0) {
				const before = await this.messageRepo
					.createQueryBuilder('m')
					.where('m.threadId IN (:...threadIds)', { threadIds: anchorThreadIds })
					.andWhere('m.createdAt < :anchorTime', { anchorTime: anchor.createdAt })
					.orderBy('m.createdAt', 'DESC')
					.take(inc.withPreviousMessages)
					.getMany();
				collected.push(...before.reverse().map((e) => this.entityToMessage(e)));
			}

			// The anchor itself
			collected.push(this.entityToMessage(anchor));

			// Messages after the anchor
			if (inc.withNextMessages && inc.withNextMessages > 0) {
				const after = await this.messageRepo
					.createQueryBuilder('m')
					.where('m.threadId IN (:...threadIds)', { threadIds: anchorThreadIds })
					.andWhere('m.createdAt > :anchorTime', { anchorTime: anchor.createdAt })
					.orderBy('m.createdAt', 'ASC')
					.take(inc.withNextMessages)
					.getMany();
				collected.push(...after.map((e) => this.entityToMessage(e)));
			}

			for (const msg of collected) {
				if (!seen.has(msg.id)) {
					seen.add(msg.id);
					result.push(msg);
				}
			}
		}

		// Return in chronological order
		result.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
		return result;
	}

	async listMessagesByResourceId(
		args: StorageListMessagesByResourceIdInput,
	): Promise<StorageListMessagesOutput> {
		const page = args.page ?? 0;
		const perPageInput = args.perPage;
		const perPage = perPageInput === false ? Number.MAX_SAFE_INTEGER : (perPageInput ?? 40);

		const qb = this.messageRepo
			.createQueryBuilder('m')
			.where('m.resourceId = :resourceId', { resourceId: args.resourceId });

		if (args.filter?.dateRange?.start) {
			const op = args.filter.dateRange.startExclusive ? '>' : '>=';
			qb.andWhere(`m.createdAt ${op} :start`, {
				start: args.filter.dateRange.start,
			});
		}
		if (args.filter?.dateRange?.end) {
			const op = args.filter.dateRange.endExclusive ? '<' : '<=';
			qb.andWhere(`m.createdAt ${op} :end`, {
				end: args.filter.dateRange.end,
			});
		}

		const { field = 'createdAt', direction = 'ASC' } = args.orderBy ?? {};
		qb.orderBy(`m.${field}`, direction);

		const total = await qb.getCount();
		qb.skip(page * perPage).take(perPage);
		const entities = await qb.getMany();

		return {
			messages: entities.map((e) => this.entityToMessage(e)),
			total,
			page,
			perPage: perPageInput ?? 40,
			hasMore: (page + 1) * perPage < total,
		};
	}

	async listMessagesById({
		messageIds,
	}: {
		messageIds: string[];
	}): Promise<{ messages: MastraDBMessage[] }> {
		if (messageIds.length === 0) return { messages: [] };
		const entities = await this.messageRepo.findBy({ id: In(messageIds) });
		return { messages: entities.map((e) => this.entityToMessage(e)) };
	}

	async saveMessages({
		messages,
	}: {
		messages: MastraDBMessage[];
	}): Promise<{ messages: MastraDBMessage[] }> {
		const entities = messages.map((m) => {
			if (!m.threadId) {
				throw new Error(`Message ${m.id} is missing required threadId`);
			}
			const entity = this.messageRepo.create({
				id: m.id,
				threadId: m.threadId,
				content: JSON.stringify(m.content),
				role: m.role,
				type: m.type ?? null,
				resourceId: m.resourceId ?? null,
			});
			// Preserve original Mastra message timestamp instead of defaulting to insert time
			if (m.createdAt) {
				entity.createdAt = m.createdAt;
			}
			return entity;
		});
		const saved = await this.messageRepo.save(entities);
		return { messages: saved.map((e) => this.entityToMessage(e)) };
	}

	async updateMessages({
		messages,
	}: {
		messages: Array<
			Partial<Omit<MastraDBMessage, 'createdAt'>> & {
				id: string;
				content?: {
					metadata?: MastraMessageContentV2['metadata'];
					content?: MastraMessageContentV2['content'];
				};
			}
		>;
	}): Promise<MastraDBMessage[]> {
		const result: MastraDBMessage[] = [];
		for (const msg of messages) {
			const existing = await this.messageRepo.findOneBy({ id: msg.id });
			if (!existing) continue;

			const updates: Record<string, unknown> = {};
			if (msg.role) updates.role = msg.role;
			if (msg.type !== undefined) updates.type = msg.type;

			// Handle partial content updates
			if (msg.content) {
				const existingContent = jsonParse<MastraMessageContentV2>(existing.content);
				if (msg.content.metadata !== undefined) existingContent.metadata = msg.content.metadata;
				if (msg.content.content !== undefined) existingContent.content = msg.content.content;
				updates.content = JSON.stringify(existingContent);
			}

			if (Object.keys(updates).length > 0) {
				await this.messageRepo.update(msg.id, updates);
			}

			const updated = await this.messageRepo.findOneByOrFail({ id: msg.id });
			result.push(this.entityToMessage(updated));
		}
		return result;
	}

	async deleteMessages(messageIds: string[]): Promise<void> {
		if (messageIds.length === 0) return;
		await this.messageRepo.delete(messageIds);
	}

	// Resource operations

	async getResourceById({
		resourceId,
	}: {
		resourceId: string;
	}): Promise<StorageResourceType | null> {
		return await withCurrentTraceSpan(
			{
				name: 'memory_load',
				tags: ['memory', 'internal'],
				metadata: buildResourceTraceMetadata(resourceId),
				inputs: { resource_id: resourceId },
				processOutputs: summarizeLoadedResource,
			},
			async () => {
				const entity = await this.resourceRepo.findOneBy({ id: resourceId });
				if (!entity) return null;
				return {
					id: entity.id,
					workingMemory: entity.workingMemory ?? undefined,
					metadata: entity.metadata ?? undefined,
					createdAt: entity.createdAt,
					updatedAt: entity.updatedAt,
				};
			},
		);
	}

	async saveResource({
		resource,
	}: {
		resource: StorageResourceType;
	}): Promise<StorageResourceType> {
		const entity = this.resourceRepo.create({
			id: resource.id,
			workingMemory: resource.workingMemory ?? null,
			metadata: resource.metadata ?? null,
		});
		const saved = await this.resourceRepo.save(entity);
		return {
			id: saved.id,
			workingMemory: saved.workingMemory ?? undefined,
			metadata: saved.metadata ?? undefined,
			createdAt: saved.createdAt,
			updatedAt: saved.updatedAt,
		};
	}

	async updateResource({
		resourceId,
		workingMemory,
		metadata,
	}: {
		resourceId: string;
		workingMemory?: string;
		metadata?: Record<string, unknown>;
	}): Promise<StorageResourceType> {
		// Upsert: Mastra calls updateResource even when the resource doesn't exist yet
		// (e.g. first updateWorkingMemory call for a new user).
		let existing = await this.resourceRepo.findOneBy({ id: resourceId });
		if (!existing) {
			existing = await this.resourceRepo.save(
				this.resourceRepo.create({
					id: resourceId,
					workingMemory: workingMemory ?? null,
					metadata: metadata ?? null,
				}),
			);
		} else {
			if (workingMemory !== undefined) existing.workingMemory = workingMemory;
			if (metadata !== undefined) existing.metadata = metadata;
			existing = await this.resourceRepo.save(existing);
		}
		return {
			id: existing.id,
			workingMemory: existing.workingMemory ?? undefined,
			metadata: existing.metadata ?? undefined,
			createdAt: existing.createdAt,
			updatedAt: existing.updatedAt,
		};
	}

	async cloneThread(args: StorageCloneThreadInput): Promise<StorageCloneThreadOutput> {
		const source = await this.getThreadById({
			threadId: args.sourceThreadId,
		});
		if (!source) throw new Error(`Source thread ${args.sourceThreadId} not found`);

		const newThreadId = args.newThreadId ?? randomUUID();
		const cloneMetadata = {
			...(source.metadata ?? {}),
			...(args.metadata ?? {}),
			mastra: {
				...((source.metadata?.mastra as Record<string, unknown>) ?? {}),
				clone: {
					sourceThreadId: args.sourceThreadId,
					clonedAt: new Date(),
				},
			},
		};

		const newThread = await this.saveThread({
			thread: {
				id: newThreadId,
				resourceId: args.resourceId ?? source.resourceId,
				title: args.title ?? source.title,
				metadata: cloneMetadata,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		});

		// Clone messages
		const { messages: sourceMessages } = await this.listMessages({
			threadId: args.sourceThreadId,
			perPage: false,
			orderBy: { field: 'createdAt', direction: 'ASC' },
		});

		let messagesToClone = sourceMessages;
		if (args.options?.messageLimit) {
			messagesToClone = messagesToClone.slice(-args.options.messageLimit);
		}

		const messageIdMap: Record<string, string> = {};
		const clonedMessages = messagesToClone.map((m) => {
			const newId = generateNanoId();
			messageIdMap[m.id] = newId;
			return { ...m, id: newId, threadId: newThreadId };
		});

		if (clonedMessages.length > 0) {
			await this.saveMessages({ messages: clonedMessages });
		}

		return { thread: newThread, clonedMessages, messageIdMap };
	}

	// ── Observational Memory ────────────────────────────────────────────────

	private omLookupKey(scope: string, threadId: string | null, resourceId: string): string {
		return `${scope}:${threadId ?? 'null'}:${resourceId}`;
	}

	private entityToOMRecord(entity: InstanceAiObservationalMemory): ObservationalMemoryRecord {
		return {
			id: entity.id,
			scope: entity.scope as ObservationalMemoryRecord['scope'],
			threadId: entity.threadId,
			resourceId: entity.resourceId,
			createdAt: entity.createdAt,
			updatedAt: entity.updatedAt,
			lastObservedAt: entity.lastObservedAt ?? undefined,
			originType: entity.originType as ObservationalMemoryRecord['originType'],
			generationCount: entity.generationCount,
			activeObservations: entity.activeObservations,
			bufferedObservationChunks: (entity.bufferedObservationChunks ??
				undefined) as ObservationalMemoryRecord['bufferedObservationChunks'],
			bufferedObservations: entity.bufferedObservations ?? undefined,
			bufferedObservationTokens: entity.bufferedObservationTokens ?? undefined,
			bufferedMessageIds: entity.bufferedMessageIds ?? undefined,
			bufferedReflection: entity.bufferedReflection ?? undefined,
			bufferedReflectionTokens: entity.bufferedReflectionTokens ?? undefined,
			bufferedReflectionInputTokens: entity.bufferedReflectionInputTokens ?? undefined,
			reflectedObservationLineCount: entity.reflectedObservationLineCount ?? undefined,
			observedMessageIds: entity.observedMessageIds ?? undefined,
			observedTimezone: entity.observedTimezone ?? undefined,
			totalTokensObserved: entity.totalTokensObserved,
			observationTokenCount: entity.observationTokenCount,
			pendingMessageTokens: entity.pendingMessageTokens,
			isReflecting: entity.isReflecting,
			isObserving: entity.isObserving,
			isBufferingObservation: entity.isBufferingObservation,
			isBufferingReflection: entity.isBufferingReflection,
			lastBufferedAtTokens: entity.lastBufferedAtTokens,
			lastBufferedAtTime: entity.lastBufferedAtTime,
			config: typeof entity.config === 'string' ? jsonParse(entity.config) : entity.config,
			metadata: entity.metadata ?? undefined,
		};
	}

	async getObservationalMemory(
		threadId: string | null,
		resourceId: string,
	): Promise<ObservationalMemoryRecord | null> {
		const lookupKey = this.omLookupKey(threadId ? 'thread' : 'resource', threadId, resourceId);
		const entity = await this.omRepo.findOne({
			where: { lookupKey },
			order: { generationCount: 'DESC' },
		});
		if (!entity) return null;
		return this.entityToOMRecord(entity);
	}

	async getObservationalMemoryHistory(
		threadId: string | null,
		resourceId: string,
		limit = 10,
	): Promise<ObservationalMemoryRecord[]> {
		const scope = threadId ? 'thread' : 'resource';
		const entities = await this.omRepo.find({
			where: { scope, threadId: threadId ?? undefined, resourceId },
			order: { generationCount: 'DESC' },
			take: limit,
		});
		return entities.map((e) => this.entityToOMRecord(e));
	}

	async initializeObservationalMemory(
		input: CreateObservationalMemoryInput,
	): Promise<ObservationalMemoryRecord> {
		const id = generateNanoId();
		const lookupKey = this.omLookupKey(input.scope, input.threadId, input.resourceId);
		const entity = this.omRepo.create({
			id,
			lookupKey,
			scope: input.scope,
			threadId: input.threadId,
			resourceId: input.resourceId,
			originType: 'initial',
			config: JSON.stringify(input.config),
			observedTimezone: input.observedTimezone ?? null,
		});
		const saved = await this.omRepo.save(entity);
		return this.entityToOMRecord(saved);
	}

	async insertObservationalMemoryRecord(record: ObservationalMemoryRecord): Promise<void> {
		const lookupKey = this.omLookupKey(record.scope, record.threadId, record.resourceId);
		const entity = this.omRepo.create({
			id: record.id,
			lookupKey,
			scope: record.scope,
			threadId: record.threadId,
			resourceId: record.resourceId,
			activeObservations: record.activeObservations,
			originType: record.originType,
			config: JSON.stringify(record.config),
			generationCount: record.generationCount,
			lastObservedAt: record.lastObservedAt ?? null,
			pendingMessageTokens: record.pendingMessageTokens,
			totalTokensObserved: record.totalTokensObserved,
			observationTokenCount: record.observationTokenCount,
			isObserving: record.isObserving,
			isReflecting: record.isReflecting,
			observedMessageIds: record.observedMessageIds ?? null,
			observedTimezone: record.observedTimezone ?? null,
			bufferedObservations: record.bufferedObservations ?? null,
			bufferedObservationTokens: record.bufferedObservationTokens ?? null,
			bufferedMessageIds: record.bufferedMessageIds ?? null,
			bufferedReflection: record.bufferedReflection ?? null,
			bufferedReflectionTokens: record.bufferedReflectionTokens ?? null,
			bufferedReflectionInputTokens: record.bufferedReflectionInputTokens ?? null,
			reflectedObservationLineCount: record.reflectedObservationLineCount ?? null,
			bufferedObservationChunks: (record.bufferedObservationChunks ?? null) as unknown[] | null,
			isBufferingObservation: record.isBufferingObservation,
			isBufferingReflection: record.isBufferingReflection,
			lastBufferedAtTokens: record.lastBufferedAtTokens,
			lastBufferedAtTime: record.lastBufferedAtTime ?? null,
			metadata: record.metadata ?? null,
		});
		await this.omRepo.save(entity);
	}

	async updateActiveObservations(input: UpdateActiveObservationsInput): Promise<void> {
		const entity = await this.omRepo.findOneByOrFail({ id: input.id });
		const existingIds = entity.observedMessageIds ?? [];
		const mergedIds = [...new Set([...existingIds, ...(input.observedMessageIds ?? [])])];
		await this.omRepo.update(input.id, {
			activeObservations: input.observations,
			observationTokenCount: input.tokenCount,
			lastObservedAt: input.lastObservedAt,
			observedMessageIds: mergedIds,
			observedTimezone: input.observedTimezone ?? entity.observedTimezone,
			totalTokensObserved: entity.totalTokensObserved + input.tokenCount,
		});
	}

	async updateBufferedObservations(input: UpdateBufferedObservationsInput): Promise<void> {
		const entity = await this.omRepo.findOneByOrFail({ id: input.id });
		const chunks = entity.bufferedObservationChunks ?? [];
		chunks.push(input.chunk);
		const updates: Record<string, unknown> = {
			bufferedObservationChunks: chunks,
		};
		if (input.lastBufferedAtTime) {
			updates.lastBufferedAtTime = input.lastBufferedAtTime;
		}
		await this.omRepo.update(input.id, updates);
	}

	async swapBufferedToActive(
		input: SwapBufferedToActiveInput,
	): Promise<SwapBufferedToActiveResult> {
		const entity = await this.omRepo.findOneByOrFail({ id: input.id });
		const record = this.entityToOMRecord(entity);
		const chunks = record.bufferedObservationChunks ?? [];

		if (chunks.length === 0) {
			return {
				chunksActivated: 0,
				messageTokensActivated: 0,
				observationTokensActivated: 0,
				messagesActivated: 0,
				activatedCycleIds: [],
				activatedMessageIds: [],
			};
		}

		// Calculate retention floor
		const retentionFloor = input.messageTokensThreshold * (1 - input.activationRatio);
		const tokensToRemove = input.currentPendingTokens - retentionFloor;

		// Select chunks to activate (from oldest to newest)
		let removedTokens = 0;
		let activatedCount = 0;
		const activated: typeof chunks = [];
		const remaining: typeof chunks = [];

		for (const chunk of chunks) {
			if (removedTokens < tokensToRemove || (input.forceMaxActivation && remaining.length === 0)) {
				activated.push(chunk);
				removedTokens += chunk.messageTokens ?? 0;
				activatedCount++;
			} else {
				remaining.push(chunk);
			}
		}

		// Build result
		let totalMessageTokens = 0;
		let totalObsTokens = 0;
		let totalMessages = 0;
		const allMsgIds: string[] = [];
		const cycleIds: string[] = [];
		const observationParts: string[] = [];

		for (const chunk of activated) {
			totalMessageTokens += chunk.messageTokens ?? 0;
			totalObsTokens += chunk.tokenCount ?? 0;
			totalMessages += chunk.messageIds?.length ?? 0;
			allMsgIds.push(...(chunk.messageIds ?? []));
			if (chunk.cycleId) cycleIds.push(chunk.cycleId);
			if (chunk.observations) observationParts.push(chunk.observations);
		}

		// Merge activated observations into active
		const newActive = record.activeObservations
			? record.activeObservations + '\n' + observationParts.join('\n')
			: observationParts.join('\n');

		// Update last observed timestamp from last activated chunk
		const lastActivatedChunk = activated[activated.length - 1] as
			| BufferedObservationChunk
			| undefined;
		const newLastObservedAt =
			input.lastObservedAt ??
			(lastActivatedChunk?.lastObservedAt
				? new Date(lastActivatedChunk.lastObservedAt as unknown as string)
				: record.lastObservedAt);

		// Merge message IDs
		const existingMsgIds = record.observedMessageIds ?? [];
		const mergedMsgIds = [...new Set([...existingMsgIds, ...allMsgIds])];

		await this.omRepo.update(input.id, {
			activeObservations: newActive,
			observationTokenCount: record.observationTokenCount + totalObsTokens,
			bufferedObservationChunks: remaining.length > 0 ? remaining : null,
			lastObservedAt: newLastObservedAt ?? null,
			observedMessageIds: mergedMsgIds,
			totalTokensObserved: record.totalTokensObserved + totalObsTokens,
			isBufferingObservation: false,
		});

		return {
			chunksActivated: activatedCount,
			messageTokensActivated: totalMessageTokens,
			observationTokensActivated: totalObsTokens,
			messagesActivated: totalMessages,
			activatedCycleIds: cycleIds,
			activatedMessageIds: allMsgIds,
			observations: observationParts.join('\n'),
		};
	}

	async createReflectionGeneration(
		input: CreateReflectionGenerationInput,
	): Promise<ObservationalMemoryRecord> {
		const { currentRecord, reflection, tokenCount } = input;
		const newId = generateNanoId();
		const lookupKey = this.omLookupKey(
			currentRecord.scope,
			currentRecord.threadId,
			currentRecord.resourceId,
		);
		const entity = this.omRepo.create({
			id: newId,
			lookupKey,
			scope: currentRecord.scope,
			threadId: currentRecord.threadId,
			resourceId: currentRecord.resourceId,
			activeObservations: reflection,
			originType: 'reflection',
			config: JSON.stringify(currentRecord.config),
			generationCount: currentRecord.generationCount + 1,
			lastObservedAt: currentRecord.lastObservedAt ?? null,
			observationTokenCount: tokenCount,
			totalTokensObserved: currentRecord.totalTokensObserved,
			pendingMessageTokens: currentRecord.pendingMessageTokens,
			isObserving: false,
			isReflecting: false,
			isBufferingObservation: false,
			isBufferingReflection: false,
			lastBufferedAtTokens: 0,
			lastBufferedAtTime: null,
			observedTimezone: currentRecord.observedTimezone ?? null,
			metadata: currentRecord.metadata ?? null,
		});
		const saved = await this.omRepo.save(entity);
		return this.entityToOMRecord(saved);
	}

	async updateBufferedReflection(input: UpdateBufferedReflectionInput): Promise<void> {
		await this.omRepo.update(input.id, {
			bufferedReflection: input.reflection,
			bufferedReflectionTokens: input.tokenCount,
			bufferedReflectionInputTokens: input.inputTokenCount,
			reflectedObservationLineCount: input.reflectedObservationLineCount,
		});
	}

	async swapBufferedReflectionToActive(
		input: SwapBufferedReflectionToActiveInput,
	): Promise<ObservationalMemoryRecord> {
		const { currentRecord, tokenCount } = input;

		// Separate reflected vs unreflected observations
		const lines = currentRecord.activeObservations.split('\n');
		const reflectedCount = currentRecord.reflectedObservationLineCount ?? lines.length;
		const unreflected = lines.slice(reflectedCount).join('\n');

		// New active = buffered reflection + unreflected observations
		const newActive = currentRecord.bufferedReflection
			? unreflected
				? `${currentRecord.bufferedReflection}\n${unreflected}`
				: currentRecord.bufferedReflection
			: unreflected;

		const newId = generateNanoId();
		const lookupKey = this.omLookupKey(
			currentRecord.scope,
			currentRecord.threadId,
			currentRecord.resourceId,
		);
		const entity = this.omRepo.create({
			id: newId,
			lookupKey,
			scope: currentRecord.scope,
			threadId: currentRecord.threadId,
			resourceId: currentRecord.resourceId,
			activeObservations: newActive,
			originType: 'reflection',
			config: JSON.stringify(currentRecord.config),
			generationCount: currentRecord.generationCount + 1,
			lastObservedAt: currentRecord.lastObservedAt ?? null,
			observationTokenCount: tokenCount,
			totalTokensObserved: currentRecord.totalTokensObserved,
			pendingMessageTokens: currentRecord.pendingMessageTokens,
			isObserving: false,
			isReflecting: false,
			isBufferingObservation: false,
			isBufferingReflection: false,
			lastBufferedAtTokens: 0,
			lastBufferedAtTime: null,
			observedTimezone: currentRecord.observedTimezone ?? null,
			metadata: currentRecord.metadata ?? null,
		});
		const saved = await this.omRepo.save(entity);
		return this.entityToOMRecord(saved);
	}

	async setReflectingFlag(id: string, isReflecting: boolean): Promise<void> {
		await this.omRepo.update(id, { isReflecting });
	}

	async setObservingFlag(id: string, isObserving: boolean): Promise<void> {
		await this.omRepo.update(id, { isObserving });
	}

	async setBufferingObservationFlag(
		id: string,
		isBuffering: boolean,
		lastBufferedAtTokens?: number,
	): Promise<void> {
		const updates: Record<string, unknown> = {
			isBufferingObservation: isBuffering,
		};
		if (isBuffering && lastBufferedAtTokens !== undefined) {
			updates.lastBufferedAtTokens = lastBufferedAtTokens;
		}
		await this.omRepo.update(id, updates);
	}

	async setBufferingReflectionFlag(id: string, isBuffering: boolean): Promise<void> {
		await this.omRepo.update(id, { isBufferingReflection: isBuffering });
	}

	async clearObservationalMemory(threadId: string | null, resourceId: string): Promise<void> {
		const scope = threadId ? 'thread' : 'resource';
		const lookupKey = this.omLookupKey(scope, threadId, resourceId);
		await this.omRepo.delete({ lookupKey });
	}

	async setPendingMessageTokens(id: string, tokenCount: number): Promise<void> {
		await this.omRepo.update(id, { pendingMessageTokens: tokenCount });
	}

	// ── Helpers ──────────────────────────────────────────────────────────────

	private entityToMessage(entity: InstanceAiMessage): MastraDBMessage {
		return {
			id: entity.id,
			role: entity.role as MastraDBMessage['role'],
			createdAt: entity.createdAt,
			threadId: entity.threadId,
			resourceId: entity.resourceId ?? undefined,
			type: entity.type ?? undefined,
			content: jsonParse<MastraMessageContentV2>(entity.content),
		};
	}
}
