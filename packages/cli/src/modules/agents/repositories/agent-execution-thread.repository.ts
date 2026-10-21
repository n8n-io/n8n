import type { AgentSessionOrigin, AgentSessionQueryFilters } from '@n8n/api-types';
import type { SerializableAgentState } from '@n8n/agents';
import { AgentsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import {
	BaseRepository,
	escapeLike,
	LIKE_ESCAPE_CLAUSE,
	TransactionRunner,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import {
	DataSource,
	In,
	IsNull,
	MoreThanOrEqual,
	Not,
	type EntityManager,
	type SelectQueryBuilder,
} from '@n8n/typeorm';
import chunk from 'lodash/chunk';
import { jsonParse, UserError } from 'n8n-workflow';

import { AgentBackgroundJob } from '../entities/agent-background-job.entity';
import { AgentChatAttachment } from '../entities/agent-chat-attachment.entity';
import { AgentCheckpoint } from '../entities/agent-checkpoint.entity';
import { AgentExecution } from '../entities/agent-execution.entity';
import {
	AgentExecutionThread,
	type AgentThreadAccess,
} from '../entities/agent-execution-thread.entity';
import { AgentPlan } from '../entities/agent-plan.entity';
import { checkpointExecutionId } from '../types/agent-queued-message';
import type { AgentTaskStop } from '../types/agent-task-stop';
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

type TaskStopScope = AgentTaskStop & { threadId: string };

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

function ownedSessionWhere(agentId: string, ownerId: string, threadId: string) {
	return {
		id: threadId,
		agentId,
		ownerId,
		accessScope: 'user' as const,
		parentThreadId: IsNull(),
	};
}

interface AgentSessionDeletionRefs {
	attachmentBinaryDataIds: string[];
	executionLogs: Array<Pick<AgentExecution, 'id' | 'storedAt'>>;
}

@Service()
export class AgentExecutionThreadRepository extends BaseRepository<AgentExecutionThread> {
	constructor(
		dataSource: DataSource,
		transactionRunner: TransactionRunner,
		private readonly agentsConfig: AgentsConfig,
	) {
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

	/** One top-level private session of a user with an agent. */
	async findOwnedById(
		agentId: string,
		ownerId: string,
		threadId: string,
	): Promise<AgentExecutionThread | null> {
		return await this.findOneBy(ownedSessionWhere(agentId, ownerId, threadId));
	}

	/**
	 * Rename a top-level private session of a user with an agent. Returns false
	 * when no such session exists.
	 */
	async renameOwned(
		agentId: string,
		ownerId: string,
		threadId: string,
		title: string,
		ctx: OperationContext,
	): Promise<boolean> {
		const result = await this.managerFor(ctx).update(
			AgentExecutionThread,
			ownedSessionWhere(agentId, ownerId, threadId),
			{ title },
		);
		return result.affected === 1;
	}

	/**
	 * Move a top-level private session of a user with an agent to another
	 * project, with its chat attachments. Returns false when no such session
	 * exists. The caller must check that the user can use the target project,
	 * and run this in a transaction.
	 */
	async moveOwned(
		agentId: string,
		ownerId: string,
		threadId: string,
		projectId: string,
		ctx: OperationContext,
	): Promise<boolean> {
		const manager = this.managerFor(ctx);
		const result = await manager.update(
			AgentExecutionThread,
			ownedSessionWhere(agentId, ownerId, threadId),
			{ projectId },
		);
		if (result.affected !== 1) return false;
		// Attachment lookups and session deletion filter on the project of the thread.
		await manager.update(AgentChatAttachment, { agentId, threadId }, { projectId });
		return true;
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
		// Order by the same expression as the keyset, so ties stored in another format stay together.
		const threads = await query
			.orderBy(updatedAt, 'DESC')
			.addOrderBy('thread.id', 'DESC')
			.limit(limit + 1)
			.getMany();
		const hasMore = threads.length > limit;
		if (hasMore) threads.pop();
		return { threads, hasMore };
	}

	/** Sessions of an agent last updated before `cutoff`, oldest first, for pruning. */
	async findByAgentUpdatedBefore(
		agentId: string,
		cutoff: Date,
		limit: number,
	): Promise<AgentExecutionThread[]> {
		const updatedAt = this.updatedAtExpression();
		return await this.createQueryBuilder('thread')
			.where('thread.agentId = :agentId', { agentId })
			.andWhere(`${updatedAt} < :cutoff`, { cutoff })
			.orderBy(updatedAt, 'ASC')
			.addOrderBy('thread.id', 'ASC')
			.limit(limit)
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

	async findTaskStop(threadId: string, ctx: OperationContext = {}): Promise<TaskStopScope | null> {
		const thread = await this.managerFor(ctx).findOneBy(AgentExecutionThread, { id: threadId });
		return this.readStop(thread);
	}

	async saveStop(stop: TaskStopScope, ctx: OperationContext) {
		const { threadId, ...taskStop } = stop;
		await this.managerFor(ctx).update(AgentExecutionThread, { id: threadId }, { taskStop });
		return stop;
	}

	async captureGeneration(threadId: string, ctx: OperationContext) {
		const manager = this.managerFor(ctx);
		const [executions, jobs, children] = await Promise.all([
			manager.find(AgentExecution, {
				where: { threadId },
				select: ['id'],
			}),
			manager.find(AgentBackgroundJob, {
				where: { parentThreadId: threadId },
				select: ['id', 'sourceExecutionId', 'childThreadId'],
			}),
			manager.find(AgentExecutionThread, { where: { parentThreadId: threadId }, select: ['id'] }),
		]);
		return {
			executionIds: [
				...new Set([
					...executions.map((execution) => execution.id),
					...jobs.flatMap((job) => (job.sourceExecutionId ? [job.sourceExecutionId] : [])),
				]),
			],
			jobIds: jobs.map((job) => job.id),
			threadIds: [
				...new Set([
					...children.map((child) => child.id),
					...jobs.flatMap((job) => (job.childThreadId ? [job.childThreadId] : [])),
				]),
			],
		};
	}

	async blocksQueue(threadId: string, ctx: OperationContext) {
		const stop = await this.findTaskStop(threadId, ctx);
		return Boolean(stop && !stop.pause.reportedAt);
	}

	/** Lock ancestors first so dispatch and cancellation use the same admission boundary. */
	async lockScope(threadId: string, ctx: OperationContext) {
		const lineage = await this.lineage(threadId, ctx);
		for (const thread of lineage.toReversed()) await this.lockById(thread.id, ctx);
	}

	async assertWakeAdmission(
		threadId: string,
		wake: { jobIds: string[]; planStopId?: string },
		ctx: OperationContext,
	) {
		const pause = await this.findTaskStop(threadId, ctx);
		if (wake.planStopId) {
			if (
				!pause ||
				pause.pause.id !== wake.planStopId ||
				pause.pause.reportExecutionId ||
				pause.pause.reportedAt ||
				pause.pause.resumedAt ||
				(await this.unfinishedWork(pause, ctx)).length
			) {
				throw new UserError('This plan stop report is no longer available');
			}
			return;
		}
		if (await this.hasPausedAncestor(threadId, ctx)) {
			throw new UserError('The plan is stopped. Wait for a new user request.');
		}
	}

	async assertAdmission(threadId: string, executionId: string | undefined, ctx: OperationContext) {
		if (
			(await this.isCancelled(threadId, executionId, ctx)) ||
			(await this.hasPausedAncestor(threadId, ctx))
		) {
			throw new UserError('These tasks were canceled. Wait for a new user request.');
		}
	}

	async isCancelled(threadId: string, executionId?: string, ctx: OperationContext = {}) {
		const request = await this.findTaskStop(threadId, ctx);
		if (!request) return false;
		if (executionId) return request.generation.executionIds.includes(executionId);
		const execution = await this.managerFor(ctx).findOne(AgentExecution, {
			where: { threadId, status: 'running' },
			order: { createdAt: 'DESC' },
		});
		return Boolean(execution && request.generation.executionIds.includes(execution.id));
	}

	async targetedJobs(request: TaskStopScope, ctx: OperationContext = {}) {
		const manager = this.managerFor(ctx);
		const jobs: AgentBackgroundJob[] = [];
		const visited = new Set<string>();
		const pending = [request.threadId, ...request.generation.threadIds];
		while (pending.length) {
			const threadId = pending.shift()!;
			if (visited.has(threadId)) continue;
			visited.add(threadId);
			const children = await manager.find(AgentBackgroundJob, {
				where:
					threadId === request.threadId
						? [
								{ parentThreadId: threadId, id: In(request.generation.jobIds) },
								{
									parentThreadId: threadId,
									sourceExecutionId: In(request.generation.executionIds),
								},
							]
						: { parentThreadId: threadId },
			});
			jobs.push(...children);
			pending.push(...children.flatMap((job) => (job.childThreadId ? [job.childThreadId] : [])));
			const delegated = await manager.find(AgentExecutionThread, {
				where: {
					parentThreadId: threadId,
					...(threadId === request.threadId ? { id: In(request.generation.threadIds) } : {}),
				},
			});
			pending.push(...delegated.map((thread) => thread.id));
		}
		return jobs;
	}

	async targetedDescendants(request: TaskStopScope, ctx: OperationContext = {}) {
		const jobs = await this.targetedJobs(request, ctx);
		const threads = [
			...request.generation.threadIds,
			...jobs.flatMap((job) => (job.childThreadId ? [job.childThreadId] : [])),
		];
		const seen = new Set(threads);
		let parents = [...threads];
		while (parents.length) {
			const descendants = await this.managerFor(ctx).find(AgentExecutionThread, {
				where: { parentThreadId: In(parents) },
			});
			parents = descendants.filter((thread) => !seen.has(thread.id)).map((thread) => thread.id);
			for (const id of parents) seen.add(id);
		}
		return await this.managerFor(ctx).findBy(AgentExecutionThread, {
			id: In([...seen].filter((id) => id !== request.threadId)),
		});
	}

	async unfinishedWork(request: TaskStopScope, ctx: OperationContext = {}) {
		const manager = this.managerFor(ctx);
		const children = await this.targetedDescendants(request, ctx);
		const childIds = children.map((thread) => thread.id);
		const executions = await manager.find(AgentExecution, {
			where: [
				{ threadId: request.threadId, id: In(request.generation.executionIds), status: 'running' },
				{ threadId: In(childIds), status: 'running' },
			],
		});
		const checkpoints = await manager.find(AgentCheckpoint, {
			where: {
				threadId: request.threadId,
				state: Not(IsNull()),
				expired: false,
				updatedAt: MoreThanOrEqual(
					new Date(
						Date.now() - this.agentsConfig.checkpointTtlSeconds * Time.seconds.toMilliseconds,
					),
				),
			},
		});
		const jobs = await this.targetedJobs(request, ctx);
		return [
			...jobs
				.filter((job) => ['running', 'suspended'].includes(job.status))
				.map((job) => ({ jobId: job.id, title: job.title })),
			...executions.map((execution) => ({
				jobId: execution.id,
				title:
					children.find((child) => child.id === execution.threadId)?.agentName ??
					'Current response',
			})),
			...checkpoints.flatMap((checkpoint) => {
				const state = jsonParse<SerializableAgentState | null>(checkpoint.state ?? '', {
					fallbackValue: null,
				});
				if (state?.status !== 'suspended') return [];
				const executionId = checkpointExecutionId(state);
				if (executionId && !request.generation.executionIds.includes(executionId)) return [];
				return [{ jobId: executionId ?? request.threadId, title: 'Current response' }];
			}),
		];
	}

	async pausedScope(threadId: string, ctx: OperationContext = {}) {
		return (
			(await this.lineage(threadId, ctx))
				.map((thread) => this.readStop(thread))
				.find((stop) => stop && !stop.pause.resumedAt) ?? null
		);
	}

	async hasPausedAncestor(threadId: string, ctx: OperationContext) {
		return Boolean(await this.pausedScope(threadId, ctx));
	}

	async recordAdmission(
		threadId: string,
		executionId: string,
		input: {
			planStopId?: string;
			userInitiated: boolean;
		},
		ctx: OperationContext,
	) {
		const stop = await this.findTaskStop(threadId, ctx);
		if (!stop) return;
		if (input.planStopId) {
			stop.pause.reportExecutionId = executionId;
		} else if (input.userInitiated && !stop.pause.resumedAt) {
			if (!stop.pause.reportedAt) throw new UserError('The plan is still stopping');
			stop.pause.resumedAt = new Date().toISOString();
		} else return;
		await this.saveStop(stop, ctx);
	}

	async pendingPauseReports() {
		const isPostgres = this.manager.connection.options.type === 'postgres';
		const pause = isPostgres
			? 'thread."taskStop"->\'pause\''
			: "json_extract(thread.taskStop, '$.pause')";
		const reportedAt = isPostgres
			? "thread.\"taskStop\"->'pause'->>'reportedAt'"
			: "json_extract(thread.taskStop, '$.pause.reportedAt')";
		const threads = await this.createQueryBuilder('thread')
			.select('thread.id')
			.where(`${pause} IS NOT NULL`)
			.andWhere(`${reportedAt} IS NULL`)
			.getMany();
		return threads.map((thread) => thread.id);
	}

	async pauseReportPlan(stop: TaskStopScope) {
		return stop.planId
			? await this.managerFor({}).findOneBy(AgentPlan, {
					threadId: stop.threadId,
					id: stop.planId,
				})
			: null;
	}

	async pauseReportTarget(threadId: string) {
		return await this.findOneBy({ id: threadId });
	}

	async finishPauseReport(threadId: string, stopId: string, failed = false) {
		return await this.runInTransaction({}, async (manager, ctx) => {
			await this.lockById(threadId, ctx);
			const stop = await this.findTaskStop(threadId, ctx);
			if (!stop || stop.pause.id !== stopId || stop.pause.reportedAt) return;
			const execution = stop.pause.reportExecutionId
				? await manager.findOneBy(AgentExecution, { id: stop.pause.reportExecutionId })
				: null;
			if (execution?.status === 'running' || (!execution && !failed)) return;
			stop.pause.reportedAt = new Date().toISOString();
			stop.pause.reportFailed =
				failed || !execution || ['error', 'interrupted', 'cancelled'].includes(execution.status);
			// Composer Stop also consumes this report. It must not trigger another reply.
			await this.saveStop(stop, ctx);
			const jobs = await this.targetedJobs(stop, ctx);
			if (jobs.length)
				await manager.update(
					AgentBackgroundJob,
					{
						id: In(jobs.map((job) => job.id)),
						status: In(['paused', 'completed', 'failed', 'cancelled']),
					},
					{ notifiedAt: new Date(stop.pause.reportedAt) },
				);
		});
	}

	private readStop(thread: AgentExecutionThread | null): TaskStopScope | null {
		if (!thread?.taskStop) return null;
		const stop = thread.taskStop;
		return {
			...stop,
			threadId: thread.id,
			// Legacy stops have no pending report and do not pause later turns.
			pause: stop.pause ?? {
				id: `legacy:${thread.id}:${stop.requestedAt}`,
				reportedAt: stop.requestedAt,
				resumedAt: stop.requestedAt,
			},
		};
	}

	private async lineage(threadId: string, ctx: OperationContext) {
		const threads: AgentExecutionThread[] = [];
		const visited = new Set<string>();
		let id: string | null = threadId;
		while (id && !visited.has(id)) {
			visited.add(id);
			const thread: AgentExecutionThread | null = await this.managerFor(ctx).findOneBy(
				AgentExecutionThread,
				{ id },
			);
			if (!thread) break;
			threads.push(thread);
			id = thread.parentThreadId;
		}
		return threads;
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
