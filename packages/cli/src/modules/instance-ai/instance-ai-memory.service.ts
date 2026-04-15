import type {
	InstanceAiEnsureThreadResponse,
	InstanceAiRichMessagesResponse,
	InstanceAiThreadInfo,
	InstanceAiThreadListResponse,
	InstanceAiThreadMessagesResponse,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { InstanceAiConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { createMemory, patchThread, type AgentTreeSnapshot } from '@n8n/instance-ai';

import { DbSnapshotStorage } from './storage/db-snapshot-storage';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { parseStoredMessages } from './message-parser';
import type { MastraDBMessage } from './message-parser';
import { TypeORMCompositeStore } from './storage/typeorm-composite-store';

@Service()
export class InstanceAiMemoryService {
	private readonly instanceAiConfig: InstanceAiConfig;

	constructor(
		private readonly logger: Logger,
		globalConfig: GlobalConfig,
		private readonly compositeStore: TypeORMCompositeStore,
		private readonly dbSnapshotStorage: DbSnapshotStorage,
	) {
		this.instanceAiConfig = globalConfig.instanceAi;
	}

	async listThreads(
		userId: string,
		page = 0,
		perPage = 100,
	): Promise<InstanceAiThreadListResponse> {
		const memory = this.createMemoryInstance();
		const result = await memory.listThreads({
			filter: { resourceId: userId },
			perPage,
			page,
			orderBy: { field: 'updatedAt', direction: 'DESC' },
		});
		return {
			threads: result.threads.map((t) => this.toThreadInfo(t)),
			total: result.total,
			page: result.page,
			hasMore: result.hasMore,
		};
	}

	async ensureThread(userId: string, threadId: string): Promise<InstanceAiEnsureThreadResponse> {
		const memory = this.createMemoryInstance();
		const existing = await memory.getThreadById({ threadId });
		if (existing) {
			if (existing.resourceId !== userId) {
				throw new Error(`Thread ${threadId} is not owned by user ${userId}`);
			}

			return {
				thread: this.toThreadInfo(existing),
				created: false,
			};
		}

		const now = new Date();
		const created = await memory.saveThread({
			thread: {
				id: threadId,
				resourceId: userId,
				title: '',
				createdAt: now,
				updatedAt: now,
			},
		});

		return {
			thread: this.toThreadInfo(created),
			created: true,
		};
	}

	async getThreadMessages(
		userId: string,
		threadId: string,
		options?: { limit?: number; page?: number },
	): Promise<InstanceAiThreadMessagesResponse> {
		const memory = this.createMemoryInstance();
		let result: Awaited<ReturnType<typeof memory.recall>>;
		try {
			result = await memory.recall({
				threadId,
				resourceId: userId,
				perPage: options?.limit ?? 50,
				page: options?.page ?? 0,
			});
		} catch (error: unknown) {
			if (error instanceof Error && error.message.includes('No thread found')) {
				return { threadId, messages: [] };
			}
			throw error;
		}
		return {
			threadId,
			messages: result.messages.map((m) => ({
				id: m.id,
				role: m.role,
				content: typeof m.content === 'string' ? m.content : m.content,
				type: m.type,
				createdAt: m.createdAt.toISOString(),
			})),
		};
	}

	async getRichMessages(
		userId: string,
		threadId: string,
		options?: { limit?: number; page?: number; excludeRunIds?: string[] },
	): Promise<Omit<InstanceAiRichMessagesResponse, 'nextEventId'>> {
		const memory = this.createMemoryInstance();

		// Fetch raw Mastra messages — thread may not exist yet (new conversation before first message)
		let result: Awaited<ReturnType<typeof memory.recall>>;
		try {
			result = await memory.recall({
				threadId,
				resourceId: userId,
				perPage: options?.limit ?? 50,
				page: options?.page ?? 0,
			});
		} catch (error: unknown) {
			if (error instanceof Error && error.message.includes('No thread found')) {
				return { threadId, messages: [] };
			}
			throw error;
		}

		let snapshots = await this.dbSnapshotStorage.getAll(threadId).catch((error) => {
			this.logger.warn('Failed to load agent tree snapshots', {
				threadId,
				error: error instanceof Error ? error.message : String(error),
			});
			return [] as AgentTreeSnapshot[];
		});

		// Exclude snapshots for active runs — they have no matching assistant
		// message in Mastra memory yet and would misalign the positional
		// snapshot-to-message matching in parseStoredMessages.
		if (options?.excludeRunIds?.length) {
			const excluded = new Set(options.excludeRunIds);
			snapshots = snapshots.filter((s) => !excluded.has(s.runId));
		}

		// Parse into rich messages with agent trees
		const mastraMessages: MastraDBMessage[] = result.messages.map((m) => ({
			id: m.id,
			role: m.role,
			content: m.content,
			type: m.type,
			createdAt: m.createdAt,
		}));
		const messages = parseStoredMessages(mastraMessages, snapshots);

		return { threadId, messages };
	}

	async getLatestRunSnapshot(
		threadId: string,
		options?: { messageGroupId?: string; runId?: string },
	): Promise<AgentTreeSnapshot | undefined> {
		return await this.dbSnapshotStorage.getLatest(threadId, options);
	}

	/**
	 * Verify that a thread belongs to a specific user.
	 * Returns true if the thread exists and is owned by the user.
	 */
	async validateThreadOwnership(userId: string, threadId: string): Promise<boolean> {
		return (await this.checkThreadOwnership(userId, threadId)) === 'owned';
	}

	/**
	 * Check thread ownership with three possible outcomes:
	 * - 'owned': thread exists and belongs to this user
	 * - 'not_found': thread doesn't exist yet (new conversation)
	 * - 'other_user': thread exists but belongs to someone else
	 */
	async checkThreadOwnership(
		userId: string,
		threadId: string,
	): Promise<'owned' | 'not_found' | 'other_user'> {
		const memory = this.createMemoryInstance();
		const thread = await memory.getThreadById({ threadId });
		if (!thread) return 'not_found';
		return thread.resourceId === userId ? 'owned' : 'other_user';
	}

	async deleteThread(threadId: string): Promise<void> {
		const memory = this.createMemoryInstance();
		await memory.deleteThread(threadId);
	}

	async renameThread(threadId: string, title: string): Promise<InstanceAiThreadInfo> {
		return await this.updateThread(threadId, { title });
	}

	async updateThread(
		threadId: string,
		updates: { title?: string; metadata?: Record<string, unknown> },
	): Promise<InstanceAiThreadInfo> {
		const memory = this.createMemoryInstance();
		const updated = await patchThread(memory, {
			threadId,
			update: ({ metadata }) => {
				const patch: { title?: string; metadata: Record<string, unknown> } = {
					metadata: { ...metadata, ...updates.metadata },
				};
				if (updates.title !== undefined) {
					patch.title = updates.title;
					patch.metadata.titleRefined = true;
				}
				return patch;
			},
		});
		if (!updated) {
			throw new NotFoundError(`Thread ${threadId} not found`);
		}
		return this.toThreadInfo(updated);
	}

	async getThreadMetadata(
		userId: string,
		threadId: string,
	): Promise<Record<string, unknown> | undefined> {
		const memory = this.createMemoryInstance();
		const thread = await memory.getThreadById({ threadId });
		if (!thread || thread.resourceId !== userId) return undefined;
		return thread.metadata;
	}

	/**
	 * Delete conversation threads older than the configured TTL.
	 * Safe to call on startup — no-op if threadTtlDays is 0 (disabled).
	 */
	async cleanupExpiredThreads(
		onThreadDeleted?: (threadId: string) => Promise<void>,
	): Promise<number> {
		const ttlDays = this.instanceAiConfig.threadTtlDays;
		if (!ttlDays || ttlDays <= 0) return 0;

		const memory = this.createMemoryInstance();
		const cutoff = new Date(Date.now() - ttlDays * 24 * 60 * 60 * 1000);
		let deletedCount = 0;

		// Page through all threads and delete expired ones.
		// Always re-fetch page 0 after deletions to avoid skipping threads
		// when items shift due to deletion during pagination.
		const perPage = 100;
		let hasMore = true;

		while (hasMore) {
			const result = await memory.listThreads({ perPage, page: 0 });
			let deletedInPage = 0;
			for (const thread of result.threads) {
				if (thread.updatedAt < cutoff) {
					try {
						await onThreadDeleted?.(thread.id);
						await memory.deleteThread(thread.id);
						deletedCount++;
						deletedInPage++;
					} catch (error) {
						this.logger.warn('Failed to delete expired thread', {
							threadId: thread.id,
							error: error instanceof Error ? error.message : String(error),
						});
					}
				}
			}
			// If nothing was deleted on this page, we've passed the expired range
			hasMore = deletedInPage > 0 && result.hasMore;
		}

		if (deletedCount > 0) {
			this.logger.info(
				`Cleaned up ${deletedCount} expired conversation threads (TTL: ${ttlDays} days)`,
			);
		}

		return deletedCount;
	}

	private createMemoryInstance() {
		return createMemory({
			storage: this.compositeStore,
			embedderModel: this.instanceAiConfig.embedderModel || undefined,
			lastMessages: this.instanceAiConfig.lastMessages,
			semanticRecallTopK: this.instanceAiConfig.semanticRecallTopK,
		});
	}

	private toThreadInfo(thread: {
		id: string;
		title?: string;
		resourceId: string;
		metadata?: Record<string, unknown>;
		createdAt: Date;
		updatedAt: Date;
	}): InstanceAiThreadInfo {
		return {
			id: thread.id,
			title: thread.title,
			resourceId: thread.resourceId,
			createdAt: thread.createdAt.toISOString(),
			updatedAt: thread.updatedAt.toISOString(),
			metadata: thread.metadata,
		};
	}
}
