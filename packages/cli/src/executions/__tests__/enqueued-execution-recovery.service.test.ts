import { mockLogger } from '@n8n/backend-test-utils';
import type { ExecutionRepository, IExecutionResponse, Project } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { ErrorReporter } from 'n8n-core';
import type { IWorkflowBase } from 'n8n-workflow';

import { ExecutionAlreadyResumingError } from '@/errors/execution-already-resuming.error';
import type { EventService } from '@/events/event.service';
import { EnqueuedExecutionRecoveryService } from '@/executions/enqueued-execution-recovery.service';
import type { ResumeAttemptService } from '@/executions/resume-attempt.service';
import type { OwnershipService } from '@/services/ownership.service';
import type { WorkflowRunner } from '@/workflow-runner';

describe('EnqueuedExecutionRecoveryService', () => {
	const errorReporter = mock<ErrorReporter>();
	const executionRepository = mock<ExecutionRepository>();
	const resumeAttemptService = mock<ResumeAttemptService>();
	const ownershipService = mock<OwnershipService>();
	const workflowRunner = mock<WorkflowRunner>();
	const eventService = mock<EventService>();
	const project = mock<Project>({ id: 'projectId' });

	const service = new EnqueuedExecutionRecoveryService(
		mockLogger(),
		errorReporter,
		executionRepository,
		resumeAttemptService,
		ownershipService,
		workflowRunner,
		eventService,
	);

	const enqueuedExecution = (id: string) =>
		mock<IExecutionResponse>({
			id,
			mode: 'trigger',
			workflowId: 'workflowId',
			workflowData: mock<IWorkflowBase>({ id: 'workflowId' }),
		});

	/** Enqueued rows by id. An id without a row is gone by the time it is read. */
	const mockEnqueued = (executions: Array<IExecutionResponse | string>) => {
		const ids = executions.map((e) => (typeof e === 'string' ? e : e.id));
		const rows = executions.filter((e): e is IExecutionResponse => typeof e !== 'string');
		executionRepository.findEnqueuedIds.mockResolvedValue(ids);
		executionRepository.findSingleExecution.mockImplementation(async (id) =>
			rows.find((e) => e.id === id),
		);
	};

	const runArgsFor = (execution: IExecutionResponse) => [
		{
			executionMode: execution.mode,
			executionData: execution.data,
			workflowData: execution.workflowData,
			projectId: project.id,
		},
		undefined,
		false,
		execution.id,
	];

	beforeEach(() => {
		jest.clearAllMocks();
		ownershipService.getWorkflowProjectCached.mockResolvedValue(project);
		workflowRunner.run.mockResolvedValue('1');
		resumeAttemptService.claim.mockResolvedValue({ granted: true, attempt: 1 });
	});

	test('does nothing when no execution is enqueued', async () => {
		mockEnqueued([]);

		await service.recoverEnqueuedExecutions();

		expect(resumeAttemptService.claim).not.toHaveBeenCalled();
		expect(workflowRunner.run).not.toHaveBeenCalled();
	});

	test('starts each enqueued execution and reports the start', async () => {
		const [first, second] = [enqueuedExecution('1'), enqueuedExecution('2')];
		mockEnqueued([first, second]);

		await service.recoverEnqueuedExecutions();

		expect(workflowRunner.run).toHaveBeenCalledTimes(2);
		expect(workflowRunner.run).toHaveBeenNthCalledWith(1, ...runArgsFor(first));
		expect(workflowRunner.run).toHaveBeenNthCalledWith(2, ...runArgsFor(second));
		expect(eventService.emit).toHaveBeenCalledWith('execution-started-during-bootup', {
			executionId: '1',
		});
		expect(eventService.emit).toHaveBeenCalledWith('execution-started-during-bootup', {
			executionId: '2',
		});
	});

	test('claims a resume attempt before it loads each execution', async () => {
		mockEnqueued([enqueuedExecution('1'), enqueuedExecution('2')]);

		await service.recoverEnqueuedExecutions();

		expect(resumeAttemptService.claim.mock.calls).toEqual([
			['1', 'new'],
			['2', 'new'],
		]);
		const [firstClaim, secondClaim] = resumeAttemptService.claim.mock.invocationCallOrder;
		const [firstRead, secondRead] =
			executionRepository.findSingleExecution.mock.invocationCallOrder;
		expect(firstClaim).toBeLessThan(firstRead);
		expect(secondClaim).toBeLessThan(secondRead);
	});

	test('skips an execution whose resume attempts are used up and keeps going', async () => {
		const second = enqueuedExecution('2');
		mockEnqueued([enqueuedExecution('1'), second]);
		resumeAttemptService.claim.mockResolvedValueOnce({ granted: false });

		await service.recoverEnqueuedExecutions();

		expect(executionRepository.findSingleExecution).not.toHaveBeenCalledWith(
			'1',
			expect.anything(),
		);
		expect(workflowRunner.run).toHaveBeenCalledTimes(1);
		expect(workflowRunner.run).toHaveBeenCalledWith(...runArgsFor(second));
	});

	test('skips an execution that another process claimed first', async () => {
		mockEnqueued([enqueuedExecution('1'), enqueuedExecution('2')]);
		resumeAttemptService.claim.mockRejectedValueOnce(new ExecutionAlreadyResumingError('1'));

		await service.recoverEnqueuedExecutions();

		expect(errorReporter.error).not.toHaveBeenCalled();
		expect(workflowRunner.run).toHaveBeenCalledTimes(1);
	});

	test('skips an execution that is gone by the time it is read', async () => {
		const second = enqueuedExecution('2');
		mockEnqueued(['1', second]);

		await service.recoverEnqueuedExecutions();

		expect(resumeAttemptService.release).not.toHaveBeenCalled();
		expect(workflowRunner.run).toHaveBeenCalledTimes(1);
		expect(workflowRunner.run).toHaveBeenCalledWith(...runArgsFor(second));
	});

	test('leaves an execution `new` and gives its attempt back when the load fails', async () => {
		const second = enqueuedExecution('2');
		mockEnqueued([enqueuedExecution('1'), second]);
		const error = new Error('database is locked');
		executionRepository.findSingleExecution.mockRejectedValueOnce(error);

		await service.recoverEnqueuedExecutions();

		expect(resumeAttemptService.release).toHaveBeenCalledTimes(1);
		expect(resumeAttemptService.release).toHaveBeenCalledWith('1', 'new', 1);
		expect(errorReporter.error).toHaveBeenCalledWith(error, {
			executionId: '1',
			shouldBeLogged: false,
		});
		expect(workflowRunner.run).toHaveBeenCalledTimes(1);
		expect(workflowRunner.run).toHaveBeenCalledWith(...runArgsFor(second));
	});

	test('reports an execution that fails to start and keeps going', async () => {
		const second = enqueuedExecution('2');
		mockEnqueued([enqueuedExecution('1'), second]);
		const error = new Error('project lookup failed');
		ownershipService.getWorkflowProjectCached.mockRejectedValueOnce(error);

		await service.recoverEnqueuedExecutions();

		expect(errorReporter.error).toHaveBeenCalledWith(error, {
			executionId: '1',
			shouldBeLogged: false,
		});
		expect(workflowRunner.run).toHaveBeenCalledTimes(1);
		expect(workflowRunner.run).toHaveBeenCalledWith(...runArgsFor(second));
	});
});
