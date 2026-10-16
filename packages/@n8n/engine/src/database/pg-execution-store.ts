import type { Pool } from 'pg';

import { toJsonb } from './jsonb';
import type { PreparedStatement } from './prepared-statement';
import {
	ExecutionNotFoundError,
	type ExecutionRecord,
	type ExecutionStore,
	type NewExecutionRecord,
} from '../execution/execution-store';
import {
	LIVE_EXECUTION_STATUSES,
	type ExecutionStatus,
	type TriggerOutputs,
} from '../execution/execution.types';

const ENDABLE_STATUSES: readonly ExecutionStatus[] = ['queued', ...LIVE_EXECUTION_STATUSES];

/**
 * Every column the execution path reads, and none it does not: `workflow` is
 * for the read path, and `trigger_outputs` is read once by `loadTriggerOutputs`.
 */
const LOAD_EXECUTION: PreparedStatement = {
	name: 'engine_load_execution',
	text: `SELECT
			id,
			workflow_id AS "workflowId",
			status,
			mode,
			graph,
			caller_context AS "callerContext",
			response_expectation AS "responseExpectation",
			finished_at AS "finishedAt"
		FROM workflow_execution
		WHERE id = $1::uuid`,
};

const LOAD_TRIGGER_OUTPUTS: PreparedStatement = {
	name: 'engine_load_trigger_outputs',
	text: 'SELECT trigger_outputs AS "triggerOutputs" FROM workflow_execution WHERE id = $1::uuid',
};

/** `ExecutionStore` adapter that sends raw SQL to the engine's `pg` pool. */
export class PgExecutionStore implements ExecutionStore {
	constructor(private readonly pool: Pool) {}

	async createExecution(record: NewExecutionRecord): Promise<void> {
		await this.pool.query(
			`INSERT INTO workflow_execution
				(id, workflow_id, status, mode, graph, workflow, trigger_outputs, caller_context, response_expectation)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
			[
				record.id,
				record.workflowId,
				record.status,
				record.mode,
				toJsonb(record.graph),
				toJsonb(record.workflow),
				toJsonb(record.triggerOutputs),
				toJsonb(record.callerContext),
				toJsonb(record.responseExpectation),
			],
		);
	}

	async loadExecution(id: string): Promise<ExecutionRecord> {
		const { rows } = await this.pool.query<ExecutionRecord>({ ...LOAD_EXECUTION, values: [id] });
		if (rows.length === 0) throw new ExecutionNotFoundError(id);
		return rows[0];
	}

	async loadTriggerOutputs(id: string): Promise<TriggerOutputs | null> {
		const { rows } = await this.pool.query<{ triggerOutputs: TriggerOutputs | null }>({
			...LOAD_TRIGGER_OUTPUTS,
			values: [id],
		});
		if (rows.length === 0) throw new ExecutionNotFoundError(id);
		return rows[0].triggerOutputs;
	}

	async transitionStatus(id: string, from: ExecutionStatus, to: ExecutionStatus): Promise<boolean> {
		const result = await this.pool.query(
			`UPDATE workflow_execution SET status = $3, updated_at = now()
			WHERE id = $1 AND status = $2`,
			[id, from, to],
		);
		return result.rowCount === 1;
	}

	async finishExecution(
		id: string,
		status: 'completed' | 'failed',
	): Promise<{ finishedAt: Date } | null> {
		// A waiting execution can end too: a failure elsewhere cancels its waits.
		return await this.end(id, status, LIVE_EXECUTION_STATUSES);
	}

	async cancelExecution(id: string): Promise<{ finishedAt: Date } | null> {
		return await this.end(id, 'cancelled', ENDABLE_STATUSES);
	}

	private async end(
		id: string,
		status: ExecutionStatus,
		from: readonly ExecutionStatus[],
	): Promise<{ finishedAt: Date } | null> {
		const finishedAt = new Date();
		const result = await this.pool.query(
			`UPDATE workflow_execution SET status = $2, finished_at = $3, updated_at = now()
			WHERE id = $1 AND status = ANY($4::varchar[])`,
			[id, status, finishedAt, from],
		);
		return result.rowCount === 1 ? { finishedAt } : null;
	}

	async refreshLiveStatus(id: string): Promise<void> {
		// The probes read the steps before the UPDATE takes the row's lock, so a
		// step can change in between.
		await this.pool.query(
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
}
