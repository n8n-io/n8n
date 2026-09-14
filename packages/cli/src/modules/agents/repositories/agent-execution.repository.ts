import {
	BaseRepository,
	isUniqueConstraintError,
	type OperationContext,
	TransactionRunner,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, IsNull, LessThan, Not } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';
import { OperationalError } from 'n8n-workflow';

import { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import { AgentExecution, type AgentExecutionStatus } from '../entities/agent-execution.entity';
import type { ThreadFailureSummary } from '../utils/execution-failure-summary';

export type RunningAgentExecution = Pick<
	AgentExecution,
	'id' | 'threadId' | 'startedAt' | 'updatedAt' | 'timeline'
>;

/** Another running turn already claims this thread. */
export class AgentThreadClaimConflictError extends OperationalError {
	constructor() {
		super('Another agent turn already holds this thread', { level: 'info' });
	}
}

export type NewAgentExecution = Omit<
	AgentExecution,
	'id' | 'createdAt' | 'updatedAt' | 'thread' | 'enqueueSequence' | 'generateId' | 'setUpdateDate'
>;

type AgentExecutionFinalizationValues = Pick<
	AgentExecution,
	'status' | 'stoppedAt' | 'duration' | 'timeline' | 'storedAt' | 'error' | 'failureSummary'
> &
	Partial<
		Pick<
			AgentExecution,
			'model' | 'promptTokens' | 'completionTokens' | 'totalTokens' | 'cost' | 'hitlStatus'
		>
	>;

@Service()
export class AgentExecutionRepository extends BaseRepository<AgentExecution> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentExecution, dataSource.manager, transactionRunner);
	}

	/** All executions in a thread, oldest first — used by the timeline view. */
	async findByThreadIdOrdered(threadId: string): Promise<AgentExecution[]> {
		return await this.find({ where: { threadId }, order: { createdAt: 'ASC' } });
	}

	async findRunning(): Promise<RunningAgentExecution[]> {
		return await this.find({
			select: ['id', 'threadId', 'startedAt', 'updatedAt', 'timeline'],
			where: { status: 'running' },
		});
	}

	/**
	 * Insert a queued or running row. For a running row with `runContext`, the
	 * partial unique index turns a second claim on the same thread into
	 * {@link AgentThreadClaimConflictError}. Queued rows get a per-thread sequence.
	 */
	async insertExecution(
		values: NewAgentExecution,
		ctx: OperationContext = {},
	): Promise<AgentExecution> {
		try {
			if (values.status === 'queued') {
				return await this.runInTransaction(ctx, async (entityManager) => {
					// Serialize allocations on the durable thread row before reading the prior sequence.
					await entityManager
						.getRepository(AgentExecutionThread)
						.createQueryBuilder()
						.update(AgentExecutionThread)
						.set({ updatedAt: () => '"updatedAt"' })
						.where('id = :threadId', { threadId: values.threadId })
						.execute();

					const repository = entityManager.getRepository(AgentExecution);
					const latest = await repository
						.createQueryBuilder('execution')
						.select('MAX(execution.enqueueSequence)', 'max')
						.where('execution.threadId = :threadId', { threadId: values.threadId })
						.getRawOne<{ max: number | null }>();

					return await repository.save(
						repository.create({
							...values,
							enqueueSequence: (latest?.max ?? 0) + 1,
						}),
					);
				});
			}

			return await this.save(this.create({ ...values, enqueueSequence: null }));
		} catch (error) {
			if (
				values.status === 'running' &&
				values.runContext !== null &&
				isUniqueConstraintError(error)
			) {
				throw new AgentThreadClaimConflictError();
			}
			throw error;
		}
	}

	async countQueuedByThread(threadId: string): Promise<number> {
		return await this.countBy({ threadId, status: 'queued' });
	}

	/** The thread's waiting turns, oldest first. */
	async findQueuedByThread(threadId: string): Promise<AgentExecution[]> {
		return await this.find({
			where: { threadId, status: 'queued' },
			order: { enqueueSequence: 'ASC' },
		});
	}

	async findThreadIdsWithQueued(): Promise<string[]> {
		const rows = await this.find({ select: ['threadId'], where: { status: 'queued' } });
		return [...new Set(rows.map((row) => row.threadId))];
	}

	/**
	 * Turn a queued row into the thread's claimed running row. `false` when the
	 * row is no longer queued. A unique-index conflict means another claimed
	 * running row holds the thread: {@link AgentThreadClaimConflictError}.
	 */
	async promoteQueuedToRunning(
		executionId: string,
		threadId: string,
		startedAt: Date,
	): Promise<boolean> {
		try {
			const result = await this.update(
				{ id: executionId, threadId, status: 'queued' },
				{ status: 'running', startedAt, updatedAt: startedAt },
			);
			return result.affected === 1;
		} catch (error) {
			if (isUniqueConstraintError(error)) throw new AgentThreadClaimConflictError();
			throw error;
		}
	}

	/** End a queued row that cannot run. `false` once the row left `queued`. */
	async failQueued(executionId: string, error: string, stoppedAt: Date): Promise<boolean> {
		const result = await this.update(
			{ id: executionId, status: 'queued' },
			{ status: 'error', error, runContext: null, stoppedAt, updatedAt: stoppedAt },
		);
		return result.affected === 1;
	}

	/**
	 * Refresh the liveness timestamp. With `claimedThreadId`, the update matches
	 * only while the row still has queue context for that thread.
	 */
	async touchRunning(executionId: string, claimedThreadId?: string): Promise<boolean> {
		const result = await this.update(
			{
				id: executionId,
				status: 'running',
				...(claimedThreadId ? { threadId: claimedThreadId, runContext: Not(IsNull()) } : {}),
			},
			{ updatedAt: new Date() },
		);
		return result.affected === 1;
	}

	async updateTimelineIfRunning(
		executionId: string,
		timeline: AgentExecution['timeline'],
	): Promise<boolean> {
		const result = await this.update({ id: executionId, status: 'running' }, {
			timeline,
			updatedAt: new Date(),
		} as QueryDeepPartialEntity<AgentExecution>);
		return result.affected === 1;
	}

	/**
	 * Move a running row to a terminal status. This also releases its thread
	 * claim. With `staleBefore`, only a row without a heartbeat since then
	 * matches, so a run that is alive again keeps its claim.
	 */
	async updateIfRunning(
		executionId: string,
		values: AgentExecutionFinalizationValues,
		staleBefore?: Date,
	): Promise<boolean> {
		const result = await this.update(
			{
				id: executionId,
				status: 'running',
				...(staleBefore ? { updatedAt: LessThan(staleBefore) } : {}),
			},
			{
				...values,
				runContext: null,
			} as QueryDeepPartialEntity<AgentExecution>,
		);
		return result.affected === 1;
	}

	/**
	 * The first user-message text in each of the given threads. Used by the
	 * sessions list to render a preview before the LLM-generated title is
	 * available.
	 *
	 * Excludes resumed runs (null `userMessage`) and turns still waiting in the
	 * queue. Returns one row per thread containing the userMessage from that
	 * thread's earliest matching run.
	 */
	async findFirstUserMessageByThreadIds(threadIds: string[]): Promise<Map<string, string>> {
		if (threadIds.length === 0) return new Map();

		// Correlated subquery: for each thread, pick the row with the smallest
		// createdAt that has a non-empty userMessage. Identifiers are double-quoted
		// so Postgres preserves their camelCase (it lowercases unquoted names),
		// and the table name is read from metadata so DB_TABLE_PREFIX is respected.
		const tableName = this.metadata.tablePath;
		const rows = await this.createQueryBuilder('e')
			.select(['e."threadId" AS "threadId"', 'e."userMessage" AS "userMessage"'])
			.where('e."threadId" IN (:...threadIds)', { threadIds })
			.andWhere('e."userMessage" IS NOT NULL')
			.andWhere('e."userMessage" != \'\'')
			.andWhere('e."status" != \'queued\'')
			.andWhere(
				`e."createdAt" = (SELECT MIN(e2."createdAt") FROM ${tableName} e2 ` +
					'WHERE e2."threadId" = e."threadId" AND e2."userMessage" IS NOT NULL ' +
					'AND e2."userMessage" != \'\' AND e2."status" != \'queued\')',
			)
			.getRawMany<{ threadId: string; userMessage: string }>();

		return new Map(rows.map((r) => [r.threadId, r.userMessage]));
	}

	/**
	 * The earliest non-null `source` for each of the given threads. Used by the
	 * sessions list to show channel origin (e.g. slack, telegram) on each row.
	 *
	 * Returns one row per thread from that thread's earliest matching run.
	 */
	async findFirstSourceByThreadIds(threadIds: string[]): Promise<Map<string, string>> {
		if (threadIds.length === 0) return new Map();

		// Correlated subquery: for each thread, pick the row with the smallest
		// createdAt that has a non-null source. Identifiers are double-quoted
		// so Postgres preserves their camelCase (it lowercases unquoted names),
		// and the table name is read from metadata so DB_TABLE_PREFIX is respected.
		const tableName = this.metadata.tablePath;
		const rows = await this.createQueryBuilder('e')
			.select(['e."threadId" AS "threadId"', 'e."source" AS "source"'])
			.where('e."threadId" IN (:...threadIds)', { threadIds })
			.andWhere('e."source" IS NOT NULL')
			.andWhere(
				`e.id = (SELECT e2.id FROM ${tableName} e2 ` +
					'WHERE e2."threadId" = e."threadId" AND e2."source" IS NOT NULL ' +
					'ORDER BY e2."createdAt" ASC, e2.id ASC LIMIT 1)',
			)
			.getRawMany<{ threadId: string; source: string }>();

		return new Map(rows.map((r) => [r.threadId, r.source]));
	}

	/** Status of each thread's latest turn that started; queued turns do not count yet. */
	async findLatestStatusesByThreadIds(
		threadIds: string[],
	): Promise<Map<string, Exclude<AgentExecutionStatus, 'queued'>>> {
		if (threadIds.length === 0) return new Map();

		const tableName = this.metadata.tablePath;
		const rows = await this.createQueryBuilder('e')
			.select(['e."threadId" AS "threadId"', 'e."status" AS "status"'])
			.where('e."threadId" IN (:...threadIds)', { threadIds })
			.andWhere(
				`e.id = (SELECT e2.id FROM ${tableName} e2 ` +
					'WHERE e2."threadId" = e."threadId" AND e2."status" != \'queued\' ' +
					'ORDER BY e2."createdAt" DESC, e2.id DESC LIMIT 1)',
			)
			.getRawMany<{ threadId: string; status: Exclude<AgentExecutionStatus, 'queued'> }>();

		return new Map(rows.map((row) => [row.threadId, row.status]));
	}

	async findFailureSummariesByThreadIds(
		threadIds: string[],
	): Promise<Map<string, ThreadFailureSummary>> {
		if (threadIds.length === 0) return new Map();

		const executions = await this.createQueryBuilder('e')
			.select(['e.id', 'e.threadId', 'e.failureSummary'])
			.where('e."threadId" IN (:...threadIds)', { threadIds })
			.andWhere('e."failureSummary" IS NOT NULL')
			.getMany();
		const summaries = new Map<string, ThreadFailureSummary>();

		for (const execution of executions) {
			const summary = execution.failureSummary;
			if (!summary) continue;

			const latest = { ...summary.latest, executionId: execution.id };
			const current = summaries.get(execution.threadId);
			if (!current) {
				summaries.set(execution.threadId, { count: summary.count, latest });
				continue;
			}

			current.count += summary.count;
			if (latest.occurredAt >= current.latest.occurredAt) current.latest = latest;
		}

		return summaries;
	}

	/**
	 * Suspended runs in a thread that don't yet have a `model` recorded.
	 * Used by the resume-completion path to backfill model info, which only
	 * arrives once the resumed run finishes.
	 */
	async findSuspendedWithoutModel(threadId: string): Promise<AgentExecution[]> {
		return await this.find({
			where: { threadId, hitlStatus: 'suspended', model: IsNull() },
		});
	}

	/**
	 * The most recently suspended execution in a thread — used to recover the
	 * original run's `source` when resuming a HITL tool call. A resume request
	 * carries no `source` of its own; it belongs to the suspended run being
	 * resumed.
	 */
	async findLatestSuspendedByThreadId(threadId: string): Promise<AgentExecution | null> {
		return await this.findOne({
			where: { threadId, hitlStatus: 'suspended' },
			order: { createdAt: 'DESC' },
		});
	}

	/**
	 * Whether the thread ever parked a run. Counts rows on the
	 * `(threadId, createdAt)` index without loading any execution data, so it is
	 * cheap enough to ask on every inbound message.
	 *
	 * A row keeps `hitlStatus: 'suspended'` after its resume (the resumed turn is
	 * a separate row), so this can only rule a thread out, never confirm that
	 * something is parked right now — the checkpoint is the authority for that.
	 */
	async hasSuspendedRun(threadId: string): Promise<boolean> {
		const count = await this.count({ where: { threadId, hitlStatus: 'suspended' } });
		return count > 0;
	}

	/** Backfill model on a set of executions in a single statement. */
	async backfillModel(executionIds: string[], model: string): Promise<void> {
		if (executionIds.length === 0) return;
		await this.createQueryBuilder()
			.update(AgentExecution)
			.set({ model })
			.whereInIds(executionIds)
			.execute();
	}

	/** Delete every run in a thread. Caller must verify ownership first. */
	async deleteByThreadId(threadId: string): Promise<void> {
		await this.delete({ threadId });
	}

	/** Blob-stored log refs for every run in a thread — for log cleanup on thread delete. */
	async findBlobRefsByThreadId(
		threadId: string,
	): Promise<Array<Pick<AgentExecution, 'id' | 'storedAt'>>> {
		return await this.find({
			select: ['id', 'storedAt'],
			where: { threadId, storedAt: Not('db') },
		});
	}

	/** Blob-stored log refs across all of an agent's threads — for log cleanup on agent delete. */
	async findBlobRefsByAgentId(
		agentId: string,
	): Promise<Array<Pick<AgentExecution, 'id' | 'threadId' | 'storedAt'>>> {
		return await this.find({
			select: ['id', 'threadId', 'storedAt'],
			where: { thread: { agentId }, storedAt: Not('db') },
		});
	}
}
