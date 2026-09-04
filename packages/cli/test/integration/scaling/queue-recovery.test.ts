import { createWorkflow, mockLogger, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { WorkflowEntity } from '@n8n/db';
import { ExecutionRepository, StatisticsNames } from '@n8n/db';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import type { WorkflowExecuteMode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ExecutionCrashService } from '@/executions/execution-crash.service';
import { ScalingService } from '@/scaling/scaling.service';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';

import { createExecution } from '../shared/db/executions';
import { findWorkflowStatistic, findWorkflowStatistics } from '../shared/workflow-statistics';

describe('ScalingService queue recovery', () => {
	let scalingService: ScalingService;
	let workflow: WorkflowEntity;
	const originalSkipStatisticsEvents = process.env.SKIP_STATISTICS_EVENTS;

	beforeAll(async () => {
		delete process.env.SKIP_STATISTICS_EVENTS;

		await testDb.init();

		Container.get(InstanceSettings).markAsLeader();
		Container.get(WorkflowStatisticsService);

		scalingService = new ScalingService(
			mockLogger(),
			mock(),
			mock(),
			mock(),
			Container.get(GlobalConfig),
			Container.get(ExecutionRepository),
			mock(),
			Container.get(InstanceSettings),
			mock(),
			mock(),
			Container.get(ExecutionCrashService),
		);
	});

	beforeEach(async () => {
		vi.spyOn(scalingService, 'findJobsByStatus').mockResolvedValue([]);

		await testDb.truncate([
			'WorkflowEntity',
			'WorkflowStatistics',
			'WorkflowStatisticsDelta',
			'ExecutionEntity',
		]);

		workflow = await createWorkflow();
	});

	afterAll(async () => {
		if (originalSkipStatisticsEvents !== undefined) {
			process.env.SKIP_STATISTICS_EVENTS = originalSkipStatisticsEvents;
		}

		await testDb.terminate();
	});

	const createDanglingExecution = async (
		mode: WorkflowExecuteMode,
		target: WorkflowEntity = workflow,
	) => await createExecution({ status: 'running', finished: false, stoppedAt: null, mode }, target);

	const findStatistics = async (name: StatisticsNames, workflowId: string = workflow.id) =>
		await findWorkflowStatistic(workflowId, name);

	it('records a production error against the workflow for an execution recovered as crashed', async () => {
		const execution = await createDanglingExecution('trigger');

		await scalingService.recoverFromQueue();

		await expect(
			Container.get(ExecutionRepository).findOneBy({ id: execution.id }),
		).resolves.toMatchObject({ status: 'crashed' });

		await vi.waitFor(async () => {
			const statistics = await findStatistics(StatisticsNames.productionError);

			expect(statistics).toMatchObject({ count: 1, rootCount: 1, workflowName: workflow.name });
		});
	});

	it('counts every crashed execution of the same workflow in one sweep', async () => {
		await createDanglingExecution('trigger');
		await createDanglingExecution('trigger');

		await scalingService.recoverFromQueue();

		await vi.waitFor(async () => {
			const statistics = await findStatistics(StatisticsNames.productionError);

			expect(statistics).toMatchObject({ count: 2, rootCount: 2 });
		});
	});

	it('does not count a chat execution recovered as crashed', async () => {
		const chatWorkflow = await createWorkflow();
		await createDanglingExecution('chat', chatWorkflow);

		await scalingService.recoverFromQueue();

		await createDanglingExecution('trigger');

		await scalingService.recoverFromQueue();

		// The later sweep's counter appearing proves the chat sweep has finished counting.
		await vi.waitFor(async () => {
			expect(await findStatistics(StatisticsNames.productionError)).toMatchObject({ count: 1 });
		});

		expect(await findWorkflowStatistics(chatWorkflow.id)).toEqual([]);
	});

	it('excludes an execution already `crashed` from a later, sequential sweep', async () => {
		const execution = await createDanglingExecution('trigger');

		await scalingService.recoverFromQueue();

		await vi.waitFor(async () => {
			expect(await findStatistics(StatisticsNames.productionError)).toMatchObject({ count: 1 });
		});

		await scalingService.recoverFromQueue();
		await Container.get(ExecutionCrashService).markAsCrashed(execution.id);

		const laterWorkflow = await createWorkflow();
		await createDanglingExecution('trigger', laterWorkflow);

		await scalingService.recoverFromQueue();

		// The later counter appearing proves any repeat of the first would already be visible.
		await vi.waitFor(async () => {
			expect(await findStatistics(StatisticsNames.productionError, laterWorkflow.id)).toMatchObject(
				{ count: 1 },
			);
		});

		expect(await findStatistics(StatisticsNames.productionError)).toMatchObject({
			count: 1,
			rootCount: 1,
		});
	});

	it('attributes each execution in one sweep to its own workflow and mode', async () => {
		const manualWorkflow = await createWorkflow();
		const subWorkflow = await createWorkflow();

		await createDanglingExecution('trigger');
		await createDanglingExecution('manual', manualWorkflow);
		await createDanglingExecution('integrated', subWorkflow);

		await scalingService.recoverFromQueue();

		await vi.waitFor(async () => {
			expect(await findStatistics(StatisticsNames.productionError)).toMatchObject({
				count: 1,
				rootCount: 1,
			});
			expect(await findStatistics(StatisticsNames.manualError, manualWorkflow.id)).toMatchObject({
				count: 1,
				rootCount: 0,
			});
			expect(await findStatistics(StatisticsNames.productionError, subWorkflow.id)).toMatchObject({
				count: 1,
				rootCount: 0,
			});
		});

		expect(await findStatistics(StatisticsNames.manualError)).toBeNull();
		expect(await findStatistics(StatisticsNames.productionError, manualWorkflow.id)).toBeNull();
		expect(await findStatistics(StatisticsNames.manualError, subWorkflow.id)).toBeNull();
	});
});
