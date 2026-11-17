import { In, type EntityManager } from '@n8n/typeorm';

import {
	fromSqliteDatetime,
	fromSqliteJson,
	toSqliteDatetime,
	toSqliteJson,
} from './sqlite-values';
import { WorkflowStepExecution } from '../entities';
import { generateId } from '../generate-id';
import {
	isLiveExecutionStatus,
	stepKeyId,
	type ExecutionStatus,
	type ResumeCause,
	type StepError,
	type StepKey,
	type StepKeyId,
	type StepSlots,
	type StepStatus,
	type WaitDeclaration,
} from '../../execution/execution.types';
import type { DueStep, NewStepRecord, StepRecord, StepSummary } from '../../execution/step-store';
import { TypeOrmStepStore, assertCreatableRecord } from '../typeorm-step-store';

type ClaimedStepRow = {
	id: string;
	execution_id: string;
	node_id: string;
	iteration: number;
	wait_declaration: string | null;
	resume_cause: string | null;
};

type SummaryRow = {
	id: string;
	node_id: string;
	iteration: number;
	status: StepStatus;
	outputs: string | null;
};

/**
 * `StepStore` on SQLite.
 *
 * Postgres serializes the transitions that must not interleave (`createSteps`
 * and `claimStep` against `failStep`) with row locks. SQLite has one writer:
 * every write transaction opens `BEGIN IMMEDIATE`, which takes the database's
 * single write lock, so two of these transactions never interleave at all.
 * Each method that locked a row in Postgres is a plain transaction here, and
 * each `RETURNING` is a read inside that same transaction.
 */
export class SqliteStepStore extends TypeOrmStepStore {
	async createSteps(
		executionId: string,
		records: NewStepRecord[],
	): Promise<Array<{ id: string } & StepKey>> {
		if (records.length === 0) return [];
		for (const record of records) assertCreatableRecord(record);

		return await this.repo.manager.transaction(async (manager) => {
			if (await this.hasFailed(manager, executionId)) return [];

			const rows = records.map((record) => ({ ...record, id: generateId() }));
			for (const row of rows) {
				// `OR IGNORE` is the unique key doing its job: a step another planner
				// already created is skipped, and the rest of the batch lands.
				await manager.query(
					`INSERT OR IGNORE INTO workflow_step_execution
					 (id, execution_id, node_id, iteration, status, outputs, stale_after)
					 VALUES (?, ?, ?, ?, ?, ?, ?)`,
					[
						row.id,
						executionId,
						row.nodeId,
						row.iteration,
						row.status,
						toSqliteJson(row.outputs),
						staleAfterText(this.staleAfterFor(row.status)),
					],
				);
			}
			const inserted = await manager.query<Array<{ id: string }>>(
				`SELECT id FROM workflow_step_execution WHERE id IN (${rows.map(() => '?').join(', ')})`,
				rows.map((row) => row.id),
			);
			const landed = new Set(inserted.map((row) => row.id));
			return rows
				.filter((row) => landed.has(row.id))
				.map(({ id, nodeId, iteration }) => ({ id, nodeId, iteration }));
		});
	}

	async claimStep(id: string): Promise<StepRecord | null> {
		return await this.repo.manager.transaction(async (manager) => {
			const [step] = await manager.query<Array<{ execution_id: string }>>(
				'SELECT execution_id FROM workflow_step_execution WHERE id = ?',
				[id],
			);
			if (!step || (await this.hasFailed(manager, step.execution_id))) return null;

			const claimed = await this.transition(id, 'queued', 'running', {}, manager);
			if (!claimed) return null;

			const [row] = await manager.query<ClaimedStepRow[]>(
				`SELECT id, execution_id, node_id, iteration, wait_declaration, resume_cause
				 FROM workflow_step_execution WHERE id = ?`,
				[id],
			);
			return {
				id: row.id,
				executionId: row.execution_id,
				nodeId: row.node_id,
				iteration: row.iteration,
				status: 'running',
				outputs: null,
				waitDeclaration: fromSqliteJson<WaitDeclaration>(row.wait_declaration),
				resumeCause: fromSqliteJson<ResumeCause>(row.resume_cause),
			};
		});
	}

	async suspendStep(id: string, waitDeclaration: WaitDeclaration): Promise<boolean> {
		return await this.repo.manager.transaction(async (manager) => {
			const [execution] = await manager.query<Array<{ status: ExecutionStatus }>>(
				`SELECT status FROM workflow_execution
				 WHERE id = (SELECT execution_id FROM workflow_step_execution WHERE id = ?)`,
				[id],
			);
			if (!execution) return false;

			if (!isLiveExecutionStatus(execution.status)) {
				await this.transition(id, 'running', 'cancelled', {}, manager);
				return false;
			}

			return await this.transition(
				id,
				'running',
				'waiting',
				{
					waitDeclaration,
					waitTill:
						waitDeclaration.resumeAt === undefined ? null : new Date(waitDeclaration.resumeAt),
				},
				manager,
			);
		});
	}

	async resumeDueSteps(due: Date, limit: number): Promise<DueStep[]> {
		return await this.repo.manager.transaction(async (manager) => {
			const rows = await manager.query<Array<{ id: string; execution_id: string }>>(
				`SELECT id, execution_id FROM workflow_step_execution
				 WHERE status = 'waiting' AND wait_till <= ?
				 ORDER BY wait_till
				 LIMIT ?`,
				[toSqliteDatetime(due), limit],
			);
			if (rows.length === 0) return [];
			await manager.update(
				WorkflowStepExecution,
				{ id: In(rows.map((row) => row.id)), status: 'waiting' },
				{
					status: 'queued',
					resumeCause: { kind: 'deadline' },
					staleAfter: this.staleAfterFor('queued'),
				},
			);
			return rows.map(({ id, execution_id: executionId }) => ({ id, executionId }));
		});
	}

	async nextWaitDeadline(): Promise<Date | null> {
		const [row] = await this.repo
			.createQueryBuilder('step')
			.select('MIN(step.wait_till)', 'next')
			.where("step.status = 'waiting'")
			.andWhere('step.wait_till IS NOT NULL')
			.getRawMany<{ next: string | null }>();
		return fromSqliteDatetime(row?.next);
	}

	protected async failStepFrom(from: StepStatus, id: string, error: StepError): Promise<boolean> {
		// A transaction is the lock: it is the one writer while it runs, so a
		// planning insert or a claim lands before this failure or after it.
		return await this.repo.manager.transaction(
			async (manager) => await this.transition(id, from, 'failed', { error }, manager),
		);
	}

	async loadStepSummariesByKeys(
		executionId: string,
		keys: StepKey[],
	): Promise<Record<StepKeyId, StepSummary>> {
		if (keys.length === 0) return {};
		const tuples = keys.map(() => '(?, ?)').join(', ');
		const rows = await this.repo.manager.query<SummaryRow[]>(
			`SELECT id, node_id, iteration, status, outputs FROM workflow_step_execution
			 WHERE execution_id = ? AND (node_id, iteration) IN (${tuples})`,
			[executionId, ...keys.flatMap(({ nodeId, iteration }) => [nodeId, iteration])],
		);
		return Object.fromEntries(rows.map((row) => [stepKeyId(toSummary(row)), toSummary(row)]));
	}

	async loadLatestStepSummaries(
		executionId: string,
		nodeIds: string[],
	): Promise<Record<string, StepSummary>> {
		if (nodeIds.length === 0) return {};
		// SQLite's bare-column rule: with `MAX(iteration)` in the select, the
		// other columns come from the row that holds that maximum.
		const rows = await this.repo.manager.query<SummaryRow[]>(
			`SELECT id, node_id, MAX(iteration) AS iteration, status, outputs
			 FROM workflow_step_execution
			 WHERE execution_id = ? AND node_id IN (${nodeIds.map(() => '?').join(', ')})
			 GROUP BY node_id`,
			[executionId, ...nodeIds],
		);
		return Object.fromEntries(rows.map((row) => [row.node_id, toSummary(row)]));
	}

	private async hasFailed(manager: EntityManager, executionId: string): Promise<boolean> {
		const [failed] = await manager.query<Array<{ id: string }>>(
			"SELECT id FROM workflow_step_execution WHERE execution_id = ? AND status = 'failed' LIMIT 1",
			[executionId],
		);
		return failed !== undefined;
	}
}

function staleAfterText(value: Date | null): string | null {
	return value === null ? null : toSqliteDatetime(value);
}

/** The slot booleans Postgres computes in SQL, computed here from the row. */
function toSummary(row: SummaryRow): StepSummary {
	const outputs = fromSqliteJson<StepSlots>(row.outputs);
	return {
		id: row.id,
		nodeId: row.node_id,
		iteration: row.iteration,
		status: row.status,
		filledOutputSlots: (outputs ?? []).map((slot) => slot !== null),
	};
}
