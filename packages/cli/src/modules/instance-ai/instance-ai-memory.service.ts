import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { InstanceAiConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { createMemory, WORKING_MEMORY_TEMPLATE } from '@n8n/instance-ai';
import type {
	InstanceAiThreadListResponse,
	InstanceAiThreadMessagesResponse,
	InstanceAiThreadContextResponse,
	InstanceAiRichMessagesResponse,
} from '@n8n/api-types';

import { AgentTreeSnapshotStorage } from './agent-tree-snapshot';
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
	) {
		this.instanceAiConfig = globalConfig.instanceAi;
	}

	async getWorkingMemory(
		userId: string,
		threadId: string,
	): Promise<{ content: string; template: string }> {
		const memory = this.createMemoryInstance();
		const content = await memory.getWorkingMemory({
			threadId,
			resourceId: userId,
		});
		return {
			content: content ?? '',
			template: WORKING_MEMORY_TEMPLATE,
		};
	}

	async updateWorkingMemory(userId: string, threadId: string, content: string): Promise<void> {
		const memory = this.createMemoryInstance();
		await memory.updateWorkingMemory({
			threadId,
			resourceId: userId,
			workingMemory: content,
		});
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
			threads: result.threads.map((t) => ({
				id: t.id,
				title: t.title,
				resourceId: t.resourceId,
				createdAt: t.createdAt.toISOString(),
				updatedAt: t.updatedAt.toISOString(),
				metadata: t.metadata,
			})),
			total: result.total,
			page: result.page,
			hasMore: result.hasMore,
		};
	}

	async getThreadMessages(
		userId: string,
		threadId: string,
		options?: { limit?: number; page?: number },
	): Promise<InstanceAiThreadMessagesResponse> {
		const memory = this.createMemoryInstance();
		const result = await memory.recall({
			threadId,
			resourceId: userId,
			perPage: options?.limit ?? 50,
			page: options?.page ?? 0,
		});
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

	async getThreadContext(
		userId: string,
		threadId: string,
	): Promise<InstanceAiThreadContextResponse> {
		const memory = this.createMemoryInstance();
		const workingMemory = await memory.getWorkingMemory({
			threadId,
			resourceId: userId,
		});
		return {
			threadId,
			workingMemory: workingMemory ?? null,
		};
	}

	async getRichMessages(
		userId: string,
		threadId: string,
		options?: { limit?: number; page?: number },
	): Promise<Omit<InstanceAiRichMessagesResponse, 'nextEventId'>> {
		const memory = this.createMemoryInstance();

		// Fetch raw Mastra messages
		const result = await memory.recall({
			threadId,
			resourceId: userId,
			perPage: options?.limit ?? 50,
			page: options?.page ?? 0,
		});

		// Fetch agent tree snapshots from thread metadata
		const snapshotStorage = new AgentTreeSnapshotStorage(memory);
		const snapshots = await snapshotStorage.getAll(threadId);

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
	async cleanupExpiredThreads(): Promise<number> {
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
}
