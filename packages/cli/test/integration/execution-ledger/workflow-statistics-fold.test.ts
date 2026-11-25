import { createTeamProject, createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import { EventService, ExecutionLedger } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import type { ExecutionLedgerFoldStep, Project, WorkflowEntity } from '@n8n/db';
import {
	FoldStepRegistry,
	FoldTransactionLostError,
	StatisticsNames,
	WorkflowStatisticsRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { sleep } from '@n8n/utils/sleep';
import type {
	ExecutionStatus,
	IRun,
	Workflow,
	WorkflowExecuteMode,
	WorkflowExecutionSource,
} from 'n8n-workflow';
import {
	createEmptyRunExecutionData,
	createRunExecutionData,
	NodeOperationError,
} from 'n8n-workflow';

import { ExecutionLedgerModule } from '@n8n/backend-module-execution-ledger/module';
import {
	claimAllLedgerRows,
	foldAllLedgerRows,
} from '@n8n/backend-module-execution-ledger/testing';
import {
	getLifecycleHooksForRegularMain,
	getLifecycleHooksForSubExecutions,
} from '@/execution-lifecycle/execution-lifecycle-hooks';
import { ExecutionCrashService } from '@/executions/execution-crash.service';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { ExecutionService } from '@/executions/execution.service';
import { packagedModules } from '@/modules/modules.manifest';
import { WorkflowStatisticsFoldStep } from '@/services/workflow-statistics.fold-step';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';

import { findWorkflowStatistics, useWorkflowStatisticsEvents } from '../shared/workflow-statistics';
import { createSimpleWorkflowFixture } from '../shared/workflow-fixtures';

type Counters = Partial<Record<StatisticsNames, { count: number; rootCount: number }>>;

describe('workflow statistics fold step', () => {
	useWorkflowStatisticsEvents();

	let project: Project;
	let workflow: WorkflowEntity;
	let failNextFold = false;

	/** Loses the fold transaction, so the fold rolls the counters back. */
	const failingStep: ExecutionLedgerFoldStep = {
		name: 'test_failing_step',
		fold: async () => {
			if (failNextFold) throw new FoldTransactionLostError('test', undefined, undefined);
			return undefined;
		},
	};

	beforeAll(async () => {
		await testModules.loadModules(['execution-ledger'], packagedModules);
		await testDb.init();
		await new ExecutionLedgerModule().init();
		Container.get(WorkflowStatisticsService);

		const registry = Container.get(FoldStepRegistry);
		registry.register(Container.get(WorkflowStatisticsFoldStep));
		registry.register(failingStep);
	});

	beforeEach(async () => {
		failNextFold = false;
		await testDb.truncate([
			'WorkflowStatistics',
			'ExecutionEntity',
			'WorkflowEntity',
			'Project',
			'Settings',
		]);
		await claimAllLedgerRows();
		project = await createTeamProject('Ledger project');
		workflow = await createWorkflow(
			{
				name: 'Ledger workflow',
				...createSimpleWorkflowFixture(),
				settings: { saveDataSuccessExecution: 'all', saveDataErrorExecution: 'all' },
			},
			project,
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	const createExecution = async (
		mode: WorkflowExecuteMode,
		{
			status = 'running',
			source,
		}: { status?: 'running' | 'new'; source?: WorkflowExecutionSource } = {},
	) =>
		await Container.get(ExecutionPersistence).create(
			{
				workflowId: workflow.id,
				data: createEmptyRunExecutionData(),
				workflowData: workflow,
				mode,
				status,
				finished: false,
				...(status === 'running' ? { startedAt: new Date() } : {}),
			},
			{},
			{ source },
		);

	const finishedRun = (status: ExecutionStatus, mode: WorkflowExecuteMode): IRun => ({
		data: createRunExecutionData({ resultData: { runData: {} } }),
		mode,
		status,
		finished: status === 'success',
		startedAt: new Date(Date.now() - 1_000),
		stoppedAt: new Date(),
		storedAt: 'db',
	});

	const finish = async (
		mode: WorkflowExecuteMode,
		status: ExecutionStatus,
		{
			source,
			failedBeforeStart,
		}: { source?: WorkflowExecutionSource; failedBeforeStart?: 'policy' } = {},
	) => {
		const executionId = await createExecution(mode, { source });
		const hooks =
			mode === 'integrated'
				? getLifecycleHooksForSubExecutions(mode, executionId, workflow)
				: getLifecycleHooksForRegularMain(
						{ executionMode: mode, workflowData: workflow, source },
						executionId,
					);
		const run = finishedRun(status, mode);
		if (failedBeforeStart) run.data.resultData.failedBeforeStart = failedBeforeStart;
		await hooks.runHook('workflowExecuteAfter', [run, {}]);
	};

	const toCounters = (rows: Awaited<ReturnType<typeof findWorkflowStatistics>>): Counters =>
		Object.fromEntries(rows.map(({ name, count, rootCount }) => [name, { count, rootCount }]));

	/** The counters as stored now. It does not fold the old delta table. */
	const storedCounters = async () =>
		toCounters(
			await Container.get(WorkflowStatisticsRepository).findBy({ workflowId: workflow.id }),
		);

	/** The ledger writes its rows in the background, so fold until the counters are complete. */
	const foldUntil = async (expected: Counters) =>
		await vi.waitFor(
			async () => {
				await foldAllLedgerRows();
				expect(await storedCounters()).toEqual(expected);
			},
			{ timeout: 10_000, interval: 50 },
		);

	const milestoneEvents = () => {
		const emit = vi.spyOn(Container.get(EventService), 'emit');
		return () =>
			emit.mock.calls
				.map(([eventName]) => eventName)
				.filter((eventName) => eventName === 'first-production-workflow-succeeded');
	};

	describe('counters', () => {
		it('counts a finished production run once, with its root count', async () => {
			await finish('trigger', 'success');

			await foldUntil({ [StatisticsNames.productionSuccess]: { count: 1, rootCount: 1 } });
		});

		it('adds a later batch to the same counter', async () => {
			await finish('trigger', 'success');
			await foldUntil({ [StatisticsNames.productionSuccess]: { count: 1, rootCount: 1 } });

			await finish('webhook', 'success');
			await finish('integrated', 'success');

			await foldUntil({ [StatisticsNames.productionSuccess]: { count: 3, rootCount: 2 } });
		});

		it('does not count a run until the fold runs', async () => {
			await finish('trigger', 'success');
			await finish('webhook', 'error');

			// Long enough for the old writer to have written, if it still ran.
			await sleep(500);

			expect(await findWorkflowStatistics(workflow.id)).toEqual([]);
		});

		it('counts a run of a workflow with no owner project', async () => {
			const unowned = await createWorkflow({
				name: 'Unowned workflow',
				...createSimpleWorkflowFixture(),
				settings: { saveDataSuccessExecution: 'all' },
			});
			const executionId = await Container.get(ExecutionPersistence).create({
				workflowId: unowned.id,
				data: createEmptyRunExecutionData(),
				workflowData: unowned,
				mode: 'trigger',
				status: 'running',
				finished: false,
				startedAt: new Date(),
			});
			await getLifecycleHooksForRegularMain(
				{ executionMode: 'trigger', workflowData: unowned },
				executionId,
			).runHook('workflowExecuteAfter', [finishedRun('success', 'trigger'), {}]);

			await vi.waitFor(
				async () => {
					await foldAllLedgerRows();
					const counters = await Container.get(WorkflowStatisticsRepository).findBy({
						workflowId: unowned.id,
					});
					expect(toCounters(counters)).toEqual({
						[StatisticsNames.productionSuccess]: { count: 1, rootCount: 1 },
					});
				},
				{ timeout: 10_000, interval: 50 },
			);
		});

		it('gives exact totals when folds overlap', async () => {
			for (let index = 0; index < 5; index++) await finish('trigger', 'success');
			const expected = { [StatisticsNames.productionSuccess]: { count: 5, rootCount: 5 } };

			await vi.waitFor(
				async () => {
					await Promise.all([foldAllLedgerRows(), foldAllLedgerRows(), foldAllLedgerRows()]);
					expect(await storedCounters()).toEqual(expected);
				},
				{ timeout: 10_000, interval: 50 },
			);

			await foldAllLedgerRows();
			expect(await storedCounters()).toEqual(expected);
		});
	});

	describe('first production milestone', () => {
		it('fires once, for the first batch only', async () => {
			const fired = milestoneEvents();

			await finish('trigger', 'success');
			await foldUntil({ [StatisticsNames.productionSuccess]: { count: 1, rootCount: 1 } });
			await finish('trigger', 'success');
			await foldUntil({ [StatisticsNames.productionSuccess]: { count: 2, rootCount: 2 } });

			expect(fired()).toHaveLength(1);
		});

		it('does not fire when the fold rolls back, then fires once on the retry', async () => {
			const fired = milestoneEvents();
			await finish('trigger', 'success');
			// Both rows of the run must be in the table before the failing fold claims them.
			await vi.waitFor(async () => {
				const { rows } = await Container.get(ExecutionLedger).getBacklogStats();
				expect(rows).toBeGreaterThanOrEqual(2);
			});

			failNextFold = true;
			await expect(foldAllLedgerRows()).rejects.toThrow(FoldTransactionLostError);

			expect(await storedCounters()).toEqual({});
			expect(fired()).toHaveLength(0);

			failNextFold = false;
			await foldUntil({ [StatisticsNames.productionSuccess]: { count: 1, rootCount: 1 } });

			expect(fired()).toHaveLength(1);
		});
	});

	describe('parity with the previous writer', () => {
		const runScenarios = async () => {
			await finish('trigger', 'success');
			await finish('webhook', 'success');
			await finish('webhook', 'error');
			await finish('evaluation', 'success');
			await finish('manual', 'success');
			await finish('manual', 'error');
			await finish('integrated', 'success');
			await finish('error', 'success');
			await finish('trigger', 'canceled');
			await finish('trigger', 'error', { failedBeforeStart: 'policy' });
			await finish('trigger', 'success', { source: 'instance_ai' });

			const crashService = Container.get(ExecutionCrashService);
			await crashService.markAsCrashed(await createExecution('trigger'), 'queue-recovery');
			await crashService.markAsCrashedFrom(
				await createExecution('trigger', { status: 'new' }),
				'new',
				'queue-recovery',
			);

			const [node] = workflow.nodes;
			await Container.get(ExecutionService).createErrorExecution(
				new NodeOperationError(node, 'Trigger failed'),
				node,
				workflow,
				{ id: workflow.id } as Workflow,
				'trigger',
			);
		};

		// Hand-written, so a shared mistake in both writers still fails.
		const expected: Counters = {
			[StatisticsNames.productionSuccess]: { count: 5, rootCount: 3 },
			[StatisticsNames.productionError]: { count: 2, rootCount: 2 },
			[StatisticsNames.manualSuccess]: { count: 2, rootCount: 0 },
			[StatisticsNames.manualError]: { count: 1, rootCount: 0 },
		};

		it('writes the same counters from the fold as the previous writer did', async () => {
			// With the module off, no ledger row exists, so the ended hook writes none either.
			const ledger = Container.get(ExecutionLedger);
			vi.spyOn(ledger, 'isEnabled', 'get').mockReturnValue(false);
			vi.spyOn(ledger, 'recordEnded').mockResolvedValue();
			await runScenarios();
			await vi.waitFor(
				async () => expect(toCounters(await findWorkflowStatistics(workflow.id))).toEqual(expected),
				{ timeout: 10_000, interval: 50 },
			);
			vi.restoreAllMocks();
			expect(await claimAllLedgerRows()).toEqual([]);
			await testDb.truncate(['WorkflowStatistics', 'ExecutionEntity']);

			await runScenarios();

			await foldUntil(expected);
		});

		it('leaves the old delta table empty', async () => {
			if (Container.get(GlobalConfig).database.type !== 'postgresdb') return;

			await finish('trigger', 'success');
			await foldUntil({ [StatisticsNames.productionSuccess]: { count: 1, rootCount: 1 } });

			const { tablePrefix } = Container.get(GlobalConfig).database;
			const dataSource = Container.get(DataSource);
			const table = dataSource.driver.escape(`${tablePrefix}workflow_statistics_delta`);
			const [{ pending }] = await dataSource.query<Array<{ pending: number }>>(
				`SELECT COUNT(*)::int AS pending FROM ${table}`,
			);
			expect(pending).toBe(0);
		});
	});
});
