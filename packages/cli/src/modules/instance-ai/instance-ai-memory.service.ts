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
import {
	createSubAgentResourceIdPrefix,
	patchThread,
	type AgentDbMessage,
	type AgentTreeSnapshot,
} from '@n8n/instance-ai';

import { DbSnapshotStorage } from './storage/db-snapshot-storage';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import {
	collectConfirmationRequestIds,
	markExpiredConfirmations,
	parseStoredMessages,
} from './message-parser';
import { InstanceAiCheckpointRepository } from './repositories/instance-ai-checkpoint.repository';
import { InstanceAiPendingConfirmationRepository } from './repositories/instance-ai-pending-confirmation.repository';
import { TypeORMAgentMemory } from './storage/typeorm-agent-memory';

function isAgentMessageLike(value: unknown): value is AgentDbMessage {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as { id?: unknown }).id === 'string' &&
		'role' in value
	);
}

function isRestorableMessage(
	value: Record<string, unknown> & { createdAt: Date },
): value is AgentDbMessage & Record<string, unknown> {
	if (typeof value.id !== 'string' || value.id.length === 0) return false;
	if (value.type === 'custom') return typeof value.data === 'object' && value.data !== null;
	return typeof value.role === 'string' && Array.isArray(value.content);
}

/** Coerce a wire-format seed message (ISO `createdAt`) into a persistable
 *  AgentDbMessage, or undefined if it fails the structural contract. */
function toRestorableMessage(value: Record<string, unknown>): AgentDbMessage | undefined {
	const rawCreatedAt = value.createdAt;
	const createdAt =
		rawCreatedAt instanceof Date
			? rawCreatedAt
			: typeof rawCreatedAt === 'string'
				? new Date(rawCreatedAt)
				: undefined;
	if (!createdAt || Number.isNaN(createdAt.getTime())) return undefined;
	const candidate = { ...value, createdAt };
	return isRestorableMessage(candidate) ? candidate : undefined;
}

function messageCreatedAtMs(message: AgentDbMessage): number {
	const at = message.createdAt;
	if (at instanceof Date) return at.getTime();
	const parsed = new Date(at).getTime();
	return Number.isNaN(parsed) ? 0 : parsed;
}

function mergeMessagesById(stored: AgentDbMessage[], extras: AgentDbMessage[]): AgentDbMessage[] {
	if (extras.length === 0) return stored;
	const byId = new Map<string, AgentDbMessage>();
	for (const message of stored) byId.set(message.id, message);
	for (const message of extras) if (!byId.has(message.id)) byId.set(message.id, message);
	return [...byId.values()].sort((a, b) => messageCreatedAtMs(a) - messageCreatedAtMs(b));
}

@Service()
export class InstanceAiMemoryService {
	private readonly instanceAiConfig: InstanceAiConfig;

	constructor(
		private readonly logger: Logger,
		globalConfig: GlobalConfig,
		private readonly agentMemory: TypeORMAgentMemory,
		private readonly dbSnapshotStorage: DbSnapshotStorage,
		private readonly checkpointRepository: InstanceAiCheckpointRepository,
		private readonly pendingConfirmationRepository: InstanceAiPendingConfirmationRepository,
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

	async ensureThread(
		userId: string,
		threadId: string,
		projectId: string,
	): Promise<InstanceAiEnsureThreadResponse> {
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

		const created = await this.agentMemory.saveThreadWithProject(
			{
				id: threadId,
				resourceId: userId,
				title: '',
			},
			projectId,
		);

		return {
			thread: this.toThreadInfo(created),
			created: true,
		};
	}

	/** Eval-only: seed a thread with a native message log (id/role/content/createdAt
	 *  preserved verbatim) so the runtime continues as if it really happened. The
	 *  thread must exist; referenced artifacts are recreated by the caller. */
	async restoreThreadMessages(
		userId: string,
		threadId: string,
		messages: Array<Record<string, unknown>>,
	): Promise<{ restored: number }> {
		const restorable: AgentDbMessage[] = [];
		for (const [index, raw] of messages.entries()) {
			const message = toRestorableMessage(raw);
			if (!message) {
				throw new BadRequestError(
					`Seed message at index ${index} is not a valid agent message (id, createdAt, and role+content or type:custom+data are required)`,
				);
			}
			restorable.push(message);
		}

		await this.agentMemory.saveMessages({ threadId, resourceId: userId, messages: restorable });
		return { restored: restorable.length };
	}

	/** Project a thread is bound to (undefined for legacy unbound threads). */
	async getThreadProjectId(threadId: string): Promise<string | undefined> {
		return (await this.agentMemory.getThreadProjectId(threadId)) ?? undefined;
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

		// Surface the in-flight messages from any suspended checkpoint. The
		// user's prompt is persisted to memory on receipt, but the intermediate
		// assistant responses and pending tool-call from a turn suspended at HITL
		// are only committed after the turn completes, so until then they live
		// only inside the checkpoint blob. Without merging them in, a thread
		// waiting on a confirmation renders without those in-flight artifacts
		// after a page reload.
		const checkpointMessages = await this.loadInFlightCheckpointMessages(threadId);
		const storedMessages = mergeMessagesById(result.messages, checkpointMessages);

		const messages = parseStoredMessages(storedMessages, snapshots);
		await this.flagExpiredConfirmations(messages);

		const projectId = await this.agentMemory.getThreadProjectId(threadId);
		return { threadId, projectId: projectId ?? undefined, messages };
	}

	/** Cross-check every confirmation card against `instance_ai_pending_confirmations`
	 *  and flip `confirmation.expired = true` on the ones with no live row. */
	private async flagExpiredConfirmations(
		messages: Awaited<ReturnType<typeof parseStoredMessages>>,
	): Promise<void> {
		const requestIds = collectConfirmationRequestIds(messages);
		if (requestIds.length === 0) return;
		try {
			const live = await this.pendingConfirmationRepository.findLiveRequestIds(
				requestIds,
				new Date(),
			);
			markExpiredConfirmations(messages, live);
		} catch (error) {
			this.logger.warn('Failed to flag expired confirmation cards', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private async loadInFlightCheckpointMessages(threadId: string): Promise<AgentDbMessage[]> {
		let checkpoints;
		try {
			checkpoints = await this.checkpointRepository.findActiveByThreadId(threadId);
		} catch (error) {
			this.logger.warn('Failed to load in-flight checkpoint messages', {
				threadId,
				error: error instanceof Error ? error.message : String(error),
			});
			return [];
		}

		const merged: AgentDbMessage[] = [];
		const seen = new Set<string>();
		for (const checkpoint of checkpoints) {
			const stateMessages = checkpoint.state?.messageList?.messages ?? [];
			for (const candidate of stateMessages) {
				if (!isAgentMessageLike(candidate) || seen.has(candidate.id)) continue;
				seen.add(candidate.id);
				merged.push({
					...candidate,
					createdAt:
						candidate.createdAt instanceof Date
							? candidate.createdAt
							: new Date(candidate.createdAt),
				});
			}
		}
		return merged;
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
		await this.agentMemory.deleteThreadsByResourceIdPrefix(
			createSubAgentResourceIdPrefix(threadId),
		);
		await this.agentMemory.deleteThread(threadId);
	}

	/**
	 * Remove every thread owned by a user, the sub-agent threads spawned under
	 * them, and their working-memory resources. Invoked on user deletion to
	 * avoid orphaning Instance AI data. Returns the number of owner threads
	 * deleted.
	 */
	async deleteThreadsForUser(userId: string): Promise<number> {
		return await this.agentMemory.deleteThreadsByResourceId(userId);
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
	 * Delete conversation threads older than the configured TTL. Invoked on a
	 * recurring schedule by the leader instance's prune job. Idempotent and
	 * safe to call repeatedly — no-op if threadTtlDays is 0 (disabled).
	 */
	async cleanupExpiredThreads(
		onThreadDeleted?: (threadId: string) => Promise<void>,
	): Promise<number> {
		const ttlDays = this.instanceAiConfig.threadTtlDays;
		if (!ttlDays || ttlDays <= 0) return 0;

		const cutoff = new Date(Date.now() - ttlDays * 24 * 60 * 60 * 1000);
		let deletedCount = 0;

		// Page through oldest threads first and delete expired ones.
		// Always re-fetch page 0 after deletions to avoid skipping threads
		// when items shift due to deletion during pagination.
		const perPage = 100;
		let hasMore = true;

		while (hasMore) {
			const result = await this.agentMemory.listThreads({
				perPage,
				page: 0,
				orderBy: { field: 'updatedAt', direction: 'ASC' },
			});
			let deletedInPage = 0;
			for (const thread of result.threads) {
				if (thread.updatedAt < cutoff) {
					try {
						await onThreadDeleted?.(thread.id);
						await this.deleteThread(thread.id);
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
