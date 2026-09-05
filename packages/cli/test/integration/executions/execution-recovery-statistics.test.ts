import { createWorkflow, mockLogger, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { WorkflowEntity } from '@n8n/db';
import { ExecutionRepository, StatisticsNames, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { ExecutionCrashService } from '@/executions/execution-crash.service';
import { ExecutionRecoveryService } from '@/executions/execution-recovery.service';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';

import { createExecution } from '../shared/db/executions';
import { findWorkflowStatistic } from '../shared/workflow-statistics';

describe('ExecutionRecoveryService auto-deactivation', () => {
	let recoveryService: ExecutionRecoveryService;
	let maxLastExecutions: number;
	let workflow: WorkflowEntity;
	const originalSkipStatisticsEvents = process.env.SKIP_STATISTICS_EVENTS;

	beforeAll(async () => {
		delete process.env.SKIP_STATISTICS_EVENTS;

		await testDb.init();

		Container.get(WorkflowStatisticsService);

		const globalConfig = Container.get(GlobalConfig);
		maxLastExecutions = globalConfig.executions.recovery.maxLastExecutions;

		recoveryService = new ExecutionRecoveryService(
			mockLogger(),
			mock(),
			mock(),
			Container.get(ExecutionRepository),
			mock(),
			globalConfig.executions,
			Container.get(WorkflowRepository),
			mock(),
			mock(),
			mock(),
			mock(),
			Container.get(ExecutionCrashService),
		);
	});

	beforeEach(async () => {
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

	it('records a production error for an execution left in progress by a deactivated workflow', async () => {
		for (let i = 0; i < maxLastExecutions; i++) {
			await createExecution({ status: 'crashed' }, workflow);
		}

		// older than the crashed ones, so it stays outside the last-N window
		await createExecution(
			{
				status: 'running',
				finished: false,
				stoppedAt: null,
				mode: 'trigger',
				startedAt: new Date(Date.now() - 60_000),
			},
			workflow,
		);

		await recoveryService.autoDeactivateWorkflowsIfNeeded(new Set([workflow.id]));

		await vi.waitFor(async () => {
			expect(
				await findWorkflowStatistic(workflow.id, StatisticsNames.productionError),
			).toMatchObject({ count: 1, rootCount: 1, workflowName: workflow.name });
		});
	});
});
