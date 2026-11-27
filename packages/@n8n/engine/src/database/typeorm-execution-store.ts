import {
	In,
	IsNull,
	LessThanOrEqual,
	Not,
	type EntityManager,
	type Repository,
} from '@n8n/typeorm';

import { WorkflowSeededStep, type WorkflowExecution } from './entities';
import { toErrorSourceColumns } from './error-source-columns';
import { KEEP_UPDATED_AT } from './keep-updated-at';
import { parentLinkSql, toParentColumns } from './parent-link-columns';
import {
	ExecutionNotFoundError,
	ParentExecutionEndedError,
	type CreateExecutionResult,
	type ExecutionRecord,
	type ExecutionStore,
	type NewExecutionRecord,
	type PrunableExecution,
	type PrunableExecutionQuery,
	type StaleQueuedExecution,
} from '../execution/execution-store';
import {
	DEFAULT_STALENESS_THRESHOLDS,
	nextQueuedStaleAfter,
	errorWorkflowPendingMs,
	type StalenessThresholds,
} from '../execution/staleness';
import {
	ENDED_EXECUTION_STATUSES,
	isEndedExecutionStatus,
	LIVE_EXECUTION_STATUSES,
	stepKeyId,
	type ExecutionStatus,
	type StepKey,
	type StepKeyId,
	type StepSlots,
} from '../execution/execution.types';

/**
 * Insert payload accepted by the repository. Derived from the method rather than
 * imported: TypeORM's `QueryDeepPartialEntity` has no root export.
 */
type InsertValues = Parameters<Repository<WorkflowExecution>['insert']>[0];

/** TypeORM-backed `ExecutionStore` adapter. */
export class TypeOrmExecutionStore implements ExecutionStore {
	constructor(
		private readonly repo: Repository<WorkflowExecution>,
		private readonly staleness: StalenessThresholds = DEFAULT_STALENESS_THRESHOLDS,
	) {}

	/** The `stale_after` value of an execution that enters `status` now. */
	private staleAfterFor(status: ExecutionStatus): Date | null {
		return status === 'queued' ? new Date(Date.now() + this.staleness.queuedMs) : null;
	}

	async createExecution({
		seededSteps,
		parent,
		errorSource,
		...record
	}: NewExecutionRecord): Promise<CreateExecutionResult> {
		const execution = this.repo.create({
			...record,
			...toParentColumns(parent),
			...toErrorSourceColumns(errorSource),
			finishedAt: null,
			staleAfter: this.staleAfterFor(record.status),
		});
		const seeded = Object.entries(seededSteps ?? {}).flatMap(([nodeId, passes]) =>
			passes.map((outputs, iteration) => ({ executionId: record.id, nodeId, iteration, outputs })),
		);
		return await this.repo.manager.transaction(async (manager) => {
			if (parent) await this.holdParentNotEnded(manager, parent.executionId);
			// The cast is needed because the insert payload type recurses into the
			// opaque `graph` jsonb and rejects `StepConfig`'s deliberate `unknown`.
			// NOTE: prefer insert to save for performance reasons.
			if (errorSource) {
				const inserted = await this.insertErrorExecution(manager, execution as InsertValues);
				// Cleared even when another start won, so a stray marker cannot outlive it.
				// The source has ended, so the write keeps its `updated_at`.
				await manager.update(
					this.repo.target,
					{ id: errorSource.executionId, errorWorkflowDueAt: Not(IsNull()) },
					{ errorWorkflowDueAt: null, ...KEEP_UPDATED_AT },
				);
				if (!inserted) return { errorExecutionAlreadyExists: true };
			} else {
				await manager.insert(this.repo.target, execution as InsertValues);
			}
			if (seeded.length > 0) await manager.insert(WorkflowSeededStep, seeded);
			return { errorExecutionAlreadyExists: false };
		});
	}

	/**
	 * Inserts an error execution unless its source already has an error execution.
	 * The unique index on the source decides, so two concurrent starts cannot
	 * both insert. Only a conflict on that index is ignored: an id that another
	 * execution already has still throws, so the marker of the source stays.
	 */
	private async insertErrorExecution(
		manager: EntityManager,
		execution: InsertValues,
	): Promise<boolean> {
		const result = await manager
			.createQueryBuilder()
			.insert()
			.into(this.repo.target)
			.values(execution)
			// Deprecated, but `orIgnore` takes no conflict target and `orUpdate` cannot do nothing.
			// oxlint-disable-next-line typescript/no-deprecated
			.onConflict(
				'(error_source_execution_id) WHERE error_source_execution_id IS NOT NULL DO NOTHING',
			)
			.returning('id')
			.execute();
		return Array.isArray(result.raw) && result.raw.length > 0;
	}

	/**
	 * The marker value that the write which fails an execution sets: a time for
	 * an execution with `resolve_error_workflow_on_failure`, `NULL` for any other. SQL,
	 * so the flag is read in the same statement as the status change.
	 */
	private errorWorkflowDueSql(): () => string {
		const dueAt = new Date(Date.now() + errorWorkflowPendingMs(this.staleness)).toISOString();
		return () =>
			`CASE WHEN resolve_error_workflow_on_failure THEN '${dueAt}'::timestamptz ELSE NULL END`;
	}

	/**
	 * Takes a shared lock on the parent row. We do this to prevent a race between
	 * sub-execution creation and parent status update (cancellation, failure).
	 */
	private async holdParentNotEnded(manager: EntityManager, parentId: string): Promise<void> {
		const row = await manager
			.createQueryBuilder(this.repo.target, 'execution')
			.setLock('pessimistic_read')
			.select('execution.status', 'status')
			.where('execution.id = :parentId', { parentId })
			.getRawOne<{ status: ExecutionStatus }>();
		if (!row) throw new ExecutionNotFoundError(parentId);
		if (isEndedExecutionStatus(row.status)) {
			throw new ParentExecutionEndedError(parentId, row.status);
		}
	}

	async loadSeededOutputs(
		executionId: string,
		keys: StepKey[],
	): Promise<Map<StepKeyId, StepSlots>> {
		if (keys.length === 0) return new Map();

		const tuples: string[] = [];
		const parameters: Record<string, string | number> = { executionId };
		keys.forEach(({ nodeId, iteration }, index) => {
			tuples.push(`(:n${index}, :i${index})`);
			parameters[`n${index}`] = nodeId;
			parameters[`i${index}`] = iteration;
		});
		const rows = await this.repo.manager
			.getRepository(WorkflowSeededStep)
			.createQueryBuilder('seeded')
			.where('seeded.execution_id = :executionId')
			.andWhere(`(seeded.node_id, seeded.iteration) IN (${tuples.join(', ')})`)
			.setParameters(parameters)
			.getMany();

		return new Map(rows.map((row) => [stepKeyId(row), row.outputs]));
	}

	async loadExecution(id: string): Promise<ExecutionRecord> {
		const row: ExecutionRecord | undefined = await this.repo
			.createQueryBuilder('execution')
			.select('execution.id', 'id')
			.addSelect('execution.workflow_id', 'workflowId')
			.addSelect('execution.status', 'status')
			.addSelect('execution.mode', 'mode')
			.addSelect('execution.graph', 'graph')
			.addSelect('execution.trigger_outputs', 'triggerOutputs')
			.addSelect('execution.caller_context', 'callerContext')
			.addSelect('execution.response_expectation', 'responseExpectation')
			.addSelect(parentLinkSql('execution'), 'parent')
			.addSelect('execution.lifecycle_event_subscription', 'lifecycleEventSubscription')
			.addSelect('execution.finished_at', 'finishedAt')
			.where('execution.id = :id', { id })
			.getRawOne();
		if (!row) throw new ExecutionNotFoundError(id);
		return row;
	}

	async loadExecutionStatus(id: string): Promise<ExecutionStatus> {
		const row = await this.repo.findOne({ select: { status: true }, where: { id } });
		if (!row) throw new ExecutionNotFoundError(id);
		return row.status;
	}

	async transitionStatus(id: string, from: ExecutionStatus, to: ExecutionStatus): Promise<boolean> {
		const result = await this.repo.update(
			{ id, status: from },
			{ status: to, staleAfter: this.staleAfterFor(to) },
		);
		return result.affected === 1;
	}

	async finishExecution(
		id: string,
		status: 'completed' | 'failed',
	): Promise<{ finishedAt: Date } | null> {
		// A waiting execution can end too: a failure elsewhere cancels its waits.
		const finishedAt = new Date();
		const result = await this.repo.update(
			{ id, status: In([...LIVE_EXECUTION_STATUSES]) },
			{
				status,
				finishedAt,
				...(status === 'failed' ? { errorWorkflowDueAt: this.errorWorkflowDueSql() } : {}),
			},
		);
		return result.affected === 1 ? { finishedAt } : null;
	}

	async cancelExecution(id: string): Promise<{ finishedAt: Date } | null> {
		const finishedAt = new Date();
		const result = await this.repo.update(
			{ id, status: In(['queued', ...LIVE_EXECUTION_STATUSES] satisfies ExecutionStatus[]) },
			{ status: 'cancelled', finishedAt, staleAfter: null },
		);
		return result.affected === 1 ? { finishedAt } : null;
	}

	async findStaleQueuedExecutions(at: Date, limit: number): Promise<StaleQueuedExecution[]> {
		// Served by the partial index on `stale_after` for `queued` rows.
		const rows = await this.repo.find({
			select: { id: true, staleAfter: true },
			where: { status: 'queued', staleAfter: LessThanOrEqual(at) },
			order: { staleAfter: 'ASC' },
			take: limit,
		});
		return rows.flatMap(({ id, staleAfter }) => (staleAfter ? [{ id, staleAfter }] : []));
	}

	async renewQueuedExecution(id: string, staleAfter: Date): Promise<boolean> {
		const result = await this.repo.update(
			{ id, status: 'queued', staleAfter },
			{ staleAfter: nextQueuedStaleAfter(staleAfter, Date.now(), this.staleness.queuedMs) },
		);
		return result.affected === 1;
	}

	async loadLiveSubExecutionIds(parentExecutionId: string): Promise<string[]> {
		const rows: Array<{ id: string }> = await this.repo
			.createQueryBuilder('execution')
			.select('execution.id', 'id')
			.where('execution.parent_execution_id = :parentExecutionId', { parentExecutionId })
			.andWhere('execution.status IN (:...statuses)', {
				statuses: ['queued', ...LIVE_EXECUTION_STATUSES] satisfies ExecutionStatus[],
			})
			.orderBy('execution.id', 'ASC')
			.getRawMany();
		return rows.map(({ id }) => id);
	}

	async refreshLiveStatus(id: string): Promise<void> {
		// The probes read the steps before the UPDATE takes the row's lock, so a
		// step can change in between.
		await this.repo.query(
			// MATERIALIZED, because `live.runnable` is read three times below.
			`WITH live AS MATERIALIZED (
				SELECT
					EXISTS (
						SELECT 1 FROM workflow_step_execution
						WHERE execution_id = $1 AND status IN ('queued', 'running')
					) AS runnable,
					EXISTS (
						SELECT 1 FROM workflow_step_execution
						WHERE execution_id = $1 AND status = 'waiting'
					) AS waiting
			)
			UPDATE workflow_execution e
			SET status = CASE WHEN live.runnable THEN 'running' ELSE 'waiting' END,
				-- A raw query bypasses the UpdateDateColumn hook, so set the time here.
				updated_at = now()
			FROM live
			WHERE e.id = $1
				-- Re-checked against the row it locks, so losing to finishExecution writes nothing.
				AND e.status IN ('running', 'waiting')
				AND (live.runnable OR live.waiting)
				-- Skip a write that changes nothing, so the row is not locked for it.
				AND e.status IS DISTINCT FROM CASE WHEN live.runnable THEN 'running' ELSE 'waiting' END`,
			[id],
		);
	}

	async findPrunableExecutions({
		maxAgeMs,
		countCutoff,
		limit,
		after,
	}: PrunableExecutionQuery): Promise<PrunableExecution[]> {
		const pastMaxAge = "execution.finished_at < now() - interval '1 millisecond' * :maxAgeMs";
		// Served by the partial index on `(finished_at, id)` for ended rows.
		const qb = this.repo
			.createQueryBuilder('execution')
			.select('execution.id', 'id')
			.addSelect('execution.workflow_id', 'workflowId')
			.addSelect('execution.finished_at', 'finishedAt')
			.where('execution.finished_at IS NOT NULL');
		if (countCutoff) {
			qb.andWhere(
				`(${pastMaxAge} OR (execution.finished_at, execution.id) <= (:cutoffFinishedAt, :cutoffId))`,
				{ maxAgeMs, cutoffFinishedAt: countCutoff.finishedAt, cutoffId: countCutoff.id },
			)
				// Bounds the index scan, which the OR above cannot.
				.andWhere(
					"execution.finished_at <= GREATEST(now() - interval '1 millisecond' * :maxAgeMs, :cutoffFinishedAt)",
				);
		} else {
			qb.andWhere(pastMaxAge, { maxAgeMs });
		}
		qb.andWhere('execution.status IN (:...ended)', { ended: ENDED_EXECUTION_STATUSES })
			// A cancel does not stop a running step, and that step can still write.
			.andWhere(
				`NOT EXISTS (
					SELECT 1 FROM workflow_step_execution step
					WHERE step.execution_id = execution.id
						AND step.status IN ('queued', 'running', 'waiting')
				)`,
			)
			// The waiting parent step still reads the result of this execution.
			.andWhere(
				`NOT EXISTS (
					SELECT 1 FROM workflow_step_execution parent_step
					WHERE execution.parent_awaited
						AND parent_step.id = execution.parent_step_id
						AND parent_step.execution_id = execution.parent_execution_id
						AND parent_step.status = 'waiting'
				)`,
			);
		if (after) {
			qb.andWhere('(execution.finished_at, execution.id) > (:afterFinishedAt, :afterId)', {
				afterFinishedAt: after.finishedAt,
				afterId: after.id,
			});
		}
		return await qb
			.orderBy('execution.finished_at')
			.addOrderBy('execution.id')
			.limit(limit)
			.getRawMany<PrunableExecution>();
	}

	async findRetentionCountCutoff(
		maxCount: number,
	): Promise<Pick<PrunableExecution, 'id' | 'finishedAt'> | undefined> {
		return await this.repo
			.createQueryBuilder('execution')
			.select('execution.id', 'id')
			.addSelect('execution.finished_at', 'finishedAt')
			// Only an ended execution has a finish time.
			.where('execution.finished_at IS NOT NULL')
			.orderBy('execution.finished_at', 'DESC')
			.addOrderBy('execution.id', 'DESC')
			.offset(maxCount)
			.limit(1)
			.getRawOne<Pick<PrunableExecution, 'id' | 'finishedAt'>>();
	}

	async deleteEndedExecutions(ids: string[]): Promise<number> {
		if (ids.length === 0) return 0;
		const result = await this.repo.delete({
			id: In(ids),
			status: In([...ENDED_EXECUTION_STATUSES]),
		});
		return result.affected ?? 0;
	}
}
