import { mockLogger } from '@n8n/backend-test-utils';
import type { Project, IExecutionResponse } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import type { IWorkflowBase, IRun, INode, IRunExecutionData } from 'n8n-workflow';
import { createDeferredPromise, WAIT_INDEFINITELY } from 'n8n-workflow';

import type { ActiveExecutions } from '@/active-executions';
import type { MultiMainSetup } from '@/scaling/multi-main-setup.ee';
import type { OwnershipService } from '@/services/ownership.service';
import { WaitTracker } from '@/wait-tracker';
import type { WorkflowRunner } from '@/workflow-runner';

jest.useFakeTimers({ advanceTimers: true });

describe('WaitTracker', () => {
	const activeExecutions = mock<ActiveExecutions>();
	const ownershipService = mock<OwnershipService>();
	const workflowRunner = mock<WorkflowRunner>();
	const executionRepository = mock<ExecutionRepository>();
	const multiMainSetup = mock<MultiMainSetup>();
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
		startedAt: undefined,
	});
	execution.workflowData = mock<IWorkflowBase>({ id: 'abcd' });

	let waitTracker: WaitTracker;
	beforeEach(() => {
		// Register mocked ExecutionRepository in Container so helper functions can access it
		Container.set(ExecutionRepository, executionRepository);

		waitTracker = new WaitTracker(
			mockLogger(),
			executionRepository,
			ownershipService,
			activeExecutions,
			workflowRunner,
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

		describe('parent execution with waiting sub-workflow', () => {
			// TODO: AI generated test, check it before merging
			it('should update parent nodeExecutionStack with child final output and resume parent', async () => {
				// Setup parent execution with Execute Workflow node waiting for child
				const parentExecution: IExecutionResponse = {
					id: 'parent_execution_id',
					finished: false,
					status: 'waiting',
					waitTill: WAIT_INDEFINITELY,
					workflowData: mock<IWorkflowBase>({ id: 'parent_workflow_id' }),
					customData: {},
					annotation: { tags: [] },
					createdAt: new Date(),
					startedAt: new Date(),
					mode: 'manual',
					workflowId: 'parent_workflow_id',
					data: {
						resultData: {
							runData: {},
							lastNodeExecuted: 'Execute Sub Workflow',
						},
						executionData: {
							contextData: {},
							nodeExecutionStack: [
								{
									node: mock<INode>({ name: 'Execute Sub Workflow' }),
									data: {
										main: [
											[
												{
													json: { data: 'Parent input data' },
													pairedItem: { item: 0 },
												},
											],
										],
									},
									source: { main: [{ previousNode: 'Manual Trigger' }] },
								},
							],
							metadata: {},
							waitingExecution: {},
							waitingExecutionSource: {},
						},
					} as unknown as IRunExecutionData,
				};

				execution.data.parentExecution = {
					executionId: parentExecution.id,
					workflowId: parentExecution.workflowData.id,
					shouldResume: true,
				};

				executionRepository.findSingleExecution
					.calledWith(parentExecution.id)
					.mockResolvedValue(parentExecution);
				// Mock updateExistingExecution to always succeed
				executionRepository.updateExistingExecution.mockImplementation(async () => true);

				const postExecutePromise = createDeferredPromise<IRun | undefined>();
				activeExecutions.getPostExecutePromise
					.calledWith(execution.id)
					.mockReturnValue(postExecutePromise.promise);

				await waitTracker.startExecution(execution.id);

				expect(workflowRunner.run).toHaveBeenCalledTimes(1);

				// Child completes with final output
				const subworkflowResults: IRun = {
					mode: 'manual',
					startedAt: new Date(),
					status: 'success',
					data: {
						resultData: {
							runData: {
								'Final Node': [
									{
										hints: [],
										startTime: new Date().getTime(),
										executionTime: 5,
										executionIndex: 0,
										source: [{ previousNode: 'Wait Node' }],
										executionStatus: 'success',
										data: {
											main: [
												[
													{
														json: { data: 'Child final output after wait' },
														pairedItem: { item: 0 },
													},
												],
											],
										},
									},
								],
							},
							lastNodeExecuted: 'Final Node',
						},
					} as unknown as IRunExecutionData,
				};

				postExecutePromise.resolve(subworkflowResults);
				await jest.advanceTimersByTimeAsync(10000); // Need longer timeout due to random delay in updateParentExecutionWithChildResults

				// Verify parent's nodeExecutionStack was updated
				expect(executionRepository.updateExistingExecution).toHaveBeenCalledWith(
					parentExecution.id,
					expect.objectContaining({
						data: expect.objectContaining({
							executionData: expect.objectContaining({
								nodeExecutionStack: expect.arrayContaining([
									expect.objectContaining({
										data: {
											main: [
												[
													{
														json: { data: 'Child final output after wait' },
														pairedItem: { item: 0 },
													},
												],
											],
										},
									}),
								]),
							}),
						}),
					}),
				);

				// Verify parent was resumed
				expect(workflowRunner.run).toHaveBeenCalledTimes(2);
			});
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
				mock<InstanceSettings>({ isLeader: false, isMultiMain: false }),
			);

			executionRepository.getWaitingExecutions.mockResolvedValue([]);

			waitTracker.init();

			expect(executionRepository.getWaitingExecutions).not.toHaveBeenCalled();
		});
	});
});
