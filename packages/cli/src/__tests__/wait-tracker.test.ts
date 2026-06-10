/* eslint-disable @typescript-eslint/unbound-method */
import type { Logger } from '@n8n/backend-common';
import { mockLogger } from '@n8n/backend-test-utils';
import type { Project, IExecutionResponse, ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock, captor } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import type { IWorkflowBase, IRun, INode, IExecuteData, ITaskData } from 'n8n-workflow';
import {
	createDeferredPromise,
	createRunExecutionData,
	UnexpectedError,
	WAIT_INDEFINITELY,
} from 'n8n-workflow';

import type { ActiveExecutions } from '@/active-executions';
import { ExecutionPersistence } from '@/executions/execution-persistence';
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
	const executionPersistence = mock<ExecutionPersistence>();
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
			resultData: {
				lastNodeExecuted: undefined,
				runData: {},
			},
		}),
		startedAt: undefined,
	});
	execution.workflowData = mock<IWorkflowBase>({ id: 'abcd', nodes: [] });

	let waitTracker: WaitTracker;
	let logger: Logger;
	beforeEach(() => {
		// The constructor reassigns `this.logger = this.logger.scoped('waiting-executions')`,
		// so the tracker logs through the *return value* of `scoped()`, not the injected mock.
		// Make `scoped()` return the same mock so `logger.error` assertions observe those calls.
		logger = mock<Logger>();
		(logger.scoped as jest.Mock).mockReturnValue(logger);
		Container.set(ExecutionPersistence, executionPersistence);
		waitTracker = new WaitTracker(
			logger,
			executionRepository,
			executionPersistence,
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

			expect(executionPersistence.findSingleExecution).not.toHaveBeenCalled();
		});

		it('if no executions to start, should do nothing', () => {
			executionRepository.getWaitingExecutions.mockResolvedValue([]);

			waitTracker.init();

			expect(executionPersistence.findSingleExecution).not.toHaveBeenCalled();
		});

		describe('if execution to start', () => {
			let startExecutionSpy: jest.SpyInstance<Promise<void>, [executionId: string]>;

			beforeEach(() => {
				executionPersistence.findSingleExecution
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

			executionPersistence.findSingleExecution
				.calledWith(execution.id)
				.mockResolvedValue(execution);
			ownershipService.getWorkflowProjectCached.mockResolvedValue(project);

			execution.data.parentExecution = undefined;
		});

		it('should query for execution to start', async () => {
			await waitTracker.startExecution(execution.id);

			expect(executionPersistence.findSingleExecution).toHaveBeenCalledWith(execution.id, {
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

		it('should preserve original startedAt timestamp when resuming execution', async () => {
			const originalStartedAt = new Date('2025-12-02T09:04:47.150Z');
			const executionWithStartedAt = {
				...execution,
				startedAt: originalStartedAt,
			};

			executionPersistence.findSingleExecution
				.calledWith(execution.id)
				.mockResolvedValue(executionWithStartedAt);

			await waitTracker.startExecution(execution.id);

			expect(workflowRunner.run).toHaveBeenCalledWith(
				expect.objectContaining({
					startedAt: originalStartedAt,
				}),
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
					data: createRunExecutionData(),
				});
				parentExecution.workflowData = mock<IWorkflowBase>({ id: 'parent_workflow_id', nodes: [] });
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

				executionPersistence.findSingleExecution
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
				expect(executionPersistence.findSingleExecution).toHaveBeenNthCalledWith(1, execution.id, {
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
					workflowData: mock<IWorkflowBase>({ id: 'parent_workflow_id', nodes: [] }),
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

				executionPersistence.findSingleExecution
					.calledWith(parentExecution.id)
					.mockResolvedValue(parentExecution);
				// Mock updateExistingExecution to always succeed
				executionPersistence.updateExistingExecution.mockResolvedValue(true);
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
				expect(executionPersistence.updateExistingExecution).toHaveBeenCalledWith(
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

				executionPersistence.findSingleExecution
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

				executionPersistence.findSingleExecution
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
				expect(executionPersistence.updateExistingExecution).not.toHaveBeenCalled();
				expect(workflowRunner.run).toHaveBeenCalledTimes(1);
			});

			describe('error handling on resuming parent execution', () => {
				it('should log the failure and not resume the parent when saving the sub-workflow result keeps failing', async () => {
					// A parent is waiting on a sub-workflow that has just succeeded. The DB write that
					// patches the parent fails on every attempt, so the retries are exhausted — this is
					// the exact step where the original fire-and-forget chain dropped the error silently.
					const executeData: IExecuteData = {
						node: mock<INode>({ name: 'Execute Sub Workflow' }),
						data: { main: [[{ json: { data: 'Parent input data' }, pairedItem: { item: 0 } }]] },
						source: { main: [{ previousNode: 'Manual Trigger' }] },
					};
					const parentExecution: IExecutionResponse = {
						id: 'parent_execution_id',
						finished: false,
						status: 'waiting',
						waitTill: WAIT_INDEFINITELY,
						workflowData: mock<IWorkflowBase>({ id: 'parent_workflow_id', nodes: [] }),
						customData: {},
						annotation: { tags: [] },
						createdAt: new Date(),
						startedAt: new Date(),
						mode: 'manual',
						workflowId: 'parent_workflow_id',
						storedAt: 'db',
						data: createRunExecutionData({ executionData: { nodeExecutionStack: [executeData] } }),
					};
					execution.data.parentExecution = {
						executionId: parentExecution.id,
						workflowId: parentExecution.workflowData.id,
						shouldResume: true,
					};

					const finalNodeName = 'Final Node';
					const taskData: ITaskData = {
						startTime: new Date().getTime(),
						executionTime: 5,
						executionIndex: 0,
						source: [{ previousNode: 'Wait Node' }],
						data: { main: [[{ json: { data: 'Child final output' }, pairedItem: { item: 0 } }]] },
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

					executionPersistence.findSingleExecution
						.calledWith(parentExecution.id)
						.mockResolvedValue(parentExecution);

					// Patch updateExistingExecution to fail every attempt, so withRetry exhausts and gives up.
					// This is the worse case scenario that keeps the parent in the 'waiting' state
					// after exhausting retries, and now it's also logged
					executionPersistence.updateExistingExecution.mockRejectedValue(
						new Error('connection terminated unexpectedly'),
					);
					const postExecutePromise = createDeferredPromise<IRun | undefined>();
					activeExecutions.getPostExecutePromise
						.calledWith(execution.id)
						.mockReturnValue(postExecutePromise.promise);

					await waitTracker.startExecution(execution.id);
					postExecutePromise.resolve(subworkflowResults);
					await jest.advanceTimersByTimeAsync(1000);

					expect(logger.error).toHaveBeenCalled();
					expect(workflowRunner.run).toHaveBeenCalledTimes(1);
				});

				it('should retry, then log the failure, when resuming the parent keeps failing', async () => {
					// Patching the parent succeeds, but resuming it fails on every attempt — the
					// second step of the resume, and the other place the original chain dropped errors.
					const { parentExecution, postExecutePromise, subworkflowResults } =
						setupParentExecutionTest(true);
					executionPersistence.updateExistingExecution.mockResolvedValue(true);

					// First run() (the sub-workflow) succeeds; every parent resume attempt rejects.
					workflowRunner.run
						.mockResolvedValueOnce(execution.id)
						.mockRejectedValue(new Error('Connection is closed'));

					await waitTracker.startExecution(execution.id);
					postExecutePromise.resolve(subworkflowResults);
					await jest.advanceTimersByTimeAsync(5000);

					// run() is called once for the sub-workflow, then once per parent resume attempt.
					// The second call is the first parent attempt; all attempts fail, so run() is called 4 times total
					// (sub-workflow + the 3 exhausted retries) and the final failure is logged rather than lost
					expect(workflowRunner.run).toHaveBeenNthCalledWith(
						2,
						expect.any(Object),
						false,
						false,
						parentExecution.id,
					);
					expect(workflowRunner.run).toHaveBeenCalledTimes(4);
					expect(logger.error).toHaveBeenCalled();
				});

				it('should resume the parent when an error clears within the retry limit', async () => {
					// The first parent resume attempt fails; the retry succeeds, so the parent resumes
					// after fewer than the max attempts
					const { parentExecution, postExecutePromise, subworkflowResults } =
						setupParentExecutionTest(true);
					executionPersistence.updateExistingExecution.mockResolvedValue(true);

					// sub-workflow succeeds; first parent resume attempt rejects; succeeds on retry
					workflowRunner.run
						.mockResolvedValueOnce(execution.id)
						.mockRejectedValueOnce(new Error('Connection is closed'))
						.mockResolvedValue(parentExecution.id);

					await waitTracker.startExecution(execution.id);
					postExecutePromise.resolve(subworkflowResults);
					await jest.advanceTimersByTimeAsync(5000);

					// Parent ultimately resumed (subworkflow + failed parent resume attempt + successful retry = 3 runs),
					// and because it recovered, nothing is logged as an error
					expect(workflowRunner.run).toHaveBeenCalledTimes(3);
					expect(workflowRunner.run).toHaveBeenLastCalledWith(
						expect.any(Object),
						false,
						false,
						parentExecution.id,
					);
					expect(logger.error).not.toHaveBeenCalled();
				});

				it('should not retry a non-retryable error when resuming the parent', async () => {
					const { postExecutePromise, subworkflowResults } = setupParentExecutionTest(true);
					executionPersistence.updateExistingExecution.mockResolvedValue(true);

					// child run succeeds; the parent resume fails with a non-retryable error.
					workflowRunner.run
						.mockResolvedValueOnce(execution.id)
						.mockRejectedValue(new UnexpectedError('Only saved workflows can be resumed.'));

					await waitTracker.startExecution(execution.id);
					postExecutePromise.resolve(subworkflowResults);
					await jest.advanceTimersByTimeAsync(5000);

					// `workflowRunner.run` is called once for the sub-workflow and once for the (single) parent attempt
					// the non-retryable error is not retried, and gets logged
					expect(workflowRunner.run).toHaveBeenCalledTimes(2);
					expect(logger.error).toHaveBeenCalled();
				});
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
				executionPersistence,
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
