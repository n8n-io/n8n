import type { AgentSessionOrigin, AgentSessionQueryFilters } from '@n8n/api-types';
import type { SerializableAgentState } from '@n8n/agents';
import {
	BaseRepository,
	escapeLike,
	LIKE_ESCAPE_CLAUSE,
	TransactionRunner,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, IsNull, Not, type EntityManager, type SelectQueryBuilder } from '@n8n/typeorm';
import chunk from 'lodash/chunk';
import { jsonParse, UserError } from 'n8n-workflow';

import { AgentChatAttachment } from '../entities/agent-chat-attachment.entity';
import { AgentCheckpoint } from '../entities/agent-checkpoint.entity';
import { AgentExecution } from '../entities/agent-execution.entity';
import {
	AgentExecutionThread,
	type AgentThreadAccess,
} from '../entities/agent-execution-thread.entity';
import {
	getDelegatedChildCheckpoints,
	type DelegatedChildCheckpoint,
} from '../utils/delegated-child-checkpoints';
import {
	N8N_CHAT_PRODUCTION_SOURCE,
	PREVIEW_THREAD_SOURCES,
	type AgentSessionMode,
} from '../utils/agent-thread-access';

const CHECKPOINT_BATCH_SIZE = 400;

export interface AgentExecutionThreadMetadata {
	parentThreadId?: string;
	parentAgentId?: string;
}

export interface AgentExecutionThreadPage {
	threads: AgentExecutionThread[];
	nextCursor: string | null;
}

/** Position of the last thread on a keyset page: `updatedAt`, then `id` breaks ties. */
export interface AgentExecutionThreadKeyset {
	updatedAt: Date;
	id: string;
}

export interface AgentExecutionThreadKeysetPage {
	threads: AgentExecutionThread[];
	hasMore: boolean;
}

export type AgentExecutionThreadOwnedChanges = Partial<
	Pick<AgentExecutionThread, 'title' | 'projectId'>
>;

interface AgentSessionDeletionRefs {
	attachmentBinaryDataIds: string[];
	executionLogs: Array<Pick<AgentExecution, 'id' | 'storedAt'>>;
}

@Service()
export class AgentExecutionThreadRepository extends BaseRepository<AgentExecutionThread> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentExecutionThread, dataSource.manager, transactionRunner);
	}

	async lockById(threadId: string, ctx: OperationContext): Promise<AgentExecutionThread | null> {
		const manager = this.managerFor(ctx);
		return await manager.findOne(AgentExecutionThread, {
			where: { id: threadId },
			lock:
				manager.connection.options.type === 'postgres' ? { mode: 'pessimistic_write' } : undefined,
		});
	}

	/**
	 * Find an existing thread or create a new one.
	 * Assign a display number on creation. Concurrent sessions can share a number.
	 */
	async findOrCreate(
		threadId: string,
		agentId: string,
		agentName: string,
		projectId: string,
		access: AgentThreadAccess,
		ctx: OperationContext,
		metadata?: AgentExecutionThreadMetadata,
		taskId?: string | null,
		taskVersionId?: string | null,
		sessionMode: AgentSessionMode = 'new',
	): Promise<{ thread: AgentExecutionThread; created: boolean }> {
		const manager = this.managerFor(ctx);
		const repository = manager.getRepository(AgentExecutionThread);
		if (metadata?.parentThreadId) {
			const parent = await repository.findOneBy({
				id: metadata.parentThreadId,
				projectId,
				agentId: metadata.parentAgentId ?? IsNull(),
			});
			if (parent) {
				access = { accessScope: parent.accessScope, ownerId: parent.ownerId };
			} else if (await repository.existsBy({ id: metadata.parentThreadId })) {
				throw new UserError('Session not found');
			}
		}
		if (access.accessScope === 'user' && !access.ownerId) throw new UserError('Session not found');

		const isPostgres = manager.connection.options.type === 'postgres';
		const findSession = async () =>
			await repository.findOne({
				where: {
					id: threadId,
					agentId,
					projectId,
					...access,
					ownerId: access.ownerId ?? IsNull(),
				},
				lock: isPostgres ? { mode: 'pessimistic_write' } : undefined,
			});
		const existing = await findSession();
		if (existing) return { thread: existing, created: false };
		if (sessionMode === 'existing') throw new UserError('Session not found');

		// ponytail: display numbers can repeat; add allocation coordination only if labels need uniqueness.
		const maxResult = await repository
			.createQueryBuilder('t')
			.select('MAX(t.sessionNumber)', 'max')
			.where('t.projectId = :projectId', { projectId })
			.getRawOne<{ max: number | null }>();
		const thread = {
			id: threadId,
			agentId,
			agentName,
			projectId,
			...access,
			taskId: taskId ?? null,
			taskVersionId: taskVersionId ?? null,
			sessionNumber: (maxResult?.max ?? 0) + 1,
			parentThreadId: metadata?.parentThreadId ?? null,
			parentAgentId: metadata?.parentAgentId ?? null,
		};
		const insert = repository
			.createQueryBuilder()
			.insert()
			.values(thread)
			.orIgnore()
			.updateEntity(false);
		if (isPostgres) insert.returning('id');
		const result = await insert.execute();
		const persisted = await findSession();
		if (!persisted) throw new UserError('Session not found');
		return {
			thread: persisted,
			created: !isPostgres || (Array.isArray(result.raw) && result.raw.length > 0),
		};
	}

	/**
	 * Paginated thread listing sorted by updatedAt DESC.
	 * Uses cursor-based pagination where the cursor is the updatedAt ISO string
	 * of the last item on the previous page.
	 */
	async findByProjectIdPaginated(
		projectId: string,
		agentId: string,
		userId: string,
		limit: number,
		cursor?: string,
		filters: AgentSessionQueryFilters = {},
	): Promise<AgentExecutionThreadPage> {
		const query = this.createQueryBuilder('thread')
			.where('thread.projectId = :projectId', { projectId })
			.andWhere('thread.agentId = :agentId', { agentId })
			.andWhere(
				"(thread.accessScope = 'project' OR (thread.accessScope = 'user' AND thread.ownerId = :userId))",
				{ userId },
			);
		this.applyListFilters(query, filters, userId, this.updatedAtExpression());
		return await this.paginateByUpdatedAt(query, limit, cursor);
	}

	/**
	 * The owner's own top-level n8n Chat threads across the given `agentIds`
	 * (the agents the caller already resolved as currently reachable), newest
	 * `updatedAt` first.
	 *
	 * Selects only the columns the cross-agent thread list renders.
	 * `activeVersion.schema` loads in full — it is read for the published
	 * personalisation — but the draft schema, tools and skills never load.
	 *
	 * `options.search` matches the title case-insensitively. A thread without
	 * a title never matches: `LOWER(NULL) LIKE ...` is `NULL`, not true.
	 */
	async findN8nChatThreadsForOwner(
		userId: string,
		agentIds: string[],
		options: { limit: number; cursor?: string; search?: string },
	): Promise<AgentExecutionThreadPage> {
		const query = this.n8nChatThreadsQuery(userId, agentIds, options.search);
		if (!query) return { threads: [], nextCursor: null };

		return await this.paginateByUpdatedAt(query, options.limit, options.cursor);
	}

	/**
	 * One of the owner's own n8n Chat threads, by id. Same reachability
	 * filters as {@link findN8nChatThreadsForOwner}, for the chat page to read
	 * a single thread's title outside the recent-threads page.
	 */
	async findN8nChatThreadForOwner(
		userId: string,
		agentIds: string[],
		threadId: string,
	): Promise<AgentExecutionThread | null> {
		const query = this.n8nChatThreadsQuery(userId, agentIds);
		if (!query) return null;

		return await query.andWhere('thread.id = :threadId', { threadId }).getOne();
	}

	/** Shared base query for {@link findN8nChatThreadsForOwner} and
	 *  {@link findN8nChatThreadForOwner}. `null` when `agentIds` is empty, so
	 *  callers skip the query instead of running one that can match nothing. */
	private n8nChatThreadsQuery(
		userId: string,
		agentIds: string[],
		search?: string,
	): SelectQueryBuilder<AgentExecutionThread> | null {
		if (agentIds.length === 0) return null;

		const query = this.createQueryBuilder('thread')
			.leftJoinAndSelect('thread.agent', 'agent')
			.leftJoinAndSelect('agent.activeVersion', 'activeVersion')
			.select([
				'thread.id',
				'thread.title',
				'thread.updatedAt',
				'agent.id',
				'agent.name',
				'agent.projectId',
				'activeVersion.versionId',
				'activeVersion.schema',
			])
			.where('thread.ownerId = :userId', { userId })
			.andWhere("thread.accessScope = 'user'")
			.andWhere('thread.agentId IN (:...agentIds)', { agentIds });
		if (search) {
			query.andWhere(`LOWER(thread.title) LIKE :search ${LIKE_ESCAPE_CLAUSE}`, {
				search: `%${escapeLike(search.toLowerCase())}%`,
			});
		}
		// ponytail: the origin rule re-runs a correlated first-source subquery per
		// thread row; fine for one user's threads, add a stored thread origin
		// column if profiling shows it.
		this.applyOriginFilter(query, N8N_CHAT_PRODUCTION_SOURCE);

		return query;
	}

	/**
	 * How many of `userId`'s own n8n Chat threads reference each agent, for
	 * ranking an agent list by usage. `projectIds: null` means no restriction.
	 */
	async countN8nChatThreadsByAgent(
		userId: string,
		projectIds: string[] | null,
	): Promise<Map<string, number>> {
		if (projectIds?.length === 0) return new Map();

		const query = this.createQueryBuilder('thread')
			.select('thread.agentId', 'agentId')
			.addSelect('COUNT(*)', 'count')
			.where('thread.ownerId = :userId', { userId })
			.andWhere("thread.accessScope = 'user'")
			.groupBy('thread.agentId');
		// ponytail: the origin rule re-runs a correlated first-source subquery per
		// thread row; fine for one user's threads, add a stored thread origin
		// column if profiling shows it.
		this.applyOriginFilter(query, N8N_CHAT_PRODUCTION_SOURCE);

		if (projectIds !== null) {
			query.andWhere('thread.projectId IN (:...projectIds)', { projectIds });
		}

		const rows = await query.getRawMany<{ agentId: string; count: string }>();
		return new Map(rows.map((row) => [row.agentId, Number(row.count)]));
	}

	/** SQLite timestamps can omit milliseconds, so compare them in one format. */
	private updatedAtExpression(): string {
		return this.manager.connection.options.type === 'postgres'
			? 'thread.updatedAt'
			: "STRFTIME('%Y-%m-%d %H:%M:%f', thread.updatedAt)";
	}

	/** Cursor pagination shared by every `thread.updatedAt DESC` listing. */
	private async paginateByUpdatedAt(
		query: SelectQueryBuilder<AgentExecutionThread>,
		limit: number,
		cursor?: string,
	): Promise<AgentExecutionThreadPage> {
		query.orderBy('thread.updatedAt', 'DESC').take(limit + 1);
		if (cursor) {
			query.andWhere(`${this.updatedAtExpression()} < :cursor`, { cursor: new Date(cursor) });
		}
		const threads = await query.getMany();
		const hasMore = threads.length > limit;
		if (hasMore) threads.pop();

		return {
			threads,
			nextCursor: hasMore ? threads[threads.length - 1].updatedAt.toISOString() : null,
		};
	}

	private applyListFilters(
		query: SelectQueryBuilder<AgentExecutionThread>,
		filters: AgentSessionQueryFilters,
		userId: string,
		updatedAt: string,
	) {
		if (filters.scope === 'mine') {
			query.andWhere('thread.ownerId = :userId', { userId });
		}
		if (filters.updatedAfter) {
			query.andWhere(`${updatedAt} >= :updatedAfter`, {
				updatedAfter: filters.updatedAfter,
			});
		}
		if (filters.updatedBefore) {
			query.andWhere(`${updatedAt} <= :updatedBefore`, {
				updatedBefore: filters.updatedBefore,
			});
		}
		if (filters.status) {
			this.applyStatusFilter(query, filters.status);
		}
		if (filters.origin) {
			this.applyOriginFilter(query, filters.origin);
		}
		if (filters.previewOnly) this.applyPreviewFilter(query);
	}

	private applyStatusFilter(
		query: SelectQueryBuilder<AgentExecutionThread>,
		status: NonNullable<AgentSessionQueryFilters['status']>,
	) {
		const latestStatus = this.latestExecutionStatusSubquery(query);
		if (status === 'succeeded') {
			query.andWhere(`(${latestStatus}) = 'success'`);
		} else {
			query.andWhere(`(${latestStatus}) = :sessionStatus`, { sessionStatus: status });
		}
	}

	private applyPreviewFilter(query: SelectQueryBuilder<AgentExecutionThread>) {
		query
			.andWhere("thread.accessScope = 'user'")
			.andWhere('thread.parentThreadId IS NULL')
			.andWhere('thread.taskId IS NULL')
			.andWhere(`${this.normalizedFirstSource(query)} IN (:...previewThreadSources)`, {
				previewThreadSources: [...PREVIEW_THREAD_SOURCES],
			});
	}

	private latestExecutionStatusSubquery(query: SelectQueryBuilder<AgentExecutionThread>): string {
		return query
			.subQuery()
			.select('latestExecution.status')
			.from(AgentExecution, 'latestExecution')
			.where('latestExecution.threadId = thread.id')
			.orderBy('latestExecution.createdAt', 'DESC')
			.addOrderBy('latestExecution.id', 'DESC')
			.limit(1)
			.getQuery();
	}

	private normalizedFirstSource(query: SelectQueryBuilder<AgentExecutionThread>): string {
		const firstSource = query
			.subQuery()
			.select('sourceExecution.source')
			.from(AgentExecution, 'sourceExecution')
			.where('sourceExecution.threadId = thread.id')
			.andWhere('sourceExecution.source IS NOT NULL')
			.orderBy('sourceExecution.createdAt', 'ASC')
			.addOrderBy('sourceExecution.id', 'ASC')
			.limit(1)
			.getQuery();
		return `LOWER(TRIM(COALESCE((${firstSource}), '')))`;
	}

	private applyOriginFilter(
		query: SelectQueryBuilder<AgentExecutionThread>,
		origin: AgentSessionOrigin,
	): void {
		const normalizedSource = this.normalizedFirstSource(query);
		const isSubAgent =
			'(thread."parentThreadId" IS NOT NULL OR ' +
			`${normalizedSource} IN ('subagent', 'sub-agent'))`;
		const isSchedule =
			`(NOT ${isSubAgent} AND ` + `(thread."taskId" IS NOT NULL OR ${normalizedSource} = 'task'))`;
		const isDirect = `(NOT ${isSubAgent} AND NOT ${isSchedule})`;

		if (origin === 'sub-agent') {
			query.andWhere(isSubAgent);
		} else if (origin === 'schedule') {
			query.andWhere(isSchedule);
		} else if (origin === 'preview') {
			query.andWhere(`${isDirect} AND ${normalizedSource} IN (:...previewThreadSources)`, {
				previewThreadSources: [...PREVIEW_THREAD_SOURCES],
			});
		} else {
			query.andWhere(`${isDirect} AND ${normalizedSource} = :sessionOrigin`, {
				sessionOrigin: origin,
			});
		}
	}

	/** Top-level private sessions of one user with one agent, newest first. */
	async findOwnedByAgent(
		agentId: string,
		ownerId: string,
		options: { limit?: number } = {},
	): Promise<AgentExecutionThread[]> {
		return await this.find({
			where: { agentId, ownerId, accessScope: 'user', parentThreadId: IsNull() },
			order: { updatedAt: 'DESC', id: 'DESC' },
			...(options.limit ? { take: options.limit } : {}),
		});
	}

	/**
	 * Top-level private sessions of one user with any instance (system) agent,
	 * in every project, oldest first. It does not check that a provider is
	 * registered for the agent, so user deletion finds every session.
	 */
	async findOwnedSystemAgentSessions(
		ownerId: string,
	): Promise<Array<Pick<AgentExecutionThread, 'id' | 'agentId' | 'projectId'>>> {
		return await this.find({
			select: ['id', 'agentId', 'projectId'],
			where: {
				ownerId,
				accessScope: 'user',
				parentThreadId: IsNull(),
				agent: { scope: 'instance' },
			},
			order: { createdAt: 'ASC', id: 'ASC' },
		});
	}

	/**
	 * One top-level private session of a user with an agent. A child session
	 * (for example an Agent builder session) has the same agent and owner as
	 * its parent, so the parent filter keeps it out of the session routes.
	 */
	async findOwnedById(
		agentId: string,
		ownerId: string,
		threadId: string,
	): Promise<AgentExecutionThread | null> {
		return await this.findOneBy({
			id: threadId,
			agentId,
			ownerId,
			accessScope: 'user',
			parentThreadId: IsNull(),
		});
	}

	/**
	 * Update the editable fields of a session. The caller must check ownership
	 * first, for example with {@link findOwnedById}.
	 */
	async updateOwned(threadId: string, changes: AgentExecutionThreadOwnedChanges): Promise<void> {
		const set: AgentExecutionThreadOwnedChanges = {};
		if (changes.title !== undefined) set.title = changes.title;
		if (changes.projectId !== undefined) set.projectId = changes.projectId;
		// TypeORM rejects an update without values.
		if (Object.keys(set).length === 0) return;
		const { projectId } = set;
		await this.runInTransaction({}, async (manager) => {
			await manager.update(AgentExecutionThread, { id: threadId }, set);
			// Child sessions (for example Agent builder sessions) follow the
			// working project of their parent, so the parent lookup in
			// `findOrCreate` keeps finding the parent.
			if (projectId !== undefined) {
				await manager.update(AgentExecutionThread, { parentThreadId: threadId }, { projectId });
			}
		});
	}

	/**
	 * One page of the top-level private sessions of a user with an agent,
	 * newest first. `before` is the last session of the previous page. The
	 * `id` breaks ties between sessions with the same `updatedAt`, so no
	 * session is skipped or repeated across pages.
	 */
	async findOwnedHistoryPage(
		agentId: string,
		ownerId: string,
		limit: number,
		search?: string,
		before?: AgentExecutionThreadKeyset,
	): Promise<AgentExecutionThreadKeysetPage> {
		const updatedAt = this.updatedAtExpression();
		const query = this.createQueryBuilder('thread')
			.where('thread.agentId = :agentId', { agentId })
			.andWhere('thread.ownerId = :ownerId', { ownerId })
			.andWhere("thread.accessScope = 'user'")
			.andWhere('thread.parentThreadId IS NULL');
		const term = search?.trim().toLowerCase();
		if (term) {
			query.andWhere(`LOWER(thread.title) LIKE :search ${LIKE_ESCAPE_CLAUSE}`, {
				search: `%${escapeLike(term)}%`,
			});
		}
		if (before) {
			query.andWhere(
				`(${updatedAt} < :beforeAt OR (${updatedAt} = :beforeAt AND thread.id < :beforeId))`,
				{ beforeAt: before.updatedAt, beforeId: before.id },
			);
		}
		const threads = await query
			.orderBy('thread.updatedAt', 'DESC')
			.addOrderBy('thread.id', 'DESC')
			.take(limit + 1)
			.getMany();
		const hasMore = threads.length > limit;
		if (hasMore) threads.pop();
		return { threads, hasMore };
	}

	/**
	 * Sessions of an agent last updated before `cutoff`, oldest first, for
	 * pruning. It returns only threads of the given agent, and it does not
	 * filter out child sessions. A future retention job must delete through
	 * `deleteThread` of the execution service. Then child sessions (for
	 * example Agent builder sessions) go with their parent.
	 */
	async findByAgentUpdatedBefore(
		agentId: string,
		cutoff: Date,
		limit: number,
	): Promise<AgentExecutionThread[]> {
		return await this.createQueryBuilder('thread')
			.where('thread.agentId = :agentId', { agentId })
			.andWhere(`${this.updatedAtExpression()} < :cutoff`, { cutoff })
			.orderBy('thread.updatedAt', 'ASC')
			.addOrderBy('thread.id', 'ASC')
			.take(limit)
			.getMany();
	}

	async findByParentThreadId(
		parentThreadId: string,
		projectId: string,
	): Promise<AgentExecutionThread[]> {
		return await this.find({
			where: { parentThreadId, projectId },
			order: { createdAt: 'ASC' },
		});
	}

	/**
	 * Child sessions that a session of the given agent started. The children
	 * follow the parent's working project (see `updateOwned`), but the cleanup
	 * does not filter by project, so a child is never left behind.
	 */
	async findChildSessions(
		parentThreadId: string,
		parentAgentId: string,
	): Promise<Array<Pick<AgentExecutionThread, 'id' | 'agentId' | 'projectId'>>> {
		return await this.find({
			select: ['id', 'agentId', 'projectId'],
			where: { parentThreadId, parentAgentId },
			order: { createdAt: 'ASC', id: 'ASC' },
		});
	}

	/** Bump updatedAt to now so the thread sorts to top of the list. */
	async bumpUpdatedAt(threadId: string, ctx: OperationContext = {}): Promise<void> {
		await this.managerFor(ctx).update(AgentExecutionThread, threadId, { updatedAt: new Date() });
	}

	/** Atomically increment token and cost counters on a thread in a single UPDATE.
	 * Pass the `ctx` from `TransactionRunner.run` to apply the increment inside
	 * the same transaction as the matching execution-cost update. */
	async incrementUsage(
		threadId: string,
		promptTokens: number,
		completionTokens: number,
		cost: number,
		duration: number,
		ctx: OperationContext = {},
	): Promise<void> {
		const set: Record<string, () => string> = {
			totalPromptTokens: () => '"totalPromptTokens" + :promptTokens',
			totalCompletionTokens: () => '"totalCompletionTokens" + :completionTokens',
		};
		if (cost > 0) {
			set.totalCost = () => '"totalCost" + :cost';
		}
		if (duration > 0) {
			set.totalDuration = () => '"totalDuration" + :duration';
		}

		await this.managerFor(ctx)
			.createQueryBuilder()
			.update(AgentExecutionThread)
			.set(set)
			.where('id = :threadId', { threadId })
			.setParameters({ promptTokens, completionTokens, cost, duration })
			.execute();
	}

	async deleteSession(
		projectId: string,
		agentId: string,
		threadId: string,
		userId: string,
		ctx: OperationContext,
	): Promise<{ status: 'deleted'; refs: AgentSessionDeletionRefs } | { status: 'busy' } | null> {
		const manager = this.managerFor(ctx);
		const thread = await manager.findOne(AgentExecutionThread, {
			where: [
				{ id: threadId, projectId, agentId, accessScope: 'project' },
				{ id: threadId, projectId, agentId, accessScope: 'user', ownerId: userId },
			],
			lock:
				manager.connection.options.type === 'postgres' ? { mode: 'pessimistic_write' } : undefined,
		});
		if (!thread) return null;
		const hasRunningWork = await manager.exists(AgentExecution, {
			where: { threadId, status: 'running' },
		});
		if (hasRunningWork) return { status: 'busy' };

		const { attachments, executionLogs } = await this.findExternalRefs(
			manager,
			projectId,
			threadId,
		);
		const checkpointRunIds = await this.findSessionCheckpointRunIds(manager, agentId, threadId);
		for (const batch of chunk(checkpointRunIds, CHECKPOINT_BATCH_SIZE)) {
			await manager.delete(AgentCheckpoint, batch);
		}
		if (attachments.length > 0) {
			await manager.delete(
				AgentChatAttachment,
				attachments.map(({ id }) => id),
			);
		}
		await manager.delete(AgentExecutionThread, { id: threadId });
		return {
			status: 'deleted',
			refs: {
				executionLogs,
				attachmentBinaryDataIds: attachments.map(({ binaryDataId }) => binaryDataId),
			},
		};
	}

	private async findSessionCheckpointRunIds(
		manager: EntityManager,
		agentId: string,
		threadId: string,
	): Promise<string[]> {
		const parents = await manager.find(AgentCheckpoint, {
			select: ['runId', 'agentId', 'state'],
			where: { agentId, threadId },
		});
		const checkpoints = parents.map((row) => ({ row, agentId }));
		const visited = new Set(checkpoints.map(({ row }) => checkpointKey(agentId, row.runId)));
		let currentLevel = checkpoints;

		while (currentLevel.length > 0) {
			const children = collectUnvisitedChildCheckpoints(currentLevel, visited);
			if (children.length === 0) break;
			const childRows = await this.findCheckpointRows(manager, children);
			currentLevel = childRows.flatMap((row) =>
				row.agentId ? [{ row, agentId: row.agentId }] : [],
			);
			checkpoints.push(...currentLevel);
		}

		return checkpoints.map(({ row }) => row.runId);
	}

	private async findCheckpointRows(
		manager: EntityManager,
		checkpoints: DelegatedChildCheckpoint[],
	): Promise<AgentCheckpoint[]> {
		const rows: AgentCheckpoint[] = [];
		for (const batch of chunk(checkpoints, CHECKPOINT_BATCH_SIZE)) {
			rows.push(
				...(await manager.find(AgentCheckpoint, {
					select: ['runId', 'agentId', 'state'],
					where: batch,
				})),
			);
		}
		return rows;
	}

	private async findExternalRefs(
		manager: EntityManager,
		projectId: string,
		threadId: string,
	): Promise<{
		executionLogs: AgentSessionDeletionRefs['executionLogs'];
		attachments: Array<Pick<AgentChatAttachment, 'id' | 'binaryDataId'>>;
	}> {
		const executionLogs = await manager.find(AgentExecution, {
			select: ['id', 'storedAt'],
			where: { threadId, storedAt: Not('db') },
		});
		const attachments = await manager.find(AgentChatAttachment, {
			select: ['id', 'binaryDataId'],
			where: { projectId, threadId },
		});
		return { executionLogs, attachments };
	}
}

function parseChildCheckpoints(
	state: string | null,
	parentAgentId: string,
): DelegatedChildCheckpoint[] {
	if (!state) return [];
	try {
		return getDelegatedChildCheckpoints(jsonParse<SerializableAgentState>(state), parentAgentId);
	} catch {
		return [];
	}
}

function collectUnvisitedChildCheckpoints(
	checkpoints: Array<{ row: AgentCheckpoint; agentId: string }>,
	visited: Set<string>,
): DelegatedChildCheckpoint[] {
	const children: DelegatedChildCheckpoint[] = [];
	for (const { row, agentId } of checkpoints) {
		for (const child of parseChildCheckpoints(row.state, agentId)) {
			const key = checkpointKey(child.agentId, child.runId);
			if (visited.has(key)) continue;
			visited.add(key);
			children.push(child);
		}
	}
	return children;
}

function checkpointKey(agentId: string, runId: string): string {
	return `${agentId}\0${runId}`;
}
