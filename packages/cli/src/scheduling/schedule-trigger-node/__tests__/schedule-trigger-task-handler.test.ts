/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/naming-convention -- item keys are pinned to the legacy ScheduleTrigger emit shape */
import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { ExecutionEntity, ExecutionRepository } from '@n8n/db';
import type { ClaimedTask } from '@n8n/scheduler';
import type { ErrorReporter } from 'n8n-core';
import type { INode, IWorkflowBase, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { UnexpectedError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { DuplicateExecutionError } from '@/errors/duplicate-execution.error';
import type { EventService } from '@/events/event.service';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import type { TriggerExecutionContextFactory } from '@/workflows/triggers/trigger-execution-context.factory';
import type { WorkflowExecutionService } from '@/workflows/workflow-execution.service';

import { SCHEDULE_TRIGGER_TASK_TYPE } from '../schedule-trigger-task';
import { ScheduleTriggerTaskHandler } from '../schedule-trigger-task-handler';

describe('ScheduleTriggerTaskHandler', () => {
	const errorReporter = mock<ErrorReporter>();
	const executionRepository = mock<ExecutionRepository>();
	const eventService = mock<EventService>();
	const triggerExecutionContextFactory = mock<TriggerExecutionContextFactory>();
	const workflowExecutionService = mock<WorkflowExecutionService>();
	const globalConfig = mock<GlobalConfig>({ generic: { timezone: 'America/New_York' } });
	const additionalData = mock<IWorkflowExecuteAdditionalData>();

	const scopedLogger = mock<Logger>();
	const rootLogger = mock<Logger>({ scoped: vi.fn().mockReturnValue(scopedLogger) });

	const handler = new ScheduleTriggerTaskHandler(
		rootLogger,
		errorReporter,
		globalConfig,
		executionRepository,
		eventService,
		triggerExecutionContextFactory,
		workflowExecutionService,
	);

	const triggerNode = mock<INode>({ id: 'node-1', name: 'Schedule Trigger', disabled: false });

	// Plain data objects, not mock proxies: the handler reads them as values.
	const buildWorkflowData = (overrides: Partial<IWorkflowBase> = {}): IWorkflowBase =>
		({
			id: 'wf-1',
			name: 'My Scheduled Workflow',
			active: true,
			isArchived: false,
			createdAt: new Date('2026-07-01T00:00:00.000Z'),
			updatedAt: new Date('2026-07-01T00:00:00.000Z'),
			nodes: [triggerNode],
			connections: {},
			settings: { timezone: 'Europe/Berlin' },
			...overrides,
		}) as IWorkflowBase;

	const scheduledFor = new Date('2026-07-06T07:30:00.000Z');

	const buildTask = (overrides: Partial<ClaimedTask> = {}): ClaimedTask => ({
		id: 'task-1',
		jobId: 7,
		taskType: 'workflow:schedule-trigger',
		payload: { workflowId: 'wf-1', nodeId: 'node-1' },
		scheduledFor,
		runAt: scheduledFor,
		status: 'running',
		attempts: 0,
		maxAttempts: 1,
		leaseEpoch: 1,
		...overrides,
	});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(additionalData);
		triggerExecutionContextFactory.loadPublishedWorkflowData.mockResolvedValue(buildWorkflowData());
		workflowExecutionService.runWorkflow.mockResolvedValue('exec-1');
	});

	describe('task type', () => {
		test('declares the schedule-trigger task type it is bound under at composition', () => {
			expect(handler.taskType).toBe(SCHEDULE_TRIGGER_TASK_TYPE);
		});
	});

	describe('handoff', () => {
		test('creates a trigger execution with the occurrence-derived dedup key', async () => {
			await handler.execute(buildTask());

			expect(triggerExecutionContextFactory.loadPublishedWorkflowData).toHaveBeenCalledWith('wf-1');
			expect(workflowExecutionService.runWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'wf-1' }),
				triggerNode,
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				[[expect.objectContaining({ json: expect.any(Object) })]],
				additionalData,
				'trigger',
				undefined,
				'7:2026-07-06T07:30:00.000Z',
			);
		});

		test('stamps the trigger item from the occurrence instant in the workflow timezone', async () => {
			await handler.execute(buildTask());

			const [, , data] = workflowExecutionService.runWorkflow.mock.calls[0];
			expect(data[0][0].json).toMatchObject({
				timestamp: '2026-07-06T09:30:00.000+02:00',
				Timezone: 'Europe/Berlin (UTC+02:00)',
			});
		});

		test('falls back to the instance timezone when the workflow sets none', async () => {
			triggerExecutionContextFactory.loadPublishedWorkflowData.mockResolvedValue(
				buildWorkflowData({ settings: {} }),
			);

			await handler.execute(buildTask());

			const [, , data] = workflowExecutionService.runWorkflow.mock.calls[0];
			expect(data[0][0].json).toMatchObject({
				timestamp: '2026-07-06T03:30:00.000-04:00',
				Timezone: 'America/New_York (UTC-04:00)',
			});
		});

		test("resolves the 'DEFAULT' timezone sentinel to the instance timezone", async () => {
			triggerExecutionContextFactory.loadPublishedWorkflowData.mockResolvedValue(
				buildWorkflowData({ settings: { timezone: 'DEFAULT' } }),
			);

			await handler.execute(buildTask());

			const [, , data] = workflowExecutionService.runWorkflow.mock.calls[0];
			// 'DEFAULT' is a sentinel, not a Moment zone: it must not leak into the
			// item as a literal zone (which Moment resolves to UTC).
			expect(data[0][0].json).toMatchObject({
				timestamp: '2026-07-06T03:30:00.000-04:00',
				Timezone: 'America/New_York (UTC-04:00)',
			});
		});

		test('builds additional data for the published workflow like the activation path', async () => {
			await handler.execute(buildTask());

			expect(WorkflowExecuteAdditionalData.getBase).toHaveBeenCalledWith({
				workflowId: 'wf-1',
				workflowSettings: { timezone: 'Europe/Berlin' },
			});
		});

		test('emits workflow-executed for the new execution', async () => {
			await handler.execute(buildTask());

			expect(eventService.emit).toHaveBeenCalledWith('workflow-executed', {
				workflowId: 'wf-1',
				workflowName: 'My Scheduled Workflow',
				executionId: 'exec-1',
				source: 'trigger',
			});
		});
	});

	describe('redelivery', () => {
		test('completes quietly when the execution already exists for the key', async () => {
			const duplicateError = new DuplicateExecutionError('7:2026-07-06T07:30:00.000Z');
			workflowExecutionService.runWorkflow.mockRejectedValue(duplicateError);
			executionRepository.findOne.mockResolvedValue(
				mock<ExecutionEntity>({ id: 'exec-0', status: 'running' }),
			);

			await expect(handler.execute(buildTask({ attempts: 1 }))).resolves.toBeUndefined();

			expect(executionRepository.findOne).toHaveBeenCalledWith({
				where: { deduplicationKey: '7:2026-07-06T07:30:00.000Z' },
				select: ['id', 'status'],
			});
			expect(scopedLogger.warn).toHaveBeenCalledWith(
				expect.stringContaining('redelivered'),
				expect.objectContaining({ executionId: 'exec-0', executionStatus: 'running' }),
			);
			expect(errorReporter.warn).toHaveBeenCalledWith(duplicateError, {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				extra: expect.objectContaining({ executionId: 'exec-0', executionStatus: 'running' }),
				shouldBeLogged: false,
			});
			expect(eventService.emit).not.toHaveBeenCalled();
		});
	});

	describe('failures', () => {
		test('rejects a task whose payload is missing workflowId or nodeId', async () => {
			const task = buildTask({ payload: { nodeId: 'node-1' } });

			await expect(handler.execute(task)).rejects.toThrow(UnexpectedError);
			expect(workflowExecutionService.runWorkflow).not.toHaveBeenCalled();
		});

		test('propagates a missing published workflow so the executor records the failure', async () => {
			const error = new UnexpectedError('Published version not found for workflow');
			triggerExecutionContextFactory.loadPublishedWorkflowData.mockRejectedValue(error);

			await expect(handler.execute(buildTask())).rejects.toThrow(error);
			expect(workflowExecutionService.runWorkflow).not.toHaveBeenCalled();
		});

		test('rejects a task whose trigger node is gone from the published workflow', async () => {
			triggerExecutionContextFactory.loadPublishedWorkflowData.mockResolvedValue(
				buildWorkflowData({ nodes: [] }),
			);

			await expect(handler.execute(buildTask())).rejects.toThrow(
				'missing or disabled in the published workflow',
			);
			expect(workflowExecutionService.runWorkflow).not.toHaveBeenCalled();
		});

		test('rejects a task whose trigger node is disabled', async () => {
			triggerExecutionContextFactory.loadPublishedWorkflowData.mockResolvedValue(
				buildWorkflowData({ nodes: [mock<INode>({ id: 'node-1', disabled: true })] }),
			);

			await expect(handler.execute(buildTask())).rejects.toThrow(
				'missing or disabled in the published workflow',
			);
			expect(workflowExecutionService.runWorkflow).not.toHaveBeenCalled();
		});

		test('propagates handoff failures so the executor retries with backoff', async () => {
			const error = new Error('db unavailable');
			workflowExecutionService.runWorkflow.mockRejectedValue(error);

			await expect(handler.execute(buildTask())).rejects.toThrow(error);
			expect(eventService.emit).not.toHaveBeenCalled();
		});
	});
});
