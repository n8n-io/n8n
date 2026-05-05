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
import { patchThread, type AgentDbMessage, type AgentTreeSnapshot } from '@n8n/instance-ai';

import { DbSnapshotStorage } from './storage/db-snapshot-storage';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { parseStoredMessages } from './message-parser';
import { TypeORMAgentMemory } from './storage/typeorm-agent-memory';

@Service()
export class InstanceAiMemoryService {
	private readonly instanceAiConfig: InstanceAiConfig;

	constructor(
		private readonly logger: Logger,
		globalConfig: GlobalConfig,
		private readonly agentMemory: TypeORMAgentMemory,
		private readonly dbSnapshotStorage: DbSnapshotStorage,
	) {
		this.instanceAiConfig = globalConfig.instanceAi;
	}

	async listThreads(
		userId: string,
		page = 0,
		perPage = 100,
	): Promise<InstanceAiThreadListResponse> {
		const result = await this.agentMemory.listThreads({
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
		const existing = await this.agentMemory.getThread(threadId);
		if (existing) {
			if (existing.resourceId !== userId) {
				throw new Error(`Thread ${threadId} is not owned by user ${userId}`);
			}

			return {
				thread: this.toThreadInfo(existing),
				created: false,
			};
		}

		const created = await this.agentMemory.saveThread({
			id: threadId,
			resourceId: userId,
			title: '',
		});

		return {
			thread: this.toThreadInfo(created),
			created: true,
		};
	}

	async getThreadMessages(
		_userId: string,
		threadId: string,
		options?: { limit?: number; page?: number },
	): Promise<InstanceAiThreadMessagesResponse> {
		const result = await this.agentMemory.listMessages({
			threadId,
			limit: options?.limit ?? 50,
			page: options?.page ?? 0,
		});
		return {
			threadId,
			messages: result.messages.map((m) => this.toThreadMessage(m)),
		};
	}

	async getRichMessages(
		_userId: string,
		threadId: string,
		options?: { limit?: number; page?: number; excludeRunIds?: string[] },
	): Promise<Omit<InstanceAiRichMessagesResponse, 'nextEventId'>> {
		const result = await this.agentMemory.listMessages({
			threadId,
			limit: options?.limit ?? 50,
			page: options?.page ?? 0,
		});

		let snapshots = await this.dbSnapshotStorage.getAll(threadId).catch((error) => {
			this.logger.warn('Failed to load agent tree snapshots', {
				threadId,
				error: error instanceof Error ? error.message : String(error),
			});
			return [] as AgentTreeSnapshot[];
		});

		// Exclude snapshots for active runs — they have no matching assistant
		// message in memory yet and would misalign the positional
		// snapshot-to-message matching in parseStoredMessages.
		if (options?.excludeRunIds?.length) {
			const excluded = new Set(options.excludeRunIds);
			snapshots = snapshots.filter((s) => !excluded.has(s.runId));
		}

		const messages = parseStoredMessages(result.messages, snapshots);

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
		const thread = await this.agentMemory.getThread(threadId);
		if (!thread) return 'not_found';
		return thread.resourceId === userId ? 'owned' : 'other_user';
	}

	async deleteThread(threadId: string): Promise<void> {
		await this.agentMemory.deleteThread(threadId);
	}

	async renameThread(threadId: string, title: string): Promise<InstanceAiThreadInfo> {
		return await this.updateThread(threadId, { title });
	}

	async updateThread(
		threadId: string,
		updates: { title?: string; metadata?: Record<string, unknown> },
	): Promise<InstanceAiThreadInfo> {
		const updated = await patchThread(this.agentMemory, {
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
		const thread = await this.agentMemory.getThread(threadId);
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

		const cutoff = new Date(Date.now() - ttlDays * 24 * 60 * 60 * 1000);
		let deletedCount = 0;

		// Page through all threads and delete expired ones.
		// Always re-fetch page 0 after deletions to avoid skipping threads
		// when items shift due to deletion during pagination.
		const perPage = 100;
		let hasMore = true;

		while (hasMore) {
			const result = await this.agentMemory.listThreads({ perPage, page: 0 });
			let deletedInPage = 0;
			for (const thread of result.threads) {
				if (thread.updatedAt < cutoff) {
					try {
						await onThreadDeleted?.(thread.id);
						await this.agentMemory.deleteThread(thread.id);
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

	private toThreadMessage(message: AgentDbMessage) {
		return {
			id: message.id,
			role: 'role' in message ? message.role : 'custom',
			content: 'content' in message ? message.content : message.data,
			type: message.type,
			createdAt: message.createdAt.toISOString(),
		};
	}
}
