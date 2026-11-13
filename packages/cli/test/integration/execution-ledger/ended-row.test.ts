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
	await retryUntil(
		async () => {
			rows.push(...(await claimAllLedgerRows()));
			expect(rows.length).toBeGreaterThanOrEqual(expectedCount);
		},
		{ intervalMs: 50, timeoutMs: 10_000 },
	);
	// A second row for the same run would arrive late, so look once more.
	await new Promise((resolve) => setTimeout(resolve, 300));
	rows.push(...(await claimAllLedgerRows()));
	return rows.filter((row) => row.event === 'ended');
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

	const createRunningExecution = async (mode: WorkflowExecuteMode = 'trigger') =>
		await Container.get(ExecutionPersistence).create({
			workflowId: workflow.id,
			data: createEmptyRunExecutionData(),
			workflowData: workflow,
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

		it('writes no row for a canceled run', async () => {
			const executionId = await createRunningExecution();

			await getLifecycleHooksForRegularMain(
				{ executionMode: 'trigger', workflowData: workflow },
				executionId,
			).runHook('workflowExecuteAfter', [finishedRun('canceled'), {}]);

			expect(await collectEndedRows(0)).toEqual([]);
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
