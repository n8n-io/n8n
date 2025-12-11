import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { IExecutionResponse, ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { stringify } from 'flatted';
import { mock } from 'jest-mock-extended';
import {
	createRunExecutionData,
	ManualExecutionCancelledError,
	WorkflowOperationError,
} from 'n8n-workflow';

import type { ActiveExecutions } from '@/active-executions';
import type { ConcurrencyControlService } from '@/concurrency/concurrency-control.service';
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
	const globalConfig = Container.get(GlobalConfig);

	const executionService = new ExecutionService(
		globalConfig,
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

	/**
	 * Helper function to create mock workflow data for testing.
	 */
	const createMockWorkflowData = (overrides: Partial<IExecutionResponse['workflowData']> = {}) => {
		const baseDate = new Date('2025-01-15T10:00:00Z');
		return {
			id: 'workflow-456',
			name: 'Test Workflow',
			createdAt: baseDate,
			nodes: [],
			connections: {},
			active: false,
			settings: {},
			isArchived: false,
			updatedAt: baseDate,
			activeVersionId: null,
			...overrides,
		};
	};

	/**
	 * Helper function to create mock execution objects for testing.
	 * Can create both IExecutionResponse and IExecutionFlattedDb types depending on usage.
	 * Automatically stringifies the `data` field if provided in overrides.
	 */
	const createMockExecution = (overrides: Partial<IExecutionResponse> = {}): any => {
		const baseDate = new Date('2025-01-15T10:00:00Z');
		const defaults = {
			id: 'exec-123',
			workflowId: 'workflow-456',
			mode: 'manual' as const,
			status: 'success' as const,
			startedAt: baseDate,
			stoppedAt: new Date(baseDate.getTime() + 5 * 60 * 1000), // 5 minutes later
			createdAt: new Date(baseDate.getTime() - 60 * 1000), // 1 minute before
			data: stringify(
				createRunExecutionData({
					resultData: { runData: {} },
				}),
			),
			workflowData: createMockWorkflowData(),
			customData: {},
			annotation: { tags: [] },
			finished: true,
		};

		// Stringify data if provided in overrides and not already a string
		const processedOverrides = { ...overrides };
		if (processedOverrides.data && typeof processedOverrides.data !== 'string') {
			(processedOverrides as any).data = stringify(processedOverrides.data);
		}

		return { ...defaults, ...processedOverrides };
	};

	beforeEach(() => {
		globalConfig.executions.mode = 'regular';
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

	describe('findOne with subworkflow merging', () => {
		it('should merge sub-executions into parent execution', async () => {
			/**
			 * Arrange
			 */
			const parentExecution = createMockExecution({
				id: 'parent-123',
				data: createRunExecutionData({
					resultData: {
						runData: {
							ExecuteWorkflow: [
								{ executionIndex: 1, startTime: 1, executionTime: 100, source: [] },
							],
						},
					},
				}),
				workflowData: createMockWorkflowData({
					name: 'Parent Workflow',
					nodes: [
						{
							id: '1',
							name: 'Execute Workflow',
							type: 'n8n-nodes-base.executeWorkflow',
							disabled: false,
							parameters: {},
							position: [0, 0],
							typeVersion: 1,
						},
					],
				}),
			});

			const subExecution = createMockExecution({
				id: 'sub-789',
				mode: 'integrated',
				startedAt: new Date('2025-01-15T10:01:00Z'),
				createdAt: new Date('2025-01-15T10:01:00Z'),
				data: createRunExecutionData({
					resultData: {
						runData: {
							SubWorkflowNode: [{ executionIndex: 0, startTime: 2, executionTime: 50, source: [] }],
						},
					},
				}),
				finished: false,
			});

			executionRepository.findIfShared.mockResolvedValue(parentExecution);
			executionRepository.findSubExecutions.mockResolvedValue([subExecution]);

			/**
			 * Act
			 */
			const result = await executionService.findOne(
				mock<ExecutionRequest.GetOne>({ params: { id: 'parent-123' } }),
				['workflow-456'],
			);

			/**
			 * Assert
			 */
			expect(executionRepository.findSubExecutions).toHaveBeenCalledWith(
				'parent-123',
				'workflow-456',
				parentExecution.startedAt,
				parentExecution.stoppedAt,
			);

			// Verify the merged data contains both parent and sub-execution runData
			expect(result!.data).toContain('ExecuteWorkflow');
			expect(result!.data).toContain('SubWorkflowNode');
		});

		it('should not merge sub-executions when execution has no executeWorkflow nodes', async () => {
			/**
			 * Arrange
			 */
			const execution = createMockExecution({
				workflowData: createMockWorkflowData({
					name: 'Simple Workflow',
					nodes: [
						{
							id: '1',
							name: 'HTTP Request',
							type: 'n8n-nodes-base.httpRequest',
							disabled: false,
							parameters: {},
							position: [0, 0],
							typeVersion: 1,
						},
					],
				}),
			});

			executionRepository.findIfShared.mockResolvedValue(execution);

			/**
			 * Act
			 */
			await executionService.findOne(
				mock<ExecutionRequest.GetOne>({ params: { id: 'exec-123' } }),
				['workflow-456'],
			);

			/**
			 * Assert
			 */
			expect(executionRepository.findSubExecutions).not.toHaveBeenCalled();
		});

		it('should not merge sub-executions for integrated mode executions', async () => {
			/**
			 * Arrange
			 */
			const execution = createMockExecution({
				mode: 'integrated',
				workflowData: createMockWorkflowData({
					name: 'Sub Workflow',
				}),
			});

			executionRepository.findIfShared.mockResolvedValue(execution);

			/**
			 * Act
			 */
			await executionService.findOne(
				mock<ExecutionRequest.GetOne>({ params: { id: 'exec-123' } }),
				['workflow-456'],
			);

			/**
			 * Assert
			 */
			expect(executionRepository.findSubExecutions).not.toHaveBeenCalled();
		});

		it('should handle when no sub-executions are found', async () => {
			/**
			 * Arrange
			 */
			const parentExecution = createMockExecution({
				id: 'parent-123',
				data: createRunExecutionData({
					resultData: {
						runData: {
							execute_workflow: [
								{ executionIndex: 0, startTime: 1, executionTime: 100, source: [] },
							],
						},
					},
				}),
				workflowData: createMockWorkflowData({
					name: 'Parent Workflow',
					nodes: [
						{
							id: '1',
							name: 'Execute Workflow',
							type: 'n8n-nodes-base.executeWorkflow',
							disabled: false,
							parameters: {},
							position: [0, 0],
							typeVersion: 1,
						},
					],
				}),
			});

			executionRepository.findIfShared.mockResolvedValue(parentExecution);
			executionRepository.findSubExecutions.mockResolvedValue([]);

			/**
			 * Act
			 */
			const result = await executionService.findOne(
				mock<ExecutionRequest.GetOne>({ params: { id: 'parent-123' } }),
				['workflow-456'],
			);

			/**
			 * Assert
			 */
			expect(executionRepository.findSubExecutions).toHaveBeenCalled();
			// Data should remain unchanged
			expect(JSON.stringify(result!.data)).toContain('execute_workflow');
		});
	});

	describe('getLastSuccessfulExecution', () => {
		it('should return the last successful execution for a workflow', async () => {
			/**
			 * Arrange
			 */
			const workflowId = 'workflow-123';
			const mockExecution = mock<IExecutionResponse>({
				id: 'execution-456',
				workflowId,
				mode: 'trigger',
				startedAt: new Date('2025-01-15T10:00:00Z'),
				stoppedAt: new Date('2025-01-15T10:05:00Z'),
				status: 'success',
			});
			executionRepository.findMultipleExecutions.mockResolvedValue([mockExecution]);

			/**
			 * Act
			 */
			const result = await executionService.getLastSuccessfulExecution(workflowId);

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
		});

		it('should return undefined when no successful execution exists', async () => {
			/**
			 * Arrange
			 */
			const workflowId = 'workflow-with-no-success';
			executionRepository.findMultipleExecutions.mockResolvedValue([]);

			/**
			 * Act
			 */
			const result = await executionService.getLastSuccessfulExecution(workflowId);

			/**
			 * Assert
			 */
			expect(result).toBeUndefined();
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
});
