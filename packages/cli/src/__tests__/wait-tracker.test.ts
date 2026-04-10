/* eslint-disable @typescript-eslint/unbound-method */
import { mockLogger } from '@n8n/backend-test-utils';
import type { Project, IExecutionResponse, ExecutionRepository, ExecutionEntity } from '@n8n/db';
import { mock, captor } from 'jest-mock-extended';
import type { ErrorReporter, InstanceSettings } from 'n8n-core';
import type { IWorkflowBase, IRun, INode, IExecuteData, ITaskData } from 'n8n-workflow';
import { createDeferredPromise, createRunExecutionData, WAIT_INDEFINITELY } from 'n8n-workflow';

import type { ActiveExecutions } from '@/active-executions';
import type { MultiMainSetup } from '@/scaling/multi-main-setup.ee';
import type { DbClock } from '@/services/db-clock.service';
import type { OwnershipService } from '@/services/ownership.service';
import { WaitTracker } from '@/wait-tracker';
import type { WorkflowRunner } from '@/workflow-runner';

jest.useFakeTimers({ advanceTimers: true });

describe('WaitTracker', () => {
	const activeExecutions = mock<ActiveExecutions>();
	const ownershipService = mock<OwnershipService>();
	const workflowRunner = mock<WorkflowRunner>();
	const executionRepository = mock<ExecutionRepository>();
	const dbClock = mock<DbClock>();
	const errorReporter = mock<ErrorReporter>();
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
	// Minimal ExecutionEntity for getWaitingExecutions — only id and waitTill are used by WaitTracker
	const waitingEntity = mock<ExecutionEntity>({ id: execution.id, waitTill: execution.waitTill });

	let waitTracker: WaitTracker;
	beforeEach(() => {
		dbClock.getApproximateDbTime.mockResolvedValue(new Date());
		waitTracker = new WaitTracker(
			mockLogger(),
			executionRepository,
			ownershipService,
			activeExecutions,
			workflowRunner,
			instanceSettings,
			dbClock,
			errorReporter,
		);
		multiMainSetup.on.mockReturnThis();
	});

	afterEach(() => {
		jest.clearAllMocks();
		jest.clearAllTimers();
	});

	describe('init()', () => {
		it('should query DB for waiting executions if leader', () => {
			executionRepository.getWaitingExecutions.mockResolvedValue([waitingEntity]);

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
				executionRepository.getWaitingExecutions.mockResolvedValue([waitingEntity]);
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

		it('should preserve original startedAt timestamp when resuming execution', async () => {
			const originalStartedAt = new Date('2025-12-02T09:04:47.150Z');
			const executionWithStartedAt = {
				...execution,
				startedAt: originalStartedAt,
			};

			executionRepository.findSingleExecution
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

		it('should poll every 5 seconds', () => {
			executionRepository.getWaitingExecutions.mockResolvedValue([]);

			const setIntervalSpy = jest.spyOn(global, 'setInterval');
			setIntervalSpy.mockClear(); // ensure no prior calls are counted
			waitTracker.init();

			expect(setIntervalSpy).toHaveBeenCalledTimes(1);
			expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
		});
	});

	describe('getWaitingExecutions()', () => {
		it('should use server time for triggerTime calculation', async () => {
			// Server clock is 10s behind local clock
			const serverTime = new Date(Date.now() - 10_000);
			dbClock.getApproximateDbTime.mockResolvedValue(serverTime);

			const waitTill = new Date(Date.now() + 5_000);
			const delayedExecution = mock<ExecutionEntity>({ id: 'delayed-exec', waitTill });
			executionRepository.getWaitingExecutions.mockResolvedValue([delayedExecution]);

			const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
			await waitTracker.getWaitingExecutions();

			// triggerTime = waitTill - serverTime = ~15s (not ~5s from Date.now())
			const expectedDelay = waitTill.getTime() - serverTime.getTime();
			expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), expectedDelay);
		});

		it('should fire immediately for past-due executions', async () => {
			// Server clock 5s ahead — waitTill is already past from the DB's perspective
			const serverTime = new Date(Date.now() + 5_000);
			dbClock.getApproximateDbTime.mockResolvedValue(serverTime);

			const waitTill = new Date(Date.now() + 2_000);
			const pastDueExecution = mock<ExecutionEntity>({ id: 'past-due-exec', waitTill });
			executionRepository.getWaitingExecutions.mockResolvedValue([pastDueExecution]);

			const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
			setTimeoutSpy.mockClear();

			const startExecutionSpy = jest
				.spyOn(waitTracker, 'startExecution')
				.mockImplementation(async () => {});

			await waitTracker.getWaitingExecutions();

			// Math.max(triggerTime, 0) clamps a negative delay to 0 — fires immediately
			expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 0);

			jest.advanceTimersByTime(0);
			expect(startExecutionSpy).toHaveBeenCalledWith('past-due-exec');
		});

		it('should warn on clock skew exceeding 2 seconds', async () => {
			// mockLogger().scoped() returns a new inner mock — make scoped() return itself
			// so that warn calls on the scoped logger are captured on our mock
			const logger = mockLogger();
			(logger.scoped as jest.Mock).mockReturnValue(logger);
			const skewedWaitTracker = new WaitTracker(
				logger,
				executionRepository,
				ownershipService,
				activeExecutions,
				workflowRunner,
				instanceSettings,
				dbClock,
				errorReporter,
			);

			// Server clock is 3s ahead — exceeds 2s threshold
			dbClock.getApproximateDbTime.mockResolvedValue(new Date(Date.now() + 3_000));
			executionRepository.getWaitingExecutions.mockResolvedValue([]);

			await skewedWaitTracker.getWaitingExecutions();

			expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Clock skew detected'));
		});

		it('should delegate DB time to DbClock', async () => {
			executionRepository.getWaitingExecutions.mockResolvedValue([]);

			await waitTracker.getWaitingExecutions();

			expect(dbClock.getApproximateDbTime).toHaveBeenCalledTimes(1);
		});
	});

	describe('race condition guards', () => {
		describe('overlapping poll guard', () => {
			it('should skip poll when previous poll is still in progress', async () => {
				// Make getWaitingExecutions hang on the first call by returning a never-resolving promise
				let resolveFirstPoll!: (value: unknown[]) => void;
				const slowPoll = new Promise<unknown[]>((resolve) => {
					resolveFirstPoll = resolve;
				});
				executionRepository.getWaitingExecutions.mockReturnValueOnce(slowPoll as Promise<never>);

				// Start first poll — it will block on the slow DB query
				const firstPoll = waitTracker.getWaitingExecutions();

				// Second poll should bail out immediately
				executionRepository.getWaitingExecutions.mockResolvedValue([]);
				await waitTracker.getWaitingExecutions();

				// Only the first call to getWaitingExecutions should have reached the DB
				expect(executionRepository.getWaitingExecutions).toHaveBeenCalledTimes(1);

				// Unblock and clean up
				resolveFirstPoll([]);
				await firstPoll;
			});

			it('should allow polling again after previous poll completes', async () => {
				executionRepository.getWaitingExecutions.mockResolvedValue([]);

				await waitTracker.getWaitingExecutions();
				await waitTracker.getWaitingExecutions();

				expect(executionRepository.getWaitingExecutions).toHaveBeenCalledTimes(2);
			});

			it('should allow polling again after previous poll errors', async () => {
				executionRepository.getWaitingExecutions.mockRejectedValueOnce(
					new Error('DB connection lost'),
				);

				await expect(waitTracker.getWaitingExecutions()).rejects.toThrow('DB connection lost');

				executionRepository.getWaitingExecutions.mockResolvedValue([]);
				await waitTracker.getWaitingExecutions();

				expect(executionRepository.getWaitingExecutions).toHaveBeenCalledTimes(2);
			});
		});

		describe('execution stays guarded until workflowRunner.run() settles', () => {
			const raceExecId = 'race-exec';
			const raceExecution = mock<IExecutionResponse>({
				id: raceExecId,
				finished: false,
				waitTill: new Date(Date.now() + 1_000),
				mode: 'manual',
				data: mock({ pushRef: 'push_ref', parentExecution: undefined }),
				startedAt: undefined,
			});
			raceExecution.workflowData = mock<IWorkflowBase>({ id: 'race-wf' });

			it('should keep execution in waitingExecutions during async startExecution work', async () => {
				const waitTill = new Date(Date.now() + 1_000);
				const entity = mock<ExecutionEntity>({ id: raceExecId, waitTill });
				executionRepository.getWaitingExecutions.mockResolvedValue([entity]);
				dbClock.getApproximateDbTime.mockResolvedValue(new Date());

				// Set up the timer via poll
				await waitTracker.getWaitingExecutions();
				expect(waitTracker.has(raceExecId)).toBe(true);

				// Make workflowRunner.run() hang so we can observe the guard
				let resolveRun!: (value: string) => void;
				const runPromise = new Promise<string>((resolve) => {
					resolveRun = resolve;
				});
				workflowRunner.run.mockReturnValueOnce(runPromise);
				executionRepository.findSingleExecution
					.calledWith(raceExecId)
					.mockResolvedValue(raceExecution);
				ownershipService.getWorkflowProjectCached.mockResolvedValue(project);

				// Fire the timer — startExecution begins but blocks on workflowRunner.run()
				const startPromise = waitTracker.startExecution(raceExecId);

				// Execution should STILL be in waitingExecutions (guard active)
				expect(waitTracker.has(raceExecId)).toBe(true);

				// A second poll should skip this execution because the guard is still active
				executionRepository.getWaitingExecutions.mockResolvedValue([entity]);
				const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
				const callCountBefore = setTimeoutSpy.mock.calls.length;

				await waitTracker.getWaitingExecutions();

				// No new timer should have been set for 'race-exec'
				const newTimerCalls = setTimeoutSpy.mock.calls.slice(callCountBefore);
				expect(newTimerCalls).toHaveLength(0);

				// Clean up
				resolveRun('exec-id');
				await startPromise;

				// Now the guard should be released
				expect(waitTracker.has(raceExecId)).toBe(false);
			});

			it('should release guard even when workflowRunner.run() throws', async () => {
				executionRepository.getWaitingExecutions.mockResolvedValue([]);
				dbClock.getApproximateDbTime.mockResolvedValue(new Date());

				// Set up a waiting execution via poll
				const waitTill = new Date(Date.now() + 1_000);
				const entity = mock<ExecutionEntity>({ id: raceExecId, waitTill });
				executionRepository.getWaitingExecutions.mockResolvedValue([entity]);
				await waitTracker.getWaitingExecutions();

				executionRepository.findSingleExecution
					.calledWith(raceExecId)
					.mockResolvedValue(raceExecution);
				ownershipService.getWorkflowProjectCached.mockResolvedValue(project);
				workflowRunner.run.mockRejectedValueOnce(new Error('Runner crashed'));

				await expect(waitTracker.startExecution(raceExecId)).rejects.toThrow('Runner crashed');

				// Guard should be released so future polls can re-schedule it
				expect(waitTracker.has(raceExecId)).toBe(false);
			});
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
				dbClock,
				errorReporter,
			);

			executionRepository.getWaitingExecutions.mockResolvedValue([]);

			waitTracker.init();

			expect(executionRepository.getWaitingExecutions).not.toHaveBeenCalled();
		});
	});
});
