import { mock } from 'jest-mock-extended';
import { WorkflowOperationError } from 'n8n-workflow';
import config from '@/config';
import { ExecutionService } from '@/executions/execution.service';
import { AbortedExecutionRetryError } from '@/errors/aborted-execution-retry.error';
import { MissingExecutionStopError } from '@/errors/missing-execution-stop.error';
import type { ActiveExecutions } from '@/ActiveExecutions';
import type { IExecutionResponse } from '@/Interfaces';
import type { Job, Queue } from '@/Queue';
import type { WaitTracker } from '@/WaitTracker';
import type { ExecutionRepository } from '@/databases/repositories/execution.repository';
import type { ExecutionRequest } from '@/executions/execution.types';
import type { ConcurrencyControlService } from '@/concurrency/concurrency-control.service';

describe('ExecutionService', () => {
	const queue = mock<Queue>();
	const activeExecutions = mock<ActiveExecutions>();
	const executionRepository = mock<ExecutionRepository>();
	const waitTracker = mock<WaitTracker>();
	const concurrencyControl = mock<ConcurrencyControlService>();

	const executionService = new ExecutionService(
		mock(),
		mock(),
		queue,
		activeExecutions,
		executionRepository,
		mock(),
		mock(),
		waitTracker,
		mock(),
		concurrencyControl,
		mock(),
	);

	beforeEach(() => {
		config.set('executions.mode', 'regular');
		jest.clearAllMocks();
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
	});

	describe('stop', () => {
		it('should throw when stopping a missing execution', async () => {
			/**
			 * Arrange
			 */
			executionRepository.findSingleExecution.mockResolvedValue(undefined);

			/**
			 * Act
			 */
			const stop = executionService.stop('inexistent-123');

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
			executionRepository.findSingleExecution.mockResolvedValue(execution);

			/**
			 * Act
			 */
			const stop = executionService.stop(execution.id);

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
				executionRepository.findSingleExecution.mockResolvedValue(execution);
				concurrencyControl.has.mockReturnValue(false);
				activeExecutions.has.mockReturnValue(true);
				waitTracker.has.mockReturnValue(false);
				executionRepository.stopDuringRun.mockResolvedValue(mock<IExecutionResponse>());

				/**
				 * Act
				 */
				await executionService.stop(execution.id);

				/**
				 * Assert
				 */
				expect(concurrencyControl.remove).not.toHaveBeenCalled();
				expect(activeExecutions.stopExecution).toHaveBeenCalledWith(execution.id);
				expect(waitTracker.stopExecution).not.toHaveBeenCalled();
				expect(executionRepository.stopDuringRun).toHaveBeenCalledWith(execution);
			});

			it('should stop a `waiting` execution in regular mode', async () => {
				/**
				 * Arrange
				 */
				const execution = mock<IExecutionResponse>({ id: '123', status: 'waiting' });
				executionRepository.findSingleExecution.mockResolvedValue(execution);
				concurrencyControl.has.mockReturnValue(false);
				activeExecutions.has.mockReturnValue(true);
				waitTracker.has.mockReturnValue(true);
				executionRepository.stopDuringRun.mockResolvedValue(mock<IExecutionResponse>());

				/**
				 * Act
				 */
				await executionService.stop(execution.id);

				/**
				 * Assert
				 */
				expect(concurrencyControl.remove).not.toHaveBeenCalled();
				expect(activeExecutions.stopExecution).toHaveBeenCalledWith(execution.id);
				expect(waitTracker.stopExecution).toHaveBeenCalledWith(execution.id);
				expect(executionRepository.stopDuringRun).toHaveBeenCalledWith(execution);
			});

			it('should stop a concurrency-controlled `new` execution in regular mode', async () => {
				/**
				 * Arrange
				 */
				const execution = mock<IExecutionResponse>({ id: '123', status: 'new', mode: 'trigger' });
				executionRepository.findSingleExecution.mockResolvedValue(execution);
				concurrencyControl.has.mockReturnValue(true);
				activeExecutions.has.mockReturnValue(false);
				waitTracker.has.mockReturnValue(false);
				executionRepository.stopBeforeRun.mockResolvedValue(mock<IExecutionResponse>());

				/**
				 * Act
				 */
				await executionService.stop(execution.id);

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
				it('should delegate to regular mode in scaling mode', async () => {
					/**
					 * Arrange
					 */
					config.set('executions.mode', 'queue');
					const execution = mock<IExecutionResponse>({
						id: '123',
						mode: 'manual',
						status: 'running',
					});
					executionRepository.findSingleExecution.mockResolvedValue(execution);
					concurrencyControl.has.mockReturnValue(false);
					activeExecutions.has.mockReturnValue(true);
					waitTracker.has.mockReturnValue(false);
					executionRepository.stopDuringRun.mockResolvedValue(mock<IExecutionResponse>());
					// @ts-expect-error Private method
					const stopInRegularModeSpy = jest.spyOn(executionService, 'stopInRegularMode');

					/**
					 * Act
					 */
					await executionService.stop(execution.id);

					/**
					 * Assert
					 */
					expect(stopInRegularModeSpy).toHaveBeenCalledWith(execution);
					expect(activeExecutions.stopExecution).toHaveBeenCalledWith(execution.id);
					expect(executionRepository.stopDuringRun).toHaveBeenCalledWith(execution);

					expect(concurrencyControl.remove).not.toHaveBeenCalled();
					expect(waitTracker.stopExecution).not.toHaveBeenCalled();
					expect(queue.stopJob).not.toHaveBeenCalled();
				});
			});

			describe('production execution', () => {
				it('should stop a `running` execution in scaling mode', async () => {
					/**
					 * Arrange
					 */
					config.set('executions.mode', 'queue');
					const execution = mock<IExecutionResponse>({ id: '123', status: 'running' });
					executionRepository.findSingleExecution.mockResolvedValue(execution);
					waitTracker.has.mockReturnValue(false);
					queue.findRunningJobBy.mockResolvedValue(mock<Job>());
					executionRepository.stopDuringRun.mockResolvedValue(mock<IExecutionResponse>());

					/**
					 * Act
					 */
					await executionService.stop(execution.id);

					/**
					 * Assert
					 */
					expect(waitTracker.stopExecution).not.toHaveBeenCalled();
					expect(activeExecutions.stopExecution).toHaveBeenCalled();
					expect(queue.findRunningJobBy).toBeCalledWith({ executionId: execution.id });
					expect(queue.stopJob).toHaveBeenCalled();
					expect(executionRepository.stopDuringRun).toHaveBeenCalled();
				});

				it('should stop a `waiting` execution in scaling mode', async () => {
					/**
					 * Arrange
					 */
					config.set('executions.mode', 'queue');
					const execution = mock<IExecutionResponse>({ id: '123', status: 'waiting' });
					executionRepository.findSingleExecution.mockResolvedValue(execution);
					waitTracker.has.mockReturnValue(true);
					queue.findRunningJobBy.mockResolvedValue(mock<Job>());
					executionRepository.stopDuringRun.mockResolvedValue(mock<IExecutionResponse>());

					/**
					 * Act
					 */
					await executionService.stop(execution.id);

					/**
					 * Assert
					 */
					expect(waitTracker.stopExecution).toHaveBeenCalledWith(execution.id);
					expect(activeExecutions.stopExecution).toHaveBeenCalled();
					expect(queue.findRunningJobBy).toBeCalledWith({ executionId: execution.id });
					expect(queue.stopJob).toHaveBeenCalled();
					expect(executionRepository.stopDuringRun).toHaveBeenCalled();
				});
			});
		});
	});
});
