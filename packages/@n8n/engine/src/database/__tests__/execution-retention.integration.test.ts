import type { DataSource } from '@n8n/typeorm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import postgresVersions from 'n8n-containers/postgres-versions.json';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { ExecutionNotFoundError, type PrunableExecution } from '../../execution/execution-store';
import {
	SETTLED_STEP_STATUSES,
	type ExecutionStatus,
	type ParentLink,
	type StepStatus,
} from '../../execution/execution.types';
import { createStores } from '../create-stores';
import { createDataSource } from '../data-source';
import { WorkflowExecution } from '../entities/workflow-execution.entity';
import { generateId } from '../generate-id';
import { TypeOrmExecutionStore } from '../typeorm-execution-store';

const DAY_MS = 24 * 60 * 60 * 1000;
const LONG_AGO = new Date('2020-01-01T00:00:00.000Z');

describe('execution retention (integration)', () => {
	let container: StartedPostgreSqlContainer;
	let dataSource: DataSource;
	let store: TypeOrmExecutionStore;

	beforeAll(async () => {
		container = await new PostgreSqlContainer(postgresVersions.primary).start();
		dataSource = createDataSource(container.getConnectionUri());
		await dataSource.initialize();
		await dataSource.runMigrations();
		store = new TypeOrmExecutionStore(dataSource.getRepository(WorkflowExecution));
	}, 120_000);

	afterAll(async () => {
		if (dataSource?.isInitialized) await dataSource.destroy();
		if (container) await container.stop();
	});

	beforeEach(async () => {
		await dataSource.query('TRUNCATE workflow_execution CASCADE');
	});

	async function addExecution({
		status = 'completed',
		finishedAt = LONG_AGO,
		parent = null,
	}: { status?: ExecutionStatus; finishedAt?: Date | null; parent?: ParentLink | null } = {}) {
		const id = generateId();
		await dataSource.query(
			`INSERT INTO workflow_execution
				(id, workflow_id, status, mode, graph, workflow, caller_context, response_expectation,
				 parent_execution_id, parent_step_id, parent_awaited, finished_at)
			 VALUES ($1, 'wf-1', $2, 'production', '{}', '{}', '{"hostMode":"trigger"}', '{"kind":"none"}',
				$3, $4, $5, $6)`,
			[id, status, parent?.executionId, parent?.stepId, parent?.awaited, finishedAt],
		);
		return id;
	}

	async function addStep(executionId: string, status: StepStatus) {
		const id = generateId();
		await dataSource.query(
			`INSERT INTO workflow_step_execution (id, execution_id, node_id, status)
			 VALUES ($1, $2, $3, $4)`,
			[id, executionId, id, status],
		);
		return id;
	}

	async function prunableIds() {
		const rows = await store.findPrunableExecutions({ maxAgeMs: DAY_MS, limit: 100 });
		return rows.map((row) => row.id);
	}

	async function countRows(table: string, column: string, ids: string[]) {
		const [{ count }]: Array<{ count: number }> = await dataSource.query(
			`SELECT count(*)::int AS count FROM ${table} WHERE ${column} = ANY($1)`,
			[ids],
		);
		return count;
	}

	it('has a partial index on the finish time and the id of ended executions', async () => {
		const [index]: Array<{ indexdef: string }> = await dataSource.query(
			`SELECT indexdef FROM pg_indexes
			 WHERE tablename = 'workflow_execution' AND indexname = 'idx_workflow_execution_finished_at_id'`,
		);

		expect(index.indexdef).toContain('(finished_at, id)');
		expect(index.indexdef).toContain('WHERE (finished_at IS NOT NULL)');
	});

	describe('findPrunableExecutions', () => {
		it.each<ExecutionStatus>(['completed', 'failed', 'cancelled'])(
			'selects a %s execution that finished before the window',
			async (status) => {
				const id = await addExecution({ status });

				const rows = await store.findPrunableExecutions({ maxAgeMs: DAY_MS, limit: 100 });

				expect(rows).toEqual([{ id, workflowId: 'wf-1', finishedAt: LONG_AGO }]);
			},
		);

		it('does not select an ended execution that finished inside the window', async () => {
			await addExecution({ finishedAt: new Date() });

			expect(await prunableIds()).toEqual([]);
		});

		it.each<ExecutionStatus>(['queued', 'running', 'waiting'])(
			'does not select a %s execution however old its finish time is',
			async (status) => {
				await addExecution({ status });

				expect(await prunableIds()).toEqual([]);
			},
		);

		it.each(SETTLED_STEP_STATUSES)(
			'selects an ended execution whose only step is %s',
			async (stepStatus) => {
				const id = await addExecution();
				await addStep(id, stepStatus);

				expect(await prunableIds()).toEqual([id]);
			},
		);

		it.each<StepStatus>(['queued', 'running', 'waiting'])(
			'does not select an ended execution that still has a %s step',
			async (stepStatus) => {
				const id = await addExecution({ status: 'cancelled' });
				await addStep(id, 'completed');
				await addStep(id, stepStatus);

				expect(await prunableIds()).toEqual([]);
			},
		);

		it.each<{
			title: string;
			awaited: boolean;
			parentStepStatus: StepStatus;
			parentDeleted: boolean;
			selected: boolean;
		}>([
			{
				title: 'does not select an awaited sub-execution while its parent step waits',
				awaited: true,
				parentStepStatus: 'waiting',
				parentDeleted: false,
				selected: false,
			},
			{
				title: 'selects an awaited sub-execution once its parent step no longer waits',
				awaited: true,
				parentStepStatus: 'completed',
				parentDeleted: false,
				selected: true,
			},
			{
				title: 'selects an awaited sub-execution whose parent no longer exists',
				awaited: true,
				parentStepStatus: 'waiting',
				parentDeleted: true,
				selected: true,
			},
			{
				title: 'selects a sub-execution that is not awaited while its parent step waits',
				awaited: false,
				parentStepStatus: 'waiting',
				parentDeleted: false,
				selected: true,
			},
		])('$title', async ({ awaited, parentStepStatus, parentDeleted, selected }) => {
			const parentId = await addExecution({ status: 'waiting', finishedAt: null });
			const stepId = await addStep(parentId, parentStepStatus);
			const childId = await addExecution({ parent: { executionId: parentId, stepId, awaited } });
			if (parentDeleted) {
				await dataSource.query('DELETE FROM workflow_execution WHERE id = $1', [parentId]);
			}

			expect(await prunableIds()).toEqual(selected ? [childId] : []);
		});

		it('returns every row once, oldest first, across batches that share a finish time', async () => {
			const at = (second: number) => new Date(`2020-01-01T00:00:0${second}.000Z`);
			const ids = await Promise.all(
				[3, 1, 2, 2, 2].map(async (second) => ({
					id: await addExecution({ finishedAt: at(second) }),
					finishedAt: at(second),
				})),
			);
			const expected = [...ids]
				.sort((a, b) => a.finishedAt.getTime() - b.finishedAt.getTime() || (a.id < b.id ? -1 : 1))
				.map(({ id }) => id);

			const seen: string[] = [];
			let after: PrunableExecution | undefined;
			for (;;) {
				const batch = await store.findPrunableExecutions({ maxAgeMs: DAY_MS, limit: 2, after });
				if (batch.length === 0) break;
				seen.push(...batch.map((row) => row.id));
				after = batch.at(-1);
			}

			expect(seen).toEqual(expected);
		});
	});

	describe('deleteEndedExecutions', () => {
		it('deletes an execution together with its step rows and its seeded rows', async () => {
			const id = await addExecution();
			await addStep(id, 'completed');
			await dataSource.query(
				`INSERT INTO workflow_seeded_step (execution_id, node_id, iteration, outputs)
				 VALUES ($1, 'seeded', 0, '{}')`,
				[id],
			);

			expect(await store.deleteEndedExecutions([id])).toBe(1);
			expect(await countRows('workflow_execution', 'id', [id])).toBe(0);
			expect(await countRows('workflow_step_execution', 'execution_id', [id])).toBe(0);
			expect(await countRows('workflow_seeded_step', 'execution_id', [id])).toBe(0);
		});

		it('does not delete an execution that has not ended, even when its id is passed', async () => {
			const live = await Promise.all(
				(['queued', 'running', 'waiting'] as const).map(
					async (status) => await addExecution({ status }),
				),
			);
			const ended = await addExecution();

			expect(await store.deleteEndedExecutions([...live, ended])).toBe(1);
			expect(await countRows('workflow_execution', 'id', live)).toBe(3);
		});

		it('leaves a late queue message of a deleted execution nothing to claim and no execution to load', async () => {
			const id = await addExecution({ status: 'cancelled' });
			const stepId = await addStep(id, 'queued');
			const { stepStore } = createStores(dataSource);

			expect(await store.deleteEndedExecutions([id])).toBe(1);

			expect(await store.transitionStatus(id, 'queued', 'running')).toBe(false);
			expect(await stepStore.claimStep(stepId)).toBeNull();
			const loadError: unknown = await store.loadExecution(id).catch((error: unknown) => error);
			expect(loadError).toBeInstanceOf(ExecutionNotFoundError);
			expect(loadError).toHaveProperty('executionId', id);
		});

		it('deletes nothing for an empty list', async () => {
			const id = await addExecution();

			expect(await store.deleteEndedExecutions([])).toBe(0);
			expect(await countRows('workflow_execution', 'id', [id])).toBe(1);
		});

		it('lets two overlapping passes delete the same execution: the second deletes nothing', async () => {
			const id = await addExecution();
			const [first, second] = await Promise.all([prunableIds(), prunableIds()]);
			expect(first).toEqual([id]);
			expect(second).toEqual([id]);

			const deleted = await Promise.all([
				store.deleteEndedExecutions(first),
				store.deleteEndedExecutions(second),
			]);

			expect(deleted.sort()).toEqual([0, 1]);
		});
	});
});
