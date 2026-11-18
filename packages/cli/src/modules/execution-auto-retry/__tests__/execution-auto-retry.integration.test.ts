import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import {
	createWorkflowWithHistory,
	mockInstance,
	setActiveVersion,
	testDb,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import {
	DataSource,
	ExecutionRepository,
	ScheduledJobRepository,
	ScheduledTaskRepository,
	type WorkflowEntity,
} from '@n8n/db';
import type { WorkflowExecuteAfterContext } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { InstanceSettings } from 'n8n-core';
import { Tracing } from 'n8n-core';
import { createRunExecutionData, NodeApiError, type INode, type IRun } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ExecutionService } from '@/executions/execution.service';
import { PrometheusSchedulerMetricsService } from '@/metrics/prometheus/scheduler-metrics.service';
import { AgentScheduledJobOwner } from '@/scheduling/agent-scheduled-job-owner';
import { DurableScheduler } from '@/scheduling/durable-scheduler';
import { PollTriggerTaskHandler } from '@/scheduling/poll-trigger-node/poll-trigger-task-handler';
import { ScheduleTriggerTaskHandler } from '@/scheduling/schedule-trigger-node/schedule-trigger-task-handler';
import { SystemTaskScheduledJobOwner } from '@/scheduling/system-tasks/system-task-scheduled-job-owner';
import { WorkflowScheduledJobOwner } from '@/scheduling/workflow-scheduled-job-owner';
import { createOwner } from '@test-integration/db/users';
import { retryUntil } from '@test-integration/retry-until';

import { ExecutionAutoRetryModule } from '../execution-auto-retry.module';
import { ExecutionAutoRetryService } from '../execution-auto-retry.service';

const executionService = mockInstance(ExecutionService);

describe('execution auto-retry with the real scheduler', () => {
	let scheduler: DurableScheduler;

	beforeAll(async () => {
		await testDb.init();

		const globalConfig = Container.get(GlobalConfig);
		globalConfig.scheduler.enabled = true;
		globalConfig.scheduler.materializationIntervalSeconds = 1;
		globalConfig.scheduler.executorIntervalSeconds = 1;
		globalConfig.scheduler.reaperIntervalSeconds = 1;
		globalConfig.scheduler.retentionIntervalSeconds = 1;

		scheduler = new DurableScheduler(
			Container.get(Logger),
			Container.get(DataSource),
			Container.get(ScheduledJobRepository),
			Container.get(ScheduledTaskRepository),
			{ instanceType: 'main', hostId: 'auto-retry-host' } as InstanceSettings,
			globalConfig,
			Container.get(Tracing),
			Container.get(ScheduleTriggerTaskHandler),
			Container.get(PollTriggerTaskHandler),
			Container.get(PrometheusSchedulerMetricsService),
			Container.get(WorkflowScheduledJobOwner),
			Container.get(AgentScheduledJobOwner),
			Container.get(SystemTaskScheduledJobOwner),
			Container.get(EventService),
		);
		Container.set(DurableScheduler, scheduler);
		await new ExecutionAutoRetryModule().init();
		scheduler.start();
	});

	afterAll(async () => {
		await scheduler.stop();
		await testDb.terminate();
	});

	const publishWorkflowWithAutoRetry = async () => {
		const workflow = await createWorkflowWithHistory(
			{ settings: { autoRetry: { enabled: true } } },
			await createOwner(),
			{},
		);
		await setActiveVersion(workflow.id, workflow.versionId);
		return workflow;
	};

	const insertFailedRun = async (
		workflow: WorkflowEntity,
		run: { mode: 'trigger' } | { mode: 'retry'; retryOf: string },
	) => {
		const { identifiers } = await Container.get(ExecutionRepository).insert({
			workflowId: workflow.id,
			// A retry run stores no workflow version, as `ExecutionService.retry` leaves it.
			workflowVersionId: run.mode === 'trigger' ? workflow.versionId : null,
			status: 'error',
			finished: false,
			createdAt: new Date(),
			...run,
		});
		return String(identifiers[0].id);
	};

	const failedRunContext = (
		workflow: WorkflowEntity,
		executionId: string,
		retryOf?: string,
	): WorkflowExecuteAfterContext => ({
		type: 'workflowExecuteAfter',
		workflow,
		mode: retryOf ? 'retry' : 'trigger',
		retryOf,
		runData: mock<IRun>({
			status: 'error',
			data: createRunExecutionData({
				resultData: {
					error: new NodeApiError(mock<INode>(), {}, { httpCode: '503' }),
					runData: {},
				},
			}),
		}),
		newStaticData: {},
		executionId,
		executedInThisProcess: true,
		endedByThisSave: true,
	});

	const expectRetryOf = async (executionId: string) =>
		await retryUntil(
			() => {
				expect(executionService.retry).toHaveBeenCalledWith(
					expect.objectContaining({ executionId }),
				);
			},
			{ intervalMs: 500, timeoutMs: 25_000 },
		);

	beforeEach(() => {
		executionService.retry.mockReset();
		executionService.retry.mockReturnValue(new Promise(() => {}));
	});

	it("a failed run's job fires and starts a retry", async () => {
		const workflow = await publishWorkflowWithAutoRetry();
		const failedId = await insertFailedRun(workflow, { mode: 'trigger' });

		await Container.get(ExecutionAutoRetryService).onWorkflowExecuteAfter(
			failedRunContext(workflow, failedId),
		);

		await expectRetryOf(failedId);
	}, 30_000);

	it('a failed retry starts another retry of the original run', async () => {
		const workflow = await publishWorkflowWithAutoRetry();
		const originalId = await insertFailedRun(workflow, { mode: 'trigger' });
		const retryId = await insertFailedRun(workflow, { mode: 'retry', retryOf: originalId });

		await Container.get(ExecutionAutoRetryService).onWorkflowExecuteAfter(
			failedRunContext(workflow, retryId, originalId),
		);

		await expectRetryOf(originalId);
	}, 30_000);
});
