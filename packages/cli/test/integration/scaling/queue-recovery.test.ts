import { createWorkflow, mockLogger, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { WorkflowEntity } from '@n8n/db';
import { ExecutionRepository, StatisticsNames, WorkflowStatisticsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import type { WorkflowExecuteMode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ScalingService } from '@/scaling/scaling.service';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';

import { createExecution } from '../shared/db/executions';

describe('ScalingService queue recovery', () => {
	let scalingService: ScalingService;
	let workflowStatisticsRepository: WorkflowStatisticsRepository;
	let workflow: WorkflowEntity;

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
		);
	});

	beforeEach(async () => {
		vi.spyOn(scalingService, 'findJobsByStatus').mockResolvedValue([]);

		await testDb.truncate(['WorkflowEntity', 'WorkflowStatistics', 'ExecutionEntity']);

		workflow = await createWorkflow();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	const createDanglingExecution = async (mode: WorkflowExecuteMode) =>
		await createExecution({ status: 'running', finished: false, stoppedAt: null, mode }, workflow);

	const findStatistics = async (name: StatisticsNames) =>
		await workflowStatisticsRepository.findOneBy({ workflowId: workflow.id, name });

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

	it('does not count a chat execution recovered as crashed', async () => {
		await createDanglingExecution('chat');

		await scalingService.recoverFromQueue();

		expect(await workflowStatisticsRepository.findBy({ workflowId: workflow.id })).toEqual([]);
	});
});
