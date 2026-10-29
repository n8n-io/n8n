import { ExecutionRedactionServiceProxy, type RedactableExecution } from '@n8n/backend-services';
import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';
import {
	MANUAL_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
	type INode,
	type IWorkflowExecutionDataProcess,
	NodeOperationError,
	UnexpectedError,
} from 'n8n-workflow';
import type { Mock } from 'vitest';

vi.mock(
	'@n8n/workflow-sdk',
	async () => await vi.importActual<typeof import('@n8n/workflow-sdk')>('@n8n/workflow-sdk'),
);

import { ActiveExecutions } from '@/active-executions';
import { McpService } from '@/modules/mcp/mcp.service';
import { NodeTypes } from '@/node-types';
import { Telemetry } from '@/telemetry';
import { WorkflowRunner } from '@/workflow-runner';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { McpExecutionTimeoutError, WorkflowAccessError } from '../mcp.errors';
import { createWorkflow } from './mock.utils';
import { createTestWorkflowTool, testWorkflow } from '../tools/test-workflow.tool';

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
	let executionRedactionServiceProxy: ExecutionRedactionServiceProxy;

	beforeEach(() => {
		workflowFinderService = mockInstance(WorkflowFinderService);
		activeExecutions = mockInstance(ActiveExecutions);
		workflowRunner = mockInstance(WorkflowRunner);
		nodeTypes = createMockNodeTypes();
		telemetry = mockInstance(Telemetry, { track: vi.fn() });
		mcpService = mockInstance(McpService, { isQueueMode: false });
		executionRedactionServiceProxy = mockInstance(ExecutionRedactionServiceProxy);
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
				executionRedactionServiceProxy,
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
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(null);

			await expect(
				testWorkflow(
					user,
					workflowFinderService,
					activeExecutions,
					workflowRunner,
					nodeTypes,
					mcpService,
					executionRedactionServiceProxy,
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
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);

			await expect(
				testWorkflow(
					user,
					workflowFinderService,
					activeExecutions,
					workflowRunner,
					nodeTypes,
					mcpService,
					executionRedactionServiceProxy,
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
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);

			await expect(
				testWorkflow(
					user,
					workflowFinderService,
					activeExecutions,
					workflowRunner,
					nodeTypes,
					mcpService,
					executionRedactionServiceProxy,
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
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);

			await expect(
				testWorkflow(
					user,
					workflowFinderService,
					activeExecutions,
					workflowRunner,
					nodeTypes,
					mcpService,
					executionRedactionServiceProxy,
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
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);
			(workflowRunner.run as Mock).mockResolvedValue('exec-1');
			(activeExecutions.getPostExecutePromise as Mock).mockResolvedValue({
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
				executionRedactionServiceProxy,
				'wf-1',
				{},
			);

			const runCall = (workflowRunner.run as Mock).mock
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
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);
			(workflowRunner.run as Mock).mockResolvedValue('exec-1');
			(activeExecutions.getPostExecutePromise as Mock).mockResolvedValue({
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
				executionRedactionServiceProxy,
				'wf-1',
				{},
				'WebhookB',
			);

			const runCall = (workflowRunner.run as Mock).mock
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
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);
			(workflowRunner.run as Mock).mockResolvedValue('exec-1');
			(activeExecutions.getPostExecutePromise as Mock).mockResolvedValue({
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
				executionRedactionServiceProxy,
				'wf-1',
				pinData,
			);

			const runCall = (workflowRunner.run as Mock).mock
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
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);
			(workflowRunner.run as Mock).mockResolvedValue('exec-1');
			(activeExecutions.getPostExecutePromise as Mock).mockResolvedValue({
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
				executionRedactionServiceProxy,
				'wf-1',
				pinData as any,
			);

			const runCall = (workflowRunner.run as Mock).mock
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
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);
			(workflowRunner.run as Mock).mockResolvedValue('exec-1');
			(activeExecutions.getPostExecutePromise as Mock).mockResolvedValue({
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
				executionRedactionServiceProxy,
				'wf-1',
				{},
			);

			const runCall = (workflowRunner.run as Mock).mock
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
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);

			await expect(
				testWorkflow(
					user,
					workflowFinderService,
					activeExecutions,
					workflowRunner,
					nodeTypes,
					mcpService,
					executionRedactionServiceProxy,
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
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);
			return workflow;
		};

		test('returns success status for successful execution', async () => {
			setupSuccessfulExecution();
			(workflowRunner.run as Mock).mockResolvedValue('exec-success');
			(activeExecutions.getPostExecutePromise as Mock).mockResolvedValue({
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
				executionRedactionServiceProxy,
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
			(workflowRunner.run as Mock).mockResolvedValue('exec-error');
			(activeExecutions.getPostExecutePromise as Mock).mockResolvedValue({
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
				executionRedactionServiceProxy,
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
			(workflowRunner.run as Mock).mockResolvedValue('exec-data-error');
			(activeExecutions.getPostExecutePromise as Mock).mockResolvedValue({
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
				executionRedactionServiceProxy,
				'wf-1',
				{ Trigger: [{ json: {} }] },
			);

			expect(result.status).toBe('error');
			expect(result.error).toBe('Node execution failed');
		});

		test('returns generic error message when resultData.error.message is missing', async () => {
			setupSuccessfulExecution();
			(workflowRunner.run as Mock).mockResolvedValue('exec-no-msg');
			(activeExecutions.getPostExecutePromise as Mock).mockResolvedValue({
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
				executionRedactionServiceProxy,
				'wf-1',
				{ Trigger: [{ json: {} }] },
			);

			expect(result.status).toBe('error');
			expect(result.error).toBe('Execution completed with errors');
		});

		test('handles workflow returning undefined data', async () => {
			setupSuccessfulExecution();
			(workflowRunner.run as Mock).mockResolvedValue('exec-no-data');
			(activeExecutions.getPostExecutePromise as Mock).mockResolvedValue(undefined);

			await expect(
				testWorkflow(
					user,
					workflowFinderService,
					activeExecutions,
					workflowRunner,
					nodeTypes,
					mcpService,
					executionRedactionServiceProxy,
					'wf-1',
					{ Trigger: [{ json: {} }] },
				),
			).rejects.toThrow(UnexpectedError);
		});
	});

	describe('execution redaction', () => {
		const setupWorkflow = () => {
			const workflow = createWorkflow({
				settings: { availableInMCP: true, redactionPolicy: 'all' },
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
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);
			return workflow;
		};

		const redactAllErrors = () => {
			(executionRedactionServiceProxy.processExecution as Mock).mockImplementation(
				async (execution: RedactableExecution) => {
					const { resultData } = execution.data;
					for (const tasks of Object.values(resultData.runData)) {
						for (const task of tasks) {
							if (task.data) task.data = { main: [[{ json: {} }]] };
						}
					}
					if (resultData.error) {
						resultData.redactedError = { type: resultData.error.name, httpCode: '401' };
						delete resultData.error;
					}
					return execution;
				},
			);
		};

		const runTestWorkflow = async () =>
			await testWorkflow(
				user,
				workflowFinderService,
				activeExecutions,
				workflowRunner,
				nodeTypes,
				mcpService,
				executionRedactionServiceProxy,
				'wf-1',
				{ Trigger: [{ json: {} }] },
			);

		test('returns the redacted error when redaction hides the execution data', async () => {
			const workflow = setupWorkflow();
			redactAllErrors();
			const executionError = new NodeOperationError(workflow.nodes[0], 'token sk-secret-123');
			(workflowRunner.run as Mock).mockResolvedValue('exec-redacted');
			(activeExecutions.getPostExecutePromise as Mock).mockResolvedValue({
				mode: 'manual',
				status: 'error',
				data: {
					resultData: { runData: {}, error: executionError },
					executionData: { runtimeData: { redaction: { version: 2, production: true } } },
				},
			});

			const result = await runTestWorkflow();

			expect(result).toEqual({
				executionId: 'exec-redacted',
				status: 'error',
				error: 'Error details hidden by execution data redaction (NodeOperationError, HTTP 401)',
			});
			expect(executionRedactionServiceProxy.processExecution).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'exec-redacted',
					mode: 'manual',
					workflowId: 'wf-1',
					workflowData: expect.objectContaining({
						settings: expect.objectContaining({ redactionPolicy: 'all' }),
					}),
					data: expect.objectContaining({
						executionData: expect.objectContaining({
							runtimeData: { redaction: { version: 2, production: true } },
						}),
					}),
				}),
				{ user },
			);
		});

		test('returns the original error when redaction does not hide the execution data', async () => {
			setupWorkflow();
			(workflowRunner.run as Mock).mockResolvedValue('exec-visible');
			(activeExecutions.getPostExecutePromise as Mock).mockResolvedValue({
				mode: 'manual',
				status: 'error',
				data: { resultData: { runData: {}, error: { message: 'Visible failure' } } },
			});

			const result = await runTestWorkflow();

			expect(result.error).toBe('Visible failure');
			expect(executionRedactionServiceProxy.processExecution).toHaveBeenCalledTimes(1);
		});

		test('does not change the run result during redaction', async () => {
			setupWorkflow();
			redactAllErrors();
			const runResult = {
				mode: 'manual',
				status: 'error',
				data: {
					resultData: {
						runData: {
							Trigger: [{ data: { main: [[{ json: { apiKey: 'secret' } }]] } }],
						},
						error: { name: 'NodeApiError', message: 'Request failed with secret' },
					},
				},
			};
			(workflowRunner.run as Mock).mockResolvedValue('exec-unchanged');
			(activeExecutions.getPostExecutePromise as Mock).mockResolvedValue(runResult);

			await runTestWorkflow();

			expect(runResult.data.resultData.error.message).toBe('Request failed with secret');
			expect(runResult.data.resultData.runData.Trigger[0].data).toEqual({
				main: [[{ json: { apiKey: 'secret' } }]],
			});
		});

		test('skips redaction for a successful execution', async () => {
			setupWorkflow();
			(workflowRunner.run as Mock).mockResolvedValue('exec-ok');
			(activeExecutions.getPostExecutePromise as Mock).mockResolvedValue({
				mode: 'manual',
				status: 'success',
				data: { resultData: { runData: {} } },
			});

			const result = await runTestWorkflow();

			expect(result.status).toBe('success');
			expect(executionRedactionServiceProxy.processExecution).not.toHaveBeenCalled();
		});

		test('keeps the execution ID and hides the error when the redaction check fails', async () => {
			setupWorkflow();
			(executionRedactionServiceProxy.processExecution as Mock).mockRejectedValue(
				new Error('scope lookup failed'),
			);
			(workflowRunner.run as Mock).mockResolvedValue('exec-lookup-failed');
			(activeExecutions.getPostExecutePromise as Mock).mockResolvedValue({
				mode: 'manual',
				status: 'error',
				data: {
					resultData: { runData: {}, error: { message: 'token sk-secret-123' } },
				},
			});

			const tool = createTestWorkflowTool(
				user,
				workflowFinderService,
				activeExecutions,
				workflowRunner,
				nodeTypes,
				telemetry,
				mcpService,
				executionRedactionServiceProxy,
			);

			const result = await tool.handler(
				{
					workflowId: 'wf-1',
					pinData: { Trigger: [{ json: {} }] },
					triggerNodeName: undefined,
					timeout: undefined,
				},
				{} as any,
			);

			expect(result.structuredContent).toEqual({
				executionId: 'exec-lookup-failed',
				status: 'error',
				error: 'Error details hidden because the execution data redaction check failed',
			});
			expect(JSON.stringify(result)).not.toContain('sk-secret-123');
			expect(JSON.stringify(vi.mocked(telemetry.track).mock.calls)).not.toContain('sk-secret-123');
		});

		test('redacts an error that stops the execution from starting', async () => {
			setupWorkflow();
			redactAllErrors();
			(workflowRunner.run as Mock).mockRejectedValue(new Error('start failed with sk-secret-123'));

			const tool = createTestWorkflowTool(
				user,
				workflowFinderService,
				activeExecutions,
				workflowRunner,
				nodeTypes,
				telemetry,
				mcpService,
				executionRedactionServiceProxy,
			);

			const result = await tool.handler(
				{
					workflowId: 'wf-1',
					pinData: { Trigger: [{ json: {} }] },
					triggerNodeName: undefined,
					timeout: undefined,
				},
				{} as any,
			);

			expect(result.structuredContent).toEqual({
				executionId: null,
				status: 'error',
				error: 'Error details hidden by execution data redaction (Error, HTTP 401)',
			});
			expect(JSON.stringify(vi.mocked(telemetry.track).mock.calls)).not.toContain('sk-secret-123');
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
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);
			(workflowRunner.run as Mock).mockResolvedValue('exec-1');
			(activeExecutions.getPostExecutePromise as Mock).mockResolvedValue({
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
				executionRedactionServiceProxy,
				'wf-1',
				{ MyTrigger: [{ json: { key: 'val' } }] },
			);

			const runCall = (workflowRunner.run as Mock).mock
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
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);
			(workflowRunner.run as Mock).mockResolvedValue('exec-1');
			(activeExecutions.getPostExecutePromise as Mock).mockResolvedValue({
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
				executionRedactionServiceProxy,
				'wf-1',
				{},
			);

			const runCall = (workflowRunner.run as Mock).mock
				.calls[0][0] as IWorkflowExecutionDataProcess;
			expect(runCall.isMcpExecution).toBe(false);
		});

		test('sets isMcpExecution to true in queue mode', async () => {
			const queueMcpService = mockInstance(McpService, {
				isQueueMode: true,
				createPendingResponse: vi.fn().mockReturnValue({
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
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);
			(workflowRunner.run as Mock).mockResolvedValue('exec-queue');

			await testWorkflow(
				user,
				workflowFinderService,
				activeExecutions,
				workflowRunner,
				nodeTypes,
				queueMcpService,
				executionRedactionServiceProxy,
				'wf-1',
				{},
			);

			const runCall = (workflowRunner.run as Mock).mock
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
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);
			(workflowRunner.run as Mock).mockResolvedValue('exec-timeout');
			(activeExecutions.getPostExecutePromise as Mock).mockRejectedValue(
				new McpExecutionTimeoutError('exec-timeout', 300_000),
			);
			(activeExecutions.stopExecution as Mock).mockImplementation(() => {});

			const tool = createTestWorkflowTool(
				user,
				workflowFinderService,
				activeExecutions,
				workflowRunner,
				nodeTypes,
				telemetry,
				mcpService,
				executionRedactionServiceProxy,
			);

			const result = await tool.handler(
				{
					workflowId: 'wf-1',
					pinData: { Trigger: [{ json: {} }] },
					triggerNodeName: undefined,
					timeout: undefined,
				},
				{} as any,
			);

			expect(result.structuredContent).toMatchObject({
				executionId: 'exec-timeout',
				status: 'error',
				error: expect.stringContaining('timed out'),
			});
		});

		test('records whether a custom timeout was provided in telemetry', async () => {
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
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);
			(workflowRunner.run as Mock).mockResolvedValue('exec-timeout-telemetry');
			(activeExecutions.getPostExecutePromise as Mock).mockResolvedValue({
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
				executionRedactionServiceProxy,
			);

			await tool.handler(
				{
					workflowId: 'wf-1',
					pinData: { Trigger: [{ json: {} }] },
					triggerNodeName: undefined,
					timeout: 42,
				},
				{} as any,
			);

			expect(telemetry.track).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					parameters: expect.objectContaining({ hasCustomTimeout: true }),
				}),
			);
		});

		test('WorkflowAccessError returns error with null executionId', async () => {
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(null);

			const tool = createTestWorkflowTool(
				user,
				workflowFinderService,
				activeExecutions,
				workflowRunner,
				nodeTypes,
				telemetry,
				mcpService,
				executionRedactionServiceProxy,
			);

			const result = await tool.handler(
				{
					workflowId: 'missing-wf',
					pinData: {},
					triggerNodeName: undefined,
					timeout: undefined,
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

	describe('timeout parameter', () => {
		const singleTriggerWorkflow = () =>
			createWorkflow({
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

		beforeEach(() => {
			vi.useFakeTimers();
			(activeExecutions.stopExecution as Mock).mockImplementation(() => {});
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		test('times out at the provided custom timeout rather than the default', async () => {
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(
				singleTriggerWorkflow(),
			);
			(workflowRunner.run as Mock).mockResolvedValue('exec-custom-timeout');
			// Never resolves — only the timeout can settle the race.
			(activeExecutions.getPostExecutePromise as Mock).mockReturnValue(new Promise(() => {}));

			const promise = testWorkflow(
				user,
				workflowFinderService,
				activeExecutions,
				workflowRunner,
				nodeTypes,
				mcpService,
				executionRedactionServiceProxy,
				'wf-1',
				{ Trigger: [{ json: {} }] },
				undefined,
				10,
			);
			const assertion = expect(promise).rejects.toMatchObject({
				name: 'McpExecutionTimeoutError',
				timeoutMs: 10_000,
			});

			// Flush the microtasks up to the timeout, then trip it.
			await vi.advanceTimersByTimeAsync(10_000);
			await assertion;
			expect(activeExecutions.stopExecution).toHaveBeenCalledWith(
				'exec-custom-timeout',
				expect.anything(),
			);
		});

		test('does not time out before the custom timeout elapses', async () => {
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(
				singleTriggerWorkflow(),
			);
			(workflowRunner.run as Mock).mockResolvedValue('exec-slow');
			let resolveExecution: (value: unknown) => void = () => {};
			(activeExecutions.getPostExecutePromise as Mock).mockReturnValue(
				new Promise((resolve) => {
					resolveExecution = resolve;
				}),
			);

			const promise = testWorkflow(
				user,
				workflowFinderService,
				activeExecutions,
				workflowRunner,
				nodeTypes,
				mcpService,
				executionRedactionServiceProxy,
				'wf-1',
				{ Trigger: [{ json: {} }] },
				undefined,
				600,
			);

			// Advance well past the 300s default — a custom 600s timeout must keep waiting.
			await vi.advanceTimersByTimeAsync(300_000);
			resolveExecution({ status: 'success', data: { resultData: { runData: {} } } });

			await expect(promise).resolves.toMatchObject({
				executionId: 'exec-slow',
				status: 'success',
			});
			expect(activeExecutions.stopExecution).not.toHaveBeenCalled();
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
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);
			(workflowRunner.run as Mock).mockResolvedValue('exec-tel');
			(activeExecutions.getPostExecutePromise as Mock).mockResolvedValue({
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
				executionRedactionServiceProxy,
			);

			await tool.handler(
				{
					workflowId: 'wf-1',
					pinData: { Trigger: [{ json: {} }], OtherNode: [{ json: { x: 1 } }] },
					triggerNodeName: 'Trigger',
					timeout: undefined,
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
						hasCustomTimeout: false,
					},
					results: {
						success: true,
						data: { executionId: 'exec-tel', status: 'success' },
					},
				}),
			);
		});

		test('tracks failed execution with error details', async () => {
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(null);

			const tool = createTestWorkflowTool(
				user,
				workflowFinderService,
				activeExecutions,
				workflowRunner,
				nodeTypes,
				telemetry,
				mcpService,
				executionRedactionServiceProxy,
			);

			await tool.handler(
				{ workflowId: 'missing', pinData: {}, triggerNodeName: undefined, timeout: undefined },
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
