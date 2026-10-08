import type { AgentExecutionStatus } from '@n8n/api-types';
import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, IsNull, Not } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';

import { AgentExecution } from '../entities/agent-execution.entity';
import { AgentExecutionMessageLink } from '../entities/agent-execution-message-link.entity';
import { AgentMessageEntity } from '../entities/agent-message.entity';
import type { ThreadFailureSummary } from '../utils/execution-failure-summary';

export type RunningAgentExecution = Pick<
	AgentExecution,
	'id' | 'threadId' | 'startedAt' | 'updatedAt' | 'timeline'
>;

export type AgentExecutionUsageRow = Pick<
	AgentExecution,
	| 'id'
	| 'status'
	| 'model'
	| 'startedAt'
	| 'stoppedAt'
	| 'duration'
	| 'promptTokens'
	| 'completionTokens'
	| 'totalTokens'
	| 'cost'
	| 'usageDetails'
>;

type AgentExecutionFinalizationValues = Pick<
	AgentExecution,
	'status' | 'stoppedAt' | 'duration' | 'timeline' | 'storedAt' | 'error' | 'failureSummary'
> &
	Partial<
		Pick<
			AgentExecution,
			'model' | 'promptTokens' | 'completionTokens' | 'totalTokens' | 'usageDetails' | 'hitlStatus'
		>
	>;

@Service()
export class AgentExecutionRepository extends BaseRepository<AgentExecution> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentExecution, dataSource.manager, transactionRunner);
	}

	async saveInContext(execution: AgentExecution, ctx: OperationContext): Promise<AgentExecution> {
		return await this.managerFor(ctx).save(execution);
	}

	/** All executions in a thread, oldest first — used by the timeline view. */
	async findByThreadIdOrdered(threadId: string): Promise<AgentExecution[]> {
		return await this.find({ where: { threadId }, order: { createdAt: 'ASC', id: 'ASC' } });
	}

	/** Usage columns of all executions in a thread, oldest first. Skips the timeline. */
	async findUsageByThreadId(threadId: string): Promise<AgentExecutionUsageRow[]> {
		return await this.find({
			select: [
				'id',
				'status',
				'model',
				'startedAt',
				'stoppedAt',
				'duration',
				'promptTokens',
				'completionTokens',
				'totalTokens',
				'cost',
				'usageDetails',
			],
			where: { threadId },
			order: { createdAt: 'ASC', id: 'ASC' },
		});
	}

	async findRunning(): Promise<RunningAgentExecution[]> {
		return await this.find({
			select: ['id', 'threadId', 'startedAt', 'updatedAt', 'timeline'],
			where: { status: 'running' },
		});
	}

	async existsRunningByThread(threadId: string, ctx: OperationContext = {}): Promise<boolean> {
		return await this.managerFor(ctx).existsBy(AgentExecution, { threadId, status: 'running' });
	}

	async findRunningByThread(threadId: string, ctx: OperationContext): Promise<AgentExecution[]> {
		return await this.managerFor(ctx).findBy(AgentExecution, { threadId, status: 'running' });
	}

	async findExecution(
		executionId: string,
		ctx: OperationContext = {},
	): Promise<AgentExecution | null> {
		return await this.managerFor(ctx).findOneBy(AgentExecution, { id: executionId });
	}

	async findLatestByThreadId(threadId: string): Promise<AgentExecution | null> {
		return await this.findOne({ where: { threadId }, order: { createdAt: 'DESC', id: 'DESC' } });
	}

	async touchRunning(executionId: string): Promise<boolean> {
		const result = await this.update(
			{ id: executionId, status: 'running' },
			{ updatedAt: new Date() },
		);
		return result.affected === 1;
	}

	async updateTimelineIfRunning(
		executionId: string,
		timeline: AgentExecution['timeline'],
		ctx: OperationContext = {},
	): Promise<boolean> {
		const result = await this.managerFor(ctx).update(
			AgentExecution,
			{ id: executionId, status: 'running' },
			{
				timeline,
				updatedAt: new Date(),
			} as QueryDeepPartialEntity<AgentExecution>,
		);
		return result.affected === 1;
	}

	async findSteerable(threadId: string, ctx: OperationContext = {}) {
		return await this.managerFor(ctx).findOne(AgentExecution, {
			select: ['id'],
			where: {
				threadId,
				status: 'running',
				acceptsSteering: true,
			},
		});
	}

	async closeSteering(threadId: string, executionId: string, ctx: OperationContext) {
		await this.managerFor(ctx).update(
			AgentExecution,
			{ id: executionId, threadId, acceptsSteering: true },
			{
				acceptsSteering: false,
			},
		);
	}

	async updateIfRunning(
		executionId: string,
		values: AgentExecutionFinalizationValues,
		staleBefore?: Date,
		ctx: OperationContext = {},
		costIncrement?: number,
	): Promise<boolean> {
		const current = await this.managerFor(ctx).findOne(AgentExecution, {
			select: ['timeline'],
			where: { id: executionId, status: 'running' },
		});
		const inputIds = new Set(
			values.timeline?.filter((event) => event.type === 'input').map((event) => event.messageId),
		);
		// A failed commit acknowledgement must not let terminal recording erase durable input.
		if (
			current?.timeline?.some((event) => event.type === 'input' && !inputIds.has(event.messageId))
		)
			return false;
		// Build the SET values once. `cost` is never set as a literal here —
		// the only way to move cost is the additive `costIncrement` fragment
		// below, which preserves any in-flight side-call `incrementCost` calls
		// (`COALESCE(cost, 0) + :costIncrement` instead of `cost = :value`).
		const setValues = {
			...values,
			acceptsSteering: false,
		} as QueryDeepPartialEntity<AgentExecution>;
		const params: Record<string, unknown> = { executionId, status: 'running' };
		if (costIncrement !== undefined && costIncrement > 0) {
			setValues.cost = () => 'COALESCE(cost, 0) + :costIncrement';
			params.costIncrement = costIncrement;
		}
		const qb = this.managerFor(ctx)
			.createQueryBuilder()
			.update(AgentExecution)
			.set(setValues)
			.where('id = :executionId', { executionId })
			.andWhere('status = :status', { status: 'running' });
		if (staleBefore) {
			qb.andWhere('updatedAt <= :staleBefore', { staleBefore });
			params.staleBefore = staleBefore;
		}
		const result = await qb.setParameters(params).execute();
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
	 * The first visible input in each session supplies its preview text.
	 * Use canonical messages when available. Keep legacy execution inputs.
	 */
	async findFirstUserMessageByThreadIds(threadIds: string[]): Promise<Map<string, string>> {
		if (threadIds.length === 0) return new Map();
		const isPostgres = this.manager.connection.options.type === 'postgres';
		const originalText = isPostgres
			? "message.content->'content'->0->>'text'"
			: "json_extract(message.content, '$.content[0].text')";
		const hidden = isPostgres
			? "message.origin->>'hidden'"
			: "json_extract(message.origin, '$.hidden')";
		const input = `CASE WHEN input.messageId IS NULL THEN e.userMessage WHEN CAST(${hidden} AS TEXT) IN ('true', '1') THEN NULL ELSE ${originalText} END`;
		const candidates = this.createQueryBuilder('e')
			.leftJoin(
				AgentExecutionMessageLink,
				'input',
				"input.executionId = e.id AND input.direction = 'input' AND input.position = 0",
			)
			.leftJoin(AgentMessageEntity, 'message', 'message.id = input.messageId')
			.select('e.threadId', 'threadId')
			.addSelect(input, 'userMessage')
			.addSelect(
				'ROW_NUMBER() OVER (PARTITION BY e.threadId ORDER BY e.createdAt, e.id)',
				'rowNumber',
			)
			.where('e.threadId IN (:...threadIds)', { threadIds })
			.andWhere(`${input} IS NOT NULL AND TRIM(${input}) != ''`);
		const rows = await this.manager
			.createQueryBuilder()
			.select('preview."threadId"', 'threadId')
			.addSelect('preview."userMessage"', 'userMessage')
			.from(`(${candidates.getQuery()})`, 'preview')
			.where('preview."rowNumber" = 1')
			.setParameters(candidates.getParameters())
			.getRawMany<{ threadId: string; userMessage: string }>();

		return new Map(rows.map((r) => [r.threadId, r.userMessage]));
	}

	/**
	 * The earliest non-null `source` for each of the given threads. Used by the
	 * sessions list to show channel origin (e.g. slack, telegram) on each row.
	 *
	 * Returns one row per thread from that thread's earliest matching run.
	 */
	async findFirstSourceByThreadIds(
		threadIds: string[],
		ctx: OperationContext = {},
	): Promise<Map<string, string>> {
		if (threadIds.length === 0) return new Map();

		// Correlated subquery: for each thread, pick the row with the smallest
		// createdAt that has a non-null source. Identifiers are double-quoted
		// so Postgres preserves their camelCase (it lowercases unquoted names),
		// and the table name is read from metadata so DB_TABLE_PREFIX is respected.
		const tableName = this.metadata.tablePath;
		const rows = await this.managerFor(ctx)
			.getRepository(AgentExecution)
			.createQueryBuilder('e')
			.select(['e."threadId" AS "threadId"', 'e."source" AS "source"'])
			.where('e."threadId" IN (:...threadIds)', { threadIds })
			.andWhere('e."source" IS NOT NULL')
			.andWhere(
				`e.id = (SELECT e2.id FROM ${tableName} e2 ` +
					'WHERE e2."threadId" = e."threadId" AND e2."source" IS NOT NULL ' +
					'ORDER BY e2."createdAt" ASC, e2.id ASC LIMIT 1)',
			)
			.getRawMany<{ threadId: string; source: string }>();

		const sources = new Map(rows.map((r) => [r.threadId, r.source]));
		const unrecorded = threadIds.filter((id) => !sources.has(id));
		if (unrecorded.length === 0) return sources;
		// Accepted input keeps its origin after removal from the queue. It names the surface before any execution.
		const inputs = await this.managerFor(ctx).find(AgentMessageEntity, {
			where: { threadId: In(unrecorded), origin: Not(IsNull()) },
			order: { createdAt: 'ASC', id: 'ASC' },
		});
		for (const input of inputs) {
			const source = input.origin?.source;
			if (source && !sources.has(input.threadId)) sources.set(input.threadId, source);
		}
		return sources;
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

	/**
	 * Atomically add a side-call model cost (title generation, observation-log
	 * observer/reflector, episodic-memory model calls) onto an execution row.
	 * Side calls can settle before or after the terminal row write, so this is
	 * an unconditional increment — not gated on `status = 'running'`. `cost` is
	 * nullable (an execution may have no priced main-turn usage yet), so
	 * `COALESCE` keeps the increment from collapsing to `NULL + :cost = NULL`.
	 * Pass the `ctx` from `TransactionRunner.run` to apply the increment inside
	 * the same transaction as the matching thread-total update.
	 */
	async incrementCost(
		executionId: string,
		cost: number,
		ctx: OperationContext = {},
	): Promise<void> {
		if (cost <= 0) return;
		await this.managerFor(ctx)
			.createQueryBuilder()
			.update(AgentExecution)
			.set({ cost: () => 'COALESCE(cost, 0) + :cost' })
			.where('id = :executionId', { executionId })
			.setParameters({ cost })
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
