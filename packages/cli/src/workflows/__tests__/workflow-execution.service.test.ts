import { mock } from 'jest-mock-extended';
import type { INode, IWorkflowBase, INodeType, IWorkflowExecuteAdditionalData } from 'n8n-workflow';

import type { User } from '@/databases/entities/user';
import type { NodeTypes } from '@/node-types';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import type { WorkflowRunner } from '@/workflow-runner';
import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';

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
			const workflow = mock<IWorkflowBase>({ active: true, nodes: [node] });

			workflowRunner.run.mockResolvedValue('fake-execution-id');

			await workflowExecutionService.runWorkflow(workflow, node, [[]], mock(), 'trigger');

			expect(workflowRunner.run).toHaveBeenCalledTimes(1);
		});
	});

	describe('executeManually()', () => {
		test('should call `WorkflowRunner.run()` with correct parameters with default partial execution logic', async () => {
			const executionId = 'fake-execution-id';
			const userId = 'user-id';
			const user = mock<User>({ id: userId });
			const runPayload = mock<WorkflowRequest.ManualRunPayload>({
				startNodes: [],
				destinationNode: undefined,
			});

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
				partialExecutionVersion: 1,
				startNodes: runPayload.startNodes,
				dirtyNodeNames: runPayload.dirtyNodeNames,
				triggerToStartFrom: runPayload.triggerToStartFrom,
			});
			expect(result).toEqual({ executionId });
		});

		test('removes runData if the destination node is a trigger', async () => {
			const executionId = 'fake-execution-id';
			const userId = 'user-id';
			const user = mock<User>({ id: userId });
			const node = mock<INode>();
			const runPayload = mock<WorkflowRequest.ManualRunPayload>({
				workflowData: { nodes: [node] },
				startNodes: [],
				destinationNode: node.name,
			});

			jest
				.spyOn(nodeTypes, 'getByNameAndVersion')
				.mockReturnValueOnce(mock<INodeType>({ description: { group: ['trigger'] } }));

			workflowRunner.run.mockResolvedValue(executionId);

			const result = await workflowExecutionService.executeManually(runPayload, user);

			expect(workflowRunner.run).toHaveBeenCalledWith({
				destinationNode: runPayload.destinationNode,
				executionMode: 'manual',
				runData: undefined,
				pinData: runPayload.workflowData.pinData,
				pushRef: undefined,
				workflowData: runPayload.workflowData,
				userId,
				partialExecutionVersion: 1,
				startNodes: runPayload.startNodes,
				dirtyNodeNames: runPayload.dirtyNodeNames,
				triggerToStartFrom: runPayload.triggerToStartFrom,
			});
			expect(result).toEqual({ executionId });
		});

		[
			{
				name: 'trigger',
				type: 'n8n-nodes-base.airtableTrigger',
				// Avoid mock constructor evaluated as true
				disabled: undefined,
			},
			{
				name: 'webhook',
				type: 'n8n-nodes-base.webhook',
				disabled: undefined,
			},
		].forEach((triggerNode: Partial<INode>) => {
			test(`should call WorkflowRunner.run() with pinned trigger with type ${triggerNode.name}`, async () => {
				const additionalData = mock<IWorkflowExecuteAdditionalData>({});
				jest.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(additionalData);
				const executionId = 'fake-execution-id';
				const userId = 'user-id';
				const user = mock<User>({ id: userId });
				const runPayload = mock<WorkflowRequest.ManualRunPayload>({
					startNodes: [],
					workflowData: {
						pinData: {
							trigger: [{}],
						},
						nodes: [triggerNode],
					},
					triggerToStartFrom: undefined,
				});

				workflowRunner.run.mockResolvedValue(executionId);

				const result = await workflowExecutionService.executeManually(runPayload, user);

				expect(workflowRunner.run).toHaveBeenCalledWith({
					destinationNode: runPayload.destinationNode,
					executionMode: 'manual',
					runData: runPayload.runData,
					pinData: runPayload.workflowData.pinData,
					pushRef: undefined,
					workflowData: runPayload.workflowData,
					userId,
					partialExecutionVersion: 1,
					startNodes: [
						{
							name: triggerNode.name,
							sourceData: null,
						},
					],
					dirtyNodeNames: runPayload.dirtyNodeNames,
					triggerToStartFrom: runPayload.triggerToStartFrom,
				});
				expect(result).toEqual({ executionId });
			});
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

			const runPayload: WorkflowRequest.ManualRunPayload = {
				startNodes: [],
				workflowData: {
					id: 'abc',
					name: 'test',
					active: false,
					pinData: {
						[pinnedTrigger.name]: [{ json: {} }],
					},
					nodes: [unexecutedTrigger, pinnedTrigger],
					connections: {},
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				runData: {},
			};

			workflowRunner.run.mockResolvedValue(executionId);

			const result = await workflowExecutionService.executeManually(runPayload, user);

			expect(workflowRunner.run).toHaveBeenCalledWith({
				destinationNode: runPayload.destinationNode,
				executionMode: 'manual',
				runData: runPayload.runData,
				pinData: runPayload.workflowData.pinData,
				pushRef: undefined,
				workflowData: runPayload.workflowData,
				userId,
				partialExecutionVersion: 1,
				startNodes: [
					{
						// Start from pinned trigger
						name: pinnedTrigger.name,
						sourceData: null,
					},
				],
				dirtyNodeNames: runPayload.dirtyNodeNames,
				// no trigger to start from
				triggerToStartFrom: undefined,
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

			const runPayload: WorkflowRequest.ManualRunPayload = {
				startNodes: [],
				workflowData: {
					id: 'abc',
					name: 'test',
					active: false,
					pinData: {
						[pinnedTrigger.name]: [{ json: {} }],
					},
					nodes: [unexecutedTrigger, pinnedTrigger],
					connections: {},
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				runData: {},
				triggerToStartFrom: {
					name: unexecutedTrigger.name,
				},
			};

			workflowRunner.run.mockResolvedValue(executionId);

			const result = await workflowExecutionService.executeManually(runPayload, user);

			expect(workflowRunner.run).toHaveBeenCalledWith({
				destinationNode: runPayload.destinationNode,
				executionMode: 'manual',
				runData: runPayload.runData,
				pinData: runPayload.workflowData.pinData,
				pushRef: undefined,
				workflowData: runPayload.workflowData,
				userId,
				partialExecutionVersion: 1,
				// ignore pinned trigger
				startNodes: [],
				dirtyNodeNames: runPayload.dirtyNodeNames,
				// pass unexecuted trigger to start from
				triggerToStartFrom: runPayload.triggerToStartFrom,
			});
			expect(result).toEqual({ executionId });
		});
	});

	describe('selectPinnedActivatorStarter()', () => {
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

		it('should return `null` if no pindata', () => {
			const node = workflowExecutionService.selectPinnedActivatorStarter(workflow, []);

			expect(node).toBeNull();
		});

		it('should return `null` if no starter nodes', () => {
			const node = workflowExecutionService.selectPinnedActivatorStarter(workflow);

			expect(node).toBeNull();
		});

		it('should select webhook node if only choice', () => {
			workflow.nodes.push(webhookNode);

			const node = workflowExecutionService.selectPinnedActivatorStarter(workflow, [], pinData);

			expect(node).toEqual(webhookNode);
		});

		it('should return `null` if no choice', () => {
			workflow.nodes.push(hackerNewsNode);

			const node = workflowExecutionService.selectPinnedActivatorStarter(workflow, [], pinData);

			expect(node).toBeNull();
		});

		it('should return ignore Respond to Webhook', () => {
			workflow.nodes.push(respondToWebhookNode);

			const node = workflowExecutionService.selectPinnedActivatorStarter(workflow, [], pinData);

			expect(node).toBeNull();
		});

		it('should select execute workflow trigger if only choice', () => {
			workflow.nodes.push(executeWorkflowTriggerNode);

			const node = workflowExecutionService.selectPinnedActivatorStarter(workflow, [], pinData);

			expect(node).toEqual(executeWorkflowTriggerNode);
		});

		it('should favor webhook node over execute workflow trigger', () => {
			workflow.nodes.push(webhookNode, executeWorkflowTriggerNode);

			const node = workflowExecutionService.selectPinnedActivatorStarter(workflow, [], pinData);

			expect(node).toEqual(webhookNode);
		});

		it('should favor first webhook node over second webhook node', () => {
			workflow.nodes.push(webhookNode, secondWebhookNode);

			const node = workflowExecutionService.selectPinnedActivatorStarter(workflow, [], pinData);

			expect(node).toEqual(webhookNode);
		});

		describe('offloading manual executions to workers', () => {
			test('when receiving no `runData`, should set `runData` to undefined in `executionData`', async () => {
				const originalEnv = process.env;
				process.env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS = 'true';

				const configMock = { getEnv: jest.fn() };
				configMock.getEnv.mockReturnValue('queue');

				const workflowRunnerMock = mock<WorkflowRunner>();
				workflowRunnerMock.run.mockResolvedValue('fake-execution-id');

				const service = new WorkflowExecutionService(
					mock(),
					mock(),
					mock(),
					mock(),
					nodeTypes,
					mock(),
					workflowRunnerMock,
					mock(),
					mock(),
					mock(),
				);

				await service.executeManually(
					{
						workflowData: mock<IWorkflowBase>({ nodes: [] }),
						startNodes: [],
						runData: undefined,
					},
					mock<User>({ id: 'user-id' }),
				);

				const callArgs = workflowRunnerMock.run.mock.calls[0][0];
				expect(callArgs.executionData?.resultData?.runData).toBeUndefined();

				process.env = originalEnv;
			});
		});
	});
});
