import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type {
	IExecutionDb,
	IExecutionResponse,
	ExecutionRepository,
	User,
	WorkflowHistoryRepository,
} from '@n8n/db';
import type { WorkflowHistory } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';
import type { IRun, IRunData, IRunExecutionData, ITaskData } from 'n8n-workflow';
import { ManualExecutionCancelledError, WorkflowOperationError } from 'n8n-workflow';

import type { ActiveExecutions } from '@/active-executions';
import type { ConcurrencyControlService } from '@/concurrency/concurrency-control.service';
import { AbortedExecutionRetryError } from '@/errors/aborted-execution-retry.error';
import { MissingExecutionStopError } from '@/errors/missing-execution-stop.error';
import type { ExecutionPersistence } from '@/executions/execution-persistence';
import type { ExecutionRedactionServiceProxy } from '@/executions/execution-redaction-proxy.service';
import { ExecutionService } from '@/executions/execution.service';
import type { ExecutionRequest } from '@/executions/execution.types';
import type { ExecutionStopService } from '@/scaling/execution-stop.service';
import { ScalingService } from '@/scaling/scaling.service';
import type { Job } from '@/scaling/scaling.types';
import type { WaitTracker } from '@/wait-tracker';
import type { WorkflowRunner } from '@/workflow-runner';

describe('ExecutionService', () => {
	const scalingService = mockInstance(ScalingService);
	const activeExecutions = mock<ActiveExecutions>();
	const executionRepository = mock<ExecutionRepository>();
	const executionPersistence = mock<ExecutionPersistence>();
	const workflowHistoryRepository = mock<WorkflowHistoryRepository>();
	const waitTracker = mock<WaitTracker>();
	const concurrencyControl = mock<ConcurrencyControlService>();
	const globalConfig = Container.get(GlobalConfig);
	const executionRedactionServiceProxy = mock<ExecutionRedactionServiceProxy>();
	const executionStopService = mock<ExecutionStopService>();

	const executionService = new ExecutionService(
		globalConfig,
		mock(),
		activeExecutions,
		mock(),
		mock(),
		executionRepository,
		executionPersistence,
		workflowHistoryRepository,
		mock(),
		mock(),
		waitTracker,
		mock(),
		concurrencyControl,
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		executionRedactionServiceProxy,
		executionStopService,
	);

	beforeEach(() => {
		globalConfig.executions.mode = 'regular';
		vi.clearAllMocks();
	});

	describe('findOne', () => {
		it('should parse redactExecutionData from query string and pass to redaction proxy', async () => {
			/**
			 * Arrange
			 */
			const execution = mock<IExecutionResponse>({ id: '123', data: { resultData: {} } });
			executionPersistence.findIfSharedUnflatten.mockResolvedValue(execution);
			executionRedactionServiceProxy.processExecution.mockResolvedValue(execution);

			const req = mock<ExecutionRequest.GetOne>({
				params: { id: '123' },
				query: { redactExecutionData: 'true' } as unknown as Record<string, string>,
			});

			/**
			 * Act
			 */
			await executionService.findOne(req, ['workflow-1']);

			/**
			 * Assert
			 */
			expect(executionRedactionServiceProxy.processExecution).toHaveBeenCalledWith(
				execution,
				expect.objectContaining({ redactExecutionData: true }),
			);
		});

		it('should leave redactExecutionData undefined when query param is absent', async () => {
			/**
			 * Arrange
			 */
			const execution = mock<IExecutionResponse>({ id: '123', data: { resultData: {} } });
			executionPersistence.findIfSharedUnflatten.mockResolvedValue(execution);
			executionRedactionServiceProxy.processExecution.mockResolvedValue(execution);

			const req = mock<ExecutionRequest.GetOne>({
				params: { id: '123' },
				query: {},
			});

			/**
			 * Act
			 */
			await executionService.findOne(req, ['workflow-1']);

			/**
			 * Assert
			 */
			expect(executionRedactionServiceProxy.processExecution).toHaveBeenCalledWith(
				execution,
				expect.objectContaining({ redactExecutionData: undefined }),
			);
		});
	});

	describe('retry', () => {
		it('should error on retrying a execution that was aborted before starting', async () => {
			/**
			 * Arrange
			 */
			executionPersistence.findWithUnflattenedData.mockResolvedValue(
				mock<IExecutionResponse>({ data: { executionData: undefined } }),
			);
			const req = mock<ExecutionRequest.Retry>();

			/**
			 * Act
			 */
			const retry = executionService.retry(req, []);

			/**
			 * Assert
			 */
			await expect(retry).rejects.toThrow(AbortedExecutionRetryError);
		});

		it('should apply redaction to the retry response', async () => {
			/**
			 * Arrange
			 */
			const workflowRunner = mock<WorkflowRunner>();
			const localExecutionRedactionProxy = mock<ExecutionRedactionServiceProxy>();
			const localExecutionService = new ExecutionService(
				globalConfig,
				mock(),
				activeExecutions,
				mock(),
				mock(),
				executionRepository,
				executionPersistence,
				mock(),
				mock(),
				mock(),
				waitTracker,
				workflowRunner,
				concurrencyControl,
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				localExecutionRedactionProxy,
				executionStopService,
			);

			const mockUser = mock<User>({ id: 'user-1' });
			const sourceExecution = mock<IExecutionResponse>({
				workflowId: 'workflow-1',
				mode: 'trigger',
				finished: false,
				status: 'error',
				data: {
					executionData: {
						nodeExecutionStack: [],
						waitingExecution: {},
						waitingExecutionSource: {},
					},
					resultData: { runData: {} },
				},
				workflowData: { id: 'workflow-1', settings: {} } as IExecutionDb['workflowData'],
			});
			executionPersistence.findWithUnflattenedData.mockResolvedValue(sourceExecution);

			const retriedExecutionId = 'retried-123';
			workflowRunner.run.mockResolvedValue(retriedExecutionId);

			const retriedRunData = mock<IRunExecutionData>({ resultData: { runData: {} } });
			const retriedRun = mock<IRun>({
				data: retriedRunData,
				mode: 'trigger',
				startedAt: new Date(),
				finished: true,
				status: 'success',
				waitTill: null,
			});
			activeExecutions.getPostExecutePromise.mockResolvedValue(retriedRun);

			localExecutionRedactionProxy.processExecution.mockImplementation(async (exec) => exec);

			const req = mock<ExecutionRequest.Retry>({
				params: { id: 'original-123' },
				user: mockUser,
				body: { loadWorkflow: false },
				query: {},
			});

			/**
			 * Act
			 */
			await localExecutionService.retry(req, ['workflow-1']);

			/**
			 * Assert
			 */
			expect(localExecutionRedactionProxy.processExecution).toHaveBeenCalledWith(
				expect.objectContaining({ id: retriedExecutionId }),
				expect.objectContaining({ user: mockUser, redactExecutionData: undefined }),
			);
		});

		/**
		 * Builds an ExecutionService wired up for the retry happy path, so a test
		 * can focus on the runData guard without re-stubbing the whole run flow.
		 */
		const buildRetryService = () => {
			const workflowRunner = mock<WorkflowRunner>();
			const redactionProxy = mock<ExecutionRedactionServiceProxy>();
			const service = new ExecutionService(
				globalConfig,
				mock(),
				activeExecutions,
				mock(),
				mock(),
				executionRepository,
				executionPersistence,
				mock(),
				mock(),
				mock(),
				waitTracker,
				workflowRunner,
				concurrencyControl,
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				redactionProxy,
				mock(),
			);

			workflowRunner.run.mockResolvedValue('retried-123');
			activeExecutions.getPostExecutePromise.mockResolvedValue(
				mock<IRun>({
					data: mock<IRunExecutionData>({ resultData: { runData: {} } }),
					mode: 'trigger',
					startedAt: new Date(),
					finished: true,
					status: 'success',
					waitTill: null,
				}),
			);
			redactionProxy.processExecution.mockImplementation(async (exec) => exec);

			return { service, workflowRunner };
		};

		const buildRetryRequest = () =>
			mock<ExecutionRequest.Retry>({
				params: { id: 'original-123' },
				user: mock<User>({ id: 'user-1' }),
				body: { loadWorkflow: false },
				query: {},
			});

		/**
		 * Builds a crashed (status 'error') source execution to retry. The data is a real
		 * object, not a mock proxy, so reading a missing runData key cannot auto-create an
		 * entry and the tests can assert on runData mutation directly.
		 */
		const buildCrashedExecution = (resultData: {
			lastNodeExecuted: string;
			runData: IRunData | undefined;
		}) => {
			const execution = mock<IExecutionResponse>({
				workflowId: 'workflow-1',
				finished: false,
				status: 'error',
				workflowData: { id: 'workflow-1', settings: {} } as IExecutionDb['workflowData'],
			});
			execution.data = {
				executionData: {
					nodeExecutionStack: [],
					waitingExecution: {},
					waitingExecutionSource: {},
				},
				resultData,
			} as unknown as IRunExecutionData;
			return execution;
		};

		const erroredRun = (error: boolean) =>
			[{ error: error ? new Error('boom') : undefined }] as unknown as ITaskData[];

		it('should not throw when retrying a crashed execution whose runData is undefined', async () => {
			const { service, workflowRunner } = buildRetryService();
			executionPersistence.findWithUnflattenedData.mockResolvedValue(
				// lastNodeExecuted is set but runData is missing entirely
				buildCrashedExecution({ lastNodeExecuted: 'Some Node', runData: undefined }),
			);

			await expect(service.retry(buildRetryRequest(), ['workflow-1'])).resolves.toBeDefined();
			expect(workflowRunner.run).toHaveBeenCalledTimes(1);
		});

		it('should not throw or pop when runData has no entry for lastNodeExecuted', async () => {
			const { service, workflowRunner } = buildRetryService();
			const otherNodeRun = erroredRun(false);
			// lastNodeExecuted points at a node absent from runData; an unrelated node's run
			// must survive the retry untouched.
			const runData: IRunData = { 'Other Node': otherNodeRun };
			executionPersistence.findWithUnflattenedData.mockResolvedValue(
				buildCrashedExecution({ lastNodeExecuted: 'Missing Node', runData }),
			);

			await expect(service.retry(buildRetryRequest(), ['workflow-1'])).resolves.toBeDefined();
			expect(workflowRunner.run).toHaveBeenCalledTimes(1);
			// No entry is created for the missing node, and unrelated run data is left intact.
			expect(runData['Missing Node']).toBeUndefined();
			expect(runData['Other Node']).toBe(otherNodeRun);
		});

		it('should remove the last run of the node when it ended in an error', async () => {
			const { service, workflowRunner } = buildRetryService();
			// Last run of the node carries an error, so it must be dropped before the retry.
			const runData: IRunData = { 'Crash Node': erroredRun(true) };
			executionPersistence.findWithUnflattenedData.mockResolvedValue(
				buildCrashedExecution({ lastNodeExecuted: 'Crash Node', runData }),
			);

			await expect(service.retry(buildRetryRequest(), ['workflow-1'])).resolves.toBeDefined();
			expect(workflowRunner.run).toHaveBeenCalledTimes(1);
			expect(runData['Crash Node']).toHaveLength(0);
		});

		it('should keep the last run of the node when it did not error', async () => {
			const { service, workflowRunner } = buildRetryService();
			// A crash can leave valid success info for the last node, which must be preserved.
			const runData: IRunData = { 'Last Node': erroredRun(false) };
			executionPersistence.findWithUnflattenedData.mockResolvedValue(
				buildCrashedExecution({ lastNodeExecuted: 'Last Node', runData }),
			);

			await expect(service.retry(buildRetryRequest(), ['workflow-1'])).resolves.toBeDefined();
			expect(workflowRunner.run).toHaveBeenCalledTimes(1);
			expect(runData['Last Node']).toHaveLength(1);
		});

		it('should not pop when the node has an empty run-data array', async () => {
			const { service, workflowRunner } = buildRetryService();
			const emptyRun = [] as unknown as ITaskData[];
			const runData: IRunData = { 'Empty Node': emptyRun };
			executionPersistence.findWithUnflattenedData.mockResolvedValue(
				buildCrashedExecution({ lastNodeExecuted: 'Empty Node', runData }),
			);

			await expect(service.retry(buildRetryRequest(), ['workflow-1'])).resolves.toBeDefined();
			expect(workflowRunner.run).toHaveBeenCalledTimes(1);
			expect(runData['Empty Node']).toHaveLength(0);
		});
	});

	describe('getLastSuccessfulExecution', () => {
		it('should return the redacted last successful execution for a workflow', async () => {
			/**
			 * Arrange
			 */
			const workflowId = 'workflow-123';
			const mockUser = mock<User>();
			const mockExecution = mock<IExecutionResponse>({
				id: 'execution-456',
				workflowId,
				mode: 'trigger',
				startedAt: new Date('2025-01-15T10:00:00Z'),
				stoppedAt: new Date('2025-01-15T10:05:00Z'),
				status: 'success',
			});
			executionPersistence.findMultipleExecutions.mockResolvedValue([mockExecution]);
			executionRedactionServiceProxy.processExecution.mockResolvedValue(mockExecution);

			/**
			 * Act
			 */
			const result = await executionService.getLastSuccessfulExecution(workflowId, mockUser);

			/**
			 * Assert
			 */
			expect(result).toEqual(mockExecution);
			expect(executionPersistence.findMultipleExecutions).toHaveBeenCalledWith(
				{
					select: ['id', 'mode', 'startedAt', 'stoppedAt', 'workflowId', 'jsonSizeBytes'],
					where: {
						workflowId,
						status: 'success',
					},
					order: { id: 'DESC' },
					take: 1,
				},
				{
					includeData: true,
					unflattenData: true,
					maxDataSizeBytes: globalConfig.executions.maxDisplaySize,
				},
			);
			expect(executionRedactionServiceProxy.processExecution).toHaveBeenCalledWith(mockExecution, {
				user: mockUser,
				redactExecutionData: undefined,
			});
		});

		it('should return undefined when no successful execution exists', async () => {
			/**
			 * Arrange
			 */
			const workflowId = 'workflow-with-no-success';
			const mockUser = mock<User>();
			executionPersistence.findMultipleExecutions.mockResolvedValue([]);

			/**
			 * Act
			 */
			const result = await executionService.getLastSuccessfulExecution(workflowId, mockUser);

			/**
			 * Assert
			 */
			expect(result).toBeUndefined();
			expect(executionRedactionServiceProxy.processExecution).not.toHaveBeenCalled();
		});
	});

	describe('stop', () => {
		it('should throw when stopping a missing execution', async () => {
			/**
			 * Arrange
			 */
			executionPersistence.findWithUnflattenedData.mockResolvedValue(undefined);
			const req = mock<ExecutionRequest.Stop>({ params: { id: '1234' } });

			/**
			 * Act
			 */
			const stop = executionService.stop(req.params.id, []);

			/**
			 * Assert
			 */
			await expect(stop).rejects.toThrowError(MissingExecutionStopError);
		});

		it('should throw when stopping a not-in-progress execution', async () => {
			/**
			 * Arrange
			 */
			const execution = mock<IExecutionResponse>({ id: '123', status: 'success' });
			executionPersistence.findWithUnflattenedData.mockResolvedValue(execution);
			const req = mock<ExecutionRequest.Stop>({ params: { id: execution.id } });

			/**
			 * Act
			 */
			const stop = executionService.stop(req.params.id, [execution.id]);

			/**
			 * Assert
			 */
			await expect(stop).rejects.toThrowError(WorkflowOperationError);
		});

		describe('regular mode', () => {
			it('should stop a `running` execution in regular mode', async () => {
				/**
				 * Arrange
				 */
				const execution = mock<IExecutionResponse>({
					id: '123',
					status: 'running',
					data: { resultData: {} },
				});
				executionPersistence.findWithUnflattenedData.mockResolvedValue(execution);
				concurrencyControl.has.mockReturnValue(false);
				activeExecutions.has.mockReturnValue(true);
				waitTracker.has.mockReturnValue(false);
				executionPersistence.updateExistingExecution.mockResolvedValue(true);

				const req = mock<ExecutionRequest.Stop>({ params: { id: execution.id } });

				/**
				 * Act
				 */
				await executionService.stop(req.params.id, [execution.id]);

				/**
				 * Assert
				 */
				expect(concurrencyControl.remove).not.toHaveBeenCalled();
				expect(activeExecutions.stopExecution).toHaveBeenCalledWith(
					execution.id,
					expect.any(ManualExecutionCancelledError),
				);
				expect(waitTracker.stopExecution).not.toHaveBeenCalled();
				expect(executionPersistence.updateExistingExecution).toHaveBeenCalledWith(
					execution.id,
					execution,
				);
			});

			it('should stop a `waiting` execution in regular mode', async () => {
				/**
				 * Arrange
				 */
				const execution = mock<IExecutionResponse>({
					id: '123',
					status: 'waiting',
					data: { resultData: {} },
				});
				executionPersistence.findWithUnflattenedData.mockResolvedValue(execution);
				concurrencyControl.has.mockReturnValue(false);
				activeExecutions.has.mockReturnValue(true);
				waitTracker.has.mockReturnValue(true);
				executionPersistence.updateExistingExecution.mockResolvedValue(true);

				const req = mock<ExecutionRequest.Stop>({ params: { id: execution.id } });

				/**
				 * Act
				 */
				await executionService.stop(req.params.id, [execution.id]);

				/**
				 * Assert
				 */
				expect(concurrencyControl.remove).not.toHaveBeenCalled();
				expect(activeExecutions.stopExecution).toHaveBeenCalledWith(
					execution.id,
					expect.any(ManualExecutionCancelledError),
				);
				expect(waitTracker.stopExecution).toHaveBeenCalledWith(execution.id);
				expect(executionPersistence.updateExistingExecution).toHaveBeenCalledWith(
					execution.id,
					execution,
				);
			});

			it('should stop a concurrency-controlled `new` execution in regular mode', async () => {
				/**
				 * Arrange
				 */
				const execution = mock<IExecutionResponse>({ id: '123', status: 'new', mode: 'trigger' });
				executionPersistence.findWithUnflattenedData.mockResolvedValue(execution);
				concurrencyControl.has.mockReturnValue(true);
				activeExecutions.has.mockReturnValue(false);
				waitTracker.has.mockReturnValue(false);
				executionRepository.stopBeforeRun.mockResolvedValue(mock<IExecutionResponse>());

				const req = mock<ExecutionRequest.Stop>({ params: { id: execution.id } });

				/**
				 * Act
				 */
				await executionService.stop(req.params.id, [execution.id]);

				/**
				 * Assert
				 */
				expect(concurrencyControl.remove).toHaveBeenCalledWith({
					mode: execution.mode,
					executionId: execution.id,
				});
				expect(activeExecutions.stopExecution).not.toHaveBeenCalled();
				expect(waitTracker.stopExecution).not.toHaveBeenCalled();
				expect(executionPersistence.updateExistingExecution).not.toHaveBeenCalled();
			});
		});

		describe('scaling mode', () => {
			describe('manual execution', () => {
				it('should stop a `running` execution in scaling mode', async () => {
					/**
					 * Arrange
					 */
					globalConfig.executions.mode = 'queue';
					const execution = mock<IExecutionResponse>({
						id: '123',
						mode: 'manual',
						status: 'running',
						data: { resultData: {} },
					});
					executionPersistence.findWithUnflattenedData.mockResolvedValue(execution);
					concurrencyControl.has.mockReturnValue(false);
					activeExecutions.has.mockReturnValue(true);
					waitTracker.has.mockReturnValue(false);

					const req = mock<ExecutionRequest.Stop>({ params: { id: execution.id } });
					const job = mock<Job>({ data: { executionId: execution.id } });
					scalingService.findJobsByStatus.mockResolvedValue([job]);
					executionPersistence.updateExistingExecution.mockResolvedValue(true);
					// @ts-expect-error Private method
					const stopInRegularModeSpy = vi.spyOn(executionService, 'stopInRegularMode');

					/**
					 * Act
					 */
					await executionService.stop(req.params.id, [execution.id]);

					/**
					 * Assert
					 */
					expect(stopInRegularModeSpy).not.toHaveBeenCalled();
					expect(activeExecutions.stopExecution).toHaveBeenCalledWith(
						execution.id,
						expect.any(ManualExecutionCancelledError),
					);
					expect(executionPersistence.updateExistingExecution).toHaveBeenCalledWith(
						execution.id,
						execution,
					);

					expect(concurrencyControl.remove).not.toHaveBeenCalled();
					expect(waitTracker.stopExecution).not.toHaveBeenCalled();
					expect(scalingService.stopJob).not.toHaveBeenCalled();
				});
			});

			describe('production execution', () => {
				it('should stop a `running` execution in scaling mode', async () => {
					/**
					 * Arrange
					 */
					globalConfig.executions.mode = 'queue';
					const execution = mock<IExecutionResponse>({
						id: '123',
						status: 'running',
						data: { resultData: {} },
					});
					executionPersistence.findWithUnflattenedData.mockResolvedValue(execution);
					waitTracker.has.mockReturnValue(false);

					const req = mock<ExecutionRequest.Stop>({ params: { id: execution.id } });
					const job = mock<Job>({ data: { executionId: execution.id } });
					scalingService.findJobsByStatus.mockResolvedValue([job]);
					executionPersistence.updateExistingExecution.mockResolvedValue(true);

					/**
					 * Act
					 */
					await executionService.stop(req.params.id, [execution.id]);

					/**
					 * Assert
					 */
					expect(waitTracker.stopExecution).not.toHaveBeenCalled();
					expect(activeExecutions.stopExecution).toHaveBeenCalled();
					expect(scalingService.findJobsByStatus).not.toHaveBeenCalled();
					expect(scalingService.stopJob).not.toHaveBeenCalled();
					expect(executionPersistence.updateExistingExecution).toHaveBeenCalled();
				});

				it('should stop a `waiting` execution in scaling mode', async () => {
					/**
					 * Arrange
					 */
					globalConfig.executions.mode = 'queue';
					const execution = mock<IExecutionResponse>({
						id: '123',
						status: 'waiting',
						data: { resultData: {} },
					});
					executionPersistence.findWithUnflattenedData.mockResolvedValue(execution);
					waitTracker.has.mockReturnValue(true);

					const req = mock<ExecutionRequest.Stop>({ params: { id: execution.id } });
					const job = mock<Job>({ data: { executionId: execution.id } });
					scalingService.findJobsByStatus.mockResolvedValue([job]);
					executionPersistence.updateExistingExecution.mockResolvedValue(true);

					/**
					 * Act
					 */
					await executionService.stop(req.params.id, [execution.id]);

					/**
					 * Assert
					 */
					expect(waitTracker.stopExecution).toHaveBeenCalledWith(execution.id);
					expect(scalingService.findJobsByStatus).not.toHaveBeenCalled();
					expect(scalingService.stopJob).not.toHaveBeenCalled();
					expect(executionPersistence.updateExistingExecution).toHaveBeenCalled();
				});
			});

			describe('subworkflow execution', () => {
				it('should broadcast a stop request so the worker running a subworkflow can cancel it', async () => {
					/**
					 * A subworkflow runs inline in a worker process, so it is absent from the main
					 * process `activeExecutions`. The main cannot stop it locally and must broadcast.
					 */
					globalConfig.executions.mode = 'queue';
					const execution = mock<IExecutionResponse>({
						id: 'child-123',
						status: 'running',
						data: { resultData: {} },
					});
					executionPersistence.findWithUnflattenedData.mockResolvedValue(execution);
					activeExecutions.has.mockReturnValue(false);
					waitTracker.has.mockReturnValue(false);
					executionPersistence.updateExistingExecution.mockResolvedValue(true);

					const req = mock<ExecutionRequest.Stop>({ params: { id: execution.id } });

					await executionService.stop(req.params.id, [execution.id]);

					expect(executionStopService.requestStop).toHaveBeenCalledWith(execution.id);
					expect(activeExecutions.stopExecution).not.toHaveBeenCalled();
					// The canceled status is still persisted by the main process.
					expect(executionPersistence.updateExistingExecution).toHaveBeenCalledWith(
						execution.id,
						execution,
					);
				});
			});
		});
	});
	describe('stopMany', () => {
		it('should call stop function for the given filters', async () => {
			executionRepository.findByStopExecutionsFilter.mockResolvedValue(
				['1', '2', '3'].map((id) => ({ id })),
			);
			const stopFn = vi.fn();
			executionService.stop = stopFn;

			const filters = {
				workflowId: '1',
				startedAfter: new Date().toISOString(),
				startedBefore: new Date().toISOString(),
				status: ['running'],
			} satisfies ExecutionRequest.StopMany['body']['filter'];

			const shared = ['A'];

			/**
			 * Act
			 */
			await executionService.stopMany(filters, shared);

			/**
			 * Assert
			 */
			expect(stopFn).toBeCalledTimes(3);
			expect(stopFn).toBeCalledWith('1', shared);
			expect(stopFn).toBeCalledWith('2', shared);
			expect(stopFn).toBeCalledWith('3', shared);
			expect(executionRepository.findByStopExecutionsFilter).toBeCalledWith(filters);
		});
	});

	describe('getExecutedVersions', () => {
		const workflowId = 'workflow-123';

		it('should return empty array when no version IDs exist', async () => {
			executionRepository.getDistinctVersionIds.mockResolvedValue([]);

			const result = await executionService.getExecutedVersions(workflowId);

			expect(result).toEqual([]);
			expect(workflowHistoryRepository.find).not.toHaveBeenCalled();
		});

		it('should return versions with metadata from workflow history', async () => {
			const versionIds = ['v1', 'v2'];
			executionRepository.getDistinctVersionIds.mockResolvedValue(versionIds);

			const historyVersions = [
				mock<WorkflowHistory>({ versionId: 'v2', name: null, createdAt: new Date('2025-01-02') }),
				mock<WorkflowHistory>({
					versionId: 'v1',
					name: 'Release 1',
					createdAt: new Date('2025-01-01'),
				}),
			];
			workflowHistoryRepository.find.mockResolvedValue(historyVersions);

			const result = await executionService.getExecutedVersions(workflowId);

			expect(executionRepository.getDistinctVersionIds).toHaveBeenCalledWith(workflowId);
			expect(workflowHistoryRepository.find).toHaveBeenCalledWith({
				where: { workflowId, versionId: expect.anything() },
				select: ['versionId', 'name', 'createdAt'],
				order: { createdAt: 'DESC' },
			});
			expect(result).toHaveLength(2);
			expect(result[0].versionId).toBe('v2');
			expect(result[0].name).toBeNull();
			expect(result[1].versionId).toBe('v1');
			expect(result[1].name).toBe('Release 1');
		});

		it('should return empty array when version IDs have no matching history', async () => {
			executionRepository.getDistinctVersionIds.mockResolvedValue(['orphan-v1']);
			workflowHistoryRepository.find.mockResolvedValue([]);

			const result = await executionService.getExecutedVersions(workflowId);

			expect(result).toEqual([]);
		});
	});
});
