import { In, type Repository } from '@n8n/typeorm';

import { WorkflowStepExecution } from './entities';
import { generateId } from './generate-id';
import { UnexpectedError } from '../common';
import {
	SETTLED_STEP_STATUSES,
	type StepSlots,
	type StepStatus,
} from '../execution/execution.types';
import {
	StepNotFoundError,
	type NewStepRecord,
	type StepError,
	type StepRecord,
	type StepStore,
	type StepSummary,
} from '../execution/step-store';

/** RETURNING rows come back keyed by database column name (snake_case). */
type InsertedStepRow = { id: string; node_id: string };
type ClaimedStepRow = { id: string; execution_id: string; node_id: string };

/** TypeORM-backed `StepStore` adapter. */
export class TypeOrmStepStore implements StepStore {
	constructor(private readonly repo: Repository<WorkflowStepExecution>) {}

	async createSteps(
		executionId: string,
		records: NewStepRecord[],
	): Promise<Array<{ id: string; nodeId: string }>> {
		if (records.length === 0) return [];

		for (const record of records) assertCreatableRecord(record);

		// Ids are assigned here because the entity's insert hook only runs on class
		// instances, and these are plain values.
		const rows = records.map((record) => ({ ...record, executionId, id: generateId() }));

		// The execution-row lock serializes this insert with `failStep`, so rows
		// land before the failure (its sweep cancels them) or not at all.
		// Otherwise rows inserted after the sweep would stay `queued` forever.
		return await this.repo.manager.transaction(async (manager) => {
			await manager.query('SELECT id FROM workflow_execution WHERE id = $1 FOR SHARE', [
				executionId,
			]);
			const [failed] = await manager.query<Array<{ id: string }>>(
				`SELECT id FROM workflow_step_execution
				 WHERE execution_id = $1 AND status = 'failed'
				 LIMIT 1`,
				[executionId],
			);
			if (failed) return [];

			// `orIgnore` is the unique key doing its job: a node another planner already
			// queued is skipped, leaving the rest of the batch to land. RETURNING emits
			// exactly the rows that were inserted, keyed by database column name.
			const result = await manager
				.createQueryBuilder()
				.insert()
				.into(WorkflowStepExecution)
				.values(rows)
				.orIgnore()
				.returning(['id', 'nodeId'])
				.execute();

			return (result.raw as InsertedStepRow[]).map(({ id, node_id: nodeId }) => ({ id, nodeId }));
		});
	}

	async loadStep(id: string): Promise<StepRecord> {
		// NOTE: `findOne({ where })`, not `findOneBy`: the latter's overload exceeds
		// TypeScript's instantiation depth on the recursive `outputs` column type.
		const row = await this.repo.findOne({ where: { id } });
		if (!row) throw new StepNotFoundError(id);
		return row;
	}

	async claimStep(id: string): Promise<StepRecord | null> {
		// The one transition that hands the row back, so the claimant doesn't
		// need a second query to learn which node it now runs. RETURNING covers
		// only the identity columns: a step claimed out of `queued` can't have
		// an outcome yet, so `outputs`/`error` are `null` by the lifecycle.
		//
		// The execution-row lock serializes the claim with `failStep`, so no
		// step starts running once its execution has a failed step. Claims
		// don't block each other (shared lock).
		return await this.repo.manager.transaction(async (manager) => {
			const [execution] = await manager.query<Array<{ id: string }>>(
				`SELECT id FROM workflow_execution
				 WHERE id = (SELECT execution_id FROM workflow_step_execution WHERE id = $1)
				 FOR SHARE`,
				[id],
			);
			if (!execution) return null;

			const result = await manager
				.createQueryBuilder()
				.update(WorkflowStepExecution)
				.set({ status: 'running' })
				.where({ id, status: 'queued' })
				.andWhere(
					`NOT EXISTS (
						SELECT 1 FROM workflow_step_execution sibling
						WHERE sibling.execution_id = :executionId AND sibling.status = 'failed'
					)`,
					{ executionId: execution.id },
				)
				.returning(['id', 'executionId', 'nodeId'])
				.execute();

			const [row] = result.raw as ClaimedStepRow[];
			if (!row) return null;

			return {
				id: row.id,
				executionId: row.execution_id,
				nodeId: row.node_id,
				status: 'running',
				outputs: null,
				error: null,
			};
		});
	}

	async completeStep(id: string, outputs: StepSlots): Promise<boolean> {
		return await this.transition(id, 'running', 'completed', { outputs });
	}

	async cancelQueuedSteps(executionId: string): Promise<void> {
		await this.repo.update({ executionId, status: 'queued' }, { status: 'cancelled' });
	}

	async failStep(id: string, error: StepError): Promise<boolean> {
		// Locking the execution row makes concurrent claims and planning inserts
		// wait for this failure to commit (see `claimStep` and `createSteps`).
		// NO KEY UPDATE, not UPDATE, so plain FK checks don't queue behind it.
		return await this.repo.manager.transaction(async (manager) => {
			await manager.query(
				`SELECT id FROM workflow_execution
				 WHERE id = (SELECT execution_id FROM workflow_step_execution WHERE id = $1)
				 FOR NO KEY UPDATE`,
				[id],
			);
			const result = await manager.update(
				WorkflowStepExecution,
				{ id, status: 'running' },
				{ error, status: 'failed' },
			);
			return result.affected === 1;
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
		fields: { outputs?: StepSlots; error?: StepError } = {},
	): Promise<boolean> {
		const result = await this.repo.update({ id, status: from }, { ...fields, status: to });
		return result.affected === 1;
	}

	async loadStepsByNodeIds(
		executionId: string,
		nodeIds: string[],
	): Promise<Record<string, StepRecord>> {
		if (nodeIds.length === 0) return {};

		const rows = await this.repo.find({ where: { executionId, nodeId: In(nodeIds) } });
		return Object.fromEntries(rows.map((row) => [row.nodeId, row]));
	}

	async loadStepSummaries(
		executionId: string,
		nodeIds: string[],
	): Promise<Record<string, StepSummary>> {
		if (nodeIds.length === 0) return {};

		// The per-slot booleans are computed inside the query, so the potentially
		// large outputs payloads are never transferred. A slot counts as filled
		// unless it holds JSON null.
		const rows: Array<{
			id: string;
			nodeId: string;
			status: StepStatus;
			filledOutputSlots: boolean[];
		}> = await this.repo
			.createQueryBuilder('step')
			.select('step.id', 'id')
			.addSelect('step.node_id', 'nodeId')
			.addSelect('step.status', 'status')
			.addSelect(
				`COALESCE(
					(SELECT array_agg(jsonb_typeof(slot.value) <> 'null' ORDER BY slot.ordinality)
					 FROM jsonb_array_elements(step.outputs) WITH ORDINALITY AS slot),
					'{}'
				)`,
				'filledOutputSlots',
			)
			.where('step.execution_id = :executionId', { executionId })
			.andWhere('step.node_id IN (:...nodeIds)', { nodeIds })
			.getRawMany();

		return Object.fromEntries(rows.map((row) => [row.nodeId, row]));
	}

	async countSettledSteps(executionId: string): Promise<number> {
		return await this.repo.count({
			where: { executionId, status: In([...SETTLED_STEP_STATUSES]) },
		});
	}

	async hasFailedSteps(executionId: string): Promise<boolean> {
		return await this.repo.exists({ where: { executionId, status: 'failed' } });
	}
}

const CREATION_STATUSES: readonly StepStatus[] = ['queued', 'completed', 'skipped'];

/**
 * Re-checks `NewStepRecord`'s union at runtime for callers outside the type
 * system. The widened parameter keeps the checks from narrowing to `never`.
 */
function assertCreatableRecord(record: {
	nodeId: string;
	status: StepStatus;
	outputs?: StepSlots;
}): void {
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
