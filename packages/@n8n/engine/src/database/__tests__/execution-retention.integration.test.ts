import type { DataSource } from '@n8n/typeorm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import postgresVersions from 'n8n-containers/postgres-versions.json';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ExecutionFileCleanup } from '../../execution/execution-file-cleanup';
import { ExecutionNotFoundError, type PrunableExecution } from '../../execution/execution-store';
import {
	SETTLED_STEP_STATUSES,
	type ExecutionStatus,
	type ParentLink,
	type StepStatus,
} from '../../execution/execution.types';
import { RetentionSweeper } from '../../retention/retention-sweeper';
import { createStores } from '../create-stores';
import { createDataSource } from '../data-source';
import { WorkflowExecution } from '../entities/workflow-execution.entity';
import { generateId } from '../generate-id';
import { TypeOrmExecutionStore } from '../typeorm-execution-store';

const DAY_MS = 24 * 60 * 60 * 1000;
const LONG_AGO = new Date('2020-01-01T00:00:00.000Z');
const secondsAgo = (seconds: number) => new Date(Date.now() - seconds * 1000);

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

	async function prunableIds(maxCount?: number) {
		const countCutoff = maxCount ? await store.findRetentionCountCutoff(maxCount) : undefined;
		const rows = await store.findPrunableExecutions({ maxAgeMs: DAY_MS, limit: 100, countCutoff });
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
			'does not select a %s execution however old its finish time is, by age or by count',
			async (status) => {
				await addExecution({ status });
				await addExecution({ finishedAt: secondsAgo(1) });

				expect(await prunableIds()).toEqual([]);
				expect(await prunableIds(1)).toEqual([]);
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
			maxCount?: number;
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
			{
				title:
					'does not select an awaited sub-execution beyond the count limit while its parent step waits',
				awaited: true,
				parentStepStatus: 'waiting',
				parentDeleted: false,
				selected: false,
				maxCount: 1,
			},
			{
				title:
					'selects an awaited sub-execution beyond the count limit once its parent step no longer waits',
				awaited: true,
				parentStepStatus: 'completed',
				parentDeleted: false,
				selected: true,
				maxCount: 1,
			},
		])('$title', async ({ awaited, parentStepStatus, parentDeleted, selected, maxCount }) => {
			const parentId = await addExecution({ status: 'waiting', finishedAt: null });
			const stepId = await addStep(parentId, parentStepStatus);
			const childId = await addExecution({
				parent: { executionId: parentId, stepId, awaited },
				finishedAt: maxCount ? secondsAgo(2) : LONG_AGO,
			});
			if (maxCount) await addExecution({ finishedAt: secondsAgo(1) });
			if (parentDeleted) {
				await dataSource.query('DELETE FROM workflow_execution WHERE id = $1', [parentId]);
			}

			expect(await prunableIds(maxCount)).toEqual(selected ? [childId] : []);
		});

		it.each([
			{ rule: 'the age rule', start: LONG_AGO, maxCount: 0, kept: 0 },
			{ rule: 'the count rule', start: new Date(Date.now() - 60_000), maxCount: 2, kept: 2 },
		])(
			'returns every selected row once, oldest first, across batches that share a finish time, under $rule',
			async ({ start, maxCount, kept }) => {
				const at = (second: number) => new Date(start.getTime() + second * 1000);
				const ids = await Promise.all(
					[3, 1, 2, 2, 2].map(async (second) => ({
						id: await addExecution({ finishedAt: at(second) }),
						finishedAt: at(second),
					})),
				);
				const expected = [...ids]
					.sort((a, b) => a.finishedAt.getTime() - b.finishedAt.getTime() || (a.id < b.id ? -1 : 1))
					.map(({ id }) => id)
					.slice(0, ids.length - kept);

				const countCutoff = maxCount ? await store.findRetentionCountCutoff(maxCount) : undefined;
				const seen: string[] = [];
				let after: PrunableExecution | undefined;
				for (;;) {
					const batch = await store.findPrunableExecutions({
						maxAgeMs: DAY_MS,
						limit: 2,
						after,
						countCutoff,
					});
					if (batch.length === 0) break;
					seen.push(...batch.map((row) => row.id));
					after = batch.at(-1);
				}

				expect(seen).toEqual(expected);
			},
		);

		describe('with a count limit', () => {
			it('keeps the newest maxCount ended executions inside the window and selects the older ones, oldest first', async () => {
				const oldest = await addExecution({ finishedAt: secondsAgo(4) });
				const older = await addExecution({ finishedAt: secondsAgo(3) });
				await addExecution({ finishedAt: secondsAgo(2) });
				await addExecution({ finishedAt: secondsAgo(1) });

				expect(await prunableIds(2)).toEqual([oldest, older]);
			});

			it('still selects an execution that finished before the window when it is among the newest maxCount', async () => {
				const oldest = await addExecution();
				const old = await addExecution({ finishedAt: new Date(LONG_AGO.getTime() + 1000) });
				await addExecution({ finishedAt: secondsAgo(1) });

				expect(await prunableIds(2)).toEqual([oldest, old]);
			});

			it('counts an ended execution that it skips for an unsettled step toward the newest maxCount', async () => {
				const oldest = await addExecution({ finishedAt: secondsAgo(4) });
				const older = await addExecution({ finishedAt: secondsAgo(3) });
				await addExecution({ finishedAt: secondsAgo(2) });
				const withRunningStep = await addExecution({
					status: 'cancelled',
					finishedAt: secondsAgo(1),
				});
				await addStep(withRunningStep, 'running');

				expect(await prunableIds(2)).toEqual([oldest, older]);
			});

			it('does not count an execution that has not ended toward the newest maxCount', async () => {
				const older = await addExecution({ finishedAt: secondsAgo(3) });
				await addExecution({ finishedAt: secondsAgo(2) });
				await addExecution({ finishedAt: secondsAgo(1) });
				await addExecution({ status: 'running', finishedAt: null });

				expect(await prunableIds(2)).toEqual([older]);
			});
		});
	});

	describe('findRetentionCountCutoff', () => {
		it('gives the newest ended execution beyond the newest maxCount, and nothing when there are maxCount or fewer', async () => {
			const finishedAt = secondsAgo(3);
			const oldest = await addExecution({ finishedAt });
			await addExecution({ finishedAt: secondsAgo(2) });
			await addExecution({ status: 'running', finishedAt: null });
			await addExecution({ finishedAt: secondsAgo(1) });

			expect(await store.findRetentionCountCutoff(2)).toEqual({ id: oldest, finishedAt });
			expect(await store.findRetentionCountCutoff(3)).toBeUndefined();
		});
	});

	describe('a RetentionSweeper pass on this store', () => {
		async function addExecutions() {
			const older: string[] = [];
			for (const seconds of [10, 9, 8, 7]) {
				const id = await addExecution({ finishedAt: secondsAgo(seconds) });
				await addStep(id, 'completed');
				older.push(id);
			}
			const withRunningStep = await addExecution({
				status: 'cancelled',
				finishedAt: secondsAgo(6),
			});
			await addStep(withRunningStep, 'running');
			const kept = [withRunningStep];
			for (const status of ['running', 'waiting'] as const) {
				kept.push(await addExecution({ status, finishedAt: null }));
			}
			for (const seconds of [3, 2, 1]) {
				kept.push(await addExecution({ finishedAt: secondsAgo(seconds) }));
			}
			return { older, kept };
		}

		/** Runs one pass: it waits for the batch that is not full, which is the last one. */
		async function sweep(maxCount: number) {
			const deleteFiles = vi.fn(async () => {});
			const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };
			const findPrunable = vi.spyOn(store, 'findPrunableExecutions');
			const policy = { maxAgeMs: DAY_MS, maxCount, intervalMs: 60_000, batchSize: 2 };
			const cleanup = new ExecutionFileCleanup(deleteFiles, logger);
			const sweeper = new RetentionSweeper(store, cleanup, policy, logger, () => 0);

			sweeper.start();
			try {
				await vi.waitFor(
					() => {
						expect(logger.error).not.toHaveBeenCalled();
						const results = findPrunable.mock.settledResults;
						expect(results.some((r) => r.type === 'fulfilled' && r.value.length < 2)).toBe(true);
					},
					{ timeout: 5_000 },
				);
			} finally {
				await sweeper.stop();
			}
			return { deleteFiles };
		}

		it('keeps the newest maxCount ended executions and every execution with work left, and deletes the older ones with their steps', async () => {
			const { older, kept } = await addExecutions();

			await sweep(3);

			expect(await countRows('workflow_execution', 'id', older)).toBe(0);
			expect(await countRows('workflow_step_execution', 'execution_id', older)).toBe(0);
			expect(await countRows('workflow_execution', 'id', kept)).toBe(kept.length);
		});

		it('deletes no execution inside the age window when maxCount is 0', async () => {
			const { older, kept } = await addExecutions();

			const { deleteFiles } = await sweep(0);

			expect(deleteFiles).not.toHaveBeenCalled();
			expect(await countRows('workflow_execution', 'id', [...older, ...kept])).toBe(
				older.length + kept.length,
			);
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
