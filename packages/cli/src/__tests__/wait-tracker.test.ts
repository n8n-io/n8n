import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import type { IRun, IWorkflowBase } from 'n8n-workflow';
import { createDeferredPromise } from 'n8n-workflow';

import type { ActiveExecutions } from '@/active-executions';
import type { Project } from '@/databases/entities/project';
import type { ExecutionRepository } from '@/databases/repositories/execution.repository';
import type { IExecutionResponse } from '@/interfaces';
import type { MultiMainSetup } from '@/scaling/multi-main-setup.ee';
import { OrchestrationService } from '@/services/orchestration.service';
import type { OwnershipService } from '@/services/ownership.service';
import { WaitTracker } from '@/wait-tracker';
import type { WorkflowRunner } from '@/workflow-runner';
import { mockLogger } from '@test/mocking';

jest.useFakeTimers({ advanceTimers: true });

describe('WaitTracker', () => {
	const activeExecutions = mock<ActiveExecutions>();
	const ownershipService = mock<OwnershipService>();
	const workflowRunner = mock<WorkflowRunner>();
	const executionRepository = mock<ExecutionRepository>();
	const multiMainSetup = mock<MultiMainSetup>();
	const orchestrationService = new OrchestrationService(mock(), multiMainSetup, mock());
	const instanceSettings = mock<InstanceSettings>({ isLeader: true, isMultiMain: false });

	const project = mock<Project>({ id: 'projectId' });
	const execution = mock<IExecutionResponse>({
		id: '123',
		finished: false,
		waitTill: new Date(Date.now() + 1000),
		mode: 'manual',
		data: mock({
			pushRef: 'push_ref',
			parentExecution: undefined,
		}),
	});
	execution.workflowData = mock<IWorkflowBase>({ id: 'abcd' });

	let waitTracker: WaitTracker;
	beforeEach(() => {
		waitTracker = new WaitTracker(
			mockLogger(),
			executionRepository,
			ownershipService,
			activeExecutions,
			workflowRunner,
			orchestrationService,
			instanceSettings,
		);
		multiMainSetup.on.mockReturnThis();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('init()', () => {
		it('should query DB for waiting executions if leader', async () => {
			executionRepository.getWaitingExecutions.mockResolvedValue([execution]);

			waitTracker.init();

			expect(executionRepository.getWaitingExecutions).toHaveBeenCalledTimes(1);
		});

		it('if follower, should do nothing', () => {
			executionRepository.getWaitingExecutions.mockResolvedValue([]);

			waitTracker.init();

			expect(executionRepository.findSingleExecution).not.toHaveBeenCalled();
		});

		it('if no executions to start, should do nothing', () => {
			executionRepository.getWaitingExecutions.mockResolvedValue([]);

			waitTracker.init();

			expect(executionRepository.findSingleExecution).not.toHaveBeenCalled();
		});

		describe('if execution to start', () => {
			let startExecutionSpy: jest.SpyInstance<Promise<void>, [executionId: string]>;

			beforeEach(() => {
				executionRepository.findSingleExecution
					.calledWith(execution.id)
					.mockResolvedValue(execution);
				executionRepository.getWaitingExecutions.mockResolvedValue([execution]);
				ownershipService.getWorkflowProjectCached.mockResolvedValue(project);

				startExecutionSpy = jest
					.spyOn(waitTracker, 'startExecution')
					.mockImplementation(async () => {});

				waitTracker.init();
			});

			it('if not enough time passed, should not start execution', async () => {
				await waitTracker.getWaitingExecutions();

				jest.advanceTimersByTime(100);

				expect(startExecutionSpy).not.toHaveBeenCalled();
			});

			it('if enough time passed, should start execution', async () => {
				await waitTracker.getWaitingExecutions();

				jest.advanceTimersByTime(2_000);

				expect(startExecutionSpy).toHaveBeenCalledWith(execution.id);
			});
		});
	});

	describe('startExecution()', () => {
		beforeEach(() => {
			executionRepository.getWaitingExecutions.mockResolvedValue([]);
			waitTracker.init();

			executionRepository.findSingleExecution.calledWith(execution.id).mockResolvedValue(execution);
			ownershipService.getWorkflowProjectCached.mockResolvedValue(project);

			execution.data.parentExecution = undefined;
		});

		it('should query for execution to start', async () => {
			await waitTracker.startExecution(execution.id);

			expect(executionRepository.findSingleExecution).toHaveBeenCalledWith(execution.id, {
				includeData: true,
				unflattenData: true,
			});

			expect(workflowRunner.run).toHaveBeenCalledWith(
				{
					executionMode: execution.mode,
					executionData: execution.data,
					workflowData: execution.workflowData,
					projectId: project.id,
					pushRef: execution.data.pushRef,
				},
				false,
				false,
				execution.id,
			);
		});

		it('should also resume parent execution once sub-workflow finishes', async () => {
			const parentExecution = mock<IExecutionResponse>({
				id: 'parent_execution_id',
				finished: false,
			});
			parentExecution.workflowData = mock<IWorkflowBase>({ id: 'parent_workflow_id' });
			execution.data.parentExecution = {
				executionId: parentExecution.id,
				workflowId: parentExecution.workflowData.id,
			};
			executionRepository.findSingleExecution
				.calledWith(parentExecution.id)
				.mockResolvedValue(parentExecution);
			const postExecutePromise = createDeferredPromise<IRun | undefined>();
			activeExecutions.getPostExecutePromise
				.calledWith(execution.id)
				.mockReturnValue(postExecutePromise.promise);

			await waitTracker.startExecution(execution.id);

			expect(executionRepository.findSingleExecution).toHaveBeenNthCalledWith(1, execution.id, {
				includeData: true,
				unflattenData: true,
			});

			expect(workflowRunner.run).toHaveBeenCalledTimes(1);
			expect(workflowRunner.run).toHaveBeenNthCalledWith(
				1,
				{
					executionMode: execution.mode,
					executionData: execution.data,
					workflowData: execution.workflowData,
					projectId: project.id,
					pushRef: execution.data.pushRef,
				},
				false,
				false,
				execution.id,
			);

			postExecutePromise.resolve(mock<IRun>());
			await jest.advanceTimersByTimeAsync(100);

			expect(workflowRunner.run).toHaveBeenCalledTimes(2);
			expect(workflowRunner.run).toHaveBeenNthCalledWith(
				2,
				{
					executionMode: parentExecution.mode,
					executionData: parentExecution.data,
					workflowData: parentExecution.workflowData,
					projectId: project.id,
					pushRef: parentExecution.data.pushRef,
				},
				false,
				false,
				parentExecution.id,
			);
		});
	});

	describe('single-main setup', () => {
		it('should start tracking', () => {
			executionRepository.getWaitingExecutions.mockResolvedValue([]);

			waitTracker.init();

			expect(executionRepository.getWaitingExecutions).toHaveBeenCalledTimes(1);
		});
	});

	describe('multi-main setup', () => {
		it('should start tracking if leader', () => {
			executionRepository.getWaitingExecutions.mockResolvedValue([]);

			waitTracker.init();

			expect(executionRepository.getWaitingExecutions).toHaveBeenCalledTimes(1);
		});

		it('should not start tracking if follower', () => {
			const waitTracker = new WaitTracker(
				mockLogger(),
				executionRepository,
				ownershipService,
				activeExecutions,
				workflowRunner,
				orchestrationService,
				mock<InstanceSettings>({ isLeader: false, isMultiMain: false }),
			);

			executionRepository.getWaitingExecutions.mockResolvedValue([]);

			waitTracker.init();

			expect(executionRepository.getWaitingExecutions).not.toHaveBeenCalled();
		});
	});
});
