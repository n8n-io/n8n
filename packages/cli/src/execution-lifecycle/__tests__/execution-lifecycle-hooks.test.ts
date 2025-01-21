import { stringify } from 'flatted';
import { mock } from 'jest-mock-extended';
import { BinaryDataService, ErrorReporter, InstanceSettings, Logger } from 'n8n-core';
import { ExpressionError, WorkflowHooks } from 'n8n-workflow';
import type {
	IRunExecutionData,
	ITaskData,
	Workflow,
	IDataObject,
	IRun,
	INode,
	IWorkflowBase,
} from 'n8n-workflow';

import config from '@/config';
import type { Project } from '@/databases/entities/project';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { EventService } from '@/events/event.service';
import { ExternalHooks } from '@/external-hooks';
import { Push } from '@/push';
import { OwnershipService } from '@/services/ownership.service';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';
import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';
import { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';
import { mockInstance } from '@test/mocking';

import {
	getWorkflowHooksMain,
	getWorkflowHooksWorkerExecuter,
	getWorkflowHooksWorkerMain,
} from '../execution-lifecycle-hooks';

describe('Execution Lifecycle Hooks', () => {
	mockInstance(Logger);
	mockInstance(InstanceSettings);
	const errorReporter = mockInstance(ErrorReporter);
	const eventService = mockInstance(EventService);
	const executionRepository = mockInstance(ExecutionRepository);
	const externalHooks = mockInstance(ExternalHooks);
	const push = mockInstance(Push);
	const workflowStaticDataService = mockInstance(WorkflowStaticDataService);
	const workflowStatisticsService = mockInstance(WorkflowStatisticsService);
	const binaryDataService = mockInstance(BinaryDataService);
	const ownershipService = mockInstance(OwnershipService);
	const workflowExecutionService = mockInstance(WorkflowExecutionService);

	const nodeName = 'Test Node';
	const node = mock<INode>();
	const workflowId = 'test-workflow-id';
	const executionId = 'test-execution-id';
	const workflowData: IWorkflowBase = {
		id: workflowId,
		name: 'Test Workflow',
		active: true,
		connections: {},
		nodes: [],
		settings: {},
		createdAt: new Date(),
		updatedAt: new Date(),
	};
	const workflow = mock<Workflow>();
	const staticData = mock<IDataObject>();
	const taskData = mock<ITaskData>();
	const runExecutionData = mock<IRunExecutionData>();
	const successfulRun = mock<IRun>({
		status: 'success',
		finished: true,
		waitTill: undefined,
	});
	const failedRun = mock<IRun>({
		status: 'error',
		finished: true,
		waitTill: undefined,
	});
	const waitingRun = mock<IRun>({
		finished: true,
		status: 'waiting',
		waitTill: new Date(),
	});
	const expressionError = new ExpressionError('Error');
	const executionMode = 'manual';
	const pushRef = 'test-push-ref';
	const retryOf = 'test-retry-of';

	const now = new Date('2025-01-13T18:25:50.267Z');
	jest.useFakeTimers({ now });

	beforeEach(() => {
		jest.clearAllMocks();
		workflowData.settings = {};
		successfulRun.data = {
			resultData: {
				runData: {},
			},
		};
		failedRun.data = {
			resultData: {
				runData: {},
				error: expressionError,
			},
		};
	});

	describe('getWorkflowHooksMain', () => {
		let hooks: WorkflowHooks;
		beforeEach(() => {
			hooks = getWorkflowHooksMain(
				{
					executionMode,
					workflowData,
					pushRef,
					retryOf,
				},
				executionId,
			);
		});

		it('should setup the correct set of hooks', () => {
			expect(hooks).toBeInstanceOf(WorkflowHooks);
			expect(hooks.mode).toBe('manual');
			expect(hooks.executionId).toBe(executionId);
			expect(hooks.workflowData).toEqual(workflowData);
			expect(hooks.pushRef).toEqual('test-push-ref');
			expect(hooks.retryOf).toEqual('test-retry-of');

			const { hookFunctions } = hooks;
			expect(hookFunctions.nodeExecuteBefore).toHaveLength(2);
			expect(hookFunctions.nodeExecuteAfter).toHaveLength(3);
			expect(hookFunctions.workflowExecuteBefore).toHaveLength(2);
			expect(hookFunctions.workflowExecuteAfter).toHaveLength(2);
			expect(hookFunctions.nodeFetchedData).toHaveLength(1);
			expect(hookFunctions.sendResponse).toBeUndefined();
		});

		describe('nodeExecuteBefore', () => {
			it('should send nodeExecuteBefore push event', async () => {
				await hooks.executeHookFunctions('nodeExecuteBefore', [nodeName]);

				expect(push.send).toHaveBeenCalledWith(
					{ type: 'nodeExecuteBefore', data: { executionId, nodeName } },
					pushRef,
				);
			});

			it('should emit node-pre-execute event', async () => {
				await hooks.executeHookFunctions('nodeExecuteBefore', [nodeName]);

				expect(eventService.emit).toHaveBeenCalledWith('node-pre-execute', {
					executionId,
					workflow: workflowData,
					nodeName,
				});
			});
		});

		describe('nodeExecuteAfter', () => {
			it('should send nodeExecuteAfter push event', async () => {
				await hooks.executeHookFunctions('nodeExecuteAfter', [
					nodeName,
					taskData,
					runExecutionData,
				]);

				expect(push.send).toHaveBeenCalledWith(
					{ type: 'nodeExecuteAfter', data: { executionId, nodeName, data: taskData } },
					pushRef,
				);
			});

			it('should emit node-post-execute event', async () => {
				await hooks.executeHookFunctions('nodeExecuteAfter', [
					nodeName,
					taskData,
					runExecutionData,
				]);

				expect(eventService.emit).toHaveBeenCalledWith('node-post-execute', {
					executionId,
					workflow: workflowData,
					nodeName,
				});
			});

			it('should save execution progress when enabled', async () => {
				workflowData.settings = { saveExecutionProgress: true };

				await hooks.executeHookFunctions('nodeExecuteAfter', [
					nodeName,
					taskData,
					runExecutionData,
				]);

				expect(executionRepository.findSingleExecution).toHaveBeenCalledWith(executionId, {
					includeData: true,
					unflattenData: true,
				});
			});

			it('should not save execution progress when disabled', async () => {
				workflowData.settings = { saveExecutionProgress: false };

				await hooks.executeHookFunctions('nodeExecuteAfter', [
					nodeName,
					taskData,
					runExecutionData,
				]);

				expect(executionRepository.findSingleExecution).not.toHaveBeenCalled();
			});
		});

		describe('workflowExecuteBefore', () => {
			it('should send executionStarted push event', async () => {
				await hooks.executeHookFunctions('workflowExecuteBefore', [workflow, runExecutionData]);

				expect(push.send).toHaveBeenCalledWith(
					{
						type: 'executionStarted',
						data: {
							executionId,
							mode: executionMode,
							retryOf,
							workflowId: 'test-workflow-id',
							workflowName: 'Test Workflow',
							startedAt: now,
							flattedRunData: '[{}]',
						},
					},
					pushRef,
				);
			});

			it('should not call eventService', async () => {
				await hooks.executeHookFunctions('workflowExecuteBefore', [workflow, runExecutionData]);

				expect(eventService.emit).not.toHaveBeenCalled();
			});

			it('should run workflow.preExecute external hook', async () => {
				await hooks.executeHookFunctions('workflowExecuteBefore', [workflow, runExecutionData]);

				expect(externalHooks.run).toHaveBeenCalledWith('workflow.preExecute', [
					workflow,
					executionMode,
				]);
			});
		});

		describe('workflowExecuteAfter', () => {
			it('should send executionFinished push event', async () => {
				await hooks.executeHookFunctions('workflowExecuteAfter', [successfulRun, {}]);
				expect(eventService.emit).not.toHaveBeenCalled();
				expect(push.send).toHaveBeenCalledWith(
					{
						type: 'executionFinished',
						data: {
							executionId,
							rawData: stringify(successfulRun.data),
							status: 'success',
							workflowId: 'test-workflow-id',
						},
					},
					pushRef,
				);
			});

			it('should send executionWaiting push event', async () => {
				await hooks.executeHookFunctions('workflowExecuteAfter', [waitingRun, {}]);

				expect(push.send).toHaveBeenCalledWith(
					{
						type: 'executionWaiting',
						data: { executionId },
					},
					pushRef,
				);
			});

			describe('saving static data', () => {
				it('should skip saving static data for manual executions', async () => {
					hooks.mode = 'manual';

					await hooks.executeHookFunctions('workflowExecuteAfter', [successfulRun, staticData]);

					expect(workflowStaticDataService.saveStaticDataById).not.toHaveBeenCalled();
				});

				it('should save static data for prod executions', async () => {
					hooks.mode = 'trigger';

					await hooks.executeHookFunctions('workflowExecuteAfter', [successfulRun, staticData]);

					expect(workflowStaticDataService.saveStaticDataById).toHaveBeenCalledWith(
						workflowId,
						staticData,
					);
				});

				it('should handle static data saving errors', async () => {
					hooks.mode = 'trigger';
					const error = new Error('Static data save failed');
					workflowStaticDataService.saveStaticDataById.mockRejectedValueOnce(error);

					await hooks.executeHookFunctions('workflowExecuteAfter', [successfulRun, staticData]);

					expect(errorReporter.error).toHaveBeenCalledWith(error);
				});
			});

			describe('saving execution data', () => {
				it('should update execution with proper data', async () => {
					await hooks.executeHookFunctions('workflowExecuteAfter', [successfulRun, {}]);

					expect(executionRepository.updateExistingExecution).toHaveBeenCalledWith(
						executionId,
						expect.objectContaining({
							finished: true,
							status: 'success',
						}),
					);
				});

				it('should handle errors when updating execution', async () => {
					const error = new Error('Failed to update execution');
					executionRepository.updateExistingExecution.mockRejectedValueOnce(error);

					await hooks.executeHookFunctions('workflowExecuteAfter', [successfulRun, {}]);

					expect(errorReporter.error).toHaveBeenCalledWith(error);
				});

				it('should not delete unfinished executions', async () => {
					const unfinishedRun = mock<IRun>({ finished: false, status: 'running' });

					await hooks.executeHookFunctions('workflowExecuteAfter', [unfinishedRun, {}]);

					expect(executionRepository.hardDelete).not.toHaveBeenCalled();
				});

				it('should not delete waiting executions', async () => {
					await hooks.executeHookFunctions('workflowExecuteAfter', [waitingRun, {}]);

					expect(executionRepository.hardDelete).not.toHaveBeenCalled();
				});

				it('should soft delete manual executions when manual saving is disabled', async () => {
					hooks.workflowData.settings = { saveManualExecutions: false };

					await hooks.executeHookFunctions('workflowExecuteAfter', [successfulRun, {}]);

					expect(executionRepository.softDelete).toHaveBeenCalledWith(executionId);
				});

				it('should not soft delete manual executions with waitTill', async () => {
					hooks.workflowData.settings = { saveManualExecutions: false };

					await hooks.executeHookFunctions('workflowExecuteAfter', [waitingRun, {}]);

					expect(executionRepository.softDelete).not.toHaveBeenCalled();
				});
			});

			describe('error workflow', () => {
				it('should not execute error workflow for manual executions', async () => {
					hooks.mode = 'manual';

					await hooks.executeHookFunctions('workflowExecuteAfter', [failedRun, {}]);

					expect(workflowExecutionService.executeErrorWorkflow).not.toHaveBeenCalled();
				});

				it('should execute error workflow for failed non-manual executions', async () => {
					hooks.mode = 'trigger';
					const errorWorkflow = 'error-workflow-id';
					workflowData.settings = { errorWorkflow };
					const project = mock<Project>();
					ownershipService.getWorkflowProjectCached
						.calledWith(workflowId)
						.mockResolvedValue(project);

					await hooks.executeHookFunctions('workflowExecuteAfter', [failedRun, {}]);

					expect(workflowExecutionService.executeErrorWorkflow).toHaveBeenCalledWith(
						errorWorkflow,
						{
							workflow: {
								id: workflowId,
								name: workflowData.name,
							},
							execution: {
								id: executionId,
								error: expressionError,
								mode: 'trigger',
								retryOf,
								lastNodeExecuted: undefined,
								url: `http://localhost:5678/workflow/${workflowId}/executions/${executionId}`,
							},
						},
						project,
					);
				});
			});

			it('should restore binary data IDs after workflow execution for webhooks', async () => {
				config.set('binaryDataManager.mode', 'filesystem');
				hooks.mode = 'webhook';
				(successfulRun.data.resultData.runData = {
					[nodeName]: [
						{
							executionTime: 1,
							startTime: 1,
							source: [],
							data: {
								main: [
									[
										{
											json: {},
											binary: {
												data: {
													id: `filesystem-v2:workflows/${workflowId}/executions/temp/binary_data/123`,
													data: '',
													mimeType: 'text/plain',
												},
											},
										},
									],
								],
							},
						},
					],
				}),
					await hooks.executeHookFunctions('workflowExecuteAfter', [successfulRun, {}]);

				expect(binaryDataService.rename).toHaveBeenCalledWith(
					'workflows/test-workflow-id/executions/temp/binary_data/123',
					'workflows/test-workflow-id/executions/test-execution-id/binary_data/123',
				);
			});
		});

		describe('statistics events', () => {
			it('workflowExecuteAfter should emit workflowExecutionCompleted statistics event', async () => {
				await hooks.executeHookFunctions('workflowExecuteAfter', [successfulRun, {}]);

				expect(workflowStatisticsService.emit).toHaveBeenCalledWith('workflowExecutionCompleted', {
					workflowData,
					fullRunData: successfulRun,
				});
			});

			it('nodeFetchedData should handle nodeFetchedData statistics event', async () => {
				await hooks.executeHookFunctions('nodeFetchedData', [workflowId, node]);

				expect(workflowStatisticsService.emit).toHaveBeenCalledWith('nodeFetchedData', {
					workflowId,
					node,
				});
			});
		});
	});

	describe('getWorkflowHooksWorkerMain', () => {
		let hooks: WorkflowHooks;

		beforeEach(() => {
			hooks = getWorkflowHooksWorkerMain(executionMode, executionId, workflowData, {
				pushRef,
				retryOf,
			});
		});

		it('should setup the correct set of hooks', () => {
			expect(hooks).toBeInstanceOf(WorkflowHooks);
			expect(hooks.mode).toBe('manual');
			expect(hooks.executionId).toBe(executionId);
			expect(hooks.workflowData).toEqual(workflowData);
			expect(hooks.pushRef).toEqual('test-push-ref');
			expect(hooks.retryOf).toEqual('test-retry-of');

			const { hookFunctions } = hooks;
			expect(hookFunctions.nodeExecuteBefore).toHaveLength(0);
			expect(hookFunctions.nodeExecuteAfter).toHaveLength(0);
			expect(hookFunctions.workflowExecuteBefore).toHaveLength(1);
			expect(hookFunctions.workflowExecuteAfter).toHaveLength(1);
		});

		describe('workflowExecuteBefore', () => {
			it('should run the workflow.preExecute external hook', async () => {
				await hooks.executeHookFunctions('workflowExecuteBefore', [workflow, runExecutionData]);

				expect(externalHooks.run).toHaveBeenCalledWith('workflow.preExecute', [
					workflow,
					executionMode,
				]);
			});
		});

		describe('workflowExecuteAfter', () => {
			it('should delete successful executions when success saving is disabled', async () => {
				workflowData.settings = {
					saveDataSuccessExecution: 'none',
					saveDataErrorExecution: 'all',
				};
				const hooks = getWorkflowHooksWorkerMain('webhook', executionId, workflowData, {
					pushRef,
					retryOf,
				});

				await hooks.executeHookFunctions('workflowExecuteAfter', [successfulRun, {}]);

				expect(executionRepository.hardDelete).toHaveBeenCalledWith({
					workflowId,
					executionId,
				});
			});

			it('should delete failed executions when error saving is disabled', async () => {
				workflowData.settings = {
					saveDataSuccessExecution: 'all',
					saveDataErrorExecution: 'none',
				};
				const hooks = getWorkflowHooksWorkerMain('webhook', executionId, workflowData, {
					pushRef,
					retryOf,
				});

				await hooks.executeHookFunctions('workflowExecuteAfter', [failedRun, {}]);

				expect(executionRepository.hardDelete).toHaveBeenCalledWith({
					workflowId,
					executionId,
				});
			});
		});
	});

	describe('getWorkflowHooksWorkerExecuter', () => {
		let hooks: WorkflowHooks;

		beforeEach(() => {
			hooks = getWorkflowHooksWorkerExecuter(executionMode, executionId, workflowData, {
				pushRef,
				retryOf,
			});
		});

		describe('saving static data', () => {
			it('should skip saving static data for manual executions', async () => {
				hooks.mode = 'manual';

				await hooks.executeHookFunctions('workflowExecuteAfter', [successfulRun, staticData]);

				expect(workflowStaticDataService.saveStaticDataById).not.toHaveBeenCalled();
			});

			it('should save static data for prod executions', async () => {
				hooks.mode = 'trigger';

				await hooks.executeHookFunctions('workflowExecuteAfter', [successfulRun, staticData]);

				expect(workflowStaticDataService.saveStaticDataById).toHaveBeenCalledWith(
					workflowId,
					staticData,
				);
			});

			it('should handle static data saving errors', async () => {
				hooks.mode = 'trigger';
				const error = new Error('Static data save failed');
				workflowStaticDataService.saveStaticDataById.mockRejectedValueOnce(error);

				await hooks.executeHookFunctions('workflowExecuteAfter', [successfulRun, staticData]);

				expect(errorReporter.error).toHaveBeenCalledWith(error);
			});
		});

		describe('error workflow', () => {
			it('should not execute error workflow for manual executions', async () => {
				hooks.mode = 'manual';

				await hooks.executeHookFunctions('workflowExecuteAfter', [failedRun, {}]);

				expect(workflowExecutionService.executeErrorWorkflow).not.toHaveBeenCalled();
			});

			it('should execute error workflow for failed non-manual executions', async () => {
				hooks.mode = 'trigger';
				const errorWorkflow = 'error-workflow-id';
				workflowData.settings = { errorWorkflow };
				const project = mock<Project>();
				ownershipService.getWorkflowProjectCached.calledWith(workflowId).mockResolvedValue(project);

				await hooks.executeHookFunctions('workflowExecuteAfter', [failedRun, {}]);

				expect(workflowExecutionService.executeErrorWorkflow).toHaveBeenCalledWith(
					errorWorkflow,
					{
						workflow: {
							id: workflowId,
							name: workflowData.name,
						},
						execution: {
							id: executionId,
							error: expressionError,
							mode: 'trigger',
							retryOf,
							lastNodeExecuted: undefined,
							url: `http://localhost:5678/workflow/${workflowId}/executions/${executionId}`,
						},
					},
					project,
				);
			});
		});
	});
});
