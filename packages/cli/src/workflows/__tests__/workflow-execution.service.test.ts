import type { GlobalConfig } from '@n8n/config';
import type { Project, User, WorkflowEntity, WorkflowRepository } from '@n8n/db';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import {
	NodeConnectionTypes,
	type IConnections,
	type INode,
	type INodeType,
	type IWorkflowBase,
	type IWorkflowExecuteAdditionalData,
	type ExecutionError,
	createRunExecutionData,
} from 'n8n-workflow';

import type { IWorkflowErrorData } from '@/interfaces';
import type { NodeTypes } from '@/node-types';
import type { TestWebhooks } from '@/webhooks/test-webhooks';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import type { WorkflowRunner } from '@/workflow-runner';
import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';
import { toITaskData } from '@test/helpers';

import type { WorkflowRequest } from '../workflow.request';

const webhookNode: INode = {
	name: 'Webhook',
	type: 'n8n-nodes-base.webhook',
	id: '111f1db0-e7be-44c5-9ce9-3e35362490f0',
	parameters: {},
	typeVersion: 1,
	position: [0, 0],
	webhookId: 'de0f8dcb-7b64-4f22-b66d-d8f74d6aefb7',
};

const secondWebhookNode = {
	...webhookNode,
	name: 'Webhook 2',
	id: '222f1db0-e7be-44c5-9ce9-3e35362490f1',
};

const executeWorkflowTriggerNode: INode = {
	name: 'Execute Workflow Trigger',
	type: 'n8n-nodes-base.executeWorkflowTrigger',
	id: '78d63bca-bb6c-4568-948f-8ed9aacb1fe9',
	parameters: {},
	typeVersion: 1,
	position: [0, 0],
};

const respondToWebhookNode: INode = {
	name: 'Respond to Webhook',
	type: 'n8n-nodes-base.respondToWebhook',
	id: '66d63bca-bb6c-4568-948f-8ed9aacb1fe9',
	parameters: {},
	typeVersion: 1,
	position: [0, 0],
};

const hackerNewsNode: INode = {
	name: 'Hacker News',
	type: 'n8n-nodes-base.hackerNews',
	id: '55d63bca-bb6c-4568-948f-8ed9aacb1fe9',
	parameters: {},
	typeVersion: 1,
	position: [0, 0],
};

const secondHackerNewsNode: INode = {
	name: 'Hacker News 2',
	type: 'n8n-nodes-base.hackerNews',
	id: '55d63bca-bb6c-4568-948f-8ed9aacb1fe3',
	parameters: {},
	typeVersion: 1,
	position: [0, 0],
};

describe('WorkflowExecutionService', () => {
	const nodeTypes = mock<NodeTypes>();
	const workflowRunner = mock<WorkflowRunner>();
	const workflowExecutionService = new WorkflowExecutionService(
		mock(),
		mock(),
		mock(),
		mock(),
		nodeTypes,
		mock(),
		workflowRunner,
		mock(),
		mock(),
		mock(),
	);

	const additionalData = mock<IWorkflowExecuteAdditionalData>({});
	jest.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(additionalData);

	describe('runWorkflow()', () => {
		test('should call `WorkflowRunner.run()`', async () => {
			const node = mock<INode>();
			const workflow = mock<IWorkflowBase>({
				active: true,
				activeVersionId: 'some-version-id',
				nodes: [node],
			});

			workflowRunner.run.mockResolvedValue('fake-execution-id');

			await workflowExecutionService.runWorkflow(workflow, node, [[]], mock(), 'trigger');

			expect(workflowRunner.run).toHaveBeenCalledTimes(1);
		});
	});

	describe('executeManually()', () => {
		beforeEach(() => {
			workflowRunner.run.mockClear();
			jest.spyOn(nodeTypes, 'getByNameAndVersion').mockReset();
		});

		test('should call `WorkflowRunner.run()` with correct parameters with default partial execution logic', async () => {
			const executionId = 'fake-execution-id';
			const userId = 'user-id';
			const user = mock<User>({ id: userId });
			const connections = {
				...createMainConnection(hackerNewsNode.name, webhookNode.name),
			};
			const runPayload: WorkflowRequest.PartialManualExecutionToDestinationPayload = {
				workflowData: mock<IWorkflowBase>({
					nodes: [webhookNode, hackerNewsNode],
					connections,
					pinData: undefined,
				}),
				agentRequest: undefined,
				runData: { [webhookNode.name]: [toITaskData([{ data: { value: 1 } }])] },
				destinationNode: { nodeName: hackerNewsNode.name, mode: 'inclusive' },
				dirtyNodeNames: [],
			};

			jest
				.spyOn(nodeTypes, 'getByNameAndVersion')
				.mockReturnValueOnce(mock<INodeType>({ description: { group: [] } }));

			workflowRunner.run.mockResolvedValue(executionId);

			const result = await workflowExecutionService.executeManually(runPayload, user);

			expect(workflowRunner.run).toHaveBeenCalledWith({
				destinationNode: runPayload.destinationNode,
				executionMode: 'manual',
				runData: runPayload.runData,
				pinData: undefined,
				pushRef: undefined,
				workflowData: runPayload.workflowData,
				userId,
				dirtyNodeNames: runPayload.dirtyNodeNames,
			});
			expect(result).toEqual({ executionId });
		});

		test('removes runData if the destination node is a trigger', async () => {
			const executionId = 'fake-execution-id';
			const userId = 'user-id';
			const user = mock<User>({ id: userId });
			const node = mock<INode>();
			const runPayload: WorkflowRequest.PartialManualExecutionToDestinationPayload = {
				workflowData: mock<IWorkflowBase>({ nodes: [node], connections: {} }),
				destinationNode: { nodeName: node.name, mode: 'inclusive' },
				agentRequest: undefined,
				runData: { [node.name]: [toITaskData([{ data: { value: 1 } }])] },
				dirtyNodeNames: [],
			};

			jest
				.spyOn(nodeTypes, 'getByNameAndVersion')
				.mockReturnValueOnce(mock<INodeType>({ description: { group: ['trigger'] } }));

			workflowRunner.run.mockResolvedValue(executionId);

			const result = await workflowExecutionService.executeManually(runPayload, user);

			expect(workflowRunner.run).toHaveBeenCalledWith({
				runData: undefined,
				destinationNode: runPayload.destinationNode,
				executionMode: 'manual',
				pinData: runPayload.workflowData.pinData,
				pushRef: undefined,
				workflowData: runPayload.workflowData,
				userId,
			});
			expect(result).toEqual({ executionId });
		});

		test('should start from pinned trigger', async () => {
			const executionId = 'fake-execution-id';
			const userId = 'user-id';
			const user = mock<User>({ id: userId });

			const pinnedTrigger: INode = {
				id: '1',
				typeVersion: 1,
				position: [1, 2],
				parameters: {},
				name: 'pinned',
				type: 'n8n-nodes-base.airtableTrigger',
			};
			const unexecutedTrigger: INode = {
				id: '1',
				typeVersion: 1,
				position: [1, 2],
				parameters: {},
				name: 'to-start-from',
				type: 'n8n-nodes-base.airtableTrigger',
			};
			const connections = {
				...createMainConnection(hackerNewsNode.name, pinnedTrigger.name),
				...createMainConnection(hackerNewsNode.name, unexecutedTrigger.name),
			};

			const runPayload: WorkflowRequest.FullManualExecutionFromUnknownTriggerPayload = {
				workflowData: {
					id: 'abc',
					name: 'test',
					active: false,
					activeVersionId: null,
					isArchived: false,
					pinData: {
						[pinnedTrigger.name]: [{ json: {} }],
					},
					nodes: [unexecutedTrigger, pinnedTrigger],
					connections,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				destinationNode: { nodeName: hackerNewsNode.name, mode: 'inclusive' },
			};

			workflowRunner.run.mockResolvedValue(executionId);

			const result = await workflowExecutionService.executeManually(runPayload, user);

			expect(workflowRunner.run).toHaveBeenCalledWith({
				destinationNode: runPayload.destinationNode,
				executionMode: 'manual',
				pinData: runPayload.workflowData.pinData,
				pushRef: undefined,
				workflowData: runPayload.workflowData,
				userId,
				triggerToStartFrom: { name: pinnedTrigger.name },
			});
			expect(result).toEqual({ executionId });
		});

		test('should ignore pinned trigger and start from unexecuted trigger', async () => {
			const executionId = 'fake-execution-id';
			const userId = 'user-id';
			const user = mock<User>({ id: userId });

			const pinnedTrigger: INode = {
				id: '1',
				typeVersion: 1,
				position: [1, 2],
				parameters: {},
				name: 'pinned',
				type: 'n8n-nodes-base.airtableTrigger',
			};

			const unexecutedTrigger: INode = {
				id: '1',
				typeVersion: 1,
				position: [1, 2],
				parameters: {},
				name: 'to-start-from',
				type: 'n8n-nodes-base.airtableTrigger',
			};

			const runPayload: WorkflowRequest.FullManualExecutionFromKnownTriggerPayload = {
				workflowData: {
					id: 'abc',
					name: 'test',
					active: false,
					activeVersionId: null,
					isArchived: false,
					pinData: { [pinnedTrigger.name]: [{ json: {} }] },
					nodes: [unexecutedTrigger, pinnedTrigger],
					connections: {},
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				triggerToStartFrom: { name: unexecutedTrigger.name },
			};

			workflowRunner.run.mockResolvedValue(executionId);

			const result = await workflowExecutionService.executeManually(runPayload, user);

			expect(workflowRunner.run).toHaveBeenCalledWith({
				destinationNode: runPayload.destinationNode,
				executionMode: 'manual',
				pinData: runPayload.workflowData.pinData,
				pushRef: undefined,
				workflowData: runPayload.workflowData,
				userId,
				// pass unexecuted trigger to start from
				triggerToStartFrom: runPayload.triggerToStartFrom,
			});
			expect(result).toEqual({ executionId });
		});

		test('should force current version for manual execution even if workflow has active version', async () => {
			const executionId = 'fake-execution-id';
			const userId = 'user-id';
			const user = mock<User>({ id: userId });
			const node = mock<INode>();
			const runPayload: WorkflowRequest.FullManualExecutionFromUnknownTriggerPayload = {
				workflowData: {
					id: 'workflow-id',
					name: 'Test Workflow',
					active: true,
					activeVersionId: 'version-123',
					isArchived: false,
					nodes: [node],
					connections: {},
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				destinationNode: { nodeName: node.name, mode: 'inclusive' },
			};

			workflowRunner.run.mockResolvedValue(executionId);

			const result = await workflowExecutionService.executeManually(runPayload, user);

			expect(workflowRunner.run).toHaveBeenCalledTimes(1);
			const callArgs = workflowRunner.run.mock.calls[0][0];
			expect(callArgs.workflowData.active).toBe(false);
			expect(callArgs.workflowData.activeVersionId).toBe(null);
			expect(callArgs.executionMode).toBe('manual');
			expect(result).toEqual({ executionId });
		});

		test('should pass workflowIsActive to testWebhooks.needsWebhook', async () => {
			const userId = 'user-id';
			const user = mock<User>({ id: userId });
			const testWebhooks = mock<TestWebhooks>();
			const workflowRepositoryMock = mock<WorkflowRepository>();
			const telegramTrigger: INode = {
				id: '1',
				typeVersion: 1,
				position: [1, 2],
				parameters: {},
				name: 'Telegram Trigger',
				type: 'n8n-nodes-base.telegramTrigger',
			};
			const activeWorkflowData = {
				id: 'workflow-id',
				name: 'Test Workflow',
				active: true,
				activeVersionId: 'version-123',
				isArchived: false,
				nodes: [telegramTrigger],
				connections: {},
				createdAt: new Date(),
				updatedAt: new Date(),
			};
			workflowRepositoryMock.isActive.mockResolvedValue(true);
			const service = new WorkflowExecutionService(
				mock(),
				mock(),
				mock(),
				workflowRepositoryMock,
				nodeTypes,
				testWebhooks,
				workflowRunner,
				mock(),
				mock(),
				mock(),
			);

			const runPayload: WorkflowRequest.FullManualExecutionFromKnownTriggerPayload = {
				workflowData: activeWorkflowData,
				triggerToStartFrom: { name: telegramTrigger.name },
			};

			testWebhooks.needsWebhook.mockRejectedValue(
				new Error(
					'Cannot test webhook for node "Telegram Trigger" while workflow is active. Please deactivate the workflow first.',
				),
			);

			await expect(service.executeManually(runPayload, user)).rejects.toThrow(
				'Cannot test webhook for node "Telegram Trigger" while workflow is active. Please deactivate the workflow first.',
			);

			expect(testWebhooks.needsWebhook).toHaveBeenCalledWith(
				expect.objectContaining({
					workflowIsActive: true,
				}),
			);
		});
	});

	describe('selectPinnedTrigger()', () => {
		const workflow = mock<IWorkflowBase>({
			nodes: [],
		});

		const pinData = {
			[webhookNode.name]: [{ json: { key: 'value' } }],
			[executeWorkflowTriggerNode.name]: [{ json: { key: 'value' } }],
		};

		afterEach(() => {
			workflow.nodes = [];
		});

		it('should return `undefined` if no pindata', () => {
			workflow.nodes.push(webhookNode, hackerNewsNode);
			workflow.connections = {
				...createMainConnection(hackerNewsNode.name, webhookNode.name),
			};

			const node = workflowExecutionService.selectPinnedTrigger(workflow, hackerNewsNode.name, {});

			expect(node).toBeUndefined();
		});

		it('should select webhook node if only choice', () => {
			workflow.nodes.push(webhookNode, hackerNewsNode);
			workflow.connections = {
				...createMainConnection(hackerNewsNode.name, webhookNode.name),
			};

			const node = workflowExecutionService.selectPinnedTrigger(
				workflow,
				hackerNewsNode.name,
				pinData,
			);

			expect(node).toEqual(webhookNode);
		});

		it('should return `undefined` if no choice', () => {
			workflow.nodes.push(hackerNewsNode);

			const node = workflowExecutionService.selectPinnedTrigger(
				workflow,
				hackerNewsNode.name,
				pinData,
			);

			expect(node).toBeUndefined();
		});

		it('should ignore Respond to Webhook', () => {
			workflow.nodes.push(respondToWebhookNode, hackerNewsNode);
			workflow.connections = {
				...createMainConnection(hackerNewsNode.name, respondToWebhookNode.name),
			};

			const node = workflowExecutionService.selectPinnedTrigger(
				workflow,
				hackerNewsNode.name,
				pinData,
			);

			expect(node).toBeUndefined();
		});

		it('should select execute workflow trigger if only choice', () => {
			workflow.nodes.push(executeWorkflowTriggerNode, hackerNewsNode);
			workflow.connections = {
				...createMainConnection(hackerNewsNode.name, executeWorkflowTriggerNode.name),
			};

			const node = workflowExecutionService.selectPinnedTrigger(
				workflow,
				hackerNewsNode.name,
				pinData,
			);

			expect(node).toEqual(executeWorkflowTriggerNode);
		});

		it('should favor webhook node over execute workflow trigger', () => {
			workflow.nodes.push(webhookNode, executeWorkflowTriggerNode, hackerNewsNode);
			workflow.connections = {
				...createMainConnection(hackerNewsNode.name, webhookNode.name),
				...createMainConnection(hackerNewsNode.name, executeWorkflowTriggerNode.name),
			};

			const node = workflowExecutionService.selectPinnedTrigger(
				workflow,
				hackerNewsNode.name,
				pinData,
			);

			expect(node).toEqual(webhookNode);
		});

		it('should favor first webhook node over second webhook node', () => {
			workflow.nodes.push(webhookNode, secondWebhookNode, hackerNewsNode);
			workflow.connections = {
				...createMainConnection(hackerNewsNode.name, webhookNode.name),
				...createMainConnection(hackerNewsNode.name, secondWebhookNode.name),
			};

			const node = workflowExecutionService.selectPinnedTrigger(
				workflow,
				hackerNewsNode.name,
				pinData,
			);

			expect(node).toEqual(webhookNode);
		});

		it('should favor webhook node connected to the destination node', () => {
			workflow.nodes.push(webhookNode, secondWebhookNode, hackerNewsNode, secondHackerNewsNode);
			workflow.connections = {
				...createMainConnection(hackerNewsNode.name, webhookNode.name),
				...createMainConnection(secondHackerNewsNode.name, secondWebhookNode.name),
			};

			const node = workflowExecutionService.selectPinnedTrigger(
				workflow,
				secondHackerNewsNode.name,
				{ ...pinData, [secondWebhookNode.name]: [{ json: { key: 'value' } }] },
			);

			expect(node).toEqual(secondWebhookNode);
		});
	});

	describe('offloading manual executions to workers', () => {
		let originalOffloadManualExecutionsToWorkers: string | undefined;
		let globalConfigMock: GlobalConfig;
		let workflowRunnerMock: MockProxy<WorkflowRunner>;
		let service: WorkflowExecutionService;

		beforeEach(() => {
			originalOffloadManualExecutionsToWorkers = process.env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS;
			process.env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS = 'true';
			globalConfigMock = mock<GlobalConfig>({ executions: { mode: 'queue' } });
			workflowRunnerMock = mock<WorkflowRunner>();
			workflowRunnerMock.run.mockResolvedValue('fake-execution-id');

			service = new WorkflowExecutionService(
				mock(),
				mock(),
				mock(),
				mock(),
				nodeTypes,
				mock(),
				workflowRunnerMock,
				globalConfigMock,
				mock(),
				mock(),
			);
		});

		afterEach(() => {
			if (originalOffloadManualExecutionsToWorkers === undefined) {
				delete process.env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS;
			} else {
				process.env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS = originalOffloadManualExecutionsToWorkers;
			}
			jest.clearAllMocks();
		});

		test('when receiving no `runData`, should set `runData` to undefined in `executionData`', async () => {
			// ACT
			await service.executeManually(
				{
					workflowData: mock<IWorkflowBase>({ nodes: [] }),
					triggerToStartFrom: executeWorkflowTriggerNode,
				} satisfies WorkflowRequest.FullManualExecutionFromKnownTriggerPayload,
				mock<User>({ id: 'user-id' }),
			);

			// ASSERT
			const callArgs = workflowRunnerMock.run.mock.calls[0][0];
			expect(callArgs.executionData?.resultData?.runData).toBeUndefined();
		});

		test('when receiving `runData`, should preserve it in `executionData` for partial execution', async () => {
			// ARRANGE
			const runData = {
				[webhookNode.name]: [
					{
						startTime: 123,
						executionTime: 456,
						source: [],
						executionIndex: 0,
					},
				],
			};
			const connections = { ...createMainConnection(hackerNewsNode.name, webhookNode.name) };

			jest
				.spyOn(nodeTypes, 'getByNameAndVersion')
				.mockReturnValueOnce(mock<INodeType>({ description: { group: [] } }));

			// ACT
			await service.executeManually(
				{
					workflowData: mock<IWorkflowBase>({ nodes: [hackerNewsNode, webhookNode], connections }),
					runData,
					destinationNode: { nodeName: hackerNewsNode.name, mode: 'inclusive' },
					dirtyNodeNames: [],
				} satisfies WorkflowRequest.PartialManualExecutionToDestinationPayload,
				mock<User>({ id: 'user-id' }),
			);

			// ASSERT
			const callArgs = workflowRunnerMock.run.mock.calls[0][0];
			expect(callArgs.executionData?.resultData?.runData).toEqual(runData);
		});

		test('should not initialize nested `executionData.executionData` to avoid treating it as resumed execution', async () => {
			// ACT
			await service.executeManually(
				{
					workflowData: mock<IWorkflowBase>({ nodes: [] }),
					triggerToStartFrom: executeWorkflowTriggerNode,
				} satisfies WorkflowRequest.FullManualExecutionFromKnownTriggerPayload,
				mock<User>({ id: 'user-id' }),
			);

			// ASSERT
			const callArgs = workflowRunnerMock.run.mock.calls[0][0];
			// Should have executionData at top level with startData and manualData
			expect(callArgs.executionData).toBeDefined();
			expect(callArgs.executionData?.startData).toBeDefined();
			expect(callArgs.executionData?.manualData).toBeDefined();
			// But nested executionData.executionData should be undefined
			expect(callArgs.executionData?.executionData).toBeUndefined();
		});
	});

	describe('executeErrorWorkflow()', () => {
		test('should call `WorkflowRunner.run()` with correct parameters', async () => {
			const workflowErrorData: IWorkflowErrorData = {
				workflow: { id: 'workflow-id', name: 'Test Workflow' },
				execution: {
					id: 'execution-id',
					mode: 'manual',
					error: new Error('Test error') as ExecutionError,
					lastNodeExecuted: 'Node with error',
				},
			};

			const workflowRunnerMock = mock<WorkflowRunner>();
			workflowRunnerMock.run.mockResolvedValue('fake-execution-id');

			const errorTriggerType = 'n8n-nodes-base.errorTrigger';
			const globalConfig = mock<GlobalConfig>({
				nodes: {
					errorTriggerType,
				},
			});

			const errorTriggerNode: INode = {
				id: 'error-trigger-node-id',
				name: 'Error Trigger',
				type: errorTriggerType,
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};

			const errorWorkflow = mock<WorkflowEntity>({
				id: 'error-workflow-id',
				name: 'Error Workflow',
				active: false,
				activeVersionId: null,
				isArchived: false,
				pinData: {},
				nodes: [errorTriggerNode],
				connections: {},
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			const workflowRepositoryMock = mock<WorkflowRepository>();
			workflowRepositoryMock.findOneBy.mockResolvedValue(errorWorkflow);

			const service = new WorkflowExecutionService(
				mock(),
				mock(),
				mock(),
				workflowRepositoryMock,
				nodeTypes,
				mock(),
				workflowRunnerMock,
				globalConfig,
				mock(),
				mock(),
			);

			await service.executeErrorWorkflow(
				'error-workflow-id',
				workflowErrorData,
				mock<Project>({ id: 'project-id' }),
			);

			expect(workflowRunnerMock.run).toHaveBeenCalledTimes(1);
			expect(workflowRunnerMock.run).toHaveBeenCalledWith({
				executionMode: 'error',
				executionData: createRunExecutionData({
					executionData: {
						contextData: {},
						metadata: {},
						nodeExecutionStack: [
							{
								node: errorTriggerNode,
								data: {
									main: [
										[
											{
												json: workflowErrorData,
											},
										],
									],
								},
								source: null,
								metadata: {
									parentExecution: {
										executionId: 'execution-id',
										workflowId: 'workflow-id',
									},
								},
							},
						],
						waitingExecution: {},
						waitingExecutionSource: {},
					},
					resultData: {
						runData: {},
					},
					startData: {},
				}),
				workflowData: errorWorkflow,
				projectId: 'project-id',
			});
		});
	});
});

function createMainConnection(targetNode: string, sourceNode: string): IConnections {
	return {
		[sourceNode]: {
			[NodeConnectionTypes.Main]: [
				[
					{
						node: targetNode,
						type: 'main',
						index: 0,
					},
				],
			],
		},
	};
}
