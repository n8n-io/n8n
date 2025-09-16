import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { Project } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import { stringify } from 'flatted';
import { mock } from 'jest-mock-extended';
import {
	BinaryDataService,
	ErrorReporter,
	InstanceSettings,
	ExecutionLifecycleHooks,
	BinaryDataConfig,
} from 'n8n-core';
import { ExpressionError } from 'n8n-workflow';
import type {
	IRunExecutionData,
	ITaskData,
	Workflow,
	IDataObject,
	IRun,
	INode,
	IWorkflowBase,
	WorkflowExecuteMode,
	ITaskStartedData,
} from 'n8n-workflow';

import { EventService } from '@/events/event.service';
import { ExternalHooks } from '@/external-hooks';
import { Push } from '@/push';
import { OwnershipService } from '@/services/ownership.service';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';
import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';
import { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

import {
	getLifecycleHooksForSubExecutions,
	getLifecycleHooksForRegularMain,
	getLifecycleHooksForScalingWorker,
	getLifecycleHooksForScalingMain,
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
	const nodeType = 'n8n-nodes-base.testNode';
	const nodeId = 'test-node-id';
	const node = mock<INode>();
	const workflowId = 'test-workflow-id';
	const executionId = 'test-execution-id';
	const workflowData: IWorkflowBase = {
		id: workflowId,
		name: 'Test Workflow',
		active: true,
		isArchived: false,
		connections: {},
		nodes: [
			{
				id: nodeId,
				name: nodeName,
				type: nodeType,
				typeVersion: 1,
				position: [100, 200],
				parameters: {},
			},
		],
		settings: {},
		createdAt: new Date(),
		updatedAt: new Date(),
	};
	const workflow = mock<Workflow>();
	const staticData = mock<IDataObject>();
	const taskStartedData = mock<ITaskStartedData>();
	const taskData = mock<ITaskData>();
	const runExecutionData = mock<IRunExecutionData>();

	const successfulRunWithRewiredDestination = mock<IRun>({
		status: 'success',
		finished: true,
		waitTill: undefined,
	});
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
	const pushRef = 'test-push-ref';
	const retryOf = 'test-retry-of';
	const userId = 'test-user-id';

	const now = new Date('2025-01-13T18:25:50.267Z');
	jest.useFakeTimers({ now });

	let lifecycleHooks: ExecutionLifecycleHooks;

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
		successfulRunWithRewiredDestination.data = {
			startData: {
				destinationNode: 'PartialExecutionToolExecutor',
				originalDestinationNode: nodeName,
			},
			resultData: {
				runData: {},
			},
		};
	});

	const workflowEventTests = (expectedUserId?: string) => {
		describe('workflowExecuteBefore', () => {
			it('should emit workflow-pre-execute events', async () => {
				await lifecycleHooks.runHook('workflowExecuteBefore', [workflow, runExecutionData]);

				expect(eventService.emit).toHaveBeenCalledWith('workflow-pre-execute', {
					executionId,
					data: workflowData,
				});
			});
		});

		describe('workflowExecuteAfter', () => {
			it('should emit workflow-post-execute events', async () => {
				await lifecycleHooks.runHook('workflowExecuteAfter', [successfulRun, {}]);

				expect(eventService.emit).toHaveBeenCalledWith('workflow-post-execute', {
					executionId,
					runData: successfulRun,
					workflow: workflowData,
					userId: expectedUserId,
				});
			});

			it('should not emit workflow-post-execute events for waiting executions', async () => {
				await lifecycleHooks.runHook('workflowExecuteAfter', [waitingRun, {}]);

				expect(eventService.emit).not.toHaveBeenCalledWith('workflow-post-execute');
			});

			it('should reset destination node to original destination', async () => {
				await lifecycleHooks.runHook('workflowExecuteAfter', [
					successfulRunWithRewiredDestination,
					{},
				]);

				expect(eventService.emit).toHaveBeenCalledWith('workflow-post-execute', {
					executionId,
					runData: successfulRunWithRewiredDestination,
					workflow: workflowData,
					userId: expectedUserId,
				});

				expect(successfulRunWithRewiredDestination.data.startData?.destinationNode).toBe(nodeName);
				expect(
					successfulRunWithRewiredDestination.data.startData?.originalDestinationNode,
				).toBeUndefined();
			});
		});
	};

	const nodeEventsTests = () => {
		describe('nodeExecuteBefore', () => {
			it('should emit node-pre-execute event', async () => {
				await lifecycleHooks.runHook('nodeExecuteBefore', [nodeName, taskStartedData]);

				expect(eventService.emit).toHaveBeenCalledWith('node-pre-execute', {
					executionId,
					workflow: workflowData,
					nodeName,
					nodeType,
					nodeId,
				});
			});
		});

		describe('nodeExecuteAfter', () => {
			it('should emit node-post-execute event', async () => {
				await lifecycleHooks.runHook('nodeExecuteAfter', [nodeName, taskData, runExecutionData]);

				expect(eventService.emit).toHaveBeenCalledWith('node-post-execute', {
					executionId,
					workflow: workflowData,
					nodeName,
					nodeType,
					nodeId,
				});
			});
		});
	};

	const externalHooksTests = () => {
		describe('workflowExecuteBefore', () => {
			it('should run workflow.preExecute hook', async () => {
				await lifecycleHooks.runHook('workflowExecuteBefore', [workflow, runExecutionData]);

				expect(externalHooks.run).toHaveBeenCalledWith('workflow.preExecute', [workflow, 'manual']);
			});
		});

		describe('workflowExecuteAfter', () => {
			it('should run workflow.postExecute hook', async () => {
				await lifecycleHooks.runHook('workflowExecuteAfter', [successfulRun, {}]);

				expect(externalHooks.run).toHaveBeenCalledWith('workflow.postExecute', [
					successfulRun,
					workflowData,
					executionId,
				]);
			});
		});
	};

	const statisticsTests = () => {
		describe('statistics events', () => {
			it('workflowExecuteAfter should emit workflowExecutionCompleted statistics event', async () => {
				await lifecycleHooks.runHook('workflowExecuteAfter', [successfulRun, {}]);

				expect(workflowStatisticsService.emit).toHaveBeenCalledWith('workflowExecutionCompleted', {
					workflowData,
					fullRunData: successfulRun,
				});
			});

			it('nodeFetchedData should handle nodeFetchedData statistics event', async () => {
				await lifecycleHooks.runHook('nodeFetchedData', [workflowId, node]);

				expect(workflowStatisticsService.emit).toHaveBeenCalledWith('nodeFetchedData', {
					workflowId,
					node,
				});
			});
		});
	};

	describe('getLifecycleHooksForRegularMain', () => {
		const createHooks = (executionMode: WorkflowExecuteMode = 'manual') =>
			getLifecycleHooksForRegularMain(
				{ executionMode, workflowData, pushRef, retryOf, userId },
				executionId,
			);

		beforeEach(() => {
			lifecycleHooks = createHooks();
		});

		workflowEventTests(userId);
		nodeEventsTests();
		externalHooksTests();
		statisticsTests();

		it('should setup the correct set of hooks', () => {
			expect(lifecycleHooks).toBeInstanceOf(ExecutionLifecycleHooks);
			expect(lifecycleHooks.mode).toBe('manual');
			expect(lifecycleHooks.executionId).toBe(executionId);
			expect(lifecycleHooks.workflowData).toEqual(workflowData);

			const { handlers } = lifecycleHooks;
			expect(handlers.nodeExecuteBefore).toHaveLength(2);
			expect(handlers.nodeExecuteAfter).toHaveLength(2);
			expect(handlers.workflowExecuteBefore).toHaveLength(3);
			expect(handlers.workflowExecuteAfter).toHaveLength(5);
			expect(handlers.nodeFetchedData).toHaveLength(1);
			expect(handlers.sendResponse).toHaveLength(0);
			expect(handlers.sendChunk).toHaveLength(0);
		});

		describe('nodeExecuteBefore', () => {
			it('should send nodeExecuteBefore push event', async () => {
				await lifecycleHooks.runHook('nodeExecuteBefore', [nodeName, taskStartedData]);

				expect(push.send).toHaveBeenCalledWith(
					{ type: 'nodeExecuteBefore', data: { executionId, nodeName, data: taskStartedData } },
					pushRef,
				);
			});
		});

		describe('nodeExecuteAfter', () => {
			it('should send nodeExecuteAfter and nodeExecuteAfterData push events', async () => {
				const mockTaskData: ITaskData = {
					startTime: 1,
					executionTime: 1,
					executionIndex: 0,
					source: [],
					data: {
						main: [
							[
								{
									json: { key: 'value' },
									binary: {
										data: {
											id: '123',
											data: '',
											mimeType: 'text/plain',
										},
									},
								},
							],
						],
					},
				};

				await lifecycleHooks.runHook('nodeExecuteAfter', [
					nodeName,
					mockTaskData,
					runExecutionData,
				]);

				const { data: _, ...taskDataWithoutData } = mockTaskData;

				expect(push.send).toHaveBeenNthCalledWith(
					1,
					{
						type: 'nodeExecuteAfter',
						data: { executionId, nodeName, itemCount: 1, data: taskDataWithoutData },
					},
					pushRef,
				);

				expect(push.send).toHaveBeenNthCalledWith(
					2,
					{
						type: 'nodeExecuteAfterData',
						data: { executionId, nodeName, itemCount: 1, data: mockTaskData },
					},
					pushRef,
					true,
				);
			});

			it('should save execution progress when enabled', async () => {
				workflowData.settings = { saveExecutionProgress: true };
				lifecycleHooks = createHooks();

				expect(lifecycleHooks.handlers.nodeExecuteAfter).toHaveLength(3);

				await lifecycleHooks.runHook('nodeExecuteAfter', [nodeName, taskData, runExecutionData]);

				expect(executionRepository.findSingleExecution).toHaveBeenCalledWith(executionId, {
					includeData: true,
					unflattenData: true,
				});
			});

			it('should not save execution progress when disabled', async () => {
				workflowData.settings = { saveExecutionProgress: false };
				lifecycleHooks = createHooks();

				expect(lifecycleHooks.handlers.nodeExecuteAfter).toHaveLength(2);

				await lifecycleHooks.runHook('nodeExecuteAfter', [nodeName, taskData, runExecutionData]);

				expect(executionRepository.findSingleExecution).not.toHaveBeenCalled();
			});
		});

		describe('workflowExecuteBefore', () => {
			it('should send executionStarted push event', async () => {
				await lifecycleHooks.runHook('workflowExecuteBefore', [workflow, runExecutionData]);

				expect(push.send).toHaveBeenCalledWith(
					{
						type: 'executionStarted',
						data: {
							executionId,
							mode: 'manual',
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

			it('should run workflow.preExecute external hook', async () => {
				await lifecycleHooks.runHook('workflowExecuteBefore', [workflow, runExecutionData]);

				expect(externalHooks.run).toHaveBeenCalledWith('workflow.preExecute', [workflow, 'manual']);
			});
		});

		describe('workflowExecuteAfter', () => {
			it('should send executionFinished push event', async () => {
				await lifecycleHooks.runHook('workflowExecuteAfter', [successfulRun, {}]);
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
				await lifecycleHooks.runHook('workflowExecuteAfter', [waitingRun, {}]);

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
					await lifecycleHooks.runHook('workflowExecuteAfter', [successfulRun, staticData]);

					expect(workflowStaticDataService.saveStaticDataById).not.toHaveBeenCalled();
				});

				it('should save static data for prod executions', async () => {
					lifecycleHooks = createHooks('trigger');

					await lifecycleHooks.runHook('workflowExecuteAfter', [successfulRun, staticData]);

					expect(workflowStaticDataService.saveStaticDataById).toHaveBeenCalledWith(
						workflowId,
						staticData,
					);
				});

				it('should handle static data saving errors', async () => {
					lifecycleHooks = createHooks('trigger');

					const error = new Error('Static data save failed');
					workflowStaticDataService.saveStaticDataById.mockRejectedValueOnce(error);

					await lifecycleHooks.runHook('workflowExecuteAfter', [successfulRun, staticData]);

					expect(errorReporter.error).toHaveBeenCalledWith(error);
				});
			});

			describe('saving execution data', () => {
				it('should update execution with proper data', async () => {
					await lifecycleHooks.runHook('workflowExecuteAfter', [successfulRun, {}]);

					expect(executionRepository.updateExistingExecution).toHaveBeenCalledWith(
						executionId,
						expect.objectContaining({
							finished: true,
							status: 'success',
						}),
					);
				});

				it('should not delete unfinished executions', async () => {
					const unfinishedRun = mock<IRun>({ finished: false, status: 'running' });

					await lifecycleHooks.runHook('workflowExecuteAfter', [unfinishedRun, {}]);

					expect(executionRepository.hardDelete).not.toHaveBeenCalled();
				});

				it('should not delete waiting executions', async () => {
					await lifecycleHooks.runHook('workflowExecuteAfter', [waitingRun, {}]);

					expect(executionRepository.hardDelete).not.toHaveBeenCalled();
				});

				it('should soft delete manual executions when manual saving is disabled', async () => {
					lifecycleHooks.workflowData.settings = { saveManualExecutions: false };
					lifecycleHooks = createHooks();

					await lifecycleHooks.runHook('workflowExecuteAfter', [successfulRun, {}]);

					expect(executionRepository.softDelete).toHaveBeenCalledWith(executionId);
				});

				it('should not soft delete manual executions with waitTill', async () => {
					lifecycleHooks.workflowData.settings = { saveManualExecutions: false };
					lifecycleHooks = createHooks();

					await lifecycleHooks.runHook('workflowExecuteAfter', [waitingRun, {}]);

					expect(executionRepository.softDelete).not.toHaveBeenCalled();
				});
			});

			describe('error workflow', () => {
				it('should not execute error workflow for manual executions', async () => {
					await lifecycleHooks.runHook('workflowExecuteAfter', [failedRun, {}]);

					expect(workflowExecutionService.executeErrorWorkflow).not.toHaveBeenCalled();
				});

				it('should execute error workflow for failed non-manual executions', async () => {
					lifecycleHooks = createHooks('trigger');

					const errorWorkflow = 'error-workflow-id';
					workflowData.settings = { errorWorkflow };
					const project = mock<Project>();
					ownershipService.getWorkflowProjectCached
						.calledWith(workflowId)
						.mockResolvedValue(project);

					await lifecycleHooks.runHook('workflowExecuteAfter', [failedRun, {}]);

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
				mockInstance(BinaryDataConfig, { mode: 'filesystem' });
				lifecycleHooks = createHooks('webhook');

				(successfulRun.data.resultData.runData = {
					[nodeName]: [
						{
							startTime: 1,
							executionIndex: 0,
							executionTime: 1,
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
					await lifecycleHooks.runHook('workflowExecuteAfter', [successfulRun, {}]);

				expect(binaryDataService.rename).toHaveBeenCalledWith(
					'workflows/test-workflow-id/executions/temp/binary_data/123',
					'workflows/test-workflow-id/executions/test-execution-id/binary_data/123',
				);
			});
		});

		describe("when pushRef isn't set", () => {
			beforeEach(() => {
				lifecycleHooks = getLifecycleHooksForRegularMain(
					{ executionMode: 'manual', workflowData, retryOf },
					executionId,
				);
			});

			it('should not setup any push hooks', async () => {
				const { handlers } = lifecycleHooks;
				expect(handlers.nodeExecuteBefore).toHaveLength(1);
				expect(handlers.nodeExecuteAfter).toHaveLength(1);
				expect(handlers.workflowExecuteBefore).toHaveLength(2);
				expect(handlers.workflowExecuteAfter).toHaveLength(4);

				await lifecycleHooks.runHook('nodeExecuteBefore', [nodeName, taskStartedData]);
				await lifecycleHooks.runHook('nodeExecuteAfter', [nodeName, taskData, runExecutionData]);
				await lifecycleHooks.runHook('workflowExecuteBefore', [workflow, runExecutionData]);
				await lifecycleHooks.runHook('workflowExecuteAfter', [successfulRun, {}]);

				expect(push.send).not.toHaveBeenCalled();
			});
		});
	});

	describe('getLifecycleHooksForScalingMain', () => {
		beforeEach(() => {
			lifecycleHooks = getLifecycleHooksForScalingMain(
				{
					executionMode: 'manual',
					workflowData,
					pushRef,
					retryOf,
					userId,
				},
				executionId,
			);
		});

		workflowEventTests(userId);
		externalHooksTests();

		it('should setup the correct set of hooks', () => {
			expect(lifecycleHooks).toBeInstanceOf(ExecutionLifecycleHooks);
			expect(lifecycleHooks.mode).toBe('manual');
			expect(lifecycleHooks.executionId).toBe(executionId);
			expect(lifecycleHooks.workflowData).toEqual(workflowData);

			const { handlers } = lifecycleHooks;
			expect(handlers.nodeExecuteBefore).toHaveLength(0);
			expect(handlers.nodeExecuteAfter).toHaveLength(0);
			expect(handlers.workflowExecuteBefore).toHaveLength(2);
			expect(handlers.workflowExecuteAfter).toHaveLength(4);
			expect(handlers.nodeFetchedData).toHaveLength(0);
			expect(handlers.sendResponse).toHaveLength(0);
			expect(handlers.sendChunk).toHaveLength(0);
		});

		describe('workflowExecuteBefore', () => {
			it('should run the workflow.preExecute external hook', async () => {
				await lifecycleHooks.runHook('workflowExecuteBefore', [workflow, runExecutionData]);

				expect(externalHooks.run).toHaveBeenCalledWith('workflow.preExecute', [workflow, 'manual']);
			});
		});

		describe('workflowExecuteAfter', () => {
			it('should delete successful executions when success saving is disabled', async () => {
				workflowData.settings = {
					saveDataSuccessExecution: 'none',
					saveDataErrorExecution: 'all',
				};
				const lifecycleHooks = getLifecycleHooksForScalingMain(
					{
						executionMode: 'webhook',
						workflowData,
						pushRef,
						retryOf,
					},
					executionId,
				);

				await lifecycleHooks.runHook('workflowExecuteAfter', [successfulRun, {}]);

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
				const lifecycleHooks = getLifecycleHooksForScalingMain(
					{
						executionMode: 'webhook',
						workflowData,
						pushRef,
						retryOf,
					},
					executionId,
				);

				await lifecycleHooks.runHook('workflowExecuteAfter', [failedRun, {}]);

				expect(executionRepository.hardDelete).toHaveBeenCalledWith({
					workflowId,
					executionId,
				});
			});
		});
	});

	describe('getLifecycleHooksForScalingWorker', () => {
		const createHooks = (executionMode: WorkflowExecuteMode = 'manual') =>
			getLifecycleHooksForScalingWorker(
				{ executionMode, workflowData, pushRef, retryOf },
				executionId,
			);

		beforeEach(() => {
			lifecycleHooks = createHooks();
		});

		nodeEventsTests();
		externalHooksTests();
		statisticsTests();

		it('should setup the correct set of hooks', () => {
			expect(lifecycleHooks).toBeInstanceOf(ExecutionLifecycleHooks);
			expect(lifecycleHooks.mode).toBe('manual');
			expect(lifecycleHooks.executionId).toBe(executionId);
			expect(lifecycleHooks.workflowData).toEqual(workflowData);

			const { handlers } = lifecycleHooks;
			expect(handlers.nodeExecuteBefore).toHaveLength(2);
			expect(handlers.nodeExecuteAfter).toHaveLength(2);
			expect(handlers.workflowExecuteBefore).toHaveLength(2);
			expect(handlers.workflowExecuteAfter).toHaveLength(4);
			expect(handlers.nodeFetchedData).toHaveLength(1);
			expect(handlers.sendResponse).toHaveLength(0);
			expect(handlers.sendChunk).toHaveLength(0);
		});

		describe('saving static data', () => {
			it('should skip saving static data for manual executions', async () => {
				await lifecycleHooks.runHook('workflowExecuteAfter', [successfulRun, staticData]);

				expect(workflowStaticDataService.saveStaticDataById).not.toHaveBeenCalled();
			});

			it('should save static data for prod executions', async () => {
				lifecycleHooks = createHooks('trigger');

				await lifecycleHooks.runHook('workflowExecuteAfter', [successfulRun, staticData]);

				expect(workflowStaticDataService.saveStaticDataById).toHaveBeenCalledWith(
					workflowId,
					staticData,
				);
			});

			it('should handle static data saving errors', async () => {
				lifecycleHooks = createHooks('trigger');
				const error = new Error('Static data save failed');
				workflowStaticDataService.saveStaticDataById.mockRejectedValueOnce(error);

				await lifecycleHooks.runHook('workflowExecuteAfter', [successfulRun, staticData]);

				expect(errorReporter.error).toHaveBeenCalledWith(error);
			});
		});

		describe('error workflow', () => {
			it('should not execute error workflow for manual executions', async () => {
				await lifecycleHooks.runHook('workflowExecuteAfter', [failedRun, {}]);

				expect(workflowExecutionService.executeErrorWorkflow).not.toHaveBeenCalled();
			});

			it('should execute error workflow for failed non-manual executions', async () => {
				lifecycleHooks = createHooks('trigger');
				const errorWorkflow = 'error-workflow-id';
				workflowData.settings = { errorWorkflow };
				const project = mock<Project>();
				ownershipService.getWorkflowProjectCached.calledWith(workflowId).mockResolvedValue(project);

				await lifecycleHooks.runHook('workflowExecuteAfter', [failedRun, {}]);

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

	describe('getLifecycleHooksForSubExecutions', () => {
		beforeEach(() => {
			lifecycleHooks = getLifecycleHooksForSubExecutions(
				'manual',
				executionId,
				workflowData,
				undefined,
			);
		});

		workflowEventTests();
		nodeEventsTests();
		externalHooksTests();
		statisticsTests();

		it('should setup the correct set of hooks', () => {
			expect(lifecycleHooks).toBeInstanceOf(ExecutionLifecycleHooks);
			expect(lifecycleHooks.mode).toBe('manual');
			expect(lifecycleHooks.executionId).toBe(executionId);
			expect(lifecycleHooks.workflowData).toEqual(workflowData);

			const { handlers } = lifecycleHooks;
			expect(handlers.nodeExecuteBefore).toHaveLength(1);
			expect(handlers.nodeExecuteAfter).toHaveLength(1);
			expect(handlers.workflowExecuteBefore).toHaveLength(2);
			expect(handlers.workflowExecuteAfter).toHaveLength(4);
			expect(handlers.nodeFetchedData).toHaveLength(1);
			expect(handlers.sendResponse).toHaveLength(0);
			expect(handlers.sendChunk).toHaveLength(0);
		});
	});
});
