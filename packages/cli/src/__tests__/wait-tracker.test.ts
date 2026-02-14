/* eslint-disable @typescript-eslint/unbound-method */
import { mockLogger } from '@n8n/backend-test-utils';
import type { Project, IExecutionResponse, ExecutionRepository } from '@n8n/db';
import { mock, captor } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import type { IWorkflowBase, IRun, INode, IExecuteData, ITaskData } from 'n8n-workflow';
import { createDeferredPromise, createRunExecutionData, WAIT_INDEFINITELY } from 'n8n-workflow';

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
		it('should query DB for waiting executions if leader', () => {
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
			const setupParentExecutionTest = (shouldResume: boolean | undefined) => {
				const parentExecution = mock<IExecutionResponse>({
					id: 'parent_execution_id',
					finished: false,
				});
				parentExecution.workflowData = mock<IWorkflowBase>({ id: 'parent_workflow_id' });
				execution.data.parentExecution = {
					executionId: parentExecution.id,
					workflowId: parentExecution.workflowData.id,
					shouldResume,
				};

				// Setup child execution's result
				const finalNodeName = 'Final Node';
				const taskData: ITaskData = {
					startTime: new Date().getTime(),
					executionTime: 5,
					executionIndex: 0,
					source: [{ previousNode: 'Wait Node' }],
					data: {
						main: [[{ json: { data: 'Child final output after wait' }, pairedItem: { item: 0 } }]],
					},
				};

				const subworkflowResults: IRun = {
					mode: 'manual',
					startedAt: new Date(),
					status: 'success',
					data: createRunExecutionData({
						resultData: {
							runData: { [finalNodeName]: [taskData] },
							lastNodeExecuted: finalNodeName,
						},
					}),
					storedAt: 'db',
				};

				executionRepository.findSingleExecution
					.calledWith(parentExecution.id)
					.mockResolvedValue(parentExecution);
				const postExecutePromise = createDeferredPromise<IRun | undefined>();
				activeExecutions.getPostExecutePromise
					.calledWith(execution.id)
					.mockReturnValue(postExecutePromise.promise);

				return { parentExecution, subworkflowResults, postExecutePromise };
			};

			it('should resume parent execution once sub-workflow finishes by default', async () => {
				// ARRANGE
				const { parentExecution, postExecutePromise, subworkflowResults } =
					setupParentExecutionTest(undefined);

				// ACT 1
				await waitTracker.startExecution(execution.id);

				// ASSERT 1
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

				// ACT 1
				postExecutePromise.resolve(subworkflowResults);
				await jest.advanceTimersToNextTimerAsync();

				// ASSERT 1
				expect(workflowRunner.run).toHaveBeenCalledTimes(2);
				expect(workflowRunner.run).toHaveBeenNthCalledWith(
					2,
					{
						executionMode: parentExecution.mode,
						executionData: parentExecution.data,
						workflowData: parentExecution.workflowData,
						projectId: project.id,
						pushRef: parentExecution.data.pushRef,
						startedAt: parentExecution.startedAt,
					},
					false,
					false,
					parentExecution.id,
				);
			});

			it('should not resume parent execution when shouldResume is false', async () => {
				// ARRANGE
				const { postExecutePromise, subworkflowResults } = setupParentExecutionTest(false);

				// ACT 1
				await waitTracker.startExecution(execution.id);

				// ASSERT 1
				expect(workflowRunner.run).toHaveBeenCalledTimes(1);

				// ACT 2
				postExecutePromise.resolve(subworkflowResults);
				await jest.advanceTimersToNextTimerAsync();

				// ASSERT 2
				expect(workflowRunner.run).toHaveBeenCalledTimes(1);
			});

			it('should resume parent execution when shouldResume is true', async () => {
				// ARRANGE
				const { parentExecution, postExecutePromise, subworkflowResults } =
					setupParentExecutionTest(true);

				// ACT 1
				await waitTracker.startExecution(execution.id);

				// ASSERT 1
				expect(workflowRunner.run).toHaveBeenCalledTimes(1);

				// ACT 2
				postExecutePromise.resolve(subworkflowResults);
				await jest.advanceTimersByTimeAsync(100);

				// ASSERT 2

				// Parent execution SHOULD be started
				expect(workflowRunner.run).toHaveBeenCalledTimes(2);
				expect(workflowRunner.run).toHaveBeenNthCalledWith(
					2,
					expect.objectContaining({
						executionMode: parentExecution.mode,
						projectId: project.id,
					}),
					false,
					false,
					parentExecution.id,
				);
			});

			it('should update parent nodeExecutionStack with child final output and resume parent', async () => {
				// ARRANGE

				// Setup parent execution with Execute Workflow node waiting for child
				const executeData: IExecuteData = {
					node: mock<INode>({ name: 'Execute Sub Workflow' }),
					data: {
						main: [[{ json: { data: 'Parent input data' }, pairedItem: { item: 0 } }]],
					},
					source: { main: [{ previousNode: 'Manual Trigger' }] },
				};
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
					storedAt: 'db',
					data: createRunExecutionData({ executionData: { nodeExecutionStack: [executeData] } }),
				};

				// Amend child execution to reference parent execution
				execution.data.parentExecution = {
					executionId: parentExecution.id,
					workflowId: parentExecution.workflowData.id,
					shouldResume: true,
				};

				// Setup child execution's result
				const finalNodeName = 'Final Node';
				const taskData: ITaskData = {
					startTime: new Date().getTime(),
					executionTime: 5,
					executionIndex: 0,
					source: [{ previousNode: 'Wait Node' }],
					data: {
						main: [[{ json: { data: 'Child final output after wait' }, pairedItem: { item: 0 } }]],
					},
				};
				const subworkflowResults: IRun = {
					mode: 'manual',
					startedAt: new Date(),
					status: 'success',
					data: createRunExecutionData({
						resultData: {
							runData: { [finalNodeName]: [taskData] },
							lastNodeExecuted: finalNodeName,
						},
					}),
					storedAt: 'db',
				};

				// Setup ExecutionRepository and ActiveExecutions
				executionRepository.findSingleExecution
					.calledWith(parentExecution.id)
					.mockResolvedValue(parentExecution);
				// Mock updateExistingExecution to always succeed
				executionRepository.updateExistingExecution.mockResolvedValue(true);
				const subExecutionPromise = createDeferredPromise<IRun | undefined>();
				activeExecutions.getPostExecutePromise
					.calledWith(execution.id)
					.mockReturnValue(subExecutionPromise.promise);

				// ACT 1
				await waitTracker.startExecution(execution.id);

				// ASSERT 1
				expect(workflowRunner.run).toHaveBeenCalledTimes(1);
				expect(workflowRunner.run).toHaveBeenNthCalledWith(
					1,
					expect.any(Object),
					false,
					false,
					execution.id,
				);

				// ACT 2
				subExecutionPromise.resolve(subworkflowResults);
				await jest.advanceTimersToNextTimerAsync();

				// ASSERT 2

				// Verify parent's nodeExecutionStack was updated
				const executionDataCaptor = captor();
				expect(executionRepository.updateExistingExecution).toHaveBeenCalledWith(
					parentExecution.id,
					executionDataCaptor,
				);
				expect(executionDataCaptor.value).toMatchObject({
					data: {
						executionData: {
							nodeExecutionStack: [
								{
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
					},
				});

				// Verify parent was resumed
				expect(workflowRunner.run).toHaveBeenCalledTimes(2);
				expect(workflowRunner.run).toHaveBeenNthCalledWith(
					2,
					expect.any(Object),
					false,
					false,
					parentExecution.id,
				);
			});

			it('should not resume parent execution if it has already finished', async () => {
				// ARRANGE
				const parentExecution: IExecutionResponse = {
					id: 'parent_execution_id',
					finished: true, // Already finished
					status: 'success',
					workflowData: mock<IWorkflowBase>({ id: 'parent_workflow_id' }),
					customData: {},
					annotation: { tags: [] },
					createdAt: new Date(),
					startedAt: new Date(),
					stoppedAt: new Date(),
					mode: 'manual',
					workflowId: 'parent_workflow_id',
					storedAt: 'db',
					data: createRunExecutionData(),
				};

				executionRepository.findSingleExecution
					.calledWith(parentExecution.id)
					.mockResolvedValue(parentExecution);
				ownershipService.getWorkflowProjectCached.mockResolvedValue(project);

				// ACT & ASSERT
				await expect(waitTracker.startExecution(parentExecution.id)).rejects.toThrow(
					'The execution did succeed and can so not be started again',
				);

				// Verify execution was NOT started
				expect(workflowRunner.run).not.toHaveBeenCalled();
			});

			it('should not attempt to update parent if child has no parent execution', async () => {
				// ARRANGE

				// Setup child execution with NO parent
				const childExecution: IExecutionResponse = execution;
				childExecution.data.parentExecution = undefined;

				executionRepository.findSingleExecution
					.calledWith(childExecution.id)
					.mockResolvedValue(childExecution);
				ownershipService.getWorkflowProjectCached.mockResolvedValue(project);

				const postExecutePromise = createDeferredPromise<IRun | undefined>();
				activeExecutions.getPostExecutePromise
					.calledWith(childExecution.id)
					.mockReturnValue(postExecutePromise.promise);

				// ACT
				await waitTracker.startExecution(childExecution.id);

				// Child completes
				postExecutePromise.resolve(undefined);
				await jest.advanceTimersToNextTimerAsync();

				// ASSERT

				// Verify parent resumption logic was NOT triggered
				// workflowRunner.run should only be called once (for the child)
				expect(workflowRunner.run).toHaveBeenCalledTimes(1);
				expect(workflowRunner.run).toHaveBeenCalledWith(
					expect.objectContaining({
						executionMode: childExecution.mode,
						workflowData: childExecution.workflowData,
					}),
					false,
					false,
					childExecution.id,
				);
			});

			it('should not resume parent execution when child execution status is "waiting"', async () => {
				// ARRANGE
				const { postExecutePromise, subworkflowResults } = setupParentExecutionTest(true);

				// Modify subworkflowResults to have status 'waiting'
				const waitingSubworkflowResults: IRun = {
					...subworkflowResults,
					status: 'waiting',
				};

				// ACT 1 - Start child execution
				await waitTracker.startExecution(execution.id);

				// ASSERT 1 - Child execution should be started
				expect(workflowRunner.run).toHaveBeenCalledTimes(1);
				expect(workflowRunner.run).toHaveBeenNthCalledWith(
					1,
					expect.objectContaining({
						executionMode: execution.mode,
						workflowData: execution.workflowData,
					}),
					false,
					false,
					execution.id,
				);

				// ACT 2 - Child execution goes into waiting state
				postExecutePromise.resolve(waitingSubworkflowResults);
				await jest.advanceTimersToNextTimerAsync();

				// ASSERT 2 - Parent execution should NOT be resumed
				expect(executionRepository.updateExistingExecution).not.toHaveBeenCalled();
				expect(workflowRunner.run).toHaveBeenCalledTimes(1);
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
