import { mock } from 'jest-mock-extended';
import type { ErrorReporter, ExecutionHooksOptionalParameters } from 'n8n-core';
import type {
	IWorkflowBase,
	IWorkflowExecutionDataProcess,
	ITaskData,
	IRunExecutionData,
	IRun,
	IDataObject,
	NodeOperationError,
	WorkflowExecuteMode,
} from 'n8n-workflow';

import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import type { EventService } from '@/events/event.service';
import { ExecutionLifecycleHooksFactory } from '@/execution-lifecycle-hooks/execution-lifecycle-hooks-factory';
import type { ExternalHooks } from '@/external-hooks';
import type { IExecutionResponse } from '@/interfaces';
import type { Push } from '@/push';
import type { ExecutionMetadataService } from '@/services/execution-metadata.service';
import type { WorkflowStatisticsService } from '@/services/workflow-statistics.service';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import type { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';
import { mockInstance } from '@test/mocking';

describe('ExecutionLifecycleHooksFactory', () => {
	const errorReporter = mock<ErrorReporter>();
	const executionRepository = mockInstance(ExecutionRepository);
	const externalHooks = mock<ExternalHooks>();
	const workflowStatisticsService = mock<WorkflowStatisticsService>();
	const workflowStaticDataService = mock<WorkflowStaticDataService>();
	const executionMetadataService = mock<ExecutionMetadataService>();
	const eventService = mock<EventService>();
	const push = mock<Push>();

	const hooksFactory = new ExecutionLifecycleHooksFactory(
		mock(),
		errorReporter,
		executionRepository,
		externalHooks,
		workflowStatisticsService,
		workflowStaticDataService,
		executionMetadataService,
		eventService,
		push,
		mock(),
	);

	const workflowId = 'workflow_id';
	const executionId = '123';
	const pushRef = 'abcd';
	const workflowData = mock<IWorkflowBase>({
		id: workflowId,
		settings: {},
		nodes: [],
	});
	const optionalParameters: ExecutionHooksOptionalParameters = {
		retryOf: 'retry123',
		pushRef,
	};

	beforeEach(() => {
		jest.clearAllMocks();
		workflowData.settings = {};
	});

	describe('forMainProcess', () => {
		const executionData = mock<IWorkflowExecutionDataProcess>({
			executionMode: 'manual',
			workflowData,
			pushRef,
			retryOf: 'retry123',
		});
		const newStaticData: IDataObject = { newKey: 'newValue' };
		const fullRunData: IRun = {
			data: { resultData: { runData: {} } },
			mode: 'manual',
			startedAt: new Date(),
			status: 'success',
		};

		it('should add all required hooks', () => {
			const hooks = hooksFactory.forMainProcess(executionData, executionId);

			const registeredHooks = (hooks as any).registered;
			expect(registeredHooks.nodeExecuteBefore).toHaveLength(2);
			expect(registeredHooks.nodeExecuteAfter).toHaveLength(3);
			expect(registeredHooks.workflowExecuteBefore).toHaveLength(3);
			expect(registeredHooks.workflowExecuteAfter).toHaveLength(2);
			expect(registeredHooks.nodeFetchedData).toHaveLength(1);
			expect(registeredHooks.sendResponse).toHaveLength(0);
		});

		it('should create hooks and execute them correctly', async () => {
			const hooks = hooksFactory.forMainProcess(executionData, executionId);

			// Test workflowExecuteBefore hook
			await hooks.executeHook('workflowExecuteBefore', []);
			expect(externalHooks.run).toHaveBeenCalledWith('workflow.preExecute', [undefined, 'manual']);

			// Test nodeExecuteBefore hook
			await hooks.executeHook('nodeExecuteBefore', ['testNode']);
			expect(push.send).toHaveBeenCalledWith(
				{
					type: 'nodeExecuteBefore',
					data: { executionId, nodeName: 'testNode' },
				},
				pushRef,
			);
			push.send.mockClear();

			// Test nodeExecuteAfter hook
			const taskData = mock<ITaskData>({});
			const runExecutionData: IRunExecutionData = { resultData: { runData: {} } };

			await hooks.executeHook('nodeExecuteAfter', ['testNode', taskData, runExecutionData]);

			expect(push.send).toHaveBeenCalledWith(
				{
					type: 'nodeExecuteAfter',
					data: { executionId, nodeName: 'testNode', data: taskData },
				},
				pushRef,
			);
			push.send.mockClear();

			// Test workflowExecuteAfter hook
			await hooks.executeHook('workflowExecuteAfter', [fullRunData, newStaticData]);

			expect(push.send).toHaveBeenCalledWith(
				{
					type: 'executionFinished',
					data: {
						executionId,
						workflowId,
						status: 'success',
						rawData: '[{"resultData":"1"},{"runData":"2"},{}]',
					},
				},
				pushRef,
			);
			expect(workflowStatisticsService.emit).toHaveBeenCalledWith('workflowExecutionCompleted', {
				workflowData,
				fullRunData,
			});
		});

		it('should handle waiting status in workflowExecuteAfter', async () => {
			const hooks = hooksFactory.forMainProcess(executionData, executionId);

			await hooks.executeHook('workflowExecuteAfter', [
				{
					...fullRunData,
					status: 'waiting',
					waitTill: new Date('2099-12-31'),
				},
				newStaticData,
			]);

			expect(push.send).toHaveBeenCalledWith(
				{ type: 'executionWaiting', data: { executionId } },
				pushRef,
			);
		});

		describe('static data', () => {
			it('should not update for manual executions', async () => {
				const hooks = hooksFactory.forMainProcess(executionData, executionId);

				await hooks.executeHook('workflowExecuteAfter', [fullRunData, newStaticData]);

				expect(workflowStaticDataService.saveStaticDataById).not.toHaveBeenCalled();
			});

			it('should update for non-manual executions', async () => {
				const hooks = hooksFactory.forMainProcess(
					{
						...executionData,
						executionMode: 'webhook',
					},
					executionId,
				);

				await hooks.executeHook('workflowExecuteAfter', [fullRunData, newStaticData]);

				expect(workflowStaticDataService.saveStaticDataById).toHaveBeenCalledWith(
					workflowData.id,
					newStaticData,
				);
			});
		});

		describe('execution saving', () => {
			it('should cleanup manual executions, if saving is disabled', async () => {
				const hooks = hooksFactory.forMainProcess(executionData, executionId);

				// Mock workflow settings to not save manual executions
				workflowData.settings = { saveManualExecutions: false };

				await hooks.executeHook('workflowExecuteAfter', [fullRunData, newStaticData]);

				expect(executionRepository.softDelete).toHaveBeenCalledWith(executionId);
			});

			it('should handle execution progress saving', async () => {
				workflowData.settings = { saveExecutionProgress: true };

				const hooks = hooksFactory.forMainProcess(executionData, executionId);

				const taskData = mock<ITaskData>({});
				const runExecutionData: IRunExecutionData = {
					resultData: {
						runData: {
							testNode: [],
						},
					},
				};
				const fullExecutionData = mock<IExecutionResponse>({
					finished: false,
					data: runExecutionData,
				});
				executionRepository.findSingleExecution
					.calledWith(executionId)
					.mockResolvedValue(fullExecutionData);

				await hooks.executeHook('nodeExecuteAfter', ['testNode', taskData, runExecutionData]);

				expect(fullExecutionData.data.resultData.lastNodeExecuted).toBe('testNode');
				expect(executionRepository.updateExistingExecution).toHaveBeenCalledWith(
					executionId,
					fullExecutionData,
				);
			});
		});

		describe('error handling', () => {
			it('should handle error workflows when execution fails', async () => {
				// Set workflow settings to save error executions
				workflowData.settings = { saveDataErrorExecution: 'all' };

				const hooks = hooksFactory.forMainProcess(
					{
						...executionData,
						executionMode: 'webhook',
					},
					executionId,
				);

				const executeErrorWorkflowSpy = jest.spyOn(
					WorkflowExecuteAdditionalData,
					'executeErrorWorkflow',
				);

				const failedRunData: IRun = {
					...fullRunData,
					status: 'error',
					data: {
						resultData: {
							runData: {},
							error: mock<NodeOperationError>(),
						},
					},
				};

				await hooks.executeHook('workflowExecuteAfter', [failedRunData, newStaticData]);

				// Verify error workflow execution
				expect(executeErrorWorkflowSpy).toHaveBeenCalledWith(
					workflowData,
					failedRunData,
					'webhook',
					executionId,
					'retry123',
				);

				executeErrorWorkflowSpy.mockRestore();
			});

			it('should handle static data save errors', async () => {
				const hooks = hooksFactory.forMainProcess(
					{
						...executionData,
						executionMode: 'webhook',
					},
					executionId,
				);

				const error = new Error('Static data save failed');
				workflowStaticDataService.saveStaticDataById.mockRejectedValueOnce(error);

				await hooks.executeHook('workflowExecuteAfter', [fullRunData, newStaticData]);

				expect(errorReporter.error).toHaveBeenCalledWith(error);
			});

			it('should handle execution save errors', async () => {
				const hooks = hooksFactory.forMainProcess(executionData, executionId);

				const error = new Error('DB save failed');
				executionRepository.updateExistingExecution.mockRejectedValueOnce(error);

				await hooks.executeHook('workflowExecuteAfter', [fullRunData, newStaticData]);

				expect(errorReporter.error).toHaveBeenCalledWith(error);
			});
		});

		describe('metadata handling', () => {
			it('should save execution metadata when present', async () => {
				const hooks = hooksFactory.forMainProcess(executionData, executionId);

				const runDataWithMetadata: IRun = {
					...fullRunData,
					data: {
						resultData: {
							runData: {},
							metadata: {
								someMetadata: 'value',
							},
						},
					},
				};

				await hooks.executeHook('workflowExecuteAfter', [runDataWithMetadata, newStaticData]);

				expect(executionMetadataService.save).toHaveBeenCalledWith(executionId, {
					someMetadata: 'value',
				});
			});

			it('should handle metadata save errors gracefully', async () => {
				const hooks = hooksFactory.forMainProcess(executionData, executionId);

				const error = new Error('Metadata save failed');
				executionMetadataService.save.mockRejectedValueOnce(error);

				const runDataWithMetadata: IRun = {
					...fullRunData,
					data: {
						resultData: {
							runData: {},
							metadata: {
								someMetadata: 'value',
							},
						},
					},
				};

				await hooks.executeHook('workflowExecuteAfter', [runDataWithMetadata, newStaticData]);

				expect(errorReporter.error).toHaveBeenCalledWith(error);
			});
		});
	});

	describe('forExecutionOnWorker', () => {
		it('should add all required hooks', () => {
			const hooks = hooksFactory.forExecutionOnWorker(
				'manual',
				executionId,
				workflowData,
				optionalParameters,
			);

			const registeredHooks = (hooks as any).registered;

			expect(registeredHooks.nodeExecuteBefore).toHaveLength(2);
			expect(registeredHooks.nodeExecuteAfter).toHaveLength(3);
			expect(registeredHooks.workflowExecuteBefore).toHaveLength(3);
			expect(registeredHooks.workflowExecuteAfter).toHaveLength(2);
			expect(registeredHooks.nodeFetchedData).toHaveLength(1);
			expect(registeredHooks.sendResponse).toHaveLength(0);
		});

		it('should run external hook `workflow.preExecute` on workflowExecuteBefore', async () => {
			const hooks = hooksFactory.forExecutionOnWorker(
				'manual',
				executionId,
				workflowData,
				optionalParameters,
			);

			await hooks.executeHook('workflowExecuteBefore', []);
			expect(externalHooks.run).toHaveBeenCalledWith('workflow.preExecute', [undefined, 'manual']);
		});

		describe('workflowExecuteAfter', () => {
			it('should not delete unfinished executions', async () => {
				const hooks = hooksFactory.forExecutionOnWorker('manual', executionId, workflowData);

				const unfinishedRunData: IRun = {
					data: { resultData: { runData: {} } },
					mode: 'manual',
					startedAt: new Date(),
					status: 'running',
					finished: false,
				};

				await hooks.executeHook('workflowExecuteAfter', [unfinishedRunData]);

				expect(executionRepository.hardDelete).not.toHaveBeenCalled();
			});

			it('should handle successful executions based on save settings', async () => {
				// Test when success executions should not be saved
				workflowData.settings = { saveDataSuccessExecution: 'none' };

				const hooks = hooksFactory.forExecutionOnWorker('manual', executionId, workflowData);

				const successRunData: IRun = {
					data: { resultData: { runData: {} } },
					mode: 'manual',
					startedAt: new Date(),
					status: 'success',
					finished: true,
				};

				await hooks.executeHook('workflowExecuteAfter', [successRunData]);

				expect(executionRepository.hardDelete).toHaveBeenCalledWith({
					workflowId,
					executionId,
				});
			});

			it('should handle error executions based on save settings', async () => {
				// Test when error executions should not be saved
				workflowData.settings = { saveDataErrorExecution: 'none' };

				const hooks = hooksFactory.forExecutionOnWorker('manual', executionId, workflowData);

				const errorRunData: IRun = {
					data: { resultData: { runData: {} } },
					mode: 'manual',
					startedAt: new Date(),
					status: 'error',
					finished: true,
				};

				await hooks.executeHook('workflowExecuteAfter', [errorRunData]);

				expect(executionRepository.hardDelete).toHaveBeenCalledWith({
					workflowId,
					executionId,
				});
			});

			it('should not delete executions when save settings allow it', async () => {
				// Test when success executions should be saved
				workflowData.settings = { saveDataSuccessExecution: 'all' };

				const hooks = hooksFactory.forExecutionOnWorker('manual', executionId, workflowData);

				const successRunData: IRun = {
					data: { resultData: { runData: {} } },
					mode: 'manual',
					startedAt: new Date(),
					status: 'success',
					finished: true,
				};

				await hooks.executeHook('workflowExecuteAfter', [successRunData]);

				expect(executionRepository.hardDelete).not.toHaveBeenCalled();
			});

			test.each(['manual', 'trigger', 'webhook', 'schedule'] as WorkflowExecuteMode[])(
				'should handle execution mode %s',
				async (mode) => {
					const hooks = hooksFactory.forExecutionOnWorker(mode, executionId, workflowData);

					const runData: IRun = {
						data: { resultData: { runData: {} } },
						mode,
						startedAt: new Date(),
						status: 'success',
						finished: true,
					};

					await hooks.executeHook('workflowExecuteAfter', [runData]);

					expect(runData.status).toBe('success');
				},
			);
		});
	});

	describe('forSubExecution', () => {
		it('should add all required hooks', () => {
			const hooks = hooksFactory.forSubExecution(
				'manual',
				executionId,
				workflowData,
				optionalParameters,
			);

			const registeredHooks = (hooks as any).registered;

			expect(registeredHooks.nodeExecuteBefore).toHaveLength(2);
			expect(registeredHooks.nodeExecuteAfter).toHaveLength(3);
			expect(registeredHooks.workflowExecuteBefore).toHaveLength(3);
			expect(registeredHooks.workflowExecuteAfter).toHaveLength(2);
			expect(registeredHooks.nodeFetchedData).toHaveLength(1);
			expect(registeredHooks.sendResponse).toHaveLength(0);
		});

		describe('preExecute hooks', () => {
			it('should handle workflow pre-execution', async () => {
				const hooks = hooksFactory.forSubExecution(
					'manual',
					executionId,
					workflowData,
					optionalParameters,
				);

				await hooks.executeHook('workflowExecuteBefore', []);

				expect(externalHooks.run).toHaveBeenCalledWith('workflow.preExecute', [
					undefined,
					'manual',
				]);
			});

			it('should handle node execution progress saving', async () => {
				workflowData.settings = { saveExecutionProgress: true };
				const hooks = hooksFactory.forSubExecution(
					'manual',
					executionId,
					workflowData,
					optionalParameters,
				);

				const taskData = mock<ITaskData>({});
				const runExecutionData: IRunExecutionData = {
					resultData: {
						runData: {
							testNode: [],
						},
					},
				};
				const fullExecutionData = mock<IExecutionResponse>({
					finished: false,
					data: runExecutionData,
				});

				executionRepository.findSingleExecution
					.calledWith(executionId)
					.mockResolvedValue(fullExecutionData);

				await hooks.executeHook('nodeExecuteAfter', ['testNode', taskData, runExecutionData]);

				expect(fullExecutionData.data.resultData.lastNodeExecuted).toBe('testNode');
				expect(executionRepository.updateExistingExecution).toHaveBeenCalledWith(
					executionId,
					fullExecutionData,
				);
			});
		});

		describe('event hooks', () => {
			it('should emit node execution events', async () => {
				const hooks = hooksFactory.forSubExecution(
					'manual',
					executionId,
					workflowData,
					optionalParameters,
				);

				await hooks.executeHook('nodeExecuteBefore', ['testNode']);
				expect(eventService.emit).toHaveBeenCalledWith('node-pre-execute', {
					executionId,
					workflow: workflowData,
					nodeName: 'testNode',
				});

				await hooks.executeHook('nodeExecuteAfter', ['testNode']);
				expect(eventService.emit).toHaveBeenCalledWith('node-post-execute', {
					executionId,
					workflow: workflowData,
					nodeName: 'testNode',
				});
			});

			it('should emit workflow execution events', async () => {
				const hooks = hooksFactory.forSubExecution(
					'manual',
					executionId,
					workflowData,
					optionalParameters,
				);

				await hooks.executeHook('workflowExecuteBefore', []);
				expect(eventService.emit).toHaveBeenCalledWith('workflow-pre-execute', {
					executionId,
					data: workflowData,
				});
			});

			it('should emit node data fetch events', async () => {
				const hooks = hooksFactory.forSubExecution(
					'manual',
					executionId,
					workflowData,
					optionalParameters,
				);
				const testNode = { name: 'Test Node' };

				await hooks.executeHook('nodeFetchedData', [workflowId, testNode]);
				expect(workflowStatisticsService.emit).toHaveBeenCalledWith('nodeFetchedData', {
					workflowId,
					node: testNode,
				});
			});
		});

		describe('saving hooks', () => {
			it('should handle successful execution saves', async () => {
				const hooks = hooksFactory.forSubExecution(
					'manual',
					executionId,
					workflowData,
					optionalParameters,
				);

				const successRunData: IRun = {
					data: { resultData: { runData: {} } },
					mode: 'manual',
					startedAt: new Date(),
					status: 'success',
					finished: true,
				};

				await hooks.executeHook('workflowExecuteAfter', [successRunData, {}]);

				expect(executionRepository.updateExistingExecution).toHaveBeenCalled();
				expect(workflowStatisticsService.emit).toHaveBeenCalledWith('workflowExecutionCompleted', {
					workflowData,
					fullRunData: successRunData,
				});
			});

			it('should handle error execution saves', async () => {
				workflowData.settings = { saveDataErrorExecution: 'all' };
				const hooks = hooksFactory.forSubExecution(
					'manual',
					executionId,
					workflowData,
					optionalParameters,
				);

				const errorRunData: IRun = {
					data: {
						resultData: {
							runData: {},
							error: mock<NodeOperationError>(),
						},
					},
					mode: 'manual',
					startedAt: new Date(),
					status: 'error',
					finished: true,
				};

				await hooks.executeHook('workflowExecuteAfter', [errorRunData, {}]);

				expect(executionRepository.updateExistingExecution).toHaveBeenCalled();
				expect(workflowStatisticsService.emit).toHaveBeenCalledWith('workflowExecutionCompleted', {
					workflowData,
					fullRunData: errorRunData,
				});
			});

			it('should handle metadata updates', async () => {
				const hooks = hooksFactory.forSubExecution(
					'manual',
					executionId,
					workflowData,
					optionalParameters,
				);

				const runDataWithMetadata: IRun = {
					data: {
						resultData: {
							runData: {},
							metadata: {
								parameter: 'test',
							},
						},
					},
					mode: 'manual',
					startedAt: new Date(),
					status: 'success',
					finished: true,
				};

				await hooks.executeHook('workflowExecuteAfter', [runDataWithMetadata, {}]);

				expect(executionMetadataService.save).toHaveBeenCalledWith(executionId, {
					parameter: 'test',
				});
			});

			it('should handle static data updates', async () => {
				const hooks = hooksFactory.forSubExecution(
					'webhook',
					executionId,
					workflowData,
					optionalParameters,
				);
				const newStaticData = { newKey: 'newValue' };

				await hooks.executeHook('workflowExecuteAfter', [
					{
						data: { resultData: { runData: {} } },
						mode: 'webhook',
						startedAt: new Date(),
						status: 'success',
						finished: true,
					},
					newStaticData,
				]);

				expect(workflowStaticDataService.saveStaticDataById).toHaveBeenCalledWith(
					workflowId,
					newStaticData,
				);
			});
		});

		describe('error handling', () => {
			it('should handle execution save errors', async () => {
				const hooks = hooksFactory.forSubExecution(
					'manual',
					executionId,
					workflowData,
					optionalParameters,
				);

				const error = new Error('Save failed');
				executionRepository.updateExistingExecution.mockRejectedValueOnce(error);

				await hooks.executeHook('workflowExecuteAfter', [
					{
						data: { resultData: { runData: {} } },
						mode: 'manual',
						startedAt: new Date(),
						status: 'success',
						finished: true,
					},
					{},
				]);

				expect(errorReporter.error).toHaveBeenCalledWith(error);
			});

			it('should handle metadata save errors', async () => {
				const hooks = hooksFactory.forSubExecution(
					'manual',
					executionId,
					workflowData,
					optionalParameters,
				);

				const error = new Error('Metadata save failed');
				executionMetadataService.save.mockRejectedValueOnce(error);

				const runDataWithMetadata: IRun = {
					data: {
						resultData: {
							runData: {},
							metadata: {},
						},
					},
					mode: 'manual',
					startedAt: new Date(),
					status: 'success',
					finished: true,
				};

				await hooks.executeHook('workflowExecuteAfter', [runDataWithMetadata, {}]);

				expect(errorReporter.error).toHaveBeenCalledWith(error);
			});
		});
	});
});
