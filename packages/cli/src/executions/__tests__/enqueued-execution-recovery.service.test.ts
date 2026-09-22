import { mockLogger } from '@n8n/backend-test-utils';
import type { ExecutionsConfig } from '@n8n/config';
import type { IExecutionResponse, Project } from '@n8n/db';
import type { ErrorReporter } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { ExecutionAlreadyResumingError } from '@/errors/execution-already-resuming.error';
import type { EventService } from '@/events/event.service';
import { EnqueuedExecutionRecoveryService } from '@/executions/enqueued-execution-recovery.service';
import type { ExecutionCrashService } from '@/executions/execution-crash.service';
import type { ExecutionService } from '@/executions/execution.service';
import type { OwnershipService } from '@/services/ownership.service';
import type { WorkflowRunner } from '@/workflow-runner';

const project = mock<Project>({ id: 'project-1' });

const enqueuedExecution = (id: string) =>
	mock<IExecutionResponse>({ id, mode: 'webhook', workflowId: `workflow-for-${id}` });

describe('EnqueuedExecutionRecoveryService', () => {
	const logger = mockLogger();
	vi.mocked(logger.scoped).mockReturnValue(logger);
	const errorReporter = mock<ErrorReporter>();
	const executionService = mock<ExecutionService>();
	const executionCrashService = mock<ExecutionCrashService>();
	const ownershipService = mock<OwnershipService>();
	const workflowRunner = mock<WorkflowRunner>();
	const eventService = mock<EventService>();

	const createService = (mode: 'regular' | 'queue' = 'regular') =>
		new EnqueuedExecutionRecoveryService(
			logger,
			errorReporter,
			mock<ExecutionsConfig>({ mode }),
			executionService,
			executionCrashService,
			ownershipService,
			workflowRunner,
			eventService,
		);

	const mockEnqueued = (executions: IExecutionResponse[], unreadableIds: string[] = []) =>
		executionService.findAllEnqueuedExecutions.mockResolvedValue({ executions, unreadableIds });

	beforeEach(() => {
		vi.clearAllMocks();
		ownershipService.getWorkflowProjectCached.mockResolvedValue(project);
		workflowRunner.run.mockResolvedValue('1');
	});

	test('refuses to touch anything in queue mode', async () => {
		mockEnqueued([enqueuedExecution('1')]);

		await expect(createService('queue').recoverEnqueuedExecutions()).rejects.toThrow(
			'Enqueued execution recovery must not run in queue mode',
		);

		expect(executionService.findAllEnqueuedExecutions).not.toHaveBeenCalled();
		expect(workflowRunner.run).not.toHaveBeenCalled();
	});

	test('runs each enqueued execution, claiming it while it is still `new`', async () => {
		mockEnqueued([enqueuedExecution('1'), enqueuedExecution('2')]);

		await createService().recoverEnqueuedExecutions();

		expect(workflowRunner.run).toHaveBeenCalledWith(
			expect.objectContaining({ executionMode: 'webhook', projectId: 'project-1' }),
			undefined,
			false,
			{ executionId: '1', expectedStatus: 'new' },
		);
		expect(workflowRunner.run.mock.calls.map((call) => call[3])).toEqual([
			{ executionId: '1', expectedStatus: 'new' },
			{ executionId: '2', expectedStatus: 'new' },
		]);
	});

	// CAT-3862: previously the rejection landed in a void'd promise and the row stayed `new`.
	test('marks an execution as crashed when its run rejects', async () => {
		mockEnqueued([enqueuedExecution('1'), enqueuedExecution('2')]);
		workflowRunner.run.mockRejectedValueOnce(new Error('cannot start'));

		await createService().recoverEnqueuedExecutions();
		await new Promise(setImmediate); // `run` is not awaited, let the rejection settle

		expect(executionCrashService.markAsCrashed).toHaveBeenCalledExactlyOnceWith('1');
		expect(errorReporter.error).toHaveBeenCalledTimes(1);
		expect(workflowRunner.run).toHaveBeenCalledTimes(2);
	});

	test('does not crash an execution claimed by another runner', async () => {
		mockEnqueued([enqueuedExecution('1')]);
		workflowRunner.run.mockRejectedValueOnce(new ExecutionAlreadyResumingError('1'));

		await createService().recoverEnqueuedExecutions();
		await new Promise(setImmediate); // `run` is not awaited, let the rejection settle

		expect(executionCrashService.markAsCrashed).not.toHaveBeenCalled();
		expect(errorReporter.error).not.toHaveBeenCalled();
	});

	// CAT-3909: these used to be dropped by the read, so they stayed at `new` forever and were
	// re-reported on every restart.
	test('crashes enqueued executions whose data could not be read', async () => {
		mockEnqueued([enqueuedExecution('1')], ['2', '3']);

		await createService().recoverEnqueuedExecutions();

		expect(executionCrashService.markAsCrashed).toHaveBeenCalledExactlyOnceWith(['2', '3']);
		expect(workflowRunner.run).toHaveBeenCalledExactlyOnceWith(
			expect.anything(),
			undefined,
			false,
			{ executionId: '1', expectedStatus: 'new' },
		);
	});

	test('crashes unreadable executions even when none are runnable', async () => {
		mockEnqueued([], ['1']);

		await createService().recoverEnqueuedExecutions();

		expect(executionCrashService.markAsCrashed).toHaveBeenCalledExactlyOnceWith(['1']);
		expect(workflowRunner.run).not.toHaveBeenCalled();
	});

	test('does not crash anything when every execution is readable', async () => {
		mockEnqueued([enqueuedExecution('1')]);

		await createService().recoverEnqueuedExecutions();

		expect(executionCrashService.markAsCrashed).not.toHaveBeenCalled();
	});

	// A throw used to abort the whole loop, leaving every remaining execution at `new`.
	test('keeps going when preparing an execution throws', async () => {
		mockEnqueued([enqueuedExecution('1'), enqueuedExecution('2')]);
		ownershipService.getWorkflowProjectCached.mockRejectedValueOnce(
			new Error('workflow not found'),
		);

		await createService().recoverEnqueuedExecutions();

		expect(executionCrashService.markAsCrashed).toHaveBeenCalledExactlyOnceWith('1');
		expect(workflowRunner.run).toHaveBeenCalledExactlyOnceWith(
			expect.anything(),
			undefined,
			false,
			{
				executionId: '2',
				expectedStatus: 'new',
			},
		);
	});
});
