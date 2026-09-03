import { createWorkflow, mockLogger, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { WorkflowEntity } from '@n8n/db';
import { ExecutionRepository, StatisticsNames, WorkflowStatisticsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import type { WorkflowExecuteMode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ExecutionCrashService } from '@/executions/execution-crash.service';
import { ScalingService } from '@/scaling/scaling.service';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';

import { createExecution } from '../shared/db/executions';

describe('ScalingService queue recovery', () => {
	let scalingService: ScalingService;
	let workflowStatisticsRepository: WorkflowStatisticsRepository;
	let workflow: WorkflowEntity;
	const originalSkipStatisticsEvents = process.env.SKIP_STATISTICS_EVENTS;

	beforeAll(async () => {
		delete process.env.SKIP_STATISTICS_EVENTS;

		await testDb.init();

		Container.get(InstanceSettings).markAsLeader();
		Container.get(WorkflowStatisticsService);

		workflowStatisticsRepository = Container.get(WorkflowStatisticsRepository);

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

		await testDb.truncate(['WorkflowEntity', 'WorkflowStatistics', 'ExecutionEntity']);

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
		await workflowStatisticsRepository.findOneBy({ workflowId, name });

	it('increments the production error counter for an execution recovered as crashed', async () => {
		const execution = await createDanglingExecution('trigger');

		await scalingService.recoverFromQueue();

		await expect(
			Container.get(ExecutionRepository).findOneBy({ id: execution.id }),
		).resolves.toMatchObject({ status: 'crashed' });

		await vi.waitFor(async () => {
			const statistics = await findStatistics(StatisticsNames.productionError);

			expect(statistics).toMatchObject({ count: 1, rootCount: 1 });
		});
	});

	it('increments the manual error counter for a manual execution recovered as crashed', async () => {
		await createDanglingExecution('manual');

		await scalingService.recoverFromQueue();

		await vi.waitFor(async () => {
			const statistics = await findStatistics(StatisticsNames.manualError);

			expect(statistics).toMatchObject({ count: 1, rootCount: 0 });
		});
	});

	it('increments the production error counter without a root count for a recovered sub-workflow execution', async () => {
		await createDanglingExecution('integrated');

		await scalingService.recoverFromQueue();

		await vi.waitFor(async () => {
			const statistics = await findStatistics(StatisticsNames.productionError);

			expect(statistics).toMatchObject({ count: 1, rootCount: 0 });
		});
	});

	it('stores the name of the workflow whose execution was recovered as crashed', async () => {
		await createDanglingExecution('trigger');

		await scalingService.recoverFromQueue();

		await vi.waitFor(async () => {
			const statistics = await findStatistics(StatisticsNames.productionError);

			expect(statistics).toMatchObject({ workflowName: workflow.name });
		});
	});

	it('does not count a chat execution recovered as crashed', async () => {
		const chatWorkflow = await createWorkflow();
		await createDanglingExecution('chat', chatWorkflow);

		await scalingService.recoverFromQueue();

		await createDanglingExecution('trigger');

		await scalingService.recoverFromQueue();

		// the chat execution is recovered in its own earlier sweep, so the later sweep's
		// counter appearing means the chat execution has already been through the statistics path
		await vi.waitFor(async () => {
			expect(await findStatistics(StatisticsNames.productionError)).toMatchObject({ count: 1 });
		});

		expect(await workflowStatisticsRepository.findBy({ workflowId: chatWorkflow.id })).toEqual([]);
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

		// the later execution is recorded after any repeat of the first one, so its counter
		// appearing means a repeated increment would already be visible
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
