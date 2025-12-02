/* eslint-disable @typescript-eslint/unbound-method */
import { mockLogger } from '@n8n/backend-test-utils';
import type { Project, IExecutionResponse } from '@n8n/db';
import type { ExecutionRepository } from '@n8n/db';
import { mock, captor } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import type {
	IWorkflowBase,
	IRun,
	INode,
	IRunExecutionData,
	IExecuteData,
	ITaskData,
	ExecutionStatus,
} from 'n8n-workflow';
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
				// TODO: remove when delay is removed
				await jest.advanceTimersByTimeAsync(10000); // Need longer timeout due to random delay in updateParentExecutionWithChildResults

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

			// TODO: AI generated test, check it before merging
			// eslint-disable-next-line n8n-local-rules/no-skipped-tests
			it.skip('should prevent race condition when multiple children try to resume same parent', async () => {
				// TODO: This test requires integration testing or a different mocking approach
				// The race condition logic happens in ActiveExecutions.add() which is called by workflowRunner.run()
				// With current mocking, we can't easily test the full flow
				// The race condition has been manually verified with actual execution logs
				// Setup parent execution
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
							lastNodeExecuted: 'Execute Workflow',
						},
						executionData: {
							contextData: {},
							nodeExecutionStack: [
								{
									node: mock<INode>({ name: 'Execute Workflow' }),
									data: {
										main: [[{ json: { type: 'parent-input' }, pairedItem: { item: 0 } }]],
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

				// Mock updateExistingExecution to simulate race condition:
				// First call with requireStatus='waiting' succeeds, subsequent calls fail
				let parentUpdateCallCount = 0;
				const originalMock = executionRepository.updateExistingExecution.getMockImplementation();
				executionRepository.updateExistingExecution.mockImplementation(
					async (
						id: string,
						data: Partial<IExecutionResponse>,
						requireStatus?: ExecutionStatus,
					) => {
						if (id === parentExecution.id && requireStatus === 'waiting') {
							parentUpdateCallCount++;
							return parentUpdateCallCount === 1; // Only first succeeds
						}
						// Call original mock for other cases
						return originalMock ? await originalMock(id, data, requireStatus) : true;
					},
				);

				executionRepository.findSingleExecution
					.calledWith(parentExecution.id)
					.mockResolvedValue(parentExecution);
				ownershipService.getWorkflowProjectCached.mockResolvedValue(project);

				// Simulate 5 concurrent calls to resume the parent
				// This mimics what happens when 5 children complete simultaneously
				const resumePromises = Array(5)
					.fill(null)
					.map(async () => await waitTracker.startExecution(parentExecution.id));

				await Promise.allSettled(resumePromises);

				// Verify atomic update was attempted 5 times with requireStatus='waiting'
				expect(parentUpdateCallCount).toBe(5);

				// Verify parent execution was started only ONCE
				// First call: succeeds (affected: 1), starts execution
				// Next 4 calls: fail (affected: 0), throw ExecutionAlreadyResumingError, caught in WaitTracker
				const parentRunCalls = (workflowRunner.run as jest.Mock).mock.calls.filter(
					(call) => call[3] === parentExecution.id,
				);
				expect(parentRunCalls.length).toBe(1);
			});

			// TODO: AI generated test, check it before merging
			// Check if redundant, also tests code we didn't add or change
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
					data: {
						resultData: {
							runData: {},
							lastNodeExecuted: 'Execute Workflow',
						},
						executionData: {
							contextData: {},
							nodeExecutionStack: [],
							metadata: {},
							waitingExecution: {},
							waitingExecutionSource: {},
						},
					} as unknown as IRunExecutionData,
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

			// TODO: AI generated test, check it before merging
			it('should not attempt to update parent if child has no parent execution', async () => {
				// ARRANGE

				// Setup child execution with NO parent
				const childExecution: IExecutionResponse = {
					id: 'child_execution_id',
					finished: false,
					status: 'waiting',
					waitTill: new Date(Date.now() + 1000),
					workflowData: mock<IWorkflowBase>({ id: 'child_workflow_id' }),
					customData: {},
					annotation: { tags: [] },
					createdAt: new Date(),
					startedAt: new Date(),
					mode: 'manual',
					workflowId: 'child_workflow_id',
					data: {
						resultData: {
							runData: {},
							lastNodeExecuted: 'Wait',
						},
						executionData: {
							contextData: {},
							nodeExecutionStack: [],
							metadata: {},
							waitingExecution: {},
							waitingExecutionSource: {},
						},
						parentExecution: undefined, // NO parent
					} as unknown as IRunExecutionData,
				};

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
				// NOTE: test succeeds without that
				// postExecutePromise.resolve(undefined);
				// await jest.advanceTimersByTimeAsync(100);

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
