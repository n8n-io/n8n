import type { AgentSessionOrigin, AgentSessionQueryFilters } from '@n8n/api-types';
import type { SerializableAgentState } from '@n8n/agents';
import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	DataSource,
	In,
	IsNull,
	LessThan,
	Not,
	type EntityManager,
	type SelectQueryBuilder,
} from '@n8n/typeorm';
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
import { PREVIEW_THREAD_SOURCES, type AgentSessionMode } from '../utils/agent-thread-access';

const CHECKPOINT_BATCH_SIZE = 400;

export interface AgentExecutionThreadMetadata {
	parentThreadId?: string;
	parentAgentId?: string;
}

export interface AgentExecutionThreadPage {
	threads: AgentExecutionThread[];
	nextCursor: string | null;
}

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

	async findCodingSessionThreads(
		projectId: string,
		agentId: string,
		userId: string,
		ids: string[],
	) {
		if (ids.length === 0) return [];
		return await this.findBy({
			id: In(ids),
			projectId,
			agentId,
			ownerId: userId,
			accessScope: 'user',
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
					// A shared thread keeps its owner, so an owner's access matches it on the owner.
					...(access.ownerId
						? { ownerId: access.ownerId }
						: { accessScope: access.accessScope, ownerId: IsNull() }),
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
		// SQLite timestamps can omit milliseconds, so compare them in one format.
		const updatedAt =
			this.manager.connection.options.type === 'postgres'
				? 'thread.updatedAt'
				: "STRFTIME('%Y-%m-%d %H:%M:%f', thread.updatedAt)";
		const query = this.createQueryBuilder('thread')
			.where('thread.projectId = :projectId', { projectId })
			.andWhere('thread.agentId = :agentId', { agentId })
			.andWhere(
				"(thread.accessScope = 'project' OR (thread.accessScope = 'user' AND thread.ownerId = :userId))",
				{ userId },
			)
			.orderBy('thread.updatedAt', 'DESC')
			.take(limit + 1);

		if (cursor) {
			query.andWhere(`${updatedAt} < :cursor`, { cursor: new Date(cursor) });
		}
		this.applyListFilters(query, filters, userId, updatedAt);
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

	/** Top-level sessions that one user owns with one agent, private or shared, newest first. */
	async findOwnedByAgent(
		agentId: string,
		ownerId: string,
		options: { limit?: number } = {},
	): Promise<AgentExecutionThread[]> {
		return await this.find({
			where: { agentId, ownerId, parentThreadId: IsNull() },
			order: { updatedAt: 'DESC', id: 'DESC' },
			...(options.limit ? { take: options.limit } : {}),
		});
	}

	/**
	 * Top-level sessions of one agent that a user can open, newest first: the sessions
	 * the user owns, and the sessions other owners shared in `sharedProjectIds`.
	 */
	async findVisibleByAgent(
		agentId: string,
		userId: string,
		sharedProjectIds: string[],
	): Promise<AgentExecutionThread[]> {
		const owned = { agentId, ownerId: userId, parentThreadId: IsNull() };
		const shared = {
			agentId,
			accessScope: 'project' as const,
			ownerId: Not(IsNull()),
			projectId: In(sharedProjectIds),
			parentThreadId: IsNull(),
		};
		return await this.find({
			where: sharedProjectIds.length > 0 ? [owned, shared] : owned,
			order: { updatedAt: 'DESC', id: 'DESC' },
		});
	}

	/** The ids in `ids` of the sessions of this agent that this user owns. */
	async findIdsOwnedByAgent(agentId: string, ownerId: string, ids: string[]): Promise<string[]> {
		if (ids.length === 0) return [];
		const rows = await this.find({
			select: { id: true },
			where: { id: In(ids), agentId, ownerId },
		});
		return rows.map(({ id }) => id);
	}

	/**
	 * One page of the sessions with an agent that a user can open, newest first, for keyset
	 * pagination. Same rule as `findVisibleByAgent`.
	 */
	async findVisibleHistoryPage(
		agentId: string,
		viewer: { userId: string; sharedProjectIds: string[] },
		page: { limit: number; search?: string; before?: { updatedAt: Date; id: string } },
	): Promise<AgentExecutionThread[]> {
		const { limit, search, before } = page;
		const visible =
			viewer.sharedProjectIds.length > 0
				? "(thread.ownerId = :ownerId OR (thread.accessScope = 'project' AND thread.ownerId IS NOT NULL AND thread.projectId IN (:...sharedProjectIds)))"
				: 'thread.ownerId = :ownerId';
		const query = this.createQueryBuilder('thread')
			.where('thread.agentId = :agentId', { agentId })
			.andWhere(visible, { ownerId: viewer.userId, sharedProjectIds: viewer.sharedProjectIds })
			.andWhere('thread.parentThreadId IS NULL');
		if (search?.trim()) {
			query.andWhere('LOWER(thread.title) LIKE :search', {
				search: `%${search.trim().toLowerCase()}%`,
			});
		}
		if (before) {
			query.andWhere(
				'(thread.updatedAt < :beforeAt OR (thread.updatedAt = :beforeAt AND thread.id < :beforeId))',
				{ beforeAt: before.updatedAt, beforeId: before.id },
			);
		}
		return await query
			.orderBy('thread.updatedAt', 'DESC')
			.addOrderBy('thread.id', 'DESC')
			.take(limit + 1)
			.getMany();
	}

	/** Sessions of an agent last updated before the cutoff, oldest first. */
	async findByAgentUpdatedBefore(
		agentId: string,
		cutoff: Date,
		limit: number,
	): Promise<AgentExecutionThread[]> {
		return await this.find({
			where: { agentId, updatedAt: LessThan(cutoff) },
			order: { updatedAt: 'ASC' },
			take: limit,
		});
	}

	/** A session that the user owns, private or shared. */
	async findOwnedById(
		agentId: string,
		ownerId: string,
		threadId: string,
	): Promise<AgentExecutionThread | null> {
		return await this.findOneBy({ id: threadId, agentId, ownerId });
	}

	/**
	 * Share a private session with its project. The session keeps its owner. Returns false
	 * when the session is not a private session of this owner.
	 */
	async shareWithProject(threadId: string, ownerId: string): Promise<boolean> {
		const result = await this.update(
			{ id: threadId, ownerId, accessScope: 'user', parentThreadId: IsNull() },
			{ accessScope: 'project' },
		);
		return (result.affected ?? 0) > 0;
	}

	/** The shared sessions of an agent among `threadIds`. */
	async findSharedByIds(agentId: string, threadIds: string[]): Promise<AgentExecutionThread[]> {
		if (threadIds.length === 0) return [];
		return await this.findBy({
			id: In(threadIds),
			agentId,
			accessScope: 'project',
			ownerId: Not(IsNull()),
		});
	}

	async updateOwned(
		threadId: string,
		changes: Partial<Pick<AgentExecutionThread, 'title' | 'projectId'>>,
	): Promise<void> {
		await this.update({ id: threadId }, changes);
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
			// A shared session keeps its owner, so only the owner deletes it.
			where: [
				{ id: threadId, projectId, agentId, accessScope: 'project', ownerId: IsNull() },
				{ id: threadId, projectId, agentId, ownerId: userId },
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
