import type { AgentDbMessage } from '@n8n/agents';
import type {
	InstanceAiEnsureThreadResponse,
	InstanceAiThreadInfo,
	InstanceAiThreadListResponse,
	InstanceAiThreadHistoryQuery,
	InstanceAiThreadHistoryResponse,
	InstanceAiThreadMessagesResponse,
	InstanceAiThreadOrigin,
	InstanceAiThreadSource,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { InstanceAiConfig } from '@n8n/config';
import { Container, Service } from '@n8n/di';
import { z } from 'zod';
import { patchThread, withBoundAgentTarget, type AgentBuilderTarget } from '@n8n/instance-ai';

import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';

import { UserRepository } from '@n8n/db';

import type { AgentExecutionThread } from '../agents/entities/agent-execution-thread.entity';
import { N8nMemory, type N8nMemoryImpl } from '../agents/integrations/n8n-memory';
import { AgentExecutionThreadRepository } from '../agents/repositories/agent-execution-thread.repository';
import { SystemAgentExecutionService } from '../agents/system-agents/system-agent-execution.service';
import { draftChatMemoryResourceId } from '../agents/utils/agent-memory-scope';
import { ASSISTANT_AGENT_ID, ASSISTANT_TURN_DEFAULTS_KEY } from './assistant-turn-options';
import { lostRunTargetOf, storedRunTargetOf, withoutLostRunTarget } from './run-target/run-target';
import { toRestorableMessage } from './instance-ai-restorable-message';
import { ThreadFactsService } from './thread-overview/thread-facts.service';

/** Write-path launch attribution. `unknown` is reserved for legacy rows on read. */
export interface InstanceAiThreadLaunchMetadata {
	source: InstanceAiThreadSource;
	origin: InstanceAiThreadOrigin;
	sourceContext?: Record<string, unknown>;
}

/** Span of a returned message page — the only trees a read needs to hydrate.
 *  Half-open (`[since, before)`) so consecutive pages partition the thread:
 *  every tree is claimed by exactly one page, none by two or by none. */
/**
 * Bounds tree hydration to the page being rendered. Trees older than the page
 * have no message to pair with and `parseStoredMessages` renders them as
 * messages of their own, so leaving them in costs a full-history read *and*
 * puts turns on screen the page did not ask for.
 *
 * The newest page keeps an open upper bound: an in-flight run's message rows
 * are not written until its turn commits, so clipping there would hide the turn
 * the user is watching.
 *
 * An older page stops where the next page starts — NOT at its own newest
 * message. A turn's tree is written when its run ends, after the assistant row
 * it pairs with (the parser pairs a tree to the newest message at or before
 * it), so a bound at the page's own newest message drops the tree of the turn
 * the page ends on and no other page claims it either.
 *
 * An empty newest page carries no bounds at all: a thread whose only activity
 * is a first, still-running turn has no message rows yet and must still render.
 * An empty older page is out of range — nothing to pair a tree with, and no
 * bounds to read it with, so it hydrates nothing (`undefined`).
 */
/**
 * Widens a windowed run set to whole message groups. A group's runs fold into
 * one tree, and a background run can outlive the turn that spawned it, so a
 * window that catches one run of a group has to pull in its siblings — folding
 * a group from half its facts yields a tree missing the other half's work.
 */
/** Runs with a `run-start` fact but no terminal `run-finish` in the log. */
/** Snapshot-shaped entries derived from the log, grouped the way the snapshot
 *  writer groups its rows: by run-start messageGroupId, else one entry per
 *  run. Events keep their thread (seq) order within each group — runs of one
 *  group can interleave (background tasks run concurrently with their parent)
 *  and the reducer must see facts in the order they happened, exactly as the
 *  run-sync bootstrap and the snapshot writer feed it. The parser pairs
 *  entries to assistant messages positionally by createdAt, so the entry is
 *  anchored at the FIRST run's last fact time (≈ parent-run end, the moment
 *  a stored snapshot row would have been created). */
@Service()
export class InstanceAiMemoryService {
	private readonly instanceAiConfig: InstanceAiConfig;

	constructor(
		private readonly logger: Logger,
		globalConfig: GlobalConfig,
		private readonly threadFacts: ThreadFactsService,
	) {
		this.instanceAiConfig = globalConfig.instanceAi;
	}

	/** Assistant memory lives in the Agents tables, scoped to the Assistant agent. */
	private get agentMemory(): N8nMemoryImpl {
		return Container.get(N8nMemory).getImplementation(ASSISTANT_AGENT_ID);
	}

	private get threads(): AgentExecutionThreadRepository {
		return Container.get(AgentExecutionThreadRepository);
	}

	/** Session row (owner, project, title) plus memory thread (metadata). */
	private async loadThread(threadId: string) {
		const session = await this.threads.findOneBy({ id: threadId, agentId: ASSISTANT_AGENT_ID });
		if (!session) return null;
		const memoryThread = await this.agentMemory.getThread(threadId);
		return {
			id: session.id,
			title: memoryThread?.title || session.title || undefined,
			resourceId: session.ownerId ?? '',
			projectId: session.projectId,
			metadata: memoryThread?.metadata,
			createdAt: session.createdAt,
			updatedAt: session.updatedAt,
		};
	}

	private async toThreadInfos(sessions: AgentExecutionThread[]): Promise<InstanceAiThreadInfo[]> {
		return await Promise.all(
			sessions.map(async (session) => {
				const memoryThread = await this.agentMemory.getThread(session.id);
				return this.toThreadInfo({
					id: session.id,
					title: memoryThread?.title || session.title || undefined,
					resourceId: session.ownerId ?? '',
					projectId: session.projectId,
					metadata: memoryThread?.metadata,
					createdAt: session.createdAt,
					updatedAt: session.updatedAt,
				});
			}),
		);
	}

	/** Paged message read over the Assistant memory, oldest first within the page. */
	private async listMessages(args: {
		threadId: string;
		limit?: number;
		page?: number;
		withNewerBoundary?: boolean;
	}): Promise<{ messages: AgentDbMessage[]; newerBoundaryAt?: Date }> {
		const limit = args.limit ?? 50;
		const page = args.page ?? 0;
		const all = await this.agentMemory.getMessages(args.threadId);
		const end = all.length - page * limit;
		if (end <= 0) return { messages: [] };
		const start = Math.max(0, end - limit);
		const boundary = args.withNewerBoundary && page > 0 ? all[end] : undefined;
		return { messages: all.slice(start, end), newerBoundaryAt: boundary?.createdAt };
	}

	async getThreadInfo(threadId: string): Promise<InstanceAiThreadInfo> {
		const thread = await this.loadThread(threadId);
		if (!thread) throw new NotFoundError('Thread not found');
		return this.toThreadInfo(thread);
	}

	/** `sharedProjectIds`: projects whose shared threads the user can also open. */
	async listThreadHistory(
		userId: string,
		query: InstanceAiThreadHistoryQuery,
		sharedProjectIds: string[] = [],
	): Promise<InstanceAiThreadHistoryResponse> {
		let before: { updatedAt: Date; id: string } | undefined;
		if (query.cursor) {
			try {
				const parsed = z
					.object({ updatedAt: z.string().datetime(), id: z.string().min(1).max(256) })
					.parse(JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8')));
				before = { updatedAt: new Date(parsed.updatedAt), id: parsed.id };
			} catch {
				throw new BadRequestError('Invalid thread history cursor');
			}
		}
		const rows = await this.threads.findVisibleHistoryPage(
			ASSISTANT_AGENT_ID,
			{ userId, sharedProjectIds },
			{ limit: query.limit, search: query.search, before },
		);
		const hasMore = rows.length > query.limit;
		const threads = await this.toThreadInfos(rows.slice(0, query.limit));
		const last = threads.at(-1);
		return {
			threads,
			hasMore,
			nextCursor:
				hasMore && last
					? Buffer.from(JSON.stringify({ updatedAt: last.updatedAt, id: last.id })).toString(
							'base64url',
						)
					: null,
		};
	}

	/** `sharedProjectIds`: projects whose shared threads the user can also open. */
	async listThreads(
		userId: string,
		page = 0,
		perPage = 100,
		sharedProjectIds: string[] = [],
	): Promise<InstanceAiThreadListResponse> {
		const all = await this.threads.findVisibleByAgent(ASSISTANT_AGENT_ID, userId, sharedProjectIds);
		const slice = all.slice(page * perPage, (page + 1) * perPage);
		const [threads, overviews] = await Promise.all([
			this.toThreadInfos(slice),
			this.threadFacts.getOverviews(slice),
		]);
		return {
			threads: threads.map((thread) => ({ ...thread, ...overviews.get(thread.id) })),
			total: all.length,
			page,
			hasMore: (page + 1) * perPage < all.length,
		};
	}

	async ensureThread(
		userId: string,
		threadId: string,
		projectId: string,
		launchMetadata: InstanceAiThreadLaunchMetadata,
		title = '',
	): Promise<InstanceAiEnsureThreadResponse> {
		const existing = await this.loadThread(threadId);
		if (existing) {
			if (existing.resourceId !== userId) {
				throw new Error(`Thread ${threadId} is not owned by user ${userId}`);
			}
			return { thread: this.toThreadInfo(existing), created: false };
		}
		const user = await Container.get(UserRepository).findByIdWithRole(userId);
		if (!user) throw new NotFoundError('User not found');
		await Container.get(SystemAgentExecutionService).createThread({
			agentId: ASSISTANT_AGENT_ID,
			user,
			projectId,
			threadId,
			...(title ? { title } : {}),
		});
		await this.agentMemory.saveThread({
			id: threadId,
			resourceId: draftChatMemoryResourceId(userId),
			title,
			metadata: {
				source: launchMetadata.source,
				origin: launchMetadata.origin,
				...(launchMetadata.sourceContext ? { sourceContext: launchMetadata.sourceContext } : {}),
			},
		});
		const created = await this.loadThread(threadId);
		if (!created) throw new NotFoundError('Thread not found');
		return { thread: this.toThreadInfo(created), created: true };
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

		await this.agentMemory.saveMessages({
			threadId,
			resourceId: draftChatMemoryResourceId(userId),
			messages: restorable,
		});
		return { restored: restorable.length };
	}

	async getThreadProjectId(threadId: string): Promise<string | undefined> {
		return (await this.loadThread(threadId))?.projectId;
	}

	async getThreadMessages(
		_userId: string,
		threadId: string,
		options?: { limit?: number; page?: number },
	): Promise<InstanceAiThreadMessagesResponse> {
		const result = await this.listMessages({
			threadId,
			limit: options?.limit ?? 50,
			page: options?.page ?? 0,
		});
		return {
			threadId,
			messages: result.messages.map((m) => this.toThreadMessage(m)),
		};
	}

	/**
	 * Verify that a thread belongs to a specific user.
	 * Returns true if the thread exists and is owned by the user.
	 */
	async validateThreadOwnership(userId: string, threadId: string): Promise<boolean> {
		return (await this.checkThreadOwnership(userId, threadId)) === 'owned';
	}

	async checkThreadOwnership(
		userId: string,
		threadId: string,
	): Promise<'owned' | 'not_found' | 'other_user'> {
		const session = await this.threads.findOneBy({ id: threadId });
		if (!session) return 'not_found';
		return session.agentId === ASSISTANT_AGENT_ID && session.ownerId === userId
			? 'owned'
			: 'other_user';
	}

	/** The bulk form of `checkThreadOwnership`: the threads in the list that the user owns. */
	async findOwnedThreadIds(userId: string, threadIds: string[]): Promise<Set<string>> {
		const unique = [...new Set(threadIds)];
		return new Set(await this.threads.findIdsOwnedByAgent(ASSISTANT_AGENT_ID, userId, unique));
	}

	async deleteThread(threadId: string): Promise<void> {
		await this.agentMemory.deleteThread(threadId);
		await this.threads.delete({ id: threadId, agentId: ASSISTANT_AGENT_ID });
	}

	/**
	 * Deletes the Assistant threads of a user, private and shared. The 'user-deleted' event comes
	 * after the user row is gone, so the threads are found also without their owner.
	 */
	async deleteThreadsForUser(userId: string): Promise<number> {
		const sessions = await this.threads.findOfUser(ASSISTANT_AGENT_ID, userId);
		for (const session of sessions) await this.deleteThread(session.id);
		return sessions.length;
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
		if (updates.title !== undefined) {
			await this.threads.updateOwned(threadId, { title: updates.title });
		}
		return await this.getThreadInfo(threadId);
	}

	/**
	 * Replace this thread's pending new-agent marker with `target` as its bound
	 * agent-builder target, in one patch — a merge-style update cannot delete a
	 * key, and leaving both standing makes a reload show a phantom blank artifact
	 * beside the real agent. Ownership is re-checked inside the patch so a thread
	 * that changed hands between read and write cannot be rebound.
	 */
	async bindAgentBuilderTarget(
		userId: string,
		threadId: string,
		target: AgentBuilderTarget,
	): Promise<InstanceAiThreadInfo> {
		const updated = await patchThread(this.agentMemory, {
			threadId,
			update: (thread) => {
				// A `null` patch means "leave the thread alone", which would answer a
				// non-owner with a success — throw instead.
				if (thread.resourceId !== draftChatMemoryResourceId(userId)) {
					throw new ForbiddenError('Not authorized for this thread');
				}
				return { metadata: withBoundAgentTarget(thread.metadata ?? {}, target) };
			},
		});
		if (!updated) {
			throw new NotFoundError(`Thread ${threadId} not found`);
		}
		return await this.getThreadInfo(updated.id);
	}

	/**
	 * The owner has seen the lost link notice of a chat. The notice is shown once, so its marker
	 * goes. A thread without the marker is left alone.
	 */
	async acknowledgeLostRunTarget(threadId: string): Promise<void> {
		await patchThread(this.agentMemory, {
			threadId,
			update: ({ metadata }) => {
				if (!metadata || !lostRunTargetOf(metadata)) return null;
				return { metadata: withoutLostRunTarget(metadata) };
			},
		});
	}

	async getThreadMetadata(
		userId: string,
		threadId: string,
	): Promise<Record<string, unknown> | undefined> {
		const thread = await this.loadThread(threadId);
		if (!thread || thread.resourceId !== userId) return undefined;
		return thread.metadata;
	}

	/**
	 * Delete conversation threads older than the configured TTL. Invoked on a
	 * recurring schedule by the leader instance's prune job. Idempotent and
	 * safe to call repeatedly — no-op if threadTtlDays is 0 (disabled). Stops
	 * before the next thread once `signal` aborts.
	 */
	async cleanupExpiredThreads(
		onThreadDeleted?: (threadId: string) => Promise<void>,
		signal?: AbortSignal,
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

		while (hasMore && !signal?.aborted) {
			const expired = await this.threads.findByAgentUpdatedBefore(
				ASSISTANT_AGENT_ID,
				cutoff,
				perPage,
			);
			const result = { threads: expired, hasMore: expired.length === perPage };
			let deletedInPage = 0;
			for (const thread of result.threads) {
				if (signal?.aborted) break;
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
		projectId?: string;
		metadata?: Record<string, unknown>;
		createdAt: Date;
		updatedAt: Date;
	}): InstanceAiThreadInfo {
		const runTarget = storedRunTargetOf(thread.metadata?.[ASSISTANT_TURN_DEFAULTS_KEY]);
		const lostRunTarget = lostRunTargetOf(thread.metadata);
		return {
			id: thread.id,
			title: thread.title,
			resourceId: thread.resourceId,
			...(thread.projectId ? { projectId: thread.projectId } : {}),
			createdAt: thread.createdAt.toISOString(),
			updatedAt: thread.updatedAt.toISOString(),
			metadata: thread.metadata,
			...(runTarget ? { runTarget } : {}),
			...(lostRunTarget ? { lostRunTarget } : {}),
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
