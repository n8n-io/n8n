import { mockLogger, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { SchedulerConfig } from '@n8n/config';
import { DbLockService, StatisticsNames, WorkflowStatisticsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { sleep } from '@n8n/utils/sleep';
import { mock } from 'vitest-mock-extended';
import type { ErrorReporter } from 'n8n-core';
import { OperationalError } from 'n8n-workflow';

import type { WorkflowStatisticsService } from '@/services/workflow-statistics.service';
import { WorkflowStatisticsRollupService } from '@/services/workflow-statistics-rollup.service';
import { WorkflowStatisticsRollupTask } from '@/services/workflow-statistics-rollup.task';

const isPostgres = process.env.DB_TYPE === 'postgresdb';

const OVERLAPPING_RUNS = 4;
const WORKFLOW_IDS = ['wf-rollup-1', 'wf-rollup-2', 'wf-rollup-3'];
/** More than one 5000-row batch in total, so the runs contend for several folds. */
const ROWS_PER_WORKFLOW = 2_000;
const LOCK_SKIP_TIMEOUT_MS = 5_000;

/** The delta table exists on Postgres only. */
describe.skipIf(!isPostgres)('WorkflowStatisticsRollupTask', () => {
	const signal = new AbortController().signal;
	let repository: WorkflowStatisticsRepository;
	let statisticsService: ReturnType<typeof mock<WorkflowStatisticsService>>;
	let task: WorkflowStatisticsRollupTask;
	let deltaTable: string;

	beforeAll(async () => {
		// One connection per run, so a run can meet the lock that another run holds.
		Container.get(GlobalConfig).database.postgresdb.poolSize = OVERLAPPING_RUNS;
		await testDb.init();
		repository = Container.get(WorkflowStatisticsRepository);
		deltaTable = `${Container.get(GlobalConfig).database.tablePrefix}workflow_statistics_delta`;
	});

	beforeEach(() => {
		statisticsService = mock<WorkflowStatisticsService>();
		task = new WorkflowStatisticsRollupTask(
			new WorkflowStatisticsRollupService(
				mockLogger(),
				mock<ErrorReporter>(),
				Container.get(DbLockService),
				repository,
				statisticsService,
			),
			mock<SchedulerConfig>({ leaseDurationSeconds: 60 }),
		);
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await testDb.truncate(['WorkflowStatistics', 'WorkflowStatisticsDelta']);
	});

	afterAll(async () => await testDb.terminate());

	async function seedIncrements(): Promise<void> {
		for (const workflowId of WORKFLOW_IDS) {
			await repository.query(
				`INSERT INTO ${deltaTable} ("workflowId", "name", "rootCountDelta", "workflowName")
				 SELECT $1, $2, 1, 'wf' FROM generate_series(1, $3)`,
				[workflowId, StatisticsNames.productionSuccess, ROWS_PER_WORKFLOW],
			);
		}
	}

	async function pendingIncrements(): Promise<number> {
		const [{ count }]: Array<{ count: number }> = await repository.query(
			`SELECT COUNT(*)::int AS count FROM ${deltaTable}`,
		);
		return count;
	}

	/** Holds the first fold inside the lock until another run is refused the lock, or a timeout passes. */
	function holdFirstFoldUntilLockSkip(): { lockSkips: () => number } {
		const dbLockService = Container.get(DbLockService);
		const tryWithLock = dbLockService.tryWithLock.bind(dbLockService);
		const rollupIncrements = repository.rollupIncrements.bind(repository);
		let lockSkips = 0;
		let onLockSkip = () => {};
		const lockSkipped = new Promise<void>((resolve) => {
			onLockSkip = resolve;
		});

		vi.spyOn(dbLockService, 'tryWithLock').mockImplementation(async (lockId, fn, options) => {
			try {
				return await tryWithLock(lockId, fn, options);
			} catch (error) {
				if (error instanceof OperationalError) {
					lockSkips++;
					onLockSkip();
				}
				throw error;
			}
		});
		vi.spyOn(repository, 'rollupIncrements').mockImplementationOnce(async (tx, batchSize) => {
			await Promise.race([lockSkipped, sleep(LOCK_SKIP_TIMEOUT_MS)]);
			return await rollupIncrements(tx, batchSize);
		});

		return { lockSkips: () => lockSkips };
	}

	it('should fold each increment once and fire each milestone once when runs overlap', async () => {
		await seedIncrements();
		const { lockSkips } = holdFirstFoldUntilLockSkip();

		await Promise.all(
			Array.from(
				{ length: OVERLAPPING_RUNS },
				async () => await task.run(signal, { durable: true }),
			),
		);
		expect(lockSkips()).toBeGreaterThan(0);
		// A run that lost the lock stops early, so finish any backlog it left.
		while ((await pendingIncrements()) > 0) {
			await task.run(signal, { durable: true });
		}

		const counters = await repository.findBy({ name: StatisticsNames.productionSuccess });
		expect(
			counters.map(({ workflowId, count, rootCount }) => ({ workflowId, count, rootCount })),
		).toEqual(
			expect.arrayContaining(
				WORKFLOW_IDS.map((workflowId) => ({
					workflowId,
					count: ROWS_PER_WORKFLOW,
					rootCount: ROWS_PER_WORKFLOW,
				})),
			),
		);
		expect(counters).toHaveLength(WORKFLOW_IDS.length);

		const milestoneWorkflowIds = statisticsService.emitFirstOccurrenceEvent.mock.calls.map(
			([, workflowId]) => workflowId,
		);
		expect(milestoneWorkflowIds.sort()).toEqual([...WORKFLOW_IDS].sort());
	});
});
