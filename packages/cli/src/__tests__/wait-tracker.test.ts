import { mockLogger } from '@n8n/backend-test-utils';
import type { Project, IExecutionResponse, ExecutionRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import type { IRun, IWorkflowBase } from 'n8n-workflow';
import { createDeferredPromise } from 'n8n-workflow';

import type { ActiveExecutions } from '@/active-executions';
<<<<<<< HEAD
=======
import { ExecutionAlreadyResumingError } from '@/errors/execution-already-resuming.error';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { CredentialsPermissionChecker } from '@/executions/pre-execution-checks';
import type { ResumeAttemptService } from '@/executions/resume-attempt.service';
import { NodeTypes } from '@/node-types';
>>>>>>> c08ba2dd3 (fix(core): Limit resume attempts for waiting and queued executions (#42135))
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
	const resumeAttemptService = mock<ResumeAttemptService>();

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
<<<<<<< HEAD
=======
		// The constructor reassigns `this.logger = this.logger.scoped('waiting-executions')`,
		// so the tracker logs through the *return value* of `scoped()`, not the injected mock.
		// Make `scoped()` return the same mock so `logger.error` assertions observe those calls.
		logger = mock<Logger>();
		(logger.scoped as Mock).mockReturnValue(logger);
		Container.set(ExecutionPersistence, executionPersistence);
		mockInstance(CredentialsPermissionChecker).getCredentialIdsForNodes.mockReturnValue([]);
		executionRepository.findParkedOnSubExecution.mockResolvedValue([]);
		resumeAttemptService.claim.mockResolvedValue({ granted: true, attempt: 1 });
>>>>>>> c08ba2dd3 (fix(core): Limit resume attempts for waiting and queued executions (#42135))
		waitTracker = new WaitTracker(
			mockLogger(),
			executionRepository,
			ownershipService,
			activeExecutions,
			workflowRunner,
			instanceSettings,
			resumeAttemptService,
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

<<<<<<< HEAD
		describe('parent execution restart behavior', () => {
=======
		it('claims a resume attempt before reading the execution', async () => {
			await waitTracker.startExecution(execution.id);

			expect(resumeAttemptService.claim).toHaveBeenCalledWith(execution.id, 'waiting');
			const [claimOrder] = resumeAttemptService.claim.mock.invocationCallOrder;
			const [readOrder] = executionPersistence.findSingleExecution.mock.invocationCallOrder;
			expect(claimOrder).toBeLessThan(readOrder);
		});

		it('does not read or run the execution when its resume attempts are used up', async () => {
			resumeAttemptService.claim.mockResolvedValueOnce({ granted: false });

			await waitTracker.startExecution(execution.id);

			expect(executionPersistence.findSingleExecution).not.toHaveBeenCalled();
			expect(workflowRunner.run).not.toHaveBeenCalled();
		});

		it('gives the attempt back when the load throws', async () => {
			executionPersistence.findSingleExecution
				.calledWith(execution.id)
				.mockRejectedValueOnce(new Error('database is locked'));

			await expect(waitTracker.startExecution(execution.id)).rejects.toThrow('database is locked');

			expect(resumeAttemptService.release).toHaveBeenCalledExactlyOnceWith(
				execution.id,
				'waiting',
				1,
			);
		});

		it('rejects a second resume while the first one is still loading', async () => {
			const run = createDeferredPromise<string>();
			workflowRunner.run.mockReturnValueOnce(run.promise);

			const first = waitTracker.startExecution(execution.id);
			await vi.waitFor(() => expect(workflowRunner.run).toHaveBeenCalled());

			await expect(waitTracker.startExecution(execution.id)).rejects.toThrow(
				ExecutionAlreadyResumingError,
			);
			expect(resumeAttemptService.claim).toHaveBeenCalledTimes(1);
			expect(executionPersistence.findSingleExecution).toHaveBeenCalledTimes(1);

			run.resolve(execution.id);
			await first;
			await expect(waitTracker.startExecution(execution.id)).resolves.toBeUndefined();
		});

		// The acting user is not a stored field, so a resume has to derive it again.
		// Without it the run comes back unattributed and a credential only its
		// publisher may use is refused halfway through.
		it('restores the identity the run acts as', async () => {
			workflowPublisherService.findActingUserIdForRestart.mockResolvedValueOnce('the-publisher');

			await waitTracker.startExecution(execution.id);

			expect(workflowRunner.run).toHaveBeenCalledWith(
				expect.objectContaining({ userId: 'the-publisher' }),
				false,
				false,
				expect.anything(),
			);
		});

		it('waits for the old local segment before registering a suspended resume', async () => {
			const oldCompletion = createDeferredPromise<IRun | undefined>();
			const suspended = {
				...execution,
				status: 'waiting' as const,
				data: { ...execution.data, waitReason: 'suspended' as const },
			};
			executionPersistence.findSingleExecution
				.calledWith(execution.id)
				.mockResolvedValue(suspended);
			activeExecutions.has.mockReturnValueOnce(true);
			activeExecutions.getPostExecutePromise.mockReturnValueOnce(oldCompletion.promise);

			const resuming = waitTracker.startExecution(execution.id);
			await vi.waitFor(() => expect(activeExecutions.getPostExecutePromise).toHaveBeenCalled());
			expect(workflowRunner.run).not.toHaveBeenCalled();

			oldCompletion.resolve(undefined);
			await resuming;
			expect(workflowRunner.run).toHaveBeenCalledOnce();
		});

		it('skips a suspended resume when the row is already running', async () => {
			const claimed = {
				...execution,
				status: 'running' as const,
				data: { ...execution.data, waitReason: 'suspended' as const },
			};
			executionPersistence.findSingleExecution.calledWith(execution.id).mockResolvedValue(claimed);
			activeExecutions.has.mockReturnValueOnce(true);

			await expect(waitTracker.startExecution(execution.id)).rejects.toThrow(
				ExecutionAlreadyResumingError,
			);
			expect(activeExecutions.getPostExecutePromise).not.toHaveBeenCalled();
			expect(workflowRunner.run).not.toHaveBeenCalled();
		});

		it('should reject when another process is already resuming the execution', async () => {
			workflowRunner.run.mockRejectedValueOnce(new ExecutionAlreadyResumingError(execution.id));

			await expect(waitTracker.startExecution(execution.id)).rejects.toThrow(
				ExecutionAlreadyResumingError,
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
				{ executionId: execution.id, expectedStatus: 'waiting', storedAt: 'fs' },
			);
		});

		describe('parent execution with waiting sub-workflow', () => {
			// Earlier tests set `workflowRunner.run` return values that `vi.clearAllMocks()`
			// does not reset — start every test here from a clean mock.
			beforeEach(() => {
				workflowRunner.run.mockReset();
			});

			/** A parent stack parked at an Execute Sub-workflow node. */
			const parentStack = (): IExecuteData[] => [
				{
					node: mock<INode>({ name: 'Execute Sub Workflow' }),
					data: { main: [[{ json: { data: 'Parent input data' }, pairedItem: { item: 0 } }]] },
					source: { main: [{ previousNode: 'Manual Trigger' }] },
				},
			];

>>>>>>> c08ba2dd3 (fix(core): Limit resume attempts for waiting and queued executions (#42135))
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
				executionRepository.findSingleExecution
					.calledWith(parentExecution.id)
					.mockResolvedValue(parentExecution);
				const postExecutePromise = createDeferredPromise<IRun | undefined>();
				activeExecutions.getPostExecutePromise
					.calledWith(execution.id)
					.mockReturnValue(postExecutePromise.promise);

				return { parentExecution, postExecutePromise };
			};

			it('should resume parent execution once sub-workflow finishes by default', async () => {
				const { parentExecution, postExecutePromise } = setupParentExecutionTest(undefined);

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
						startedAt: parentExecution.startedAt,
					},
					false,
					false,
					parentExecution.id,
				);
			});

			it('should not resume parent execution when shouldResume is false', async () => {
				const { postExecutePromise } = setupParentExecutionTest(false);

				await waitTracker.startExecution(execution.id);

				expect(workflowRunner.run).toHaveBeenCalledTimes(1);

				postExecutePromise.resolve(mock<IRun>());
				await jest.advanceTimersByTimeAsync(100);

				// Parent execution should NOT be started
				expect(workflowRunner.run).toHaveBeenCalledTimes(1);
			});

			it('should resume parent execution when shouldResume is true', async () => {
				const { parentExecution, postExecutePromise } = setupParentExecutionTest(true);

				await waitTracker.startExecution(execution.id);

				expect(workflowRunner.run).toHaveBeenCalledTimes(1);

				postExecutePromise.resolve(mock<IRun>());
				await jest.advanceTimersByTimeAsync(100);

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
<<<<<<< HEAD
=======
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
				expect(workflowRunner.run).toHaveBeenNthCalledWith(2, expect.any(Object), false, false, {
					executionId: parentExecution.id,
					expectedStatus: 'waiting',
					storedAt: 'db',
				});
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
				await vi.advanceTimersToNextTimerAsync();

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
					{ executionId: childExecution.id, expectedStatus: 'waiting', storedAt: 'fs' },
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
					{ executionId: execution.id, expectedStatus: 'waiting', storedAt: 'fs' },
				);

				// ACT 2 - Child execution goes into waiting state
				postExecutePromise.resolve(waitingSubworkflowResults);
				await vi.advanceTimersToNextTimerAsync();

				// ASSERT 2 - Parent execution should NOT be resumed
				expect(executionPersistence.updateExistingExecution).not.toHaveBeenCalled();
				expect(workflowRunner.run).toHaveBeenCalledTimes(1);
			});

			describe('error handling on resuming parent execution', () => {
				it('should log the failure and not resume the parent when saving the sub-workflow result keeps failing', async () => {
					// A parent is waiting on a sub-workflow that has just succeeded. The DB write that
					// patches the parent fails on every attempt, so the retries are exhausted — this is
					// the exact step where the original fire-and-forget chain dropped the error silently.
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
						data: createRunExecutionData({
							executionData: { nodeExecutionStack: parentStack() },
						}),
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
					await vi.advanceTimersByTimeAsync(1000);

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
					await vi.advanceTimersByTimeAsync(5000);

					// run() is called once for the sub-workflow, then once per parent resume attempt.
					// The second call is the first parent attempt; all attempts fail, so run() is called 4 times total
					// (sub-workflow + the 3 exhausted retries) and the final failure is logged rather than lost
					expect(workflowRunner.run).toHaveBeenNthCalledWith(2, expect.any(Object), false, false, {
						executionId: parentExecution.id,
						expectedStatus: 'waiting',
						storedAt: 'fs',
					});
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
					await vi.advanceTimersByTimeAsync(5000);

					// Parent ultimately resumed (subworkflow + failed parent resume attempt + successful retry = 3 runs),
					// and because it recovered, nothing is logged as an error
					expect(workflowRunner.run).toHaveBeenCalledTimes(3);
					expect(workflowRunner.run).toHaveBeenLastCalledWith(expect.any(Object), false, false, {
						executionId: parentExecution.id,
						expectedStatus: 'waiting',
						storedAt: 'fs',
					});
					expect(logger.error).not.toHaveBeenCalled();
				});

				it('should not retry a non-retryable error when resuming the parent', async () => {
					const { parentExecution, postExecutePromise, subworkflowResults } =
						setupParentExecutionTest(true);
					executionPersistence.updateExistingExecution.mockResolvedValue(true);

					// child run succeeds; the parent resume fails with a non-retryable error.
					workflowRunner.run
						.mockResolvedValueOnce(execution.id)
						.mockRejectedValue(new UnexpectedError('Only saved workflows can be resumed.'));

					await waitTracker.startExecution(execution.id);
					postExecutePromise.resolve(subworkflowResults);
					await vi.advanceTimersByTimeAsync(5000);

					// `workflowRunner.run` is called once for the sub-workflow and once for the (single) parent attempt
					// the non-retryable error is not retried, and gets logged
					expect(workflowRunner.run).toHaveBeenCalledTimes(2);
					expect(workflowRunner.run).toHaveBeenCalledWith(expect.any(Object), false, false, {
						executionId: parentExecution.id,
						expectedStatus: 'waiting',
						storedAt: 'fs',
					});
					expect(logger.error).toHaveBeenCalled();
				});
			});

			it('does not claim a parent parked on a wait this child does not own', async () => {
				const { parentExecution, postExecutePromise, subworkflowResults } =
					setupParentExecutionTest(true);
				parentExecution.data.executionData!.nodeExecutionStack[0].metadata = {
					waitingChildExecutionIds: ['another_child_execution_id'],
				};
				executionPersistence.updateExistingExecution.mockResolvedValue(true);

				await waitTracker.startExecution(execution.id);
				postExecutePromise.resolve(subworkflowResults);
				await vi.advanceTimersByTimeAsync(1000);

				expect(executionPersistence.updateExistingExecution).not.toHaveBeenCalled();
				expect(workflowRunner.run).toHaveBeenCalledTimes(1);
				expect(logger.info).toHaveBeenCalledWith(
					expect.stringContaining('not patched'),
					expect.objectContaining({
						parentExecutionId: parentExecution.id,
						childExecutionId: execution.id,
					}),
				);
			});

			it('logs at info and does not retry when the parent cannot be claimed', async () => {
				const { parentExecution, postExecutePromise, subworkflowResults } =
					setupParentExecutionTest(true);
				executionPersistence.updateExistingExecution.mockResolvedValue(true);
				workflowRunner.run
					.mockResolvedValueOnce(execution.id)
					.mockRejectedValue(new ExecutionAlreadyResumingError(parentExecution.id));

				await waitTracker.startExecution(execution.id);
				postExecutePromise.resolve(subworkflowResults);
				await vi.advanceTimersByTimeAsync(1000);

				expect(workflowRunner.run).toHaveBeenCalledTimes(2);
				expect(logger.info).toHaveBeenCalledWith(
					expect.stringContaining('not claimable'),
					expect.objectContaining({
						parentExecutionId: parentExecution.id,
						childExecutionId: execution.id,
					}),
				);
				expect(logger.error).not.toHaveBeenCalled();
			});
		});
	});

	describe('resumeParentsOfFinishedSubExecutions()', () => {
		const childId = 'child_execution_id';
		const parentId = 'parent_execution_id';

		const parkedParent = (childIds: string[] | undefined): IExecutionResponse => ({
			id: parentId,
			finished: false,
			status: 'waiting',
			waitTill: WAIT_FOR_SUB_EXECUTION,
			workflowData: mock<IWorkflowBase>({ id: 'parent_workflow_id', nodes: [] }),
			customData: {},
			annotation: { tags: [] },
			createdAt: new Date(),
			startedAt: new Date(),
			mode: 'manual',
			workflowId: 'parent_workflow_id',
			storedAt: 'db',
			data: createRunExecutionData({
				executionData: {
					nodeExecutionStack: [
						{
							node: mock<INode>({ name: 'Execute Sub Workflow' }),
							data: { main: [[{ json: {}, pairedItem: { item: 0 } }]] },
							source: null,
							metadata: childIds ? { waitingChildExecutionIds: childIds } : undefined,
						},
					],
				},
			}),
		});

		const finishedChild = (): IExecutionResponse => {
			const finalNodeName = 'Final Node';
			const taskData: ITaskData = {
				startTime: 0,
				executionTime: 1,
				executionIndex: 0,
				source: [],
				data: { main: [[{ json: { data: 'child output' }, pairedItem: { item: 0 } }]] },
			};
			return {
				id: childId,
				finished: true,
				status: 'success',
				workflowData: mock<IWorkflowBase>({ id: 'child_workflow_id', nodes: [] }),
				customData: {},
				annotation: { tags: [] },
				createdAt: new Date(),
				startedAt: new Date(),
				stoppedAt: new Date(),
				mode: 'integrated',
				workflowId: 'child_workflow_id',
				storedAt: 'db',
				data: createRunExecutionData({
					resultData: { runData: { [finalNodeName]: [taskData] }, lastNodeExecuted: finalNodeName },
				}),
			};
		};

		beforeEach(() => {
			workflowRunner.run.mockReset();
			executionPersistence.findSingleExecution.mockReset();
			executionRepository.findParkedOnSubExecution.mockResolvedValue([parentId]);
			ownershipService.getWorkflowProjectCached.mockResolvedValue(project);
			executionPersistence.updateExistingExecution.mockResolvedValue(true);
			workflowRunner.run.mockResolvedValue(parentId);
		});

		it('runs on the leader tick', () => {
			executionRepository.findParkedOnSubExecution.mockResolvedValue([]);
			executionRepository.getWaitingExecutions.mockResolvedValue([]);

			waitTracker.init();

			expect(executionRepository.findParkedOnSubExecution).toHaveBeenCalledTimes(1);
		});

		it('claims an attempt before it loads the parent and gives it back after the inspection', async () => {
			executionPersistence.findSingleExecution
				.calledWith(parentId)
				.mockResolvedValue(parkedParent([childId]));
			executionRepository.findStatusesByIds.mockResolvedValue([{ id: childId, status: 'running' }]);

			await waitTracker.resumeParentsOfFinishedSubExecutions();

			expect(resumeAttemptService.claim).toHaveBeenCalledExactlyOnceWith(parentId, 'waiting');
			const [claimOrder] = resumeAttemptService.claim.mock.invocationCallOrder;
			const [readOrder] = executionPersistence.findSingleExecution.mock.invocationCallOrder;
			expect(claimOrder).toBeLessThan(readOrder);
			expect(resumeAttemptService.release).toHaveBeenCalledExactlyOnceWith(parentId, 'waiting', 1);
			expect(workflowRunner.run).not.toHaveBeenCalled();
		});

		it('does not load the parent when its resume attempts are used up', async () => {
			resumeAttemptService.claim.mockResolvedValueOnce({ granted: false });

			await waitTracker.resumeParentsOfFinishedSubExecutions();

			expect(executionPersistence.findSingleExecution).not.toHaveBeenCalled();
			expect(resumeAttemptService.release).not.toHaveBeenCalled();
		});

		it('gives the inspection attempt back before the resume claims its own', async () => {
			executionPersistence.findSingleExecution
				.calledWith(parentId)
				.mockResolvedValue(parkedParent([childId]));
			executionPersistence.findSingleExecution
				.calledWith(childId)
				.mockResolvedValue(finishedChild());
			executionRepository.findStatusesByIds.mockResolvedValue([{ id: childId, status: 'success' }]);

			await waitTracker.resumeParentsOfFinishedSubExecutions();

			const [releaseOrder] = resumeAttemptService.release.mock.invocationCallOrder;
			const [, resumeClaimOrder] = resumeAttemptService.claim.mock.invocationCallOrder;
			expect(releaseOrder).toBeLessThan(resumeClaimOrder);
			expect(workflowRunner.run).toHaveBeenCalledTimes(1);
		});

		it('does not inspect a parent that this process is already resuming', async () => {
			const admission = createDeferredPromise<string>();
			workflowRunner.run.mockReturnValueOnce(admission.promise);
			executionPersistence.findSingleExecution
				.calledWith(parentId)
				.mockResolvedValue(parkedParent([childId]));

			const resume = waitTracker.startExecution(parentId);
			await vi.waitFor(() => expect(workflowRunner.run).toHaveBeenCalled());

			await waitTracker.resumeParentsOfFinishedSubExecutions();

			expect(resumeAttemptService.claim).toHaveBeenCalledExactlyOnceWith(parentId, 'waiting');
			expect(executionRepository.findStatusesByIds).not.toHaveBeenCalled();

			admission.resolve(parentId);
			await resume;
		});

		it('skips a tick while the previous sweep is still running', async () => {
			const held = createDeferredPromise<string[]>();
			executionRepository.findParkedOnSubExecution.mockReturnValue(held.promise);

			const inFlight = waitTracker.resumeParentsOfFinishedSubExecutions();
			await waitTracker.resumeParentsOfFinishedSubExecutions();

			expect(executionRepository.findParkedOnSubExecution).toHaveBeenCalledTimes(1);

			held.resolve([]);
			await inFlight;
			await waitTracker.resumeParentsOfFinishedSubExecutions();

			expect(executionRepository.findParkedOnSubExecution).toHaveBeenCalledTimes(2);
		});

		it.each([false, true])(
			'patches a finished child with single-output policy: %s',
			async (singleOutput) => {
				const parent = parkedParent([childId]);
				const child = finishedChild();
				if (singleOutput) {
					child.data.subWorkflowOutput = { lastRunOnly: false };
					const task = child.data.resultData.runData['Final Node'][0];
					task.data = { main: [[], task.data!.main![0]] };
					child.workflowData = {
						...child.workflowData,
						connections: {},
						settings: {},
						staticData: undefined,
						nodes: [
							{
								id: 'final',
								name: 'Final Node',
								type: 'test',
								typeVersion: 1,
								parameters: {},
								position: [0, 0],
							},
						],
					};
					mockInstance(NodeTypes).getByNameAndVersion.mockReturnValue({
						description: {
							name: 'test',
							displayName: 'Test',
							group: ['transform'],
							version: 1,
							description: '',
							defaults: {},
							inputs: ['main'],
							outputs: ['main', 'main'],
							properties: [],
						},
					});
				}
				executionPersistence.findSingleExecution.calledWith(parentId).mockResolvedValue(parent);
				executionPersistence.findSingleExecution.calledWith(childId).mockResolvedValue(child);
				executionRepository.findStatusesByIds.mockResolvedValue([
					{ id: childId, status: 'success' },
				]);

				await waitTracker.resumeParentsOfFinishedSubExecutions();

				const dataCaptor = captor<{ data: IRunExecutionData }>();
				expect(executionPersistence.updateExistingExecution).toHaveBeenCalledWith(
					parentId,
					dataCaptor,
				);
				expect(dataCaptor.value.data.executionData?.nodeExecutionStack[0].data.main).toEqual([
					[{ json: { data: 'child output' }, pairedItem: { item: 0 } }],
				]);
				expect(workflowRunner.run).toHaveBeenCalledWith(expect.any(Object), false, false, {
					executionId: parentId,
					expectedStatus: 'waiting',
					storedAt: 'db',
				});
				expect(logger.error).not.toHaveBeenCalled();
			},
		);

		it('leaves the parent parked while its child is still waiting', async () => {
			executionPersistence.findSingleExecution.mockResolvedValue(parkedParent([childId]));
			executionRepository.findStatusesByIds.mockResolvedValue([{ id: childId, status: 'waiting' }]);

			await waitTracker.resumeParentsOfFinishedSubExecutions();

			expect(executionPersistence.updateExistingExecution).not.toHaveBeenCalled();
			expect(workflowRunner.run).not.toHaveBeenCalled();
		});

		it('skips a parent whose stack head carries no child ids', async () => {
			executionPersistence.findSingleExecution.mockResolvedValue(parkedParent(undefined));

			await waitTracker.resumeParentsOfFinishedSubExecutions();

			expect(executionRepository.findStatusesByIds).not.toHaveBeenCalled();
			expect(workflowRunner.run).not.toHaveBeenCalled();
		});

		it('warns when a tagged child row no longer exists', async () => {
			executionPersistence.findSingleExecution.mockResolvedValue(parkedParent([childId]));
			executionRepository.findStatusesByIds.mockResolvedValue([]);

			await waitTracker.resumeParentsOfFinishedSubExecutions();

			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('no longer exist'),
				expect.objectContaining({ parentExecutionId: parentId, childExecutionIds: [childId] }),
			);
			expect(workflowRunner.run).not.toHaveBeenCalled();
		});

		it('logs at info when another process claimed the parent first', async () => {
			const parent = parkedParent([childId]);
			executionPersistence.findSingleExecution.calledWith(parentId).mockResolvedValue(parent);
			executionPersistence.findSingleExecution
				.calledWith(childId)
				.mockResolvedValue(finishedChild());
			executionRepository.findStatusesByIds.mockResolvedValue([{ id: childId, status: 'success' }]);
			workflowRunner.run.mockRejectedValue(new ExecutionAlreadyResumingError(parentId));

			await waitTracker.resumeParentsOfFinishedSubExecutions();

			expect(workflowRunner.run).toHaveBeenCalledTimes(1);
			expect(logger.info).toHaveBeenCalledWith(
				expect.stringContaining('not claimable'),
				expect.objectContaining({ parentExecutionId: parentId, childExecutionId: childId }),
			);
			expect(logger.error).not.toHaveBeenCalled();
		});

		it('rescues a parent whose child finished before the parent reached waiting', async () => {
			const runningParent: IExecutionResponse = { ...parkedParent([childId]), status: 'running' };
			const waitingChild: IExecutionResponse = {
				...finishedChild(),
				finished: false,
				status: 'waiting',
				data: createRunExecutionData({
					parentExecution: {
						executionId: parentId,
						workflowId: 'parent_workflow_id',
						shouldResume: true,
					},
				}),
			};
			executionPersistence.findSingleExecution
				.calledWith(parentId)
				.mockResolvedValueOnce(runningParent)
				.mockResolvedValue(parkedParent([childId]));
			executionPersistence.findSingleExecution
				.calledWith(childId)
				.mockResolvedValueOnce(waitingChild)
				.mockResolvedValue(finishedChild());
			const postExecutePromise = createDeferredPromise<IRun | undefined>();
			activeExecutions.getPostExecutePromise
				.calledWith(childId)
				.mockReturnValue(postExecutePromise.promise);
			workflowRunner.run
				.mockResolvedValueOnce(childId)
				.mockRejectedValueOnce(new ExecutionAlreadyResumingError(parentId))
				.mockResolvedValue(parentId);

			await waitTracker.startExecution(childId);
			const { data, mode, startedAt, stoppedAt, status, finished, storedAt } = finishedChild();
			postExecutePromise.resolve({ data, mode, startedAt, stoppedAt, status, finished, storedAt });
			await vi.advanceTimersByTimeAsync(1000);

			expect(executionPersistence.updateExistingExecution).not.toHaveBeenCalled();

			executionRepository.findStatusesByIds.mockResolvedValue([{ id: childId, status: 'success' }]);

			await waitTracker.resumeParentsOfFinishedSubExecutions();

			const dataCaptor = captor<{ data: IRunExecutionData }>();
			expect(executionPersistence.updateExistingExecution).toHaveBeenCalledWith(
				parentId,
				dataCaptor,
			);
			expect(dataCaptor.value.data.executionData?.nodeExecutionStack[0].data.main).toEqual([
				[{ json: { data: 'child output' }, pairedItem: { item: 0 } }],
			]);
			expect(workflowRunner.run).toHaveBeenLastCalledWith(expect.any(Object), false, false, {
				executionId: parentId,
				expectedStatus: 'waiting',
				storedAt: 'db',
			});
			expect(logger.error).not.toHaveBeenCalled();
		});

		it('leaves the parent parked when the finished child carries no result', async () => {
			const crashedChild: IExecutionResponse = {
				...finishedChild(),
				finished: false,
				status: 'crashed',
				data: createRunExecutionData({}),
			};
			executionPersistence.findSingleExecution
				.calledWith(parentId)
				.mockResolvedValue(parkedParent([childId]));
			executionPersistence.findSingleExecution.calledWith(childId).mockResolvedValue(crashedChild);
			executionRepository.findStatusesByIds.mockResolvedValue([{ id: childId, status: 'crashed' }]);

			await waitTracker.resumeParentsOfFinishedSubExecutions();

			expect(executionPersistence.updateExistingExecution).not.toHaveBeenCalled();
			expect(workflowRunner.run).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('leaving it parked'),
				expect.objectContaining({
					parentExecutionId: parentId,
					childExecutionId: childId,
					childStatus: 'crashed',
				}),
			);
		});

		it('continues with the next parent when one fails', async () => {
			executionRepository.findParkedOnSubExecution.mockResolvedValue(['broken', parentId]);
			const parent = parkedParent([childId]);
			executionPersistence.findSingleExecution
				.calledWith('broken')
				.mockRejectedValue(new Error('connection terminated unexpectedly'));
			executionPersistence.findSingleExecution.calledWith(parentId).mockResolvedValue(parent);
			executionPersistence.findSingleExecution
				.calledWith(childId)
				.mockResolvedValue(finishedChild());
			executionRepository.findStatusesByIds.mockResolvedValue([{ id: childId, status: 'success' }]);

			await waitTracker.resumeParentsOfFinishedSubExecutions();

			expect(logger.error).toHaveBeenCalledWith(
				expect.stringContaining('parked on a sub-execution'),
				expect.objectContaining({ parentExecutionId: 'broken' }),
			);
			expect(workflowRunner.run).toHaveBeenCalledWith(expect.any(Object), false, false, {
				executionId: parentId,
				expectedStatus: 'waiting',
				storedAt: 'db',
>>>>>>> c08ba2dd3 (fix(core): Limit resume attempts for waiting and queued executions (#42135))
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
				resumeAttemptService,
			);

			executionRepository.getWaitingExecutions.mockResolvedValue([]);

			waitTracker.init();

			expect(executionRepository.getWaitingExecutions).not.toHaveBeenCalled();
		});
	});
});
