import type { EventService } from '@n8n/backend-services';
import { mockLogger } from '@n8n/backend-test-utils';
import type { ExecutionsConfig } from '@n8n/config';
import type { IExecutionResponse, Project } from '@n8n/db';
import type { ErrorReporter } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { ExecutionAlreadyResumingError } from '@/errors/execution-already-resuming.error';
import { MissingExecutionDataError } from '@/executions/execution-data/missing-execution-data.error';
import { EnqueuedExecutionRecoveryService } from '@/executions/enqueued-execution-recovery.service';
import type { ExecutionCrashService } from '@/executions/execution-crash.service';
import type { ExecutionPersistence } from '@/executions/execution-persistence';
import type { ExecutionService } from '@/executions/execution.service';
import type { ResumeAttemptService } from '@/executions/resume-attempt.service';
import type { OwnershipService } from '@/services/ownership.service';
import type { WorkflowPublisherService } from '@/workflows/workflow-publisher.service';
import type { WorkflowRunner } from '@/workflow-runner';

const project = mock<Project>({ id: 'project-1' });

const enqueuedExecution = (id: string) =>
	mock<IExecutionResponse>({
		id,
		mode: 'webhook',
		workflowId: `workflow-for-${id}`,
		storedAt: 'fs',
	});

describe('EnqueuedExecutionRecoveryService', () => {
	const logger = mockLogger();
	vi.mocked(logger.scoped).mockReturnValue(logger);
	const errorReporter = mock<ErrorReporter>();
	const executionService = mock<ExecutionService>();
	const executionPersistence = mock<ExecutionPersistence>();
	const executionCrashService = mock<ExecutionCrashService>();
	const resumeAttemptService = mock<ResumeAttemptService>();
	const ownershipService = mock<OwnershipService>();
	const workflowPublisherService = mock<WorkflowPublisherService>();
	const workflowRunner = mock<WorkflowRunner>();
	const eventService = mock<EventService>();

	const createService = (mode: 'regular' | 'queue' = 'regular') =>
		new EnqueuedExecutionRecoveryService(
			logger,
			errorReporter,
			mock<ExecutionsConfig>({ mode }),
			executionService,
			executionPersistence,
			executionCrashService,
			resumeAttemptService,
			ownershipService,
			workflowPublisherService,
			workflowRunner,
			eventService,
		);

	/** Enqueued rows by id; an id without a row has unreadable data. */
	const mockEnqueued = (executions: Array<IExecutionResponse | string>) => {
		const ids = executions.map((e) => (typeof e === 'string' ? e : e.id));
		const rows = new Map(
			executions.flatMap((e) => (typeof e === 'string' ? [] : [[e.id, e] as const])),
		);
		executionService.findEnqueuedExecutionIds.mockResolvedValue(ids);
		executionPersistence.findSingleExecution.mockImplementation(async (id) => rows.get(id));
	};

	beforeEach(() => {
		vi.clearAllMocks();
		ownershipService.getWorkflowProjectCached.mockResolvedValue(project);
		workflowRunner.run.mockResolvedValue('1');
		resumeAttemptService.claim.mockResolvedValue({ granted: true, attempt: 1 });
	});

	test('refuses to touch anything in queue mode', async () => {
		mockEnqueued([enqueuedExecution('1')]);

		await expect(createService('queue').recoverEnqueuedExecutions()).rejects.toThrow(
			'Enqueued execution recovery must not run in queue mode',
		);

		expect(executionService.findEnqueuedExecutionIds).not.toHaveBeenCalled();
		expect(workflowRunner.run).not.toHaveBeenCalled();
	});

	test('runs each enqueued execution, claiming it while it is still `new`', async () => {
		mockEnqueued([enqueuedExecution('1'), enqueuedExecution('2')]);

		await createService().recoverEnqueuedExecutions();

		expect(workflowRunner.run).toHaveBeenCalledWith(
			expect.objectContaining({ executionMode: 'webhook', projectId: 'project-1' }),
			undefined,
			false,
			{ executionId: '1', expectedStatus: 'new', storedAt: 'fs' },
		);
		expect(workflowRunner.run.mock.calls.map((call) => call[3])).toEqual([
			{ executionId: '1', expectedStatus: 'new', storedAt: 'fs' },
			{ executionId: '2', expectedStatus: 'new', storedAt: 'fs' },
		]);
	});

	// The data of every enqueued execution used to be read in one query before any attempt
	// could be counted, so a crash during that read repeated on every boot.
	test('claims a resume attempt before it loads each execution', async () => {
		mockEnqueued([enqueuedExecution('1'), enqueuedExecution('2')]);

		await createService().recoverEnqueuedExecutions();

		expect(resumeAttemptService.claim.mock.calls).toEqual([
			['1', 'new'],
			['2', 'new'],
		]);
		const [firstClaim, secondClaim] = resumeAttemptService.claim.mock.invocationCallOrder;
		const [firstRead, secondRead] =
			executionPersistence.findSingleExecution.mock.invocationCallOrder;
		expect(firstClaim).toBeLessThan(firstRead);
		expect(secondClaim).toBeLessThan(secondRead);
	});

	test('skips an execution whose resume attempts are used up and keeps going', async () => {
		mockEnqueued([enqueuedExecution('1'), enqueuedExecution('2')]);
		resumeAttemptService.claim.mockResolvedValueOnce({ granted: false });

		await createService().recoverEnqueuedExecutions();

		expect(executionPersistence.findSingleExecution).not.toHaveBeenCalledWith(
			'1',
			expect.anything(),
		);
		expect(executionCrashService.markAsCrashed).not.toHaveBeenCalled();
		expect(workflowRunner.run).toHaveBeenCalledExactlyOnceWith(
			expect.anything(),
			undefined,
			false,
			{ executionId: '2', expectedStatus: 'new', storedAt: 'fs' },
		);
	});

	test('does not crash an execution that another process claimed first', async () => {
		mockEnqueued([enqueuedExecution('1'), enqueuedExecution('2')]);
		resumeAttemptService.claim.mockRejectedValueOnce(new ExecutionAlreadyResumingError('1'));

		await createService().recoverEnqueuedExecutions();

		expect(executionCrashService.markAsCrashed).not.toHaveBeenCalled();
		expect(errorReporter.error).not.toHaveBeenCalled();
		expect(workflowRunner.run).toHaveBeenCalledTimes(1);
	});

	// CAT-3862: previously the rejection landed in a void'd promise and the row stayed `new`.
	test('marks an execution as crashed when its run rejects', async () => {
		mockEnqueued([enqueuedExecution('1'), enqueuedExecution('2')]);
		workflowRunner.run.mockRejectedValueOnce(new Error('cannot start'));

		await createService().recoverEnqueuedExecutions();
		await new Promise(setImmediate); // `run` is not awaited, let the rejection settle

		expect(executionCrashService.markAsCrashed).toHaveBeenCalledExactlyOnceWith(
			'1',
			'start-failure',
		);
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
		mockEnqueued(['2', enqueuedExecution('1')]);

		await createService().recoverEnqueuedExecutions();

		expect(executionCrashService.markAsCrashed).toHaveBeenCalledExactlyOnceWith(
			'2',
			'start-failure',
		);
		expect(workflowRunner.run).toHaveBeenCalledExactlyOnceWith(
			expect.anything(),
			undefined,
			false,
			{ executionId: '1', expectedStatus: 'new', storedAt: 'fs' },
		);
	});

	test('crashes an execution whose data bundle is gone for good', async () => {
		mockEnqueued([enqueuedExecution('1'), enqueuedExecution('2')]);
		executionPersistence.findSingleExecution.mockRejectedValueOnce(
			new MissingExecutionDataError({ executionId: '1', workflowId: 'workflow-for-1' }),
		);

		await createService().recoverEnqueuedExecutions();

		expect(executionCrashService.markAsCrashed).toHaveBeenCalledExactlyOnceWith(
			'1',
			'start-failure',
		);
		expect(resumeAttemptService.release).not.toHaveBeenCalled();
		expect(workflowRunner.run).toHaveBeenCalledTimes(1);
	});

	// A read that fails for a reason that can pass must not take the execution out of the
	// queue for good, and must not count as a resume that killed the process.
	test('leaves an execution `new` and gives its attempt back when the load fails', async () => {
		mockEnqueued([enqueuedExecution('1'), enqueuedExecution('2')]);
		executionPersistence.findSingleExecution.mockRejectedValueOnce(new Error('database is locked'));

		await createService().recoverEnqueuedExecutions();

		expect(executionCrashService.markAsCrashed).not.toHaveBeenCalled();
		expect(resumeAttemptService.release).toHaveBeenCalledExactlyOnceWith('1', 'new', 1);
		expect(workflowRunner.run).toHaveBeenCalledExactlyOnceWith(
			expect.anything(),
			undefined,
			false,
			{ executionId: '2', expectedStatus: 'new', storedAt: 'fs' },
		);
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

		expect(executionCrashService.markAsCrashed).toHaveBeenCalledExactlyOnceWith(
			'1',
			'start-failure',
		);
		expect(workflowRunner.run).toHaveBeenCalledExactlyOnceWith(
			expect.anything(),
			undefined,
			false,
			{
				executionId: '2',
				expectedStatus: 'new',
				storedAt: 'fs',
			},
		);
	});
});
