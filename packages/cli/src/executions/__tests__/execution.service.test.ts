import type { ExecutionCaller } from '@n8n/api-types';
import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type {
	ExecutionMetadataRepository,
	IExecutionDb,
	IExecutionResponse,
	ExecutionRepository,
	User,
	WorkflowHistoryRepository,
} from '@n8n/db';
import type { WorkflowHistory } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { ExecutionSummary, IRun, IRunExecutionData } from 'n8n-workflow';
import { ManualExecutionCancelledError, WorkflowOperationError } from 'n8n-workflow';

import type { ActiveExecutions } from '@/active-executions';
import type { ConcurrencyControlService } from '@/concurrency/concurrency-control.service';
import { AbortedExecutionRetryError } from '@/errors/aborted-execution-retry.error';
import { MissingExecutionStopError } from '@/errors/missing-execution-stop.error';
import type { ExecutionRedactionServiceProxy } from '@/executions/execution-redaction-proxy.service';
import { ExecutionService } from '@/executions/execution.service';
import type { ExecutionRequest } from '@/executions/execution.types';
import { ScalingService } from '@/scaling/scaling.service';
import type { Job } from '@/scaling/scaling.types';
import type { WaitTracker } from '@/wait-tracker';
import type { WorkflowRunner } from '@/workflow-runner';

describe('ExecutionService', () => {
	const scalingService = mockInstance(ScalingService);
	const activeExecutions = mock<ActiveExecutions>();
	const executionRepository = mock<ExecutionRepository>();
	const workflowHistoryRepository = mock<WorkflowHistoryRepository>();
	const waitTracker = mock<WaitTracker>();
	const concurrencyControl = mock<ConcurrencyControlService>();
	const globalConfig = Container.get(GlobalConfig);
	const executionRedactionServiceProxy = mock<ExecutionRedactionServiceProxy>();

	const executionMetadataRepository = mock<ExecutionMetadataRepository>();

	const executionService = new ExecutionService(
		globalConfig,
		mock(),
		activeExecutions,
		mock(),
		mock(),
		executionRepository,
		mock(),
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
		executionMetadataRepository,
	);

	beforeEach(() => {
		globalConfig.executions.mode = 'regular';
		jest.clearAllMocks();
	});

	describe('findOne', () => {
		it('should parse redactExecutionData from query string and pass to redaction proxy', async () => {
			/**
			 * Arrange
			 */
			const execution = mock<IExecutionResponse>({ id: '123', data: { resultData: {} } });
			executionRepository.findIfSharedUnflatten.mockResolvedValue(execution);
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
			executionRepository.findIfSharedUnflatten.mockResolvedValue(execution);
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

		it('populates caller field for single-node executions', async () => {
			const execution = mock<IExecutionResponse>({
				id: 'exec-1',
				mode: 'single-node',
				data: { resultData: {} },
				customData: {
					'caller.kind': 'cli',
					'caller.name': 'n8n-cli@host',
					'caller.clientId': 'client-123',
					nodeType: 'n8n-nodes-base.set',
				},
			});
			executionRepository.findIfSharedUnflatten.mockResolvedValue(execution);
			executionRedactionServiceProxy.processExecution.mockResolvedValue(execution);

			const req = mock<ExecutionRequest.GetOne>({
				params: { id: 'exec-1' },
				query: {},
			});

			const result = await executionService.findOne(req, ['workflow-1']);

			expect(result?.caller).toEqual({
				kind: 'cli',
				name: 'n8n-cli@host',
				clientId: 'client-123',
			});
		});

		it('omits caller field for workflow executions', async () => {
			const execution = mock<IExecutionResponse>({
				id: 'exec-2',
				mode: 'manual',
				data: { resultData: {} },
				customData: {},
			});
			executionRepository.findIfSharedUnflatten.mockResolvedValue(execution);
			executionRedactionServiceProxy.processExecution.mockResolvedValue(execution);

			const req = mock<ExecutionRequest.GetOne>({
				params: { id: 'exec-2' },
				query: {},
			});

			const result = await executionService.findOne(req, ['workflow-1']);

			expect(result?.caller).toBeUndefined();
		});

		it('omits caller field when single-node has no caller metadata', async () => {
			const execution = mock<IExecutionResponse>({
				id: 'exec-3',
				mode: 'single-node',
				data: { resultData: {} },
				customData: { nodeType: 'n8n-nodes-base.set' },
			});
			executionRepository.findIfSharedUnflatten.mockResolvedValue(execution);
			executionRedactionServiceProxy.processExecution.mockResolvedValue(execution);

			const req = mock<ExecutionRequest.GetOne>({
				params: { id: 'exec-3' },
				query: {},
			});

			const result = await executionService.findOne(req, ['workflow-1']);

			expect(result?.caller).toBeUndefined();
		});
	});

	describe('findRangeWithCount caller enrichment', () => {
		it('attaches caller to single-node summaries and skips workflow ones', async () => {
			const summaries = [
				{ id: 'exec-1', mode: 'single-node', workflowId: 'w-1' },
				{ id: 'exec-2', mode: 'manual', workflowId: 'w-2' },
				{ id: 'exec-3', mode: 'single-node', workflowId: 'w-3' },
			] as unknown as ExecutionSummary[];

			executionRepository.findManyByRangeQuery.mockResolvedValue(summaries);
			executionRepository.fetchCount.mockResolvedValue(3);

			// The service now uses a query builder (createQueryBuilder().where(...).getMany())
			// to bypass column-transformer mismatches in `findBy({executionId: In(...)})`.
			// Mock the chainable surface.
			const qbWhere = jest.fn().mockReturnThis();
			const qbGetMany = jest.fn().mockResolvedValue([
				{ id: 1, executionId: 'exec-1', key: 'caller.kind', value: 'cli' },
				{ id: 2, executionId: 'exec-1', key: 'caller.name', value: 'n8n-cli@host' },
				{ id: 3, executionId: 'exec-3', key: 'caller.kind', value: 'mcp' },
				{ id: 4, executionId: 'exec-3', key: 'caller.name', value: 'mcp-server' },
				{ id: 5, executionId: 'exec-3', key: 'caller.clientId', value: 'client-123' },
			]);
			executionMetadataRepository.createQueryBuilder.mockReturnValue({
				where: qbWhere,
				getMany: qbGetMany,
			} as never);

			const { results } = await executionService.findRangeWithCount({
				kind: 'range',
				range: { limit: 10 },
			} as never);

			expect(executionMetadataRepository.createQueryBuilder).toHaveBeenCalled();
			expect(qbWhere).toHaveBeenCalledWith(
				expect.stringContaining('executionId IN'),
				expect.objectContaining({ ids: expect.arrayContaining(['exec-1', 'exec-3']) }),
			);
			expect((results[0] as ExecutionSummary & { caller?: ExecutionCaller }).caller).toEqual({
				kind: 'cli',
				name: 'n8n-cli@host',
			});
			expect(
				(results[1] as ExecutionSummary & { caller?: ExecutionCaller }).caller,
			).toBeUndefined();
			expect((results[2] as ExecutionSummary & { caller?: ExecutionCaller }).caller).toEqual({
				kind: 'mcp',
				name: 'mcp-server',
				clientId: 'client-123',
			});
		});

		it('does not call metadata repository when there are no single-node summaries', async () => {
			const summaries = [
				{ id: 'exec-99', mode: 'manual', workflowId: 'w-9' },
			] as unknown as ExecutionSummary[];

			executionRepository.findManyByRangeQuery.mockResolvedValue(summaries);
			executionRepository.fetchCount.mockResolvedValue(1);

			await executionService.findRangeWithCount({
				kind: 'range',
				range: { limit: 10 },
			} as never);

			expect(executionMetadataRepository.createQueryBuilder).not.toHaveBeenCalled();
		});

		it('swallows metadata fetch failures and returns summaries without caller', async () => {
			const summaries = [
				{ id: 'exec-1', mode: 'single-node', workflowId: 'w-1' },
			] as unknown as ExecutionSummary[];

			executionRepository.findManyByRangeQuery.mockResolvedValue(summaries);
			executionRepository.fetchCount.mockResolvedValue(1);
			executionMetadataRepository.createQueryBuilder.mockReturnValue({
				where: jest.fn().mockReturnThis(),
				getMany: jest.fn().mockRejectedValue(new Error('db is down')),
			} as never);

			const { results } = await executionService.findRangeWithCount({
				kind: 'range',
				range: { limit: 10 },
			} as never);

			expect(
				(results[0] as ExecutionSummary & { caller?: ExecutionCaller }).caller,
			).toBeUndefined();
		});
	});

	describe('findManyByCredentialId', () => {
		it('returns enriched summaries and aggregate counts', async () => {
			const summaries = [
				{ id: 'exec-a', mode: 'single-node', workflowId: 'w-1' },
				{ id: 'exec-b', mode: 'single-node', workflowId: 'w-2' },
			] as unknown as ExecutionSummary[];

			executionRepository.findManyByCredentialId.mockResolvedValue(summaries);
			executionRepository.countByCredentialId.mockResolvedValue({
				total: 5,
				succeeded: 4,
				failed: 1,
			});
			executionMetadataRepository.createQueryBuilder.mockReturnValue({
				where: jest.fn().mockReturnThis(),
				getMany: jest.fn().mockResolvedValue([
					{ id: 1, executionId: 'exec-a', key: 'caller.kind', value: 'mcp' },
					{ id: 2, executionId: 'exec-a', key: 'caller.name', value: 'Claude Desktop' },
				]),
			} as never);

			const result = await executionService.findManyByCredentialId('cred_abc', { limit: 20 });

			expect(executionRepository.findManyByCredentialId).toHaveBeenCalledWith('cred_abc', {
				limit: 20,
			});
			expect(executionRepository.countByCredentialId).toHaveBeenCalledWith('cred_abc');
			expect(result.total).toBe(5);
			expect(result.succeeded).toBe(4);
			expect(result.failed).toBe(1);
			expect((result.results[0] as ExecutionSummary & { caller?: ExecutionCaller }).caller).toEqual(
				{ kind: 'mcp', name: 'Claude Desktop' },
			);
		});

		it('passes lastId through for pagination', async () => {
			executionRepository.findManyByCredentialId.mockResolvedValue([]);
			executionRepository.countByCredentialId.mockResolvedValue({
				total: 0,
				succeeded: 0,
				failed: 0,
			});

			await executionService.findManyByCredentialId('cred_xyz', {
				limit: 50,
				lastId: 'exec-99',
			});

			expect(executionRepository.findManyByCredentialId).toHaveBeenCalledWith('cred_xyz', {
				limit: 50,
				lastId: 'exec-99',
			});
		});

		it('returns zero counts when the credential has no executions', async () => {
			executionRepository.findManyByCredentialId.mockResolvedValue([]);
			executionRepository.countByCredentialId.mockResolvedValue({
				total: 0,
				succeeded: 0,
				failed: 0,
			});

			const result = await executionService.findManyByCredentialId('cred_unused', { limit: 20 });

			expect(result.results).toHaveLength(0);
			expect(result.total).toBe(0);
			expect(result.succeeded).toBe(0);
			expect(result.failed).toBe(0);
		});
	});

	describe('retry', () => {
		it('should error on retrying a execution that was aborted before starting', async () => {
			/**
			 * Arrange
			 */
			executionRepository.findWithUnflattenedData.mockResolvedValue(
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
				mock(),
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
				mock(),
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
			executionRepository.findWithUnflattenedData.mockResolvedValue(sourceExecution);

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
			executionRepository.findMultipleExecutions.mockResolvedValue([mockExecution]);
			executionRedactionServiceProxy.processExecution.mockResolvedValue(mockExecution);

			/**
			 * Act
			 */
			const result = await executionService.getLastSuccessfulExecution(workflowId, mockUser);

			/**
			 * Assert
			 */
			expect(result).toEqual(mockExecution);
			expect(executionRepository.findMultipleExecutions).toHaveBeenCalledWith(
				{
					select: ['id', 'mode', 'startedAt', 'stoppedAt', 'workflowId'],
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
			executionRepository.findMultipleExecutions.mockResolvedValue([]);

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
			executionRepository.findWithUnflattenedData.mockResolvedValue(undefined);
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
			executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
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
				const execution = mock<IExecutionResponse>({ id: '123', status: 'running' });
				executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
				concurrencyControl.has.mockReturnValue(false);
				activeExecutions.has.mockReturnValue(true);
				waitTracker.has.mockReturnValue(false);
				executionRepository.stopDuringRun.mockResolvedValue(mock<IExecutionResponse>());

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
				expect(executionRepository.stopDuringRun).toHaveBeenCalledWith(execution);
			});

			it('should stop a `waiting` execution in regular mode', async () => {
				/**
				 * Arrange
				 */
				const execution = mock<IExecutionResponse>({ id: '123', status: 'waiting' });
				executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
				concurrencyControl.has.mockReturnValue(false);
				activeExecutions.has.mockReturnValue(true);
				waitTracker.has.mockReturnValue(true);
				executionRepository.stopDuringRun.mockResolvedValue(mock<IExecutionResponse>());

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
				expect(executionRepository.stopDuringRun).toHaveBeenCalledWith(execution);
			});

			it('should stop a concurrency-controlled `new` execution in regular mode', async () => {
				/**
				 * Arrange
				 */
				const execution = mock<IExecutionResponse>({ id: '123', status: 'new', mode: 'trigger' });
				executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
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
				expect(executionRepository.stopDuringRun).not.toHaveBeenCalled();
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
					});
					executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
					concurrencyControl.has.mockReturnValue(false);
					activeExecutions.has.mockReturnValue(true);
					waitTracker.has.mockReturnValue(false);

					const req = mock<ExecutionRequest.Stop>({ params: { id: execution.id } });
					const job = mock<Job>({ data: { executionId: execution.id } });
					scalingService.findJobsByStatus.mockResolvedValue([job]);
					executionRepository.stopDuringRun.mockResolvedValue(mock<IExecutionResponse>());
					// @ts-expect-error Private method
					const stopInRegularModeSpy = jest.spyOn(executionService, 'stopInRegularMode');

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
					expect(executionRepository.stopDuringRun).toHaveBeenCalledWith(execution);

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
					const execution = mock<IExecutionResponse>({ id: '123', status: 'running' });
					executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
					waitTracker.has.mockReturnValue(false);

					const req = mock<ExecutionRequest.Stop>({ params: { id: execution.id } });
					const job = mock<Job>({ data: { executionId: execution.id } });
					scalingService.findJobsByStatus.mockResolvedValue([job]);
					executionRepository.stopDuringRun.mockResolvedValue(mock<IExecutionResponse>());

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
					expect(executionRepository.stopDuringRun).toHaveBeenCalled();
				});

				it('should stop a `waiting` execution in scaling mode', async () => {
					/**
					 * Arrange
					 */
					globalConfig.executions.mode = 'queue';
					const execution = mock<IExecutionResponse>({ id: '123', status: 'waiting' });
					executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
					waitTracker.has.mockReturnValue(true);

					const req = mock<ExecutionRequest.Stop>({ params: { id: execution.id } });
					const job = mock<Job>({ data: { executionId: execution.id } });
					scalingService.findJobsByStatus.mockResolvedValue([job]);
					executionRepository.stopDuringRun.mockResolvedValue(mock<IExecutionResponse>());

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
					expect(executionRepository.stopDuringRun).toHaveBeenCalled();
				});
			});
		});
	});
	describe('stopMany', () => {
		it('should call stop function for the given filters', async () => {
			executionRepository.findByStopExecutionsFilter.mockResolvedValue(
				['1', '2', '3'].map((id) => ({ id })),
			);
			const stopFn = jest.fn();
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
