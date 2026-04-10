import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';
import {
	MANUAL_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
	type INode,
	type IWorkflowExecutionDataProcess,
	UnexpectedError,
} from 'n8n-workflow';

jest.mock('@n8n/workflow-sdk', () => jest.requireActual('@n8n/workflow-sdk'));

import { createWorkflow } from './mock.utils';
import { McpExecutionTimeoutError, WorkflowAccessError } from '../mcp.errors';
import { createTestWorkflowTool, testWorkflow } from '../tools/test-workflow.tool';

import { ActiveExecutions } from '@/active-executions';
import { NodeTypes } from '@/node-types';
import { McpService } from '@/modules/mcp/mcp.service';
import { Telemetry } from '@/telemetry';
import { WorkflowRunner } from '@/workflow-runner';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

// Helper to create a mock NodeTypes that recognizes trigger vs non-trigger nodes
const TRIGGER_NODE_TYPES = new Set([
	WEBHOOK_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	'n8n-nodes-base.scheduleTrigger',
]);

function createMockNodeTypes() {
	const instance = mockInstance(NodeTypes);
	instance.getByNameAndVersion.mockImplementation(((type: string) => {
		if (!type) throw new Error(`Unknown node type: ${type}`);
		return {
			description: {
				name: type,
				displayName: type,
				group: TRIGGER_NODE_TYPES.has(type) ? ['trigger'] : ['transform'],
				properties: [],
				defaults: {},
				inputs: [],
				outputs: [],
				version: 1,
			},
		};
	}) as unknown as typeof instance.getByNameAndVersion);
	return instance;
}

describe('test-workflow MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	let workflowFinderService: WorkflowFinderService;
	let activeExecutions: ActiveExecutions;
	let workflowRunner: WorkflowRunner;
	let nodeTypes: ReturnType<typeof createMockNodeTypes>;
	let telemetry: Telemetry;
	let mcpService: McpService;

	beforeEach(() => {
		workflowFinderService = mockInstance(WorkflowFinderService);
		activeExecutions = mockInstance(ActiveExecutions);
		workflowRunner = mockInstance(WorkflowRunner);
		nodeTypes = createMockNodeTypes();
		telemetry = mockInstance(Telemetry, { track: jest.fn() });
		mcpService = mockInstance(McpService, { isQueueMode: false });
	});

	describe('smoke tests', () => {
		test('creates tool with correct name and config', () => {
			const tool = createTestWorkflowTool(
				user,
				workflowFinderService,
				activeExecutions,
				workflowRunner,
				nodeTypes,
				telemetry,
				mcpService,
			);

			expect(tool.name).toBe('test_workflow');
			expect(tool.config).toBeDefined();
			expect(typeof tool.config.description).toBe('string');
			expect(tool.config.inputSchema).toBeDefined();
			expect(tool.config.outputSchema).toBeDefined();
			expect(typeof tool.handler).toBe('function');
		});
	});

	describe('workflow validation', () => {
		test('propagates errors from getMcpWorkflow when workflow not found', async () => {
			(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(null);

			await expect(
				testWorkflow(
					user,
					workflowFinderService,
					activeExecutions,
					workflowRunner,
					nodeTypes,
					mcpService,
					'missing-workflow',
					{},
				),
			).rejects.toThrow(WorkflowAccessError);
		});

		test('throws when no trigger node exists in workflow', async () => {
			const workflow = createWorkflow({
				settings: { availableInMCP: true },
				nodes: [
					{
						id: 'node-1',
						name: 'SetNode',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [0, 0],
						disabled: false,
						parameters: {},
					} as INode,
				],
			});
			(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);

			await expect(
				testWorkflow(
					user,
					workflowFinderService,
					activeExecutions,
					workflowRunner,
					nodeTypes,
					mcpService,
					'no-trigger-workflow',
					{},
				),
			).rejects.toThrow('Workflow has no trigger node');
		});

		test('throws when specified triggerNodeName is not found', async () => {
			const workflow = createWorkflow({
				settings: { availableInMCP: true },
				nodes: [
					{
						id: 'node-1',
						name: 'WebhookNode',
						type: WEBHOOK_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						disabled: false,
						parameters: {},
					} as INode,
				],
			});
			(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);

			await expect(
				testWorkflow(
					user,
					workflowFinderService,
					activeExecutions,
					workflowRunner,
					nodeTypes,
					mcpService,
					'wf-1',
					{},
					'NonExistentTrigger',
				),
			).rejects.toThrow('Trigger node "NonExistentTrigger" not found');
		});

		test('skips disabled trigger nodes', async () => {
			const workflow = createWorkflow({
				settings: { availableInMCP: true },
				nodes: [
					{
						id: 'node-1',
						name: 'DisabledTrigger',
						type: WEBHOOK_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						disabled: true,
						parameters: {},
					} as INode,
				],
			});
			(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);

			await expect(
				testWorkflow(
					user,
					workflowFinderService,
					activeExecutions,
					workflowRunner,
					nodeTypes,
					mcpService,
					'wf-1',
					{},
				),
			).rejects.toThrow('Workflow has no trigger node');
		});
	});

	describe('trigger node resolution', () => {
		test('finds first trigger node when triggerNodeName is not provided', async () => {
			const workflow = createWorkflow({
				settings: { availableInMCP: true },
				nodes: [
					{
						id: 'node-1',
						name: 'SetNode',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [0, 0],
						disabled: false,
						parameters: {},
					} as INode,
					{
						id: 'node-2',
						name: 'MyWebhook',
						type: WEBHOOK_NODE_TYPE,
						typeVersion: 1,
						position: [100, 0],
						disabled: false,
						parameters: {},
					} as INode,
				],
			});
			(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);
			(workflowRunner.run as jest.Mock).mockResolvedValue('exec-1');
			(activeExecutions.getPostExecutePromise as jest.Mock).mockResolvedValue({
				status: 'success',
				data: { resultData: { runData: {} } },
			});

			await testWorkflow(
				user,
				workflowFinderService,
				activeExecutions,
				workflowRunner,
				nodeTypes,
				mcpService,
				'wf-1',
				{},
			);

			const runCall = (workflowRunner.run as jest.Mock).mock
				.calls[0][0] as IWorkflowExecutionDataProcess;
			expect(runCall.startNodes).toEqual([{ name: 'MyWebhook', sourceData: null }]);
		});

		test('finds specific trigger node when triggerNodeName is provided', async () => {
			const workflow = createWorkflow({
				settings: { availableInMCP: true },
				nodes: [
					{
						id: 'node-1',
						name: 'WebhookA',
						type: WEBHOOK_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						disabled: false,
						parameters: {},
					} as INode,
					{
						id: 'node-2',
						name: 'WebhookB',
						type: WEBHOOK_NODE_TYPE,
						typeVersion: 1,
						position: [100, 0],
						disabled: false,
						parameters: {},
					} as INode,
				],
			});
			(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);
			(workflowRunner.run as jest.Mock).mockResolvedValue('exec-1');
			(activeExecutions.getPostExecutePromise as jest.Mock).mockResolvedValue({
				status: 'success',
				data: { resultData: { runData: {} } },
			});

			await testWorkflow(
				user,
				workflowFinderService,
				activeExecutions,
				workflowRunner,
				nodeTypes,
				mcpService,
				'wf-1',
				{},
				'WebhookB',
			);

			const runCall = (workflowRunner.run as jest.Mock).mock
				.calls[0][0] as IWorkflowExecutionDataProcess;
			expect(runCall.startNodes).toEqual([{ name: 'WebhookB', sourceData: null }]);
		});
	});

	describe('pin data normalization', () => {
		test('passes through items already wrapped in json property', async () => {
			const workflow = createWorkflow({
				settings: { availableInMCP: true },
				nodes: [
					{
						id: 'node-1',
						name: 'Trigger',
						type: WEBHOOK_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						disabled: false,
						parameters: {},
					} as INode,
				],
			});
			(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);
			(workflowRunner.run as jest.Mock).mockResolvedValue('exec-1');
			(activeExecutions.getPostExecutePromise as jest.Mock).mockResolvedValue({
				status: 'success',
				data: { resultData: { runData: {} } },
			});

			const pinData = {
				Trigger: [{ json: { id: '123', name: 'test' } }],
			};

			await testWorkflow(
				user,
				workflowFinderService,
				activeExecutions,
				workflowRunner,
				nodeTypes,
				mcpService,
				'wf-1',
				pinData,
			);

			const runCall = (workflowRunner.run as jest.Mock).mock
				.calls[0][0] as IWorkflowExecutionDataProcess;
			expect(runCall.pinData).toMatchObject({
				Trigger: [{ json: { id: '123', name: 'test' } }],
			});
		});

		test('wraps flat objects in json property', async () => {
			const workflow = createWorkflow({
				settings: { availableInMCP: true },
				nodes: [
					{
						id: 'node-1',
						name: 'Trigger',
						type: WEBHOOK_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						disabled: false,
						parameters: {},
					} as INode,
				],
			});
			(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);
			(workflowRunner.run as jest.Mock).mockResolvedValue('exec-1');
			(activeExecutions.getPostExecutePromise as jest.Mock).mockResolvedValue({
				status: 'success',
				data: { resultData: { runData: {} } },
			});

			const pinData = {
				Trigger: [{ id: '123', name: 'test' }],
			};

			await testWorkflow(
				user,
				workflowFinderService,
				activeExecutions,
				workflowRunner,
				nodeTypes,
				mcpService,
				'wf-1',
				pinData as any,
			);

			const runCall = (workflowRunner.run as jest.Mock).mock
				.calls[0][0] as IWorkflowExecutionDataProcess;
			expect(runCall.pinData).toMatchObject({
				Trigger: [{ json: { id: '123', name: 'test' } }],
			});
		});

		test('provides default trigger pin data when trigger has no pin data', async () => {
			const workflow = createWorkflow({
				settings: { availableInMCP: true },
				nodes: [
					{
						id: 'node-1',
						name: 'MyTrigger',
						type: WEBHOOK_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						disabled: false,
						parameters: {},
					} as INode,
				],
			});
			(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);
			(workflowRunner.run as jest.Mock).mockResolvedValue('exec-1');
			(activeExecutions.getPostExecutePromise as jest.Mock).mockResolvedValue({
				status: 'success',
				data: { resultData: { runData: {} } },
			});

			// Empty pin data — no entry for the trigger
			await testWorkflow(
				user,
				workflowFinderService,
				activeExecutions,
				workflowRunner,
				nodeTypes,
				mcpService,
				'wf-1',
				{},
			);

			const runCall = (workflowRunner.run as jest.Mock).mock
				.calls[0][0] as IWorkflowExecutionDataProcess;
			// Trigger should get default [{json: {}}] in the execution stack
			expect(runCall.executionData?.executionData?.nodeExecutionStack[0].data.main[0]).toEqual([
				{ json: {} },
			]);
		});

		test('rejects pin data with unknown node names', async () => {
			const workflow = createWorkflow({
				settings: { availableInMCP: true },
				nodes: [
					{
						id: 'node-1',
						name: 'Trigger',
						type: WEBHOOK_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						disabled: false,
						parameters: {},
					} as INode,
				],
			});
			(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);

			await expect(
				testWorkflow(
					user,
					workflowFinderService,
					activeExecutions,
					workflowRunner,
					nodeTypes,
					mcpService,
					'wf-1',
					{ Trigger: [{ json: {} }], NonExistentNode: [{ json: { x: 1 } }] },
					'Trigger',
				),
			).rejects.toThrow('Pin data contains unknown node names: NonExistentNode');
		});
	});

	describe('execution flow', () => {
		const setupSuccessfulExecution = () => {
			const workflow = createWorkflow({
				settings: { availableInMCP: true },
				nodes: [
					{
						id: 'node-1',
						name: 'Trigger',
						type: WEBHOOK_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						disabled: false,
						parameters: {},
					} as INode,
				],
			});
			(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);
			return workflow;
		};

		test('returns success status for successful execution', async () => {
			setupSuccessfulExecution();
			(workflowRunner.run as jest.Mock).mockResolvedValue('exec-success');
			(activeExecutions.getPostExecutePromise as jest.Mock).mockResolvedValue({
				status: 'success',
				data: { resultData: { runData: {} } },
			});

			const result = await testWorkflow(
				user,
				workflowFinderService,
				activeExecutions,
				workflowRunner,
				nodeTypes,
				mcpService,
				'wf-1',
				{ Trigger: [{ json: {} }] },
			);

			expect(result).toMatchObject({
				executionId: 'exec-success',
				status: 'success',
			});
			expect(result.error).toBeUndefined();
		});

		test('returns error status when execution status is error', async () => {
			setupSuccessfulExecution();
			(workflowRunner.run as jest.Mock).mockResolvedValue('exec-error');
			(activeExecutions.getPostExecutePromise as jest.Mock).mockResolvedValue({
				status: 'error',
				data: {
					resultData: {
						error: { message: 'Something went wrong' },
					},
				},
			});

			const result = await testWorkflow(
				user,
				workflowFinderService,
				activeExecutions,
				workflowRunner,
				nodeTypes,
				mcpService,
				'wf-1',
				{ Trigger: [{ json: {} }] },
			);

			expect(result).toMatchObject({
				executionId: 'exec-error',
				status: 'error',
				error: 'Something went wrong',
			});
		});

		test('returns error when resultData has error even with success status', async () => {
			setupSuccessfulExecution();
			(workflowRunner.run as jest.Mock).mockResolvedValue('exec-data-error');
			(activeExecutions.getPostExecutePromise as jest.Mock).mockResolvedValue({
				status: 'success',
				data: {
					resultData: {
						error: { message: 'Node execution failed' },
					},
				},
			});

			const result = await testWorkflow(
				user,
				workflowFinderService,
				activeExecutions,
				workflowRunner,
				nodeTypes,
				mcpService,
				'wf-1',
				{ Trigger: [{ json: {} }] },
			);

			expect(result.status).toBe('error');
			expect(result.error).toBe('Node execution failed');
		});

		test('returns generic error message when resultData.error.message is missing', async () => {
			setupSuccessfulExecution();
			(workflowRunner.run as jest.Mock).mockResolvedValue('exec-no-msg');
			(activeExecutions.getPostExecutePromise as jest.Mock).mockResolvedValue({
				status: 'error',
				data: {
					resultData: {
						error: {},
					},
				},
			});

			const result = await testWorkflow(
				user,
				workflowFinderService,
				activeExecutions,
				workflowRunner,
				nodeTypes,
				mcpService,
				'wf-1',
				{ Trigger: [{ json: {} }] },
			);

			expect(result.status).toBe('error');
			expect(result.error).toBe('Execution completed with errors');
		});

		test('handles workflow returning undefined data', async () => {
			setupSuccessfulExecution();
			(workflowRunner.run as jest.Mock).mockResolvedValue('exec-no-data');
			(activeExecutions.getPostExecutePromise as jest.Mock).mockResolvedValue(undefined);

			await expect(
				testWorkflow(
					user,
					workflowFinderService,
					activeExecutions,
					workflowRunner,
					nodeTypes,
					mcpService,
					'wf-1',
					{ Trigger: [{ json: {} }] },
				),
			).rejects.toThrow(UnexpectedError);
		});
	});

	describe('run data structure', () => {
		test('passes correct runData to workflowRunner', async () => {
			const workflow = createWorkflow({
				settings: { availableInMCP: true },
				nodes: [
					{
						id: 'node-1',
						name: 'MyTrigger',
						type: WEBHOOK_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						disabled: false,
						parameters: {},
					} as INode,
				],
			});
			(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);
			(workflowRunner.run as jest.Mock).mockResolvedValue('exec-1');
			(activeExecutions.getPostExecutePromise as jest.Mock).mockResolvedValue({
				status: 'success',
				data: { resultData: { runData: {} } },
			});

			await testWorkflow(
				user,
				workflowFinderService,
				activeExecutions,
				workflowRunner,
				nodeTypes,
				mcpService,
				'wf-1',
				{ MyTrigger: [{ json: { key: 'val' } }] },
			);

			const runCall = (workflowRunner.run as jest.Mock).mock
				.calls[0][0] as IWorkflowExecutionDataProcess;
			expect(runCall.executionMode).toBe('manual');
			expect(runCall.userId).toBe('user-1');
			expect(runCall.startNodes).toEqual([{ name: 'MyTrigger', sourceData: null }]);
			expect(runCall.pinData).toMatchObject({
				MyTrigger: [{ json: { key: 'val' } }],
			});
			expect(runCall.mcpType).toBe('service');
			expect(runCall.mcpSessionId).toBeDefined();
			expect(runCall.mcpMessageId).toBeDefined();
		});

		test('sets isMcpExecution to false in regular mode', async () => {
			const workflow = createWorkflow({
				settings: { availableInMCP: true },
				nodes: [
					{
						id: 'node-1',
						name: 'Trigger',
						type: WEBHOOK_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						disabled: false,
						parameters: {},
					} as INode,
				],
			});
			(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);
			(workflowRunner.run as jest.Mock).mockResolvedValue('exec-1');
			(activeExecutions.getPostExecutePromise as jest.Mock).mockResolvedValue({
				status: 'success',
				data: { resultData: { runData: {} } },
			});

			await testWorkflow(
				user,
				workflowFinderService,
				activeExecutions,
				workflowRunner,
				nodeTypes,
				mcpService,
				'wf-1',
				{},
			);

			const runCall = (workflowRunner.run as jest.Mock).mock
				.calls[0][0] as IWorkflowExecutionDataProcess;
			expect(runCall.isMcpExecution).toBe(false);
		});

		test('sets isMcpExecution to true in queue mode', async () => {
			const queueMcpService = mockInstance(McpService, {
				isQueueMode: true,
				createPendingResponse: jest.fn().mockReturnValue({
					promise: Promise.resolve({
						status: 'success',
						data: { resultData: { runData: {} } },
					}),
				}),
			});

			const workflow = createWorkflow({
				settings: { availableInMCP: true },
				nodes: [
					{
						id: 'node-1',
						name: 'Trigger',
						type: WEBHOOK_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						disabled: false,
						parameters: {},
					} as INode,
				],
			});
			(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);
			(workflowRunner.run as jest.Mock).mockResolvedValue('exec-queue');

			await testWorkflow(
				user,
				workflowFinderService,
				activeExecutions,
				workflowRunner,
				nodeTypes,
				queueMcpService,
				'wf-1',
				{},
			);

			const runCall = (workflowRunner.run as jest.Mock).mock
				.calls[0][0] as IWorkflowExecutionDataProcess;
			expect(runCall.isMcpExecution).toBe(true);
		});
	});

	describe('error handling via handler', () => {
		test('timeout error returns executionId and timeout message', async () => {
			const workflow = createWorkflow({
				settings: { availableInMCP: true },
				nodes: [
					{
						id: 'node-1',
						name: 'Trigger',
						type: WEBHOOK_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						disabled: false,
						parameters: {},
					} as INode,
				],
			});
			(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);
			(workflowRunner.run as jest.Mock).mockResolvedValue('exec-timeout');
			(activeExecutions.getPostExecutePromise as jest.Mock).mockRejectedValue(
				new McpExecutionTimeoutError('exec-timeout', 300_000),
			);
			(activeExecutions.stopExecution as jest.Mock).mockImplementation(() => {});

			const tool = createTestWorkflowTool(
				user,
				workflowFinderService,
				activeExecutions,
				workflowRunner,
				nodeTypes,
				telemetry,
				mcpService,
			);

			const result = await tool.handler(
				{
					workflowId: 'wf-1',
					pinData: { Trigger: [{ json: {} }] },
					triggerNodeName: undefined,
				},
				{} as any,
			);

			expect(result.structuredContent).toMatchObject({
				executionId: 'exec-timeout',
				status: 'error',
				error: expect.stringContaining('timed out'),
			});
		});

		test('WorkflowAccessError returns error with null executionId', async () => {
			(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(null);

			const tool = createTestWorkflowTool(
				user,
				workflowFinderService,
				activeExecutions,
				workflowRunner,
				nodeTypes,
				telemetry,
				mcpService,
			);

			const result = await tool.handler(
				{
					workflowId: 'missing-wf',
					pinData: {},
					triggerNodeName: undefined,
				},
				{} as any,
			);

			expect(result.structuredContent).toMatchObject({
				executionId: null,
				status: 'error',
				error: expect.stringContaining("not found or you don't have permission"),
			});
		});
	});

	describe('telemetry', () => {
		test('tracks successful execution', async () => {
			const workflow = createWorkflow({
				settings: { availableInMCP: true },
				nodes: [
					{
						id: 'node-1',
						name: 'Trigger',
						type: WEBHOOK_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						disabled: false,
						parameters: {},
					} as INode,
					{
						id: 'node-2',
						name: 'OtherNode',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [200, 0],
						disabled: false,
						parameters: {},
					} as INode,
				],
			});
			(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);
			(workflowRunner.run as jest.Mock).mockResolvedValue('exec-tel');
			(activeExecutions.getPostExecutePromise as jest.Mock).mockResolvedValue({
				status: 'success',
				data: { resultData: { runData: {} } },
			});

			const tool = createTestWorkflowTool(
				user,
				workflowFinderService,
				activeExecutions,
				workflowRunner,
				nodeTypes,
				telemetry,
				mcpService,
			);

			await tool.handler(
				{
					workflowId: 'wf-1',
					pinData: { Trigger: [{ json: {} }], OtherNode: [{ json: { x: 1 } }] },
					triggerNodeName: 'Trigger',
				},
				{} as any,
			);

			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					user_id: 'user-1',
					tool_name: 'test_workflow',
					parameters: {
						workflowId: 'wf-1',
						nodeCount: 2,
						hasTriggerNodeName: true,
					},
					results: {
						success: true,
						data: { executionId: 'exec-tel', status: 'success' },
					},
				}),
			);
		});

		test('tracks failed execution with error details', async () => {
			(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(null);

			const tool = createTestWorkflowTool(
				user,
				workflowFinderService,
				activeExecutions,
				workflowRunner,
				nodeTypes,
				telemetry,
				mcpService,
			);

			await tool.handler(
				{ workflowId: 'missing', pinData: {}, triggerNodeName: undefined },
				{} as any,
			);

			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					tool_name: 'test_workflow',
					results: expect.objectContaining({
						success: false,
						error_reason: 'no_permission',
					}),
				}),
			);
		});
	});
});
