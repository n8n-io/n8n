import { createTeamProject, createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import { isBillableExecution, isLedgerFact } from '@n8n/backend-services';
import type { ExecutionLedgerRow, Project, WorkflowEntity } from '@n8n/db';
import { StatisticsNames } from '@n8n/db';
import { Container } from '@n8n/di';
import type { ExecutionStatus, IRun, WorkflowExecuteMode } from 'n8n-workflow';
import { createEmptyRunExecutionData, createRunExecutionData } from 'n8n-workflow';

import { claimAllLedgerRows } from '@n8n/backend-module-execution-ledger/testing';
import { ExecutionLedgerModule } from '@n8n/backend-module-execution-ledger/module';
import {
	getLifecycleHooksForRegularMain,
	getLifecycleHooksForScalingMain,
	getLifecycleHooksForScalingWorker,
	getLifecycleHooksForSubExecutions,
} from '@/execution-lifecycle/execution-lifecycle-hooks';
import { ExecutionCancelService } from '@/executions/execution-cancel.service';
import { ExecutionCrashService } from '@/executions/execution-crash.service';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { packagedModules } from '@/modules/modules.manifest';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';

import { retryUntil } from '../shared/retry-until';
import { findWorkflowStatistics, useWorkflowStatisticsEvents } from '../shared/workflow-statistics';
import { createSimpleWorkflowFixture } from '../shared/workflow-fixtures';

/** The ledger inserts run in the background, so the rows are collected until they stop changing. */
async function collectEndedRows(expectedCount: number): Promise<ExecutionLedgerRow[]> {
	const rows: ExecutionLedgerRow[] = [];
	const claimEnded = async () =>
		rows.push(...(await claimAllLedgerRows()).filter((row) => row.event === 'ended'));
	await retryUntil(
		async () => {
			await claimEnded();
			expect(rows.length).toBeGreaterThanOrEqual(expectedCount);
		},
		{ intervalMs: 50, timeoutMs: 10_000 },
	);
	// A second row for the same run would arrive late, so look once more.
	await new Promise((resolve) => setTimeout(resolve, 300));
	await claimEnded();
	return rows;
}

describe('execution ledger ended rows', () => {
	useWorkflowStatisticsEvents();

	let project: Project;
	let workflow: WorkflowEntity;

	beforeAll(async () => {
		await testModules.loadModules(['execution-ledger'], packagedModules);
		await testDb.init();
		await new ExecutionLedgerModule().init();
		Container.get(WorkflowStatisticsService);
	});

	beforeEach(async () => {
		await testDb.truncate(['WorkflowStatistics', 'ExecutionEntity', 'WorkflowEntity', 'Project']);
		await claimAllLedgerRows();
		project = await createTeamProject('Ledger project');
		workflow = await createWorkflow(
			{ name: 'Ledger workflow', ...createSimpleWorkflowFixture(), settings: {} },
			project,
		);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	const createRunningExecution = async (
		mode: WorkflowExecuteMode = 'trigger',
		ofWorkflow: WorkflowEntity = workflow,
	) =>
		await Container.get(ExecutionPersistence).create({
			workflowId: ofWorkflow.id,
			data: createEmptyRunExecutionData(),
			workflowData: ofWorkflow,
			mode,
			status: 'running',
			finished: false,
			startedAt: new Date(),
		});

	const finishedRun = (status: ExecutionStatus, mode: WorkflowExecuteMode = 'trigger'): IRun => ({
		data: createRunExecutionData({ resultData: { runData: {} } }),
		mode,
		status,
		finished: status === 'success',
		startedAt: new Date(Date.now() - 1_000),
		stoppedAt: new Date(),
		storedAt: 'db',
	});

	describe('exactly one row for each run', () => {
		it('writes one row when the after hooks run twice', async () => {
			const executionId = await createRunningExecution();
			const hooks = getLifecycleHooksForRegularMain(
				{ executionMode: 'trigger', workflowData: workflow },
				executionId,
			);

			await hooks.runHook('workflowExecuteAfter', [finishedRun('success'), {}]);
			await hooks.runHook('workflowExecuteAfter', [finishedRun('success'), {}]);

			const rows = await collectEndedRows(1);
			expect(rows).toHaveLength(1);
			expect(rows[0]).toMatchObject({
				executionId,
				outcome: 'success',
				projectId: project.id,
				mode: 'trigger',
			});
		});

		it('writes one row in queue mode, from the worker only', async () => {
			const executionId = await createRunningExecution();
			const run = finishedRun('error');

			await getLifecycleHooksForScalingWorker(
				{ executionMode: 'trigger', workflowData: workflow },
				executionId,
			).runHook('workflowExecuteAfter', [run, {}]);
			await getLifecycleHooksForScalingMain(
				{ executionMode: 'trigger', workflowData: workflow },
				executionId,
			).runHook('workflowExecuteAfter', [run, {}]);

			const rows = await collectEndedRows(1);
			expect(rows).toHaveLength(1);
			expect(rows[0]).toMatchObject({ executionId, outcome: 'error' });
		});

		it('writes no second row for a late worker save after a crash sweep', async () => {
			const executionId = await createRunningExecution();

			await Container.get(ExecutionCrashService).markAsCrashed(executionId, 'queue-recovery');
			await getLifecycleHooksForScalingWorker(
				{ executionMode: 'trigger', workflowData: workflow },
				executionId,
			).runHook('workflowExecuteAfter', [finishedRun('success'), {}]);

			const rows = await collectEndedRows(1);
			expect(rows).toHaveLength(1);
			expect(rows[0]).toMatchObject({ executionId, outcome: 'crashed' });
		});

		it('writes one row for an unsaved manual run that a crash sweep reaches later', async () => {
			workflow.settings = { saveManualExecutions: false };
			const executionId = await createRunningExecution('manual');

			await getLifecycleHooksForRegularMain(
				{ executionMode: 'manual', workflowData: workflow },
				executionId,
			).runHook('workflowExecuteAfter', [finishedRun('success', 'manual'), {}]);
			await Container.get(ExecutionCrashService).markAsCrashed(executionId, 'queue-recovery');

			const rows = await collectEndedRows(1);
			expect(rows).toHaveLength(1);
			expect(rows[0]).toMatchObject({ executionId, outcome: 'success', mode: 'manual' });
		});

		it('writes one blocked row for a run that failed before its first node', async () => {
			const executionId = await createRunningExecution();
			const run = finishedRun('error');
			run.data.resultData.failedBeforeStart = 'policy';

			await getLifecycleHooksForRegularMain(
				{ executionMode: 'trigger', workflowData: workflow },
				executionId,
			).runHook('workflowExecuteAfter', [run, {}]);

			const rows = await collectEndedRows(1);
			expect(rows).toHaveLength(1);
			expect(rows[0]).toMatchObject({
				executionId,
				outcome: 'blocked',
				blockedBy: 'policy',
				runtimeMs: 0,
				timeSavedMin: 0,
			});
		});

		it('writes one row for each run when a crash sweep races the final saves', async () => {
			const executionIds = await Promise.all(
				Array.from({ length: 10 }, async () => await createRunningExecution()),
			);

			await Promise.all(
				executionIds.flatMap((executionId) => [
					Container.get(ExecutionCrashService).markAsCrashed(executionId, 'queue-recovery'),
					getLifecycleHooksForRegularMain(
						{ executionMode: 'trigger', workflowData: workflow },
						executionId,
					).runHook('workflowExecuteAfter', [finishedRun('success'), {}]),
				]),
			);

			const rows = await collectEndedRows(executionIds.length);
			expect(rows.map((row) => row.executionId).sort()).toEqual([...executionIds].sort());
		});
	});

	describe('a workflow with no owner project', () => {
		let unowned: WorkflowEntity;

		beforeEach(async () => {
			unowned = await createWorkflow({
				name: 'Unowned',
				...createSimpleWorkflowFixture(),
				settings: {},
			});
		});

		it('writes an ended row with no project for a finished run', async () => {
			const executionId = await createRunningExecution('trigger', unowned);

			await getLifecycleHooksForRegularMain(
				{ executionMode: 'trigger', workflowData: unowned },
				executionId,
			).runHook('workflowExecuteAfter', [finishedRun('success'), {}]);

			const rows = await collectEndedRows(1);
			expect(rows).toHaveLength(1);
			expect(rows[0]).toMatchObject({ executionId, outcome: 'success', projectId: null });
		});

		it('writes an ended row with no project for a canceled run', async () => {
			const executionId = await createRunningExecution('trigger', unowned);

			const { recorded } = await Container.get(ExecutionCancelService).markAsCanceled([
				executionId,
			]);
			await recorded;

			const rows = await collectEndedRows(1);
			expect(rows).toHaveLength(1);
			expect(rows[0]).toMatchObject({ executionId, outcome: 'canceled', projectId: null });
		});

		it('writes an ended row with no project for a crashed run', async () => {
			const executionId = await createRunningExecution('trigger', unowned);

			await Container.get(ExecutionCrashService).markAsCrashed(executionId, 'queue-recovery');

			const rows = await collectEndedRows(1);
			expect(rows).toHaveLength(1);
			expect(rows[0]).toMatchObject({ executionId, outcome: 'crashed', projectId: null });
		});
	});

	describe('canceled runs', () => {
		it('writes one canceled row from the hook run that finished the run', async () => {
			const executionId = await createRunningExecution();

			await getLifecycleHooksForRegularMain(
				{ executionMode: 'trigger', workflowData: workflow },
				executionId,
			).runHook('workflowExecuteAfter', [finishedRun('canceled'), {}]);

			const rows = await collectEndedRows(1);
			expect(rows).toHaveLength(1);
			expect(rows[0]).toMatchObject({ executionId, outcome: 'canceled', projectId: project.id });
		});

		it('writes one row for each run a cancel moved, and none for a finished run', async () => {
			const runningIds = await Promise.all([createRunningExecution(), createRunningExecution()]);
			const finishedId = await createRunningExecution();
			await getLifecycleHooksForRegularMain(
				{ executionMode: 'trigger', workflowData: workflow },
				finishedId,
			).runHook('workflowExecuteAfter', [finishedRun('success'), {}]);
			await collectEndedRows(1);

			const cancelService = Container.get(ExecutionCancelService);
			const { recorded } = await cancelService.markAsCanceled([...runningIds, finishedId]);
			await recorded;
			await (await cancelService.markAsCanceled(runningIds)).recorded;

			const rows = (await claimAllLedgerRows()).filter((row) => row.event === 'ended');
			expect(rows.map((row) => row.executionId).sort()).toEqual([...runningIds].sort());
			expect(rows.every((row) => row.outcome === 'canceled')).toBe(true);
		});

		it('writes one row for each run when a cancel races the engine cancel hook', async () => {
			const executionIds = await Promise.all(
				Array.from({ length: 10 }, async () => await createRunningExecution()),
			);

			await Promise.all(
				executionIds.flatMap((executionId) => [
					Container.get(ExecutionCancelService).markAsCanceled([executionId]),
					getLifecycleHooksForRegularMain(
						{ executionMode: 'trigger', workflowData: workflow },
						executionId,
					).runHook('workflowExecuteAfter', [finishedRun('canceled'), {}]),
				]),
			);

			const rows = await collectEndedRows(executionIds.length);
			expect(rows.map((row) => row.executionId).sort()).toEqual([...executionIds].sort());
		});
	});

	describe('parity with workflow statistics', () => {
		const productionNames: string[] = [
			StatisticsNames.productionSuccess,
			StatisticsNames.productionError,
		];
		const rootProductionCount = async () =>
			(await findWorkflowStatistics(workflow.id))
				.filter(({ name }) => productionNames.includes(name))
				.reduce((sum, { rootCount }) => sum + rootCount, 0);

		const finish = async (mode: WorkflowExecuteMode, status: ExecutionStatus) => {
			const executionId = await createRunningExecution(mode);
			const hooks =
				mode === 'integrated'
					? getLifecycleHooksForSubExecutions(mode, executionId, workflow)
					: getLifecycleHooksForRegularMain(
							{ executionMode: mode, workflowData: workflow },
							executionId,
						);
			await hooks.runHook('workflowExecuteAfter', [finishedRun(status, mode), {}]);
		};

		it('counts the same billable runs as workflow statistics', async () => {
			workflow.settings = { saveDataSuccessExecution: 'all', saveDataErrorExecution: 'all' };
			await finish('trigger', 'success');
			await finish('webhook', 'success');
			await finish('webhook', 'error');
			await finish('manual', 'success');
			await finish('integrated', 'success');
			await Container.get(ExecutionCrashService).markAsCrashed(
				await createRunningExecution('trigger'),
				'queue-recovery',
			);

			const rows = await collectEndedRows(6);
			const billableRows = rows.filter((row) => isLedgerFact(row) && isBillableExecution(row));

			expect(rows).toHaveLength(6);
			expect(billableRows).toHaveLength(4);
			await vi.waitFor(async () => expect(await rootProductionCount()).toBe(billableRows.length), {
				timeout: 10_000,
			});
		});
	});
});
