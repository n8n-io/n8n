import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { ExecutionRepository, UserRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import {
	BinaryDataService,
	ErrorReporter,
	InstanceSettings,
	ExecutionLifecycleHooks,
	BinaryDataConfig,
} from 'n8n-core';
import { stringify } from 'flatted';
import { createRunExecutionData, ExpressionError } from 'n8n-workflow';
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
import { ExecutionRedactionServiceProxy } from '@/executions/execution-redaction-proxy.service';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { ExternalHooks } from '@/external-hooks';
import { Push } from '@/push';
import { ExecutionMetadataService } from '@/services/execution-metadata.service';
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
	const executionPersistence = mockInstance(ExecutionPersistence);
	const executionMetadataService = mockInstance(ExecutionMetadataService);
	const externalHooks = mockInstance(ExternalHooks);
	const push = mockInstance(Push);
	const workflowStaticDataService = mockInstance(WorkflowStaticDataService);
	const workflowStatisticsService = mockInstance(WorkflowStatisticsService);
	const binaryDataService = mockInstance(BinaryDataService);
	const ownershipService = mockInstance(OwnershipService);
	const workflowExecutionService = mockInstance(WorkflowExecutionService);
	const userRepository = mockInstance(UserRepository);
	const redactionProxy = mockInstance(ExecutionRedactionServiceProxy);

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
		activeVersionId: 'some-version-id',
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
		storedAt: 'db',
	});
	const successfulRun = mock<IRun>({
		status: 'success',
		finished: true,
		waitTill: undefined,
		storedAt: 'db',
	});
	const failedRun = mock<IRun>({
		status: 'error',
		finished: false,
		waitTill: undefined,
		storedAt: 'db',
	});
	const waitingRun = mock<IRun>({
		finished: true,
		status: 'waiting',
		waitTill: new Date(),
		storedAt: 'db',
		data: {
			resultData: {
				lastNodeExecuted: undefined,
				runData: {},
			},
		},
	});
	const successfulRunWithMetadata = mock<IRun>({
		status: 'success',
		finished: true,
		waitTill: undefined,
		storedAt: 'db',
		data: {
			resultData: {
				metadata: {
					testKey1: 'testValue1',
					testKey2: 'testValue2',
				},
			},
		},
	});
	const failedRunWithMetadata = mock<IRun>({
		status: 'error',
		finished: false,
		waitTill: undefined,
		storedAt: 'db',
		data: {
			resultData: {
				metadata: {
					testKey1: 'testValue1',
					testKey2: 'testValue2',
				},
			},
		},
	});
	const crashedRunWithMetadata = mock<IRun>({
		status: 'crashed',
		finished: false,
		waitTill: undefined,
		storedAt: 'db',
		data: {
			resultData: {
				metadata: {
					testKey1: 'testValue1',
					testKey2: 'testValue2',
				},
			},
		},
	});
	const canceledRunWithMetadata = mock<IRun>({
		status: 'canceled',
		finished: false,
		waitTill: undefined,
		storedAt: 'db',
		data: {
			resultData: {
				metadata: {
					testKey1: 'testValue1',
					testKey2: 'testValue2',
				},
			},
		},
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
		userRepository.findOne.mockResolvedValue(mock<User>());
		redactionProxy.processExecution.mockImplementation(async (execution) => execution);
		workflowData.settings = {};
		successfulRun.data = createRunExecutionData({
			resultData: {
				runData: {},
			},
		});
		failedRun.data = createRunExecutionData({
			resultData: {
				runData: {},
				error: expressionError,
			},
		});
		successfulRunWithRewiredDestination.data = createRunExecutionData({
			startData: {
				destinationNode: { nodeName: 'PartialExecutionToolExecutor', mode: 'inclusive' },
				originalDestinationNode: { nodeName, mode: 'inclusive' },
			},
			resultData: {
				runData: {},
			},
		});
		successfulRunWithMetadata.data = createRunExecutionData({
			resultData: {
				runData: {},
				metadata: {
					testKey1: 'testValue1',
					testKey2: 'testValue2',
				},
			},
		});
		failedRunWithMetadata.data = createRunExecutionData({
			resultData: {
				runData: {},
				error: expressionError,
				metadata: {
					testKey1: 'testValue1',
					testKey2: 'testValue2',
				},
			},
		});
		crashedRunWithMetadata.data = createRunExecutionData({
			resultData: {
				runData: {},
				metadata: {
					testKey1: 'testValue1',
					testKey2: 'testValue2',
				},
			},
		});
		canceledRunWithMetadata.data = createRunExecutionData({
			resultData: {
				runData: {},
				metadata: {
					testKey1: 'testValue1',
					testKey2: 'testValue2',
				},
			},
		});
	});

	const workflowEventTests = (expectedUserId?: string) => {
		describe('workflowExecuteBefore', () => {
			it('should emit workflow-pre-execute events', async () => {
				await lifecycleHooks.runHook('workflowExecuteBefore', [workflow, runExecutionData]);

				expect(eventService.emit).toHaveBeenCalledWith('workflow-pre-execute', {
					executionId,
					data: workflowData,
					mode: 'manual',
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

			describe('execution-waiting audit event', () => {
				it('should emit execution-waiting when the last node is waiting for a webhook', async () => {
					const webhookWaitingRun = mock<IRun>({
						finished: true,
						status: 'waiting',
						waitTill: new Date(),
						storedAt: 'db',
					});
					// Assigning `data` outside the `mock()` call to avoid jest-mock-extended wrapping it in a DeepMockProxy
					webhookWaitingRun.data = createRunExecutionData({
						resultData: {
							lastNodeExecuted: 'wait',
							runData: {
								wait: [
									{ metadata: { resumeUrl: 'https://example.test/webhook/abc' } },
								] as ITaskData[],
							},
						},
					});
					await lifecycleHooks.runHook('workflowExecuteAfter', [webhookWaitingRun, {}]);

					expect(eventService.emit).toHaveBeenCalledWith('execution-waiting', {
						executionId,
						workflowId,
					});
					expect(eventService.emit).not.toHaveBeenCalledWith(
						'workflow-post-execute',
						expect.anything(),
					);
				});

				it('should not emit execution-waiting when no node was executed', async () => {
					await lifecycleHooks.runHook('workflowExecuteAfter', [waitingRun, {}]);

					expect(eventService.emit).not.toHaveBeenCalledWith(
						'execution-waiting',
						expect.anything(),
					);
				});

				it('should not emit execution-waiting when the last node is not waiting for a webhook', async () => {
					const nonWebhookWaitingRun = mock<IRun>({
						finished: true,
						status: 'waiting',
						waitTill: new Date(),
						storedAt: 'db',
					});
					nonWebhookWaitingRun.data = createRunExecutionData({
						resultData: {
							lastNodeExecuted: 'sendAndWait',
							runData: {
								sendAndWait: [{ metadata: {} }] as ITaskData[],
							},
						},
					});
					await lifecycleHooks.runHook('workflowExecuteAfter', [nonWebhookWaitingRun, {}]);

					expect(eventService.emit).not.toHaveBeenCalledWith(
						'execution-waiting',
						expect.anything(),
					);
				});

				it('should use the latest task run to determine webhook wait status', async () => {
					const latestTaskWebhookWaitingRun = mock<IRun>({
						finished: true,
						status: 'waiting',
						waitTill: new Date(),
						storedAt: 'db',
					});
					latestTaskWebhookWaitingRun.data = createRunExecutionData({
						resultData: {
							lastNodeExecuted: 'wait',
							runData: {
								wait: [
									{ metadata: {} },
									{ metadata: { resumeUrl: 'https://example.test/webhook/xyz' } },
								] as ITaskData[],
							},
						},
					});
					await lifecycleHooks.runHook('workflowExecuteAfter', [latestTaskWebhookWaitingRun, {}]);

					expect(eventService.emit).toHaveBeenCalledWith('execution-waiting', {
						executionId,
						workflowId,
					});
				});
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

				expect(successfulRunWithRewiredDestination.data.startData?.destinationNode).toEqual({
					nodeName,
					mode: 'inclusive',
				});
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
			expect(handlers.workflowExecuteResume).toHaveLength(0);
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
						data: {
							executionId,
							nodeName,
							itemCountByConnectionType: {
								main: [1],
							},
							data: taskDataWithoutData,
						},
					},
					pushRef,
				);

				expect(push.send).toHaveBeenNthCalledWith(
					2,
					{
						type: 'nodeExecuteAfterData',
						data: {
							executionId,
							nodeName,
							itemCountByConnectionType: {
								main: [1],
							},
							data: mockTaskData,
						},
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

				expect(executionRepository.findSingleExecution).not.toHaveBeenCalled();
				expect(executionRepository.updateExistingExecution).toHaveBeenCalledWith(
					executionId,
					{ data: runExecutionData, status: 'running' },
					{ requireNotFinished: true, requireNotCanceled: true },
				);
			});

			it('should not save execution progress when disabled', async () => {
				workflowData.settings = { saveExecutionProgress: false };
				lifecycleHooks = createHooks();

				expect(lifecycleHooks.handlers.nodeExecuteAfter).toHaveLength(2);

				await lifecycleHooks.runHook('nodeExecuteAfter', [nodeName, taskData, runExecutionData]);

				expect(executionRepository.findSingleExecution).not.toHaveBeenCalled();
			});

			it('should send redacted data in nodeExecuteAfterData when redaction modifies it', async () => {
				const mockTaskData: ITaskData = {
					startTime: 1,
					executionTime: 1,
					executionIndex: 0,
					source: [],
					data: {
						main: [[{ json: { secret: 'original-value' } }]],
					},
				};

				const redactedTaskData: ITaskData = {
					...mockTaskData,
					data: { main: [[{ json: { secret: 'REDACTED' } }]] },
				};

				redactionProxy.processExecution.mockImplementation(async (execution) => ({
					...execution,
					data: {
						...execution.data,
						resultData: { runData: { [nodeName]: [redactedTaskData] } },
					},
				}));

				await lifecycleHooks.runHook('nodeExecuteAfter', [
					nodeName,
					mockTaskData,
					runExecutionData,
				]);

				expect(redactionProxy.processExecution).toHaveBeenCalledTimes(1);
				const [redactableExec, options] = redactionProxy.processExecution.mock.calls[0];
				expect(redactableExec).toHaveProperty('workflowId', workflowId);
				expect(options.keepOriginal).toBe(true);
				expect(options.user).toBeDefined();

				// nodeExecuteAfter (metadata-only) is unaffected
				expect(push.send).toHaveBeenNthCalledWith(
					1,
					expect.objectContaining({ type: 'nodeExecuteAfter' }),
					pushRef,
				);

				// nodeExecuteAfterData contains redacted data
				expect(push.send).toHaveBeenNthCalledWith(
					2,
					{
						type: 'nodeExecuteAfterData',
						data: {
							executionId,
							nodeName,
							itemCountByConnectionType: { main: [1] },
							data: redactedTaskData,
						},
					},
					pushRef,
					true,
				);
			});

			it('should invoke processExecution for nodeExecuteAfterData', async () => {
				const mockTaskData: ITaskData = {
					startTime: 1,
					executionTime: 1,
					executionIndex: 0,
					source: [],
					data: { main: [[{ json: { key: 'value' } }]] },
				};

				await lifecycleHooks.runHook('nodeExecuteAfter', [
					nodeName,
					mockTaskData,
					runExecutionData,
				]);

				expect(userRepository.findOne).toHaveBeenCalled();
				expect(redactionProxy.processExecution).toHaveBeenCalledTimes(1);
			});

			it('should skip nodeExecuteAfterData push when userId is not provided (e.g. webhook execution missing userId)', async () => {
				lifecycleHooks = getLifecycleHooksForRegularMain(
					{ executionMode: 'manual', workflowData, pushRef, retryOf, userId: undefined },
					executionId,
				);

				const mockTaskData: ITaskData = {
					startTime: 1,
					executionTime: 1,
					executionIndex: 0,
					source: [],
					data: { main: [[{ json: { key: 'value' } }]] },
				};

				await lifecycleHooks.runHook('nodeExecuteAfter', [
					nodeName,
					mockTaskData,
					runExecutionData,
				]);

				expect(push.send).toHaveBeenCalledWith(
					expect.objectContaining({ type: 'nodeExecuteAfter' }),
					pushRef,
				);

				expect(push.send).not.toHaveBeenCalledWith(
					expect.objectContaining({ type: 'nodeExecuteAfterData' }),
					pushRef,
					true,
				);
			});

			it('should skip nodeExecuteAfterData push when user cannot be resolved (fail-closed)', async () => {
				userRepository.findOne.mockResolvedValue(null);
				lifecycleHooks = createHooks();

				const mockTaskData: ITaskData = {
					startTime: 1,
					executionTime: 1,
					executionIndex: 0,
					source: [],
					data: { main: [[{ json: { key: 'value' } }]] },
				};

				await lifecycleHooks.runHook('nodeExecuteAfter', [
					nodeName,
					mockTaskData,
					runExecutionData,
				]);

				// nodeExecuteAfter (metadata-only) is still sent
				expect(push.send).toHaveBeenCalledWith(
					expect.objectContaining({ type: 'nodeExecuteAfter' }),
					pushRef,
				);

				// nodeExecuteAfterData is NOT sent
				expect(push.send).not.toHaveBeenCalledWith(
					expect.objectContaining({ type: 'nodeExecuteAfterData' }),
					pushRef,
					true,
				);

				expect(redactionProxy.processExecution).not.toHaveBeenCalled();
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

			it('should send redacted flattedRunData when redaction modifies it', async () => {
				const originalRunData = {
					[nodeName]: [
						{
							startTime: 1,
							executionTime: 1,
							executionIndex: 0,
							source: [],
							data: { main: [[{ json: { secret: 'original' } }]] },
						} as ITaskData,
					],
				};
				const redactedRunData = {
					[nodeName]: [
						{
							startTime: 1,
							executionTime: 1,
							executionIndex: 0,
							source: [],
							data: { main: [[{ json: { secret: 'REDACTED' } }]] },
						} as ITaskData,
					],
				};

				const execData = createRunExecutionData({
					resultData: { runData: originalRunData },
				});

				redactionProxy.processExecution.mockImplementation(async (execution) => ({
					...execution,
					data: {
						...execution.data,
						resultData: { runData: redactedRunData },
					},
				}));

				await lifecycleHooks.runHook('workflowExecuteBefore', [workflow, execData]);

				expect(redactionProxy.processExecution).toHaveBeenCalledTimes(1);
				const [redactableExec, options] = redactionProxy.processExecution.mock.calls[0];
				expect(redactableExec).toHaveProperty('workflowId', workflowId);
				expect(options.keepOriginal).toBe(true);
				expect(options.user).toBeDefined();

				expect(push.send).toHaveBeenCalledWith(
					expect.objectContaining({
						type: 'executionStarted',
						data: expect.objectContaining({
							flattedRunData: stringify(redactedRunData),
						}),
					}),
					pushRef,
				);
			});

			it('should send executionStarted with empty runData when user cannot be resolved (fail-closed)', async () => {
				userRepository.findOne.mockResolvedValue(null);
				lifecycleHooks = createHooks();

				await lifecycleHooks.runHook('workflowExecuteBefore', [workflow, runExecutionData]);

				expect(push.send).toHaveBeenCalledWith(
					expect.objectContaining({
						type: 'executionStarted',
						data: expect.objectContaining({
							flattedRunData: '[{}]',
						}),
					}),
					pushRef,
				);
				expect(redactionProxy.processExecution).not.toHaveBeenCalled();
			});

			it('should not call processExecution when runData is empty', async () => {
				await lifecycleHooks.runHook('workflowExecuteBefore', [workflow, runExecutionData]);

				expect(redactionProxy.processExecution).not.toHaveBeenCalled();
				expect(push.send).toHaveBeenCalledWith(
					expect.objectContaining({
						type: 'executionStarted',
						data: expect.objectContaining({
							flattedRunData: '[{}]',
						}),
					}),
					pushRef,
				);
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

					expect(executionPersistence.hardDelete).not.toHaveBeenCalled();
				});

				it('should not delete waiting executions', async () => {
					await lifecycleHooks.runHook('workflowExecuteAfter', [waitingRun, {}]);

					expect(executionPersistence.hardDelete).not.toHaveBeenCalled();
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

			describe('saving metadata', () => {
				it('should save metadata in regular main mode', async () => {
					await lifecycleHooks.runHook('workflowExecuteAfter', [successfulRunWithMetadata, {}]);

					expect(executionMetadataService.save).toHaveBeenCalledWith(executionId, {
						testKey1: 'testValue1',
						testKey2: 'testValue2',
					});
				});

				it('should not save metadata if execution has none', async () => {
					await lifecycleHooks.runHook('workflowExecuteAfter', [successfulRun, {}]);

					expect(executionMetadataService.save).not.toHaveBeenCalled();
				});

				it('should save metadata even if execution will be kept (not deleted)', async () => {
					lifecycleHooks = createHooks('trigger');
					workflowData.settings = {
						saveDataSuccessExecution: 'all',
					};

					await lifecycleHooks.runHook('workflowExecuteAfter', [successfulRunWithMetadata, {}]);

					expect(executionMetadataService.save).toHaveBeenCalledWith(executionId, {
						testKey1: 'testValue1',
						testKey2: 'testValue2',
					});
					expect(executionPersistence.hardDelete).not.toHaveBeenCalled();
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
			expect(handlers.workflowExecuteResume).toHaveLength(0);
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
			it('should delete unsaved successful executions when success saving is disabled', async () => {
				workflowData.settings = {
					saveDataSuccessExecution: 'none',
					saveDataErrorExecution: 'all',
				};
				const testHooks = getLifecycleHooksForScalingMain(
					{
						executionMode: 'webhook',
						workflowData,
						pushRef,
						retryOf,
					},
					executionId,
				);

				await testHooks.runHook('workflowExecuteAfter', [successfulRun, {}]);

				expect(executionPersistence.deleteInFlightExecution).toHaveBeenCalledWith({
					workflowId,
					executionId,
					storedAt: 'db',
				});
			});

			it('should delete unsaved failed executions when error saving is disabled', async () => {
				workflowData.settings = {
					saveDataSuccessExecution: 'all',
					saveDataErrorExecution: 'none',
				};
				const testHooks = getLifecycleHooksForScalingMain(
					{
						executionMode: 'webhook',
						workflowData,
						pushRef,
						retryOf,
					},
					executionId,
				);

				await testHooks.runHook('workflowExecuteAfter', [failedRun, {}]);

				expect(executionPersistence.deleteInFlightExecution).toHaveBeenCalledWith({
					workflowId,
					executionId,
					storedAt: 'db',
				});
			});

			describe('metadata handling', () => {
				it('should save metadata in scaling main mode when execution is kept', async () => {
					// Test that scaling main saves metadata when execution is not deleted
					await lifecycleHooks.runHook('workflowExecuteAfter', [successfulRunWithMetadata, {}]);

					expect(executionMetadataService.save).toHaveBeenCalledWith(executionId, {
						testKey1: 'testValue1',
						testKey2: 'testValue2',
					});
				});

				it('should NOT save metadata in scaling main mode when execution is deleted', async () => {
					workflowData.settings = {
						saveDataSuccessExecution: 'none' as const,
						saveDataErrorExecution: 'all' as const,
					};
					const testLifecycleHooks = getLifecycleHooksForScalingMain(
						{
							executionMode: 'webhook',
							workflowData,
							pushRef,
							retryOf,
						},
						executionId,
					);

					await testLifecycleHooks.runHook('workflowExecuteAfter', [successfulRunWithMetadata, {}]);

					// Metadata should not be saved before deletion
					expect(executionMetadataService.save).not.toHaveBeenCalled();
					// Execution should be deleted
					expect(executionPersistence.deleteInFlightExecution).toHaveBeenCalledWith({
						workflowId,
						executionId,
						storedAt: 'db',
					});
				});

				it('should NOT save metadata when execution has none', async () => {
					await lifecycleHooks.runHook('workflowExecuteAfter', [successfulRun, {}]);

					expect(executionMetadataService.save).not.toHaveBeenCalled();
				});

				it('should save metadata for failed executions when error saving is enabled', async () => {
					await lifecycleHooks.runHook('workflowExecuteAfter', [failedRunWithMetadata, {}]);

					expect(executionMetadataService.save).toHaveBeenCalledWith(executionId, {
						testKey1: 'testValue1',
						testKey2: 'testValue2',
					});
				});

				it('should NOT save metadata for failed executions when error saving is disabled', async () => {
					workflowData.settings = {
						saveDataSuccessExecution: 'all' as const,
						saveDataErrorExecution: 'none' as const,
					};
					const testLifecycleHooks = getLifecycleHooksForScalingMain(
						{
							executionMode: 'webhook',
							workflowData,
							pushRef,
							retryOf,
						},
						executionId,
					);

					await testLifecycleHooks.runHook('workflowExecuteAfter', [failedRunWithMetadata, {}]);

					expect(executionMetadataService.save).not.toHaveBeenCalled();
					expect(executionPersistence.deleteInFlightExecution).toHaveBeenCalledWith({
						workflowId,
						executionId,
						storedAt: 'db',
					});
				});

				it('should save metadata for crashed executions when error saving is enabled', async () => {
					await lifecycleHooks.runHook('workflowExecuteAfter', [crashedRunWithMetadata, {}]);

					expect(executionMetadataService.save).toHaveBeenCalledWith(executionId, {
						testKey1: 'testValue1',
						testKey2: 'testValue2',
					});
				});

				it('should save metadata for canceled executions when error saving is enabled', async () => {
					await lifecycleHooks.runHook('workflowExecuteAfter', [canceledRunWithMetadata, {}]);

					expect(executionMetadataService.save).toHaveBeenCalledWith(executionId, {
						testKey1: 'testValue1',
						testKey2: 'testValue2',
					});
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
			expect(handlers.workflowExecuteResume).toHaveLength(0);
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

		describe('metadata handling', () => {
			it('should NOT save metadata in scaling worker mode', async () => {
				const lifecycleHooks = createHooks('trigger');

				await lifecycleHooks.runHook('workflowExecuteAfter', [successfulRunWithMetadata, {}]);

				// Worker should never save metadata - that's main's responsibility
				expect(executionMetadataService.save).not.toHaveBeenCalled();
			});

			it('should still update execution data in scaling worker mode', async () => {
				const lifecycleHooks = createHooks('trigger');

				await lifecycleHooks.runHook('workflowExecuteAfter', [successfulRunWithMetadata, {}]);

				// Worker should save execution data but not metadata
				expect(executionRepository.updateExistingExecution).toHaveBeenCalledWith(
					executionId,
					expect.objectContaining({
						finished: true,
						status: 'success',
					}),
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
			expect(handlers.workflowExecuteResume).toHaveLength(0);
			expect(handlers.nodeFetchedData).toHaveLength(1);
			expect(handlers.sendResponse).toHaveLength(0);
			expect(handlers.sendChunk).toHaveLength(0);
		});

		describe('when parentExecution is provided', () => {
			const parentWorkflowId = 'parent-workflow-id';
			const parentExecutionId = 'parent-execution-id';
			const parentExecution = {
				workflowId: parentWorkflowId,
				executionId: parentExecutionId,
			};

			beforeEach(() => {
				lifecycleHooks = getLifecycleHooksForSubExecutions(
					'integrated',
					executionId,
					workflowData,
					undefined,
					parentExecution,
				);
			});

			it('should duplicate binary data to parent execution', async () => {
				const binaryDataId = `filesystem:workflows/${workflowId}/executions/${executionId}/binary_data/123`;
				const duplicatedBinaryDataId = `filesystem:workflows/${parentWorkflowId}/executions/${parentExecutionId}/binary_data/456`;

				const mainOutputData = [
					[
						{
							json: {},
							binary: {
								data: {
									id: binaryDataId,
									data: '',
									mimeType: 'text/plain',
								},
							},
						},
					],
				];

				successfulRun.data.resultData.runData = {
					[nodeName]: [
						{
							startTime: 1,
							executionIndex: 0,
							executionTime: 1,
							source: [],
							data: {
								main: mainOutputData,
							},
						},
					],
				};
				successfulRun.data.resultData.lastNodeExecuted = nodeName;

				binaryDataService.duplicateBinaryData.mockResolvedValue([
					[
						{
							json: {},
							binary: {
								data: {
									id: duplicatedBinaryDataId,
									data: '',
									mimeType: 'text/plain',
								},
							},
						},
					],
				]);

				await lifecycleHooks.runHook('workflowExecuteAfter', [successfulRun, {}]);

				expect(binaryDataService.duplicateBinaryData).toHaveBeenCalledWith(
					{ type: 'execution', workflowId: parentWorkflowId, executionId: parentExecutionId },
					mainOutputData,
				);
			});

			it('should not duplicate binary data when there is no output data', async () => {
				successfulRun.data.resultData.runData = {};
				successfulRun.data.resultData.lastNodeExecuted = undefined;

				await lifecycleHooks.runHook('workflowExecuteAfter', [successfulRun, {}]);

				expect(binaryDataService.duplicateBinaryData).not.toHaveBeenCalled();
			});
		});
	});
});
