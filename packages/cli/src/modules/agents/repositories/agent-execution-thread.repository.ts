import type { AgentSessionOrigin, AgentSessionQueryFilters } from '@n8n/api-types';
import type { SerializableAgentState } from '@n8n/agents';
import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
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
			)
			.orderBy('thread.updatedAt', 'DESC')
			.take(limit + 1);

		if (cursor) {
			query.andWhere('thread.updatedAt < :cursor', { cursor: new Date(cursor) });
		}
		this.applyListFilters(query, filters);
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
	) {
		if (filters.updatedAfter) {
			query.andWhere('thread.updatedAt >= :updatedAfter', {
				updatedAfter: filters.updatedAfter,
			});
		}
		if (filters.updatedBefore) {
			query.andWhere('thread.updatedAt <= :updatedBefore', {
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
		const failureExists = this.failureExistsSubquery(query);
		if (status === 'succeeded') {
			query.andWhere(`(${latestStatus}) = 'success' AND NOT EXISTS ${failureExists}`);
		} else if (status === 'error') {
			query.andWhere(
				`((${latestStatus}) = 'error' OR ` +
					`((${latestStatus}) = 'success' AND EXISTS ${failureExists}))`,
			);
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

	private failureExistsSubquery(query: SelectQueryBuilder<AgentExecutionThread>): string {
		return query
			.subQuery()
			.select('1')
			.from(AgentExecution, 'failedExecution')
			.where('failedExecution.threadId = thread.id')
			.andWhere('failedExecution.failureSummary IS NOT NULL')
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

	/** Atomically increment token and cost counters on a thread in a single UPDATE. */
	async incrementUsage(
		threadId: string,
		promptTokens: number,
		completionTokens: number,
		cost: number,
		duration: number,
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

		await this.createQueryBuilder()
			.update(AgentExecutionThread)
			.set(set)
			.where('id = :threadId', { threadId })
			.setParameters({ promptTokens, completionTokens, cost, duration })
			.execute();
	}

	/** Delete a thread, validating project ownership. Returns true if deleted. */
	async deleteByIdAndProjectId(threadId: string, projectId: string): Promise<boolean> {
		const result = await this.delete({ id: threadId, projectId });
		return (result.affected ?? 0) > 0;
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
