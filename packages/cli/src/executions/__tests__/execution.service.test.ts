import { mockInstance } from '@n8n/backend-test-utils';
import type { IExecutionResponse, ExecutionRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import { WorkflowOperationError } from 'n8n-workflow';

import type { ActiveExecutions } from '@/active-executions';
import type { ConcurrencyControlService } from '@/concurrency/concurrency-control.service';
import config from '@/config';
import { AbortedExecutionRetryError } from '@/errors/aborted-execution-retry.error';
import { MissingExecutionStopError } from '@/errors/missing-execution-stop.error';
import { ExecutionService } from '@/executions/execution.service';
import type { ExecutionRequest } from '@/executions/execution.types';
import { ScalingService } from '@/scaling/scaling.service';
import type { Job } from '@/scaling/scaling.types';
import type { WaitTracker } from '@/wait-tracker';

describe('ExecutionService', () => {
	const scalingService = mockInstance(ScalingService);
	const activeExecutions = mock<ActiveExecutions>();
	const executionRepository = mock<ExecutionRepository>();
	const waitTracker = mock<WaitTracker>();
	const concurrencyControl = mock<ConcurrencyControlService>();

	const executionService = new ExecutionService(
		mock(),
		mock(),
		activeExecutions,
		mock(),
		mock(),
		executionRepository,
		mock(),
		mock(),
		waitTracker,
		mock(),
		concurrencyControl,
		mock(),
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
				expect(activeExecutions.stopExecution).toHaveBeenCalledWith(execution.id);
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
				expect(activeExecutions.stopExecution).toHaveBeenCalledWith(execution.id);
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
					config.set('executions.mode', 'queue');
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
					expect(activeExecutions.stopExecution).toHaveBeenCalledWith(execution.id);
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
					config.set('executions.mode', 'queue');
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
					config.set('executions.mode', 'queue');
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

	describe('pause', () => {
		it('should pause a running execution successfully', async () => {
			/**
			 * Arrange
			 */
			const execution = mock<IExecutionResponse>({
				id: '123',
				status: 'running',
				finished: false,
			});
			executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
			activeExecutions.has.mockReturnValue(true);
			activeExecutions.canPause.mockReturnValue(true);
			activeExecutions.pauseExecution.mockReturnValue(true);
			activeExecutions.getExecutionStatus.mockReturnValue({
				status: 'waiting',
				currentNode: 'testNode',
			});

			/**
			 * Act
			 */
			const result = await executionService.pause('123', ['123']);

			/**
			 * Assert
			 */
			expect(activeExecutions.pauseExecution).toHaveBeenCalledWith('123');
			expect(executionRepository.updateExistingExecution).toHaveBeenCalledWith('123', {
				status: 'waiting',
			});
			expect(result.paused).toBe(true);
			expect(result.currentNodeName).toBe('testNode');
		});

		it('should throw error when execution is already finished', async () => {
			/**
			 * Arrange
			 */
			const execution = mock<IExecutionResponse>({
				id: '123',
				status: 'success',
				finished: true,
			});
			executionRepository.findWithUnflattenedData.mockResolvedValue(execution);

			/**
			 * Act & Assert
			 */
			await expect(executionService.pause('123', ['123'])).rejects.toThrow(WorkflowOperationError);
		});
	});

	describe('resume', () => {
		it('should resume a paused execution successfully', async () => {
			/**
			 * Arrange
			 */
			const execution = mock<IExecutionResponse>({
				id: '123',
				status: 'waiting',
				finished: false,
				data: {
					resultData: {
						lastNodeExecuted: 'testNode',
					},
				},
			});
			executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
			activeExecutions.has.mockReturnValue(true);
			activeExecutions.canResume.mockReturnValue(true);
			activeExecutions.resumeExecution.mockReturnValue(true);
			activeExecutions.getExecutionStatus.mockReturnValue({
				status: 'running',
				currentNode: 'testNode',
			});

			/**
			 * Act
			 */
			const result = await executionService.resume('123', ['123']);

			/**
			 * Assert
			 */
			expect(activeExecutions.resumeExecution).toHaveBeenCalledWith('123');
			expect(executionRepository.updateExistingExecution).toHaveBeenCalledWith('123', {
				status: 'running',
			});
			expect(result.resumed).toBe(true);
			expect(result.fromNodeName).toBe('testNode');
		});

		it('should throw error when execution is already finished', async () => {
			/**
			 * Arrange
			 */
			const execution = mock<IExecutionResponse>({
				id: '123',
				status: 'success',
				finished: true,
			});
			executionRepository.findWithUnflattenedData.mockResolvedValue(execution);

			/**
			 * Act & Assert
			 */
			await expect(executionService.resume('123', ['123'])).rejects.toThrow(WorkflowOperationError);
		});
	});

	describe('step', () => {
		it('should step through execution successfully', async () => {
			/**
			 * Arrange
			 */
			const execution = mock<IExecutionResponse>({
				id: '123',
				status: 'running',
				finished: false,
				workflowData: {
					nodes: [
						{ name: 'node1', type: 'test' },
						{ name: 'node2', type: 'test' },
					],
					connections: {},
				},
			});
			executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
			activeExecutions.has.mockReturnValue(true);
			activeExecutions.canStep.mockReturnValue(true);
			activeExecutions.stepExecution.mockReturnValue({
				stepsExecuted: 2,
				currentNode: 'node1',
				nextNodes: ['node2'],
			});

			const options = { steps: 2 };

			/**
			 * Act
			 */
			const result = await executionService.step('123', ['123'], options);

			/**
			 * Assert
			 */
			expect(activeExecutions.stepExecution).toHaveBeenCalledWith('123', 2, undefined);
			expect(executionRepository.updateExistingExecution).toHaveBeenCalledWith('123', {
				status: 'running',
			});
			expect(result.stepsExecuted).toBe(2);
			expect(result.currentNodeName).toBe('node1');
			expect(result.nextNodeNames).toEqual(['node2']);
		});

		it('should step with specific node names', async () => {
			/**
			 * Arrange
			 */
			const execution = mock<IExecutionResponse>({
				id: '123',
				status: 'running',
				finished: false,
				workflowData: {
					nodes: [
						{ name: 'node1', type: 'test' },
						{ name: 'node2', type: 'test' },
					],
					connections: {},
				},
			});
			executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
			activeExecutions.has.mockReturnValue(true);
			activeExecutions.canStep.mockReturnValue(true);
			activeExecutions.stepExecution.mockReturnValue({
				stepsExecuted: 1,
				currentNode: 'node1',
				nextNodes: ['node2'],
			});

			const options = { steps: 1, nodeNames: ['node2'] };

			/**
			 * Act
			 */
			const result = await executionService.step('123', ['123'], options);

			/**
			 * Assert
			 */
			expect(activeExecutions.stepExecution).toHaveBeenCalledWith('123', 1, ['node2']);
			expect(result.nextNodeNames).toEqual(['node2']);
		});
	});

	describe('retryNode', () => {
		it('should retry node in active execution successfully', async () => {
			/**
			 * Arrange
			 */
			const execution = mock<IExecutionResponse>({
				id: '123',
				status: 'running',
				workflowData: {
					nodes: [{ name: 'testNode', type: 'test', parameters: { param1: 'value1' } }],
					connections: {},
				},
			});
			executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
			activeExecutions.has.mockReturnValue(true);
			activeExecutions.retryNodeExecution.mockReturnValue(true);

			const options = {
				modifiedParameters: { param1: 'newValue' },
				resetState: true,
			};

			/**
			 * Act
			 */
			const result = await executionService.retryNode('123', 'testNode', ['123'], options);

			/**
			 * Assert
			 */
			expect(activeExecutions.retryNodeExecution).toHaveBeenCalledWith(
				'123',
				'testNode',
				{ param1: 'newValue' },
				true,
			);
			expect(result.retried).toBe(true);
			expect(result.nodeName).toBe('testNode');
		});

		it('should retry node in inactive execution', async () => {
			/**
			 * Arrange
			 */
			const node = { name: 'testNode', type: 'test', parameters: { param1: 'value1' } };
			const execution = mock<IExecutionResponse>({
				id: '123',
				status: 'error',
				workflowData: {
					nodes: [node],
					connections: {},
				},
				data: {
					resultData: {
						runData: {
							testNode: [{ error: 'some error' }],
						},
					},
				},
			});
			executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
			activeExecutions.has.mockReturnValue(false);

			const options = {
				modifiedParameters: { param1: 'newValue' },
				resetState: true,
			};

			/**
			 * Act
			 */
			const result = await executionService.retryNode('123', 'testNode', ['123'], options);

			/**
			 * Assert
			 */
			expect(node.parameters).toEqual({ param1: 'newValue' });
			expect(execution.data.resultData.runData.testNode).toBeUndefined();
			expect(executionRepository.updateExistingExecution).toHaveBeenCalled();
			expect(result.retried).toBe(true);
		});

		it('should throw error when node not found', async () => {
			/**
			 * Arrange
			 */
			const execution = mock<IExecutionResponse>({
				id: '123',
				workflowData: {
					nodes: [{ name: 'otherNode', type: 'test' }],
					connections: {},
				},
			});
			executionRepository.findWithUnflattenedData.mockResolvedValue(execution);

			/**
			 * Act & Assert
			 */
			await expect(
				executionService.retryNode('123', 'nonExistentNode', ['123'], {}),
			).rejects.toThrow(WorkflowOperationError);
		});
	});

	describe('skipNode', () => {
		it('should skip node in active execution successfully', async () => {
			/**
			 * Arrange
			 */
			const execution = mock<IExecutionResponse>({
				id: '123',
				status: 'running',
				workflowData: {
					nodes: [{ name: 'testNode', type: 'test' }],
					connections: {},
				},
			});
			executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
			activeExecutions.has.mockReturnValue(true);
			activeExecutions.skipNodeExecution.mockReturnValue(true);

			const options = {
				mockOutputData: { result: 'mocked' },
				reason: 'Testing skip functionality',
			};

			/**
			 * Act
			 */
			const result = await executionService.skipNode('123', 'testNode', ['123'], options);

			/**
			 * Assert
			 */
			expect(activeExecutions.skipNodeExecution).toHaveBeenCalledWith('123', 'testNode', {
				result: 'mocked',
			});
			expect(result.skipped).toBe(true);
			expect(result.nodeName).toBe('testNode');
		});

		it('should skip node in inactive execution', async () => {
			/**
			 * Arrange
			 */
			const execution = mock<IExecutionResponse>({
				id: '123',
				status: 'error',
				workflowData: {
					nodes: [{ name: 'testNode', type: 'test' }],
					connections: {},
				},
				data: {
					resultData: {
						runData: {},
					},
				},
			});
			executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
			activeExecutions.has.mockReturnValue(false);

			const options = {
				mockOutputData: { result: 'mocked' },
			};

			/**
			 * Act
			 */
			const result = await executionService.skipNode('123', 'testNode', ['123'], options);

			/**
			 * Assert
			 */
			expect(execution.data.resultData.runData.testNode).toBeDefined();
			expect(execution.data.resultData.runData.testNode[0].data.main[0][0].json).toEqual({
				result: 'mocked',
			});
			expect(executionRepository.updateExistingExecution).toHaveBeenCalled();
			expect(result.skipped).toBe(true);
		});
	});

	describe('getNodeStatus', () => {
		it('should get node status from active execution', async () => {
			/**
			 * Arrange
			 */
			const execution = mock<IExecutionResponse>({
				id: '123',
				workflowData: {
					nodes: [{ name: 'testNode', type: 'test' }],
					connections: {},
				},
			});
			executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
			activeExecutions.has.mockReturnValue(true);
			activeExecutions.getNodeExecutionStatus.mockReturnValue({
				status: 'success',
				executionTime: 150,
			});

			/**
			 * Act
			 */
			const result = await executionService.getNodeStatus('123', 'testNode', ['123']);

			/**
			 * Assert
			 */
			expect(activeExecutions.getNodeExecutionStatus).toHaveBeenCalledWith('123', 'testNode');
			expect(result.status).toBe('success');
			expect(result.executionTime).toBe(150);
		});

		it('should get node status from database for inactive execution', async () => {
			/**
			 * Arrange
			 */
			const execution = mock<IExecutionResponse>({
				id: '123',
				data: {
					resultData: {
						runData: {
							testNode: [
								{
									executionTime: 200,
									error: undefined,
								},
							],
						},
					},
				},
			});
			executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
			activeExecutions.has.mockReturnValue(false);

			/**
			 * Act
			 */
			const result = await executionService.getNodeStatus('123', 'testNode', ['123']);

			/**
			 * Assert
			 */
			expect(result.status).toBe('completed');
			expect(result.executionTime).toBe(200);
		});

		it('should return pending status for unexecuted node', async () => {
			/**
			 * Arrange
			 */
			const execution = mock<IExecutionResponse>({
				id: '123',
				data: {
					resultData: {
						runData: {},
					},
				},
			});
			executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
			activeExecutions.has.mockReturnValue(false);

			/**
			 * Act
			 */
			const result = await executionService.getNodeStatus('123', 'testNode', ['123']);

			/**
			 * Assert
			 */
			expect(result.status).toBe('pending');
		});
	});
});
