import { In, type Repository } from '@n8n/typeorm';

import type { WorkflowExecution } from './entities';
import {
	ExecutionNotFoundError,
	type ExecutionRecord,
	type ExecutionStore,
	type NewExecutionRecord,
} from '../execution/execution-store';
import type { ExecutionStatus } from '../execution/execution.types';

/**
 * Insert payload accepted by the repository. Derived from the method rather than
 * imported: TypeORM's `QueryDeepPartialEntity` has no root export.
 */
type InsertValues = Parameters<Repository<WorkflowExecution>['insert']>[0];

/**
 * The statuses of an execution that started and has not ended. `queued` also
 * moves on, so it is not this set. The SQL in `refreshLiveStatus` and
 * `isLiveExecutionStatus` repeat this list. Change all three together.
 */
const LIVE_STATUSES: ExecutionStatus[] = ['running', 'waiting'];

/** TypeORM-backed `ExecutionStore` adapter. */
export class TypeOrmExecutionStore implements ExecutionStore {
	constructor(private readonly repo: Repository<WorkflowExecution>) {}

	async createExecution(record: NewExecutionRecord): Promise<void> {
		const execution = this.repo.create({ ...record, finishedAt: null });
		// The cast is needed because the insert payload type recurses into the
		// opaque `graph` jsonb and rejects `StepConfig`'s deliberate `unknown`.
		// NOTE: prefer insert to save for performance reasons.
		await this.repo.insert(execution as InsertValues);
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
			.where('execution.id = :id', { id })
			.getRawOne();
		if (!row) throw new ExecutionNotFoundError(id);
		return row;
	}

	async transitionStatus(id: string, from: ExecutionStatus, to: ExecutionStatus): Promise<boolean> {
		const result = await this.repo.update({ id, status: from }, { status: to });
		return result.affected === 1;
	}

	async finishExecution(id: string, status: 'completed' | 'failed'): Promise<boolean> {
		// A waiting execution can end too: a step that fails elsewhere ends the
		// whole execution, and the steps that wait are cancelled with it.
		const result = await this.repo.update(
			{ id, status: In(LIVE_STATUSES) },
			{ status, finishedAt: new Date() },
		);
		return result.affected === 1;
	}

	async refreshLiveStatus(id: string): Promise<void> {
		// One round trip, not one instant. The probes below run once, so a step can
		// change while the UPDATE waits for the row's lock. The status is a
		// projection: the next suspension or settlement re-derives it.
		// The `e.status` predicate is re-checked against the current row, so a
		// refresh that lost a race with `finishExecution` writes nothing.
		// The last predicate skips the write when the status already holds. A
		// settling step then does not take the execution row's lock for nothing.
		await this.repo.query(
			`WITH live AS (
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
				AND e.status IN ('running', 'waiting')
				AND (live.runnable OR live.waiting)
				AND e.status IS DISTINCT FROM CASE WHEN live.runnable THEN 'running' ELSE 'waiting' END`,
			[id],
		);
	}
}
