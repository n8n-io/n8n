import type { AgentExecutionStatus } from '@n8n/api-types';
import {
	BaseRepository,
	dbNowLiteral,
	dbNowPlusMsLiteral,
	TransactionRunner,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, IsNull, Not, Raw } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';

import { AgentExecution } from '../entities/agent-execution.entity';
import type { ThreadFailureSummary } from '../utils/execution-failure-summary';

/**
 * A running execution without a heartbeat for this long belongs to a turn that
 * stopped. Compared on the database clock.
 */
export const EXECUTION_LIVENESS_GRACE_MS = 2 * 60 * 1000;

export type RunningAgentExecution = Pick<
	AgentExecution,
	'id' | 'threadId' | 'startedAt' | 'updatedAt' | 'timeline'
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
	private readonly isPostgres: boolean;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentExecution, dataSource.manager, transactionRunner);
		this.isPostgres = dataSource.options.type === 'postgres';
	}

	async saveInContext(execution: AgentExecution, ctx: OperationContext): Promise<AgentExecution> {
		return await this.managerFor(ctx).save(execution);
	}

	/** All executions in a thread, oldest first — used by the timeline view. */
	async findByThreadIdOrdered(threadId: string): Promise<AgentExecution[]> {
		return await this.find({ where: { threadId }, order: { createdAt: 'ASC', id: 'ASC' } });
	}

	/** Running executions whose last heartbeat is older than the liveness grace. */
	async findStaleRunning(): Promise<RunningAgentExecution[]> {
		const staleBefore = dbNowPlusMsLiteral(this.isPostgres, -EXECUTION_LIVENESS_GRACE_MS);
		return await this.find({
			select: ['id', 'threadId', 'startedAt', 'updatedAt', 'timeline'],
			where: {
				status: 'running',
				updatedAt: Raw((updatedAt) => `${updatedAt} <= ${staleBefore}`),
			},
		});
	}

	// TODO(AGENT-1031): Remove with the message queue flag. The session lease replaces this check.
	async existsRunningByThread(threadId: string): Promise<boolean> {
		return await this.existsBy({ threadId, status: 'running' });
	}

	async findRunningById(executionId: string): Promise<RunningAgentExecution | null> {
		return await this.findOne({
			select: ['id', 'threadId', 'startedAt', 'updatedAt', 'timeline'],
			where: { id: executionId, status: 'running' },
		});
	}

	async findLatestByThreadId(threadId: string): Promise<AgentExecution | null> {
		return await this.findOne({ where: { threadId }, order: { createdAt: 'DESC', id: 'DESC' } });
	}

	/** Refreshes the heartbeat. Returns false when the execution no longer runs. */
	async touchRunning(executionId: string): Promise<boolean> {
		const result = await this.update(
			{ id: executionId, status: 'running' },
			{ updatedAt: () => dbNowLiteral(this.isPostgres) },
		);
		return result.affected === 1;
	}

	async updateTimelineIfRunning(
		executionId: string,
		timeline: AgentExecution['timeline'],
	): Promise<boolean> {
		const result = await this.update({ id: executionId, status: 'running' }, {
			timeline,
			updatedAt: () => dbNowLiteral(this.isPostgres),
		} as QueryDeepPartialEntity<AgentExecution>);
		return result.affected === 1;
	}

	async updateIfRunning(
		executionId: string,
		values: AgentExecutionFinalizationValues,
	): Promise<boolean> {
		const result = await this.update(
			{ id: executionId, status: 'running' },
			values as QueryDeepPartialEntity<AgentExecution>,
		);
		return result.affected === 1;
	}

	async moveTimelineToBlob(
		executionId: string,
		storedAt: Exclude<AgentExecution['storedAt'], 'db'>,
	): Promise<void> {
		await this.update({ id: executionId, storedAt: 'db' }, { storedAt, timeline: null });
	}

	async findTimelineStorageLocation(
		executionId: string,
	): Promise<AgentExecution['storedAt'] | null> {
		const execution = await this.findOne({ select: ['storedAt'], where: { id: executionId } });
		return execution?.storedAt ?? null;
	}

	/**
	 * The first user-message text in each of the given threads. Used by the
	 * sessions list to render a preview before the LLM-generated title is
	 * available.
	 *
	 * Excludes resumed runs (null `userMessage`). Returns one row per thread
	 * containing the userMessage from that thread's earliest matching run.
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
			.andWhere(
				`e."createdAt" = (SELECT MIN(e2."createdAt") FROM ${tableName} e2 ` +
					'WHERE e2."threadId" = e."threadId" AND e2."userMessage" IS NOT NULL ' +
					'AND e2."userMessage" != \'\')',
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

	async findLatestStatusesByThreadIds(
		threadIds: string[],
	): Promise<Map<string, AgentExecutionStatus>> {
		if (threadIds.length === 0) return new Map();

		const tableName = this.metadata.tablePath;
		const rows = await this.createQueryBuilder('e')
			.select(['e."threadId" AS "threadId"', 'e."status" AS "status"'])
			.where('e."threadId" IN (:...threadIds)', { threadIds })
			.andWhere(
				`e.id = (SELECT e2.id FROM ${tableName} e2 ` +
					'WHERE e2."threadId" = e."threadId" ' +
					'ORDER BY e2."createdAt" DESC, e2.id DESC LIMIT 1)',
			)
			.getRawMany<{ threadId: string; status: AgentExecutionStatus }>();

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
