'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_workflow_1 = require('n8n-workflow');
const WorkflowExecuteAdditionalData = __importStar(require('@/workflow-execute-additional-data'));
const workflow_execution_service_1 = require('@/workflows/workflow-execution.service');
const webhookNode = {
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
const executeWorkflowTriggerNode = {
	name: 'Execute Workflow Trigger',
	type: 'n8n-nodes-base.executeWorkflowTrigger',
	id: '78d63bca-bb6c-4568-948f-8ed9aacb1fe9',
	parameters: {},
	typeVersion: 1,
	position: [0, 0],
};
const respondToWebhookNode = {
	name: 'Respond to Webhook',
	type: 'n8n-nodes-base.respondToWebhook',
	id: '66d63bca-bb6c-4568-948f-8ed9aacb1fe9',
	parameters: {},
	typeVersion: 1,
	position: [0, 0],
};
const hackerNewsNode = {
	name: 'Hacker News',
	type: 'n8n-nodes-base.hackerNews',
	id: '55d63bca-bb6c-4568-948f-8ed9aacb1fe9',
	parameters: {},
	typeVersion: 1,
	position: [0, 0],
};
const secondHackerNewsNode = {
	name: 'Hacker News 2',
	type: 'n8n-nodes-base.hackerNews',
	id: '55d63bca-bb6c-4568-948f-8ed9aacb1fe3',
	parameters: {},
	typeVersion: 1,
	position: [0, 0],
};
describe('WorkflowExecutionService', () => {
	const nodeTypes = (0, jest_mock_extended_1.mock)();
	const workflowRunner = (0, jest_mock_extended_1.mock)();
	const workflowExecutionService = new workflow_execution_service_1.WorkflowExecutionService(
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		nodeTypes,
		(0, jest_mock_extended_1.mock)(),
		workflowRunner,
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
	);
	const additionalData = (0, jest_mock_extended_1.mock)({});
	jest.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(additionalData);
	describe('runWorkflow()', () => {
		test('should call `WorkflowRunner.run()`', async () => {
			const node = (0, jest_mock_extended_1.mock)();
			const workflow = (0, jest_mock_extended_1.mock)({ active: true, nodes: [node] });
			workflowRunner.run.mockResolvedValue('fake-execution-id');
			await workflowExecutionService.runWorkflow(
				workflow,
				node,
				[[]],
				(0, jest_mock_extended_1.mock)(),
				'trigger',
			);
			expect(workflowRunner.run).toHaveBeenCalledTimes(1);
		});
	});
	describe('executeManually()', () => {
		test('should call `WorkflowRunner.run()` with correct parameters with default partial execution logic', async () => {
			const executionId = 'fake-execution-id';
			const userId = 'user-id';
			const user = (0, jest_mock_extended_1.mock)({ id: userId });
			const runPayload = (0, jest_mock_extended_1.mock)({
				startNodes: [],
				destinationNode: undefined,
				agentRequest: undefined,
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
			const user = (0, jest_mock_extended_1.mock)({ id: userId });
			const node = (0, jest_mock_extended_1.mock)();
			const runPayload = (0, jest_mock_extended_1.mock)({
				workflowData: { nodes: [node] },
				startNodes: [],
				destinationNode: node.name,
				agentRequest: undefined,
			});
			jest
				.spyOn(nodeTypes, 'getByNameAndVersion')
				.mockReturnValueOnce(
					(0, jest_mock_extended_1.mock)({ description: { group: ['trigger'] } }),
				);
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
				disabled: undefined,
			},
			{
				name: 'webhook',
				type: 'n8n-nodes-base.webhook',
				disabled: undefined,
			},
		].forEach((triggerNode) => {
			test(`should call WorkflowRunner.run() with pinned trigger with type ${triggerNode.name}`, async () => {
				const additionalData = (0, jest_mock_extended_1.mock)({});
				jest.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(additionalData);
				const executionId = 'fake-execution-id';
				const userId = 'user-id';
				const user = (0, jest_mock_extended_1.mock)({ id: userId });
				const runPayload = (0, jest_mock_extended_1.mock)({
					startNodes: [],
					workflowData: {
						pinData: {
							trigger: [{}],
						},
						nodes: [triggerNode],
					},
					triggerToStartFrom: undefined,
					agentRequest: undefined,
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
			const user = (0, jest_mock_extended_1.mock)({ id: userId });
			const pinnedTrigger = {
				id: '1',
				typeVersion: 1,
				position: [1, 2],
				parameters: {},
				name: 'pinned',
				type: 'n8n-nodes-base.airtableTrigger',
			};
			const unexecutedTrigger = {
				id: '1',
				typeVersion: 1,
				position: [1, 2],
				parameters: {},
				name: 'to-start-from',
				type: 'n8n-nodes-base.airtableTrigger',
			};
			const runPayload = {
				startNodes: [],
				workflowData: {
					id: 'abc',
					name: 'test',
					active: false,
					isArchived: false,
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
						name: pinnedTrigger.name,
						sourceData: null,
					},
				],
				dirtyNodeNames: runPayload.dirtyNodeNames,
				triggerToStartFrom: undefined,
			});
			expect(result).toEqual({ executionId });
		});
		test('should ignore pinned trigger and start from unexecuted trigger', async () => {
			const executionId = 'fake-execution-id';
			const userId = 'user-id';
			const user = (0, jest_mock_extended_1.mock)({ id: userId });
			const pinnedTrigger = {
				id: '1',
				typeVersion: 1,
				position: [1, 2],
				parameters: {},
				name: 'pinned',
				type: 'n8n-nodes-base.airtableTrigger',
			};
			const unexecutedTrigger = {
				id: '1',
				typeVersion: 1,
				position: [1, 2],
				parameters: {},
				name: 'to-start-from',
				type: 'n8n-nodes-base.airtableTrigger',
			};
			const runPayload = {
				startNodes: [],
				workflowData: {
					id: 'abc',
					name: 'test',
					active: false,
					isArchived: false,
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
				startNodes: [],
				dirtyNodeNames: runPayload.dirtyNodeNames,
				triggerToStartFrom: runPayload.triggerToStartFrom,
			});
			expect(result).toEqual({ executionId });
		});
	});
	describe('selectPinnedActivatorStarter()', () => {
		const workflow = (0, jest_mock_extended_1.mock)({
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
		it('should favor webhook node connected to the destination node', () => {
			workflow.nodes.push(webhookNode, secondWebhookNode, hackerNewsNode, secondHackerNewsNode);
			workflow.connections = {
				...createMainConnection(webhookNode.name, hackerNewsNode.name),
				...createMainConnection(secondWebhookNode.name, secondHackerNewsNode.name),
			};
			const node = workflowExecutionService.selectPinnedActivatorStarter(
				workflow,
				[],
				{ ...pinData, [secondWebhookNode.name]: [{ json: { key: 'value' } }] },
				secondHackerNewsNode.name,
			);
			expect(node).toEqual(secondWebhookNode);
		});
		describe('offloading manual executions to workers', () => {
			test('when receiving no `runData`, should set `runData` to undefined in `executionData`', async () => {
				const originalEnv = process.env;
				process.env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS = 'true';
				const configMock = { getEnv: jest.fn() };
				configMock.getEnv.mockReturnValue('queue');
				const workflowRunnerMock = (0, jest_mock_extended_1.mock)();
				workflowRunnerMock.run.mockResolvedValue('fake-execution-id');
				const service = new workflow_execution_service_1.WorkflowExecutionService(
					(0, jest_mock_extended_1.mock)(),
					(0, jest_mock_extended_1.mock)(),
					(0, jest_mock_extended_1.mock)(),
					(0, jest_mock_extended_1.mock)(),
					nodeTypes,
					(0, jest_mock_extended_1.mock)(),
					workflowRunnerMock,
					(0, jest_mock_extended_1.mock)(),
					(0, jest_mock_extended_1.mock)(),
					(0, jest_mock_extended_1.mock)(),
				);
				await service.executeManually(
					{
						workflowData: (0, jest_mock_extended_1.mock)({ nodes: [] }),
						startNodes: [],
						runData: undefined,
					},
					(0, jest_mock_extended_1.mock)({ id: 'user-id' }),
				);
				const callArgs = workflowRunnerMock.run.mock.calls[0][0];
				expect(callArgs.executionData?.resultData?.runData).toBeUndefined();
				process.env = originalEnv;
			});
		});
	});
	describe('executeErrorWorkflow()', () => {
		test('should call `WorkflowRunner.run()` with correct parameters', async () => {
			const workflowErrorData = {
				workflow: { id: 'workflow-id', name: 'Test Workflow' },
				execution: {
					id: 'execution-id',
					mode: 'manual',
					error: new Error('Test error'),
					lastNodeExecuted: 'Node with error',
				},
			};
			const workflowRunnerMock = (0, jest_mock_extended_1.mock)();
			workflowRunnerMock.run.mockResolvedValue('fake-execution-id');
			const errorTriggerType = 'n8n-nodes-base.errorTrigger';
			const globalConfig = (0, jest_mock_extended_1.mock)({
				nodes: {
					errorTriggerType,
				},
			});
			const errorTriggerNode = {
				id: 'error-trigger-node-id',
				name: 'Error Trigger',
				type: errorTriggerType,
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};
			const errorWorkflow = (0, jest_mock_extended_1.mock)({
				id: 'error-workflow-id',
				name: 'Error Workflow',
				active: false,
				isArchived: false,
				pinData: {},
				nodes: [errorTriggerNode],
				connections: {},
				createdAt: new Date(),
				updatedAt: new Date(),
			});
			const workflowRepositoryMock = (0, jest_mock_extended_1.mock)();
			workflowRepositoryMock.findOneBy.mockResolvedValue(errorWorkflow);
			const service = new workflow_execution_service_1.WorkflowExecutionService(
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				workflowRepositoryMock,
				nodeTypes,
				(0, jest_mock_extended_1.mock)(),
				workflowRunnerMock,
				globalConfig,
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
			);
			await service.executeErrorWorkflow(
				'error-workflow-id',
				workflowErrorData,
				(0, jest_mock_extended_1.mock)({ id: 'project-id' }),
			);
			expect(workflowRunnerMock.run).toHaveBeenCalledTimes(1);
			expect(workflowRunnerMock.run).toHaveBeenCalledWith({
				executionMode: 'error',
				executionData: {
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
				},
				workflowData: errorWorkflow,
				projectId: 'project-id',
			});
		});
	});
});
function createMainConnection(targetNode, sourceNode) {
	return {
		[sourceNode]: {
			[n8n_workflow_1.NodeConnectionTypes.Main]: [
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
//# sourceMappingURL=workflow-execution.service.test.js.map
