import type { Pool, PoolClient } from 'pg';

import { generateId } from './generate-id';
import { toJsonb } from './jsonb';
import type { PreparedStatement } from './prepared-statement';
import { UnexpectedError } from '../common';
import {
	SETTLED_STEP_STATUSES,
	stepKeyId,
	type ResumeCause,
	type WaitDeclaration,
	type StepError,
	type StepKey,
	type StepKeyId,
	type StepSlots,
	type StepStatus,
} from '../execution/execution.types';
import {
	StepNotFoundError,
	type DueStep,
	type NewStepRecord,
	type StepRecord,
	type StepStore,
	type StepSummary,
} from '../execution/step-store';

const STEP_RECORD_COLUMNS = `id,
	execution_id AS "executionId",
	node_id AS "nodeId",
	iteration,
	status,
	outputs,
	error,
	wait_declaration AS "waitDeclaration",
	resume_cause AS "resumeCause"`;

/**
 * Reports which output slots a step filled, without fetching what it put in them.
 */
const STEP_SUMMARY_COLUMNS = `step.id,
	step.node_id AS "nodeId",
	step.iteration,
	step.status,
	COALESCE(
		(SELECT array_agg(jsonb_typeof(slot.value) <> 'null' ORDER BY slot.ordinality)
		 FROM jsonb_array_elements(step.outputs) WITH ORDINALITY AS slot),
		'{}'
	) AS "filledOutputSlots"`;

/** `(node_id, iteration)` matches one of the keys passed as `$2` (node ids) and `$3` (iterations). */
const STEP_KEY_FILTER = `(step.node_id, step.iteration) IN (
	SELECT * FROM unnest($2::varchar[], $3::int[])
)`;

const LOCK_EXECUTION_FOR_SHARE: PreparedStatement = {
	name: 'engine_lock_execution_for_share',
	text: 'SELECT id FROM workflow_execution WHERE id = $1::uuid FOR SHARE',
};

/**
 * The failed-step test must be a statement after the lock: a statement that
 * waits for the lock keeps the snapshot it started with, and would miss a
 * failure committed during the wait.
 *
 * `ON CONFLICT DO NOTHING` is the unique key doing its job: a node another
 * planner already queued is skipped, leaving the rest of the batch to land.
 * RETURNING emits exactly the rows that were inserted, in input order.
 */
const INSERT_STEPS: PreparedStatement = {
	name: 'engine_insert_steps',
	text: `INSERT INTO workflow_step_execution (id, execution_id, node_id, iteration, status, outputs)
		SELECT candidate.id, $1::uuid, candidate.node_id, candidate.iteration, candidate.status, candidate.outputs
		FROM unnest($2::uuid[], $3::varchar[], $4::int[], $5::varchar[], $6::jsonb[])
			WITH ORDINALITY AS candidate (id, node_id, iteration, status, outputs, position)
		WHERE NOT EXISTS (
			SELECT 1 FROM workflow_step_execution
			WHERE execution_id = $1::uuid AND status = 'failed'
		)
		ORDER BY candidate.position
		ON CONFLICT DO NOTHING
		RETURNING id, node_id AS "nodeId", iteration`,
};

type ClaimedStepRow = Pick<
	StepRecord,
	'id' | 'executionId' | 'nodeId' | 'iteration' | 'waitDeclaration' | 'resumeCause'
>;

type TransitionColumns = Partial<
	Record<
		'outputs' | 'error' | 'wait_declaration' | 'wait_till' | 'resume_cause',
		string | Date | null
	>
>;

function stepKeyParameters(executionId: string, keys: StepKey[]): [string, string[], number[]] {
	return [executionId, keys.map((key) => key.nodeId), keys.map((key) => key.iteration)];
}

/** Runs `work` in one transaction on one pooled connection. */
async function inTransaction<T>(pool: Pool, work: (client: PoolClient) => Promise<T>): Promise<T> {
	const client = await pool.connect();
	let broken = false;
	try {
		await client.query('BEGIN');
		const result = await work(client);
		await client.query('COMMIT');
		return result;
	} catch (error) {
		await client.query('ROLLBACK').catch(() => {
			broken = true;
		});
		throw error;
	} finally {
		client.release(broken);
	}
}

/** `StepStore` adapter that sends raw SQL to the engine's `pg` pool. */
export class PgStepStore implements StepStore {
	constructor(private readonly pool: Pool) {}

	async createSteps(
		executionId: string,
		records: NewStepRecord[],
	): Promise<Array<{ id: string } & StepKey>> {
		if (records.length === 0) return [];

		for (const record of records) assertCreatableRecord(record);

		// One array per column keeps the statement text the same for every batch size.
		const values = [
			executionId,
			records.map(() => generateId()),
			records.map((record) => record.nodeId),
			records.map((record) => record.iteration),
			records.map((record) => record.status),
			records.map((record) => toJsonb(record.outputs)),
		];

		// The execution-row lock serializes this insert with `failStep`, so rows
		// land before the failure (its sweep cancels them) or not at all.
		// Otherwise rows inserted after the sweep would stay `queued` forever.
		return await inTransaction(this.pool, async (client) => {
			await client.query({ ...LOCK_EXECUTION_FOR_SHARE, values: [executionId] });
			const { rows } = await client.query<{ id: string } & StepKey>({ ...INSERT_STEPS, values });
			return rows;
		});
	}

	async loadStep(id: string): Promise<StepRecord> {
		const { rows } = await this.pool.query<StepRecord>(
			`SELECT ${STEP_RECORD_COLUMNS} FROM workflow_step_execution WHERE id = $1`,
			[id],
		);
		if (rows.length === 0) throw new StepNotFoundError(id);
		return rows[0];
	}

	async claimStep(id: string): Promise<StepRecord | null> {
		// The one transition that hands the row back, so the claimant doesn't
		// need a second query to learn which node it now runs. `outputs` is not
		// among the returned columns: a step claimed out of `queued` can't have
		// an outcome yet, so it is `null` by the lifecycle.
		//
		// `wait_declaration` and `resume_cause` are returned, because a resumed step
		// is also claimed out of `queued` and carries both. A deadline resume reads
		// its captured outputs straight off the claim, so dispatching one costs no
		// extra read.
		//
		// The execution-row lock serializes the claim with `failStep`, so no
		// step starts running once its execution has a failed step. Claims
		// don't block each other (shared lock).
		const row = await inTransaction(this.pool, async (client) => {
			await client.query(
				`SELECT id FROM workflow_execution
				WHERE id = (SELECT execution_id FROM workflow_step_execution WHERE id = $1)
				FOR SHARE`,
				[id],
			);
			const { rows } = await client.query<ClaimedStepRow>(
				`UPDATE workflow_step_execution step
				SET status = 'running', updated_at = now()
				WHERE step.id = $1 AND step.status = 'queued'
					AND NOT EXISTS (
						SELECT 1 FROM workflow_step_execution sibling
						WHERE sibling.execution_id = step.execution_id AND sibling.status = 'failed'
					)
				RETURNING
					step.id,
					step.execution_id AS "executionId",
					step.node_id AS "nodeId",
					step.iteration,
					step.wait_declaration AS "waitDeclaration",
					step.resume_cause AS "resumeCause"`,
				[id],
			);
			return rows.at(0);
		});

		return row ? { ...row, status: 'running', outputs: null } : null;
	}

	async completeStep(id: string, outputs: StepSlots): Promise<boolean> {
		return await this.transition(id, 'running', 'completed', { outputs: toJsonb(outputs) });
	}

	async suspendStep(id: string, waitDeclaration: WaitDeclaration): Promise<boolean> {
		// `wait_till` is derived from the declaration in the same statement that
		// writes it, so the column the sweep reads can never disagree with the
		// declaration it fires.
		return await this.transition(id, 'running', 'waiting', {
			wait_declaration: toJsonb(waitDeclaration),
			wait_till: waitDeclaration.resumeAt === undefined ? null : new Date(waitDeclaration.resumeAt),
		});
	}

	async resumeStep(id: string, resumeCause: ResumeCause): Promise<boolean> {
		// `wait_till` stays as it was, so the status is the only thing that keeps
		// the sweep from firing this row again.
		return await this.transition(id, 'waiting', 'queued', { resume_cause: toJsonb(resumeCause) });
	}

	async resumeDueSteps(due: Date, limit: number): Promise<DueStep[]> {
		// `SKIP LOCKED` so two sweepers split a backlog instead of one waiting out
		// the other's batch. The subquery carries the `wait_till` test, so the row
		// that is updated is the row that was found due.
		const { rows } = await this.pool.query<DueStep>(
			`UPDATE workflow_step_execution
			SET status = 'queued', resume_cause = $3, updated_at = now()
			WHERE id IN (
				SELECT id FROM workflow_step_execution
				WHERE status = 'waiting' AND wait_till <= $1
				ORDER BY wait_till
				LIMIT $2
				FOR UPDATE SKIP LOCKED
			)
			RETURNING id, execution_id AS "executionId"`,
			[due, limit, toJsonb({ kind: 'deadline' } satisfies ResumeCause)],
		);
		return rows;
	}

	async nextWaitDeadline(): Promise<Date | null> {
		// Served by the partial index on `wait_till`, so this stays a cheap read
		// even with a large backlog.
		const { rows } = await this.pool.query<{ next: Date | null }>(
			`SELECT MIN(wait_till) AS next FROM workflow_step_execution
			WHERE status = 'waiting' AND wait_till IS NOT NULL`,
		);
		return rows.at(0)?.next ?? null;
	}

	async cancelPendingSteps(executionId: string): Promise<void> {
		await this.pool.query(
			`UPDATE workflow_step_execution SET status = 'cancelled', updated_at = now()
			WHERE execution_id = $1 AND status IN ('queued', 'waiting')`,
			[executionId],
		);
	}

	async cancelStep(id: string): Promise<boolean> {
		return await this.transition(id, 'running', 'cancelled');
	}

	async failStep(id: string, error: StepError): Promise<boolean> {
		// Locking the execution row makes concurrent claims and planning inserts
		// wait for this failure to commit (see `claimStep` and `createSteps`).
		// NO KEY UPDATE, not UPDATE, so plain FK checks don't queue behind it.
		return await inTransaction(this.pool, async (client) => {
			await client.query(
				`SELECT id FROM workflow_execution
				WHERE id = (SELECT execution_id FROM workflow_step_execution WHERE id = $1)
				FOR NO KEY UPDATE`,
				[id],
			);
			return await this.transition(id, 'running', 'failed', { error: toJsonb(error) }, client);
		});
	}

	/**
	 * Compare-and-set on `status`, writing any result columns in the same
	 * statement so a step's status and its outcome can't be observed apart.
	 */
	private async transition(
		id: string,
		from: StepStatus,
		to: StepStatus,
		columns: TransitionColumns = {},
		client: Pool | PoolClient = this.pool,
	): Promise<boolean> {
		const assignments = Object.keys(columns)
			.map((column, index) => `, ${column} = $${index + 4}`)
			.join('');
		const result = await client.query(
			`UPDATE workflow_step_execution SET status = $3, updated_at = now()${assignments}
			WHERE id = $1 AND status = $2`,
			[id, from, to, ...Object.values(columns)],
		);
		return result.rowCount === 1;
	}

	async loadStepsByKeys(
		executionId: string,
		keys: StepKey[],
	): Promise<Record<StepKeyId, StepRecord>> {
		if (keys.length === 0) return {};

		const { rows } = await this.pool.query<StepRecord>(
			`SELECT ${STEP_RECORD_COLUMNS} FROM workflow_step_execution step
			WHERE step.execution_id = $1 AND ${STEP_KEY_FILTER}`,
			stepKeyParameters(executionId, keys),
		);
		return Object.fromEntries(rows.map((row) => [stepKeyId(row), row]));
	}

	async loadStepSummariesByKeys(
		executionId: string,
		keys: StepKey[],
	): Promise<Record<StepKeyId, StepSummary>> {
		if (keys.length === 0) return {};

		const { rows } = await this.pool.query<StepSummary>(
			`SELECT ${STEP_SUMMARY_COLUMNS} FROM workflow_step_execution step
			WHERE step.execution_id = $1 AND ${STEP_KEY_FILTER}`,
			stepKeyParameters(executionId, keys),
		);
		return Object.fromEntries(rows.map((row) => [stepKeyId(row), row]));
	}

	async loadLatestStepSummaries(
		executionId: string,
		nodeIds: string[],
	): Promise<Record<string, StepSummary>> {
		if (nodeIds.length === 0) return {};

		const { rows } = await this.pool.query<StepSummary>(
			`SELECT DISTINCT ON (step.node_id) ${STEP_SUMMARY_COLUMNS}
			FROM workflow_step_execution step
			WHERE step.execution_id = $1 AND step.node_id = ANY($2::varchar[])
			ORDER BY step.node_id, step.iteration DESC`,
			[executionId, nodeIds],
		);
		return Object.fromEntries(rows.map((row) => [row.nodeId, row]));
	}

	async loadAllSteps(executionId: string): Promise<StepRecord[]> {
		const { rows } = await this.pool.query<StepRecord>(
			`SELECT ${STEP_RECORD_COLUMNS} FROM workflow_step_execution
			WHERE execution_id = $1
			ORDER BY node_id, iteration`,
			[executionId],
		);
		return rows;
	}

	async countSettledSteps(executionId: string): Promise<number> {
		const { rows } = await this.pool.query<{ count: number }>(
			`SELECT count(*)::int AS count FROM workflow_step_execution
			WHERE execution_id = $1 AND status = ANY($2::varchar[])`,
			[executionId, SETTLED_STEP_STATUSES],
		);
		return rows[0].count;
	}

	async hasFailedSteps(executionId: string): Promise<boolean> {
		const { rows } = await this.pool.query<{ failed: boolean }>(
			`SELECT EXISTS (
				SELECT 1 FROM workflow_step_execution WHERE execution_id = $1 AND status = 'failed'
			) AS failed`,
			[executionId],
		);
		return rows[0].failed;
	}
}

const CREATION_STATUSES: readonly StepStatus[] = ['queued', 'completed', 'skipped'];

/**
 * Re-checks `NewStepRecord`'s union at runtime for callers outside the type
 * system. The widened parameter keeps the checks from narrowing to `never`.
 */
function assertCreatableRecord(record: {
	nodeId: string;
	iteration: number;
	status: StepStatus;
	outputs?: StepSlots;
}): void {
	if (!Number.isInteger(record.iteration) || record.iteration < 0) {
		throw new UnexpectedError(
			`step for node ${record.nodeId} is created with iteration ${record.iteration}; iterations are non-negative integers`,
		);
	}
	if (!CREATION_STATUSES.includes(record.status)) {
		throw new UnexpectedError(
			`step for node ${record.nodeId} is created ${record.status}, a status only reachable through its transition method`,
		);
	}
	if (record.outputs !== undefined && record.status !== 'completed') {
		throw new UnexpectedError(
			`step for node ${record.nodeId} is created ${record.status} with outputs, which only a step created completed may carry`,
		);
	}
	if (record.status === 'completed' && !Array.isArray(record.outputs)) {
		throw new UnexpectedError(
			`step for node ${record.nodeId} is created completed without a slot list, which persists as NULL and reads as every slot dead (pass [] for a step that fired nothing)`,
		);
	}
}
