import type { Logger } from '@n8n/backend-common';
import { mockInstance, mockLogger } from '@n8n/backend-test-utils';
import { type IExecutionResponse, User } from '@n8n/db';
import {
	MANUAL_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
	type INode,
	type IWorkflowExecutionDataProcess,
} from 'n8n-workflow';
import { UnexpectedError, UserError } from '@n8n/errors';
import type { Mock } from 'vitest';
import z from 'zod';

vi.mock(
	'@n8n/workflow-sdk',
	async () => await vi.importActual<typeof import('@n8n/workflow-sdk')>('@n8n/workflow-sdk'),
);
vi.mock('@/executions/execution-viewer-reader', () => ({ loadExecutionForViewer: vi.fn() }));

import { ActiveExecutions } from '@/active-executions';
import { ExecutionNotFoundError } from '@/errors/execution-not-found-error';
import { CredentialsPermissionChecker } from '@/executions/pre-execution-checks/credentials-permission-checker';
import { loadExecutionForViewer } from '@/executions/execution-viewer-reader';
import { McpService } from '@/modules/mcp/mcp.service';
import { NodeTypesProxy } from '@n8n/backend-services';
import { Telemetry } from '@/telemetry';
import { WorkflowRunner } from '@/workflow-runner';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { McpExecutionTimeoutError, WorkflowAccessError } from '../mcp.errors';
import { createWorkflow } from './mock.utils';
import { REDACTION_CHECK_FAILED_MESSAGE } from '../tools/execution-utils';
import { createTestWorkflowTool, testWorkflow } from '../tools/test-workflow.tool';

function mockViewedExecution(resultData: Record<string, unknown>) {
	vi.mocked(loadExecutionForViewer).mockResolvedValue({
		data: { resultData: { runData: {}, ...resultData } },
	} as unknown as IExecutionResponse);
}

function items(count: number) {
	return Array.from({ length: count }, () => ({ json: {} }));
}

// Helper to create a mock NodeTypesProxy that recognizes trigger vs non-trigger nodes
const TRIGGER_NODE_TYPES = new Set([
	WEBHOOK_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	'n8n-nodes-base.scheduleTrigger',
]);

function createMockNodeTypes() {
	const instance = mockInstance(NodeTypesProxy);
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
	let logger: Logger;

	beforeEach(() => {
		vi.mocked(loadExecutionForViewer).mockReset().mockResolvedValue(undefined);
		workflowFinderService = mockInstance(WorkflowFinderService);
		activeExecutions = mockInstance(ActiveExecutions);
		workflowRunner = mockInstance(WorkflowRunner);
		nodeTypes = createMockNodeTypes();
		telemetry = mockInstance(Telemetry, { track: vi.fn() });
		mcpService = mockInstance(McpService, { isQueueMode: false });
		// The user can use every credential unless a test says otherwise.
		mockInstance(CredentialsPermissionChecker);
		logger = mockLogger();
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
				logger,
				true,
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
					logger,
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
					logger,
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
					logger,
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
					logger,
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
				logger,
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
				logger,
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
				logger,
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
				logger,
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
				logger,
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
					logger,
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
				logger,
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
			mockViewedExecution({ error: { message: 'Something went wrong' } });
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
				logger,
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
			mockViewedExecution({ error: { message: 'Node execution failed' } });
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
				logger,
				'wf-1',
				{ Trigger: [{ json: {} }] },
			);

			expect(result.status).toBe('error');
			expect(result.error).toBe('Node execution failed');
		});

		test('returns generic error message when resultData.error.message is missing', async () => {
			setupSuccessfulExecution();
			mockViewedExecution({ error: {} });
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
				logger,
				'wf-1',
				{ Trigger: [{ json: {} }] },
			);

			expect(result.status).toBe('error');
			expect(result.error).toBe('Execution completed with errors');
		});

		const runFailedExecution = async () => {
			setupSuccessfulExecution();
			(workflowRunner.run as Mock).mockResolvedValue('exec-failed');
			(activeExecutions.getPostExecutePromise as Mock).mockResolvedValue({
				status: 'error',
				data: { resultData: { error: { message: 'token sk-secret-123' } } },
			});
			return await testWorkflow(
				user,
				workflowFinderService,
				activeExecutions,
				workflowRunner,
				nodeTypes,
				mcpService,
				logger,
				'wf-1',
				{ Trigger: [{ json: {} }] },
			);
		};

		test('returns the error as the user may see it', async () => {
			mockViewedExecution({ redactedError: { type: 'NodeApiError', httpCode: '401' } });

			const result = await runFailedExecution();

			expect(loadExecutionForViewer).toHaveBeenCalledWith('exec-failed', user);
			expect(result).toEqual({
				executionId: 'exec-failed',
				status: 'error',
				error: 'NodeApiError error (401) (details hidden by n8n)',
			});
		});

		test('hides the error when the execution cannot be loaded for the user', async () => {
			vi.mocked(loadExecutionForViewer).mockResolvedValue(undefined);

			const result = await runFailedExecution();

			expect(result).toEqual({
				executionId: 'exec-failed',
				status: 'error',
				error: REDACTION_CHECK_FAILED_MESSAGE,
			});
		});

		test('hides and logs the error when the redaction check fails', async () => {
			const lookupError = new Error('scope lookup failed');
			vi.mocked(loadExecutionForViewer).mockRejectedValue(lookupError);

			const result = await runFailedExecution();

			expect(logger.error).toHaveBeenCalledWith(
				'MCP test_workflow could not apply execution data redaction',
				{ executionId: 'exec-failed', error: lookupError },
			);

			expect(result).toEqual({
				executionId: 'exec-failed',
				status: 'error',
				error: REDACTION_CHECK_FAILED_MESSAGE,
			});
		});

		test('does not load the execution when the run succeeds', async () => {
			setupSuccessfulExecution();
			(workflowRunner.run as Mock).mockResolvedValue('exec-success');
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
				logger,
				'wf-1',
				{ Trigger: [{ json: {} }] },
			);

			expect(loadExecutionForViewer).not.toHaveBeenCalled();
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
					logger,
					'wf-1',
					{ Trigger: [{ json: {} }] },
				),
			).rejects.toThrow(UnexpectedError);
		});
	});

	describe('node results', () => {
		beforeEach(() => {
			(workflowFinderService.findWorkflowHeadForUser as Mock).mockResolvedValue({});
		});

		const runTestWorkflow = async (status: 'success' | 'error', executionReadGranted = true) => {
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
				status,
				data: { resultData: status === 'error' ? { error: { message: 'raw' } } : {} },
			});
			return await testWorkflow(
				user,
				workflowFinderService,
				activeExecutions,
				workflowRunner,
				nodeTypes,
				mcpService,
				logger,
				'wf-1',
				{ Trigger: [{ json: {} }] },
				undefined,
				undefined,
				executionReadGranted,
			);
		};

		test('lists the nodes that ran in execution order with item counts for each output', async () => {
			mockViewedExecution({
				runData: {
					Set: [{ executionIndex: 2, executionStatus: 'success', data: { main: [items(2)] } }],
					Trigger: [{ executionIndex: 0, executionStatus: 'success', data: { main: [items(1)] } }],
					If: [{ executionIndex: 1, executionStatus: 'success', data: { main: [items(2), []] } }],
				},
			});

			const result = await runTestWorkflow('success');

			expect(result).toEqual({
				executionId: 'exec-1',
				status: 'success',
				nodeResults: [
					{ nodeName: 'Trigger', status: 'success', itemCounts: [1] },
					{ nodeName: 'If', status: 'success', itemCounts: [2, 0] },
					{ nodeName: 'Set', status: 'success', itemCounts: [2] },
				],
			});
		});

		test('names the failed node and gives its error message as the user may see it', async () => {
			mockViewedExecution({
				redactedError: { type: 'NodeApiError', httpCode: '401' },
				runData: {
					Trigger: [{ executionIndex: 0, executionStatus: 'success', data: { main: [items(1)] } }],
					Code: [
						{ executionIndex: 1, executionStatus: 'error', error: { message: 'x is not defined' } },
					],
					HTTP: [
						{
							executionIndex: 2,
							executionStatus: 'error',
							redactedError: { type: 'NodeApiError', httpCode: '401' },
						},
					],
				},
			});

			const result = await runTestWorkflow('error');

			expect(result).toEqual({
				executionId: 'exec-1',
				status: 'error',
				error: 'NodeApiError error (401) (details hidden by n8n)',
				nodeResults: [
					{ nodeName: 'Trigger', status: 'success', itemCounts: [1] },
					{ nodeName: 'Code', status: 'error', itemCounts: [], error: 'x is not defined' },
					{
						nodeName: 'HTTP',
						status: 'error',
						itemCounts: [],
						error: 'NodeApiError error (401) (details hidden by n8n)',
					},
				],
			});
		});

		test('limits the number of nodes and the length of error messages', async () => {
			const longMessage = 'e'.repeat(1000);
			const runData: Record<string, unknown[]> = Object.fromEntries(
				Array.from({ length: 60 }, (_, index) => [
					`Node ${index}`,
					[{ executionIndex: index, executionStatus: 'success', data: { main: [items(1)] } }],
				]),
			);
			runData['Node 59'] = [
				{ executionIndex: 59, executionStatus: 'error', error: { message: longMessage } },
			];
			mockViewedExecution({ error: { message: longMessage }, runData });

			const result = await runTestWorkflow('error');

			expect(result.truncated).toBe(true);
			expect(result.nodeResults).toHaveLength(50);
			expect(result.nodeResults?.[0].nodeName).toBe('Node 10');
			expect(result.nodeResults?.[49]).toEqual({
				nodeName: 'Node 59',
				status: 'error',
				itemCounts: [],
				error: `${'e'.repeat(500)}...`,
			});
			expect(result.error).toBe(`${'e'.repeat(500)}...`);
		});

		test('adds the item counts of all runs of a node and takes the status of the last run', async () => {
			mockViewedExecution({
				runData: {
					Trigger: [{ executionIndex: 0, executionStatus: 'success', data: { main: [items(1)] } }],
					Loop: [
						{ executionIndex: 1, executionStatus: 'success', data: { main: [items(2), null] } },
						{
							executionIndex: 2,
							executionStatus: 'error',
							data: { main: [items(1), items(3)] },
							error: { message: 'second run failed' },
						},
					],
				},
			});

			const result = await runTestWorkflow('success');

			expect(result.nodeResults).toEqual([
				{ nodeName: 'Trigger', status: 'success', itemCounts: [1] },
				{ nodeName: 'Loop', status: 'error', itemCounts: [3, 3], error: 'second run failed' },
			]);
		});

		test('omits node results when the token does not grant execution read', async () => {
			mockViewedExecution({ error: { message: 'failed' } });

			const result = await runTestWorkflow('error', false);

			expect(result).toEqual({ executionId: 'exec-1', status: 'error', error: 'failed' });
			expect(workflowFinderService.findWorkflowHeadForUser).not.toHaveBeenCalled();
		});

		test('omits node results when the user cannot read executions of the workflow', async () => {
			mockViewedExecution({ error: { message: 'failed' } });
			(workflowFinderService.findWorkflowHeadForUser as Mock).mockResolvedValue(null);

			const result = await runTestWorkflow('error');

			expect(result).toEqual({ executionId: 'exec-1', status: 'error', error: 'failed' });
		});

		test('checks execution read access before it starts the run', async () => {
			const lookupError = new Error('database unavailable');
			(workflowFinderService.findWorkflowHeadForUser as Mock).mockRejectedValue(lookupError);

			await expect(runTestWorkflow('success')).rejects.toThrow(lookupError);
			expect(workflowRunner.run).not.toHaveBeenCalled();
		});

		test('omits node results when the execution cannot be loaded for the user', async () => {
			vi.mocked(loadExecutionForViewer).mockResolvedValue(undefined);

			const result = await runTestWorkflow('success');

			expect(result).toEqual({ executionId: 'exec-1', status: 'success' });
		});
	});

	describe('output schema', () => {
		const triggerNode = {
			id: 'node-1',
			name: 'Trigger',
			type: MANUAL_TRIGGER_NODE_TYPE,
			typeVersion: 1,
			position: [0, 0],
			disabled: false,
			parameters: {},
		} as INode;

		const callHandler = async () => {
			const tool = createTestWorkflowTool(
				user,
				workflowFinderService,
				activeExecutions,
				workflowRunner,
				nodeTypes,
				telemetry,
				mcpService,
				logger,
				true,
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
			expect(result.content).toEqual([
				{ type: 'text', text: JSON.stringify(result.structuredContent) },
			]);
			return z.object(tool.config.outputSchema!).strict().parse(result.structuredContent);
		};

		beforeEach(() => {
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(
				createWorkflow({ settings: { availableInMCP: true }, nodes: [triggerNode] }),
			);
			(workflowFinderService.findWorkflowHeadForUser as Mock).mockResolvedValue({});
			(workflowRunner.run as Mock).mockResolvedValue('exec-1');
			(activeExecutions.has as Mock).mockReturnValue(true);
		});

		test('success result matches the output schema', async () => {
			mockViewedExecution({
				runData: {
					Trigger: [{ executionIndex: 0, executionStatus: 'success', data: { main: [items(1)] } }],
				},
			});
			(activeExecutions.getPostExecutePromise as Mock).mockResolvedValue({
				status: 'success',
				data: { resultData: {} },
			});

			await expect(callHandler()).resolves.toMatchObject({ status: 'success' });
		});

		test('failed run result matches the output schema', async () => {
			mockViewedExecution({
				error: { message: 'failed' },
				runData: {
					Trigger: [{ executionIndex: 0, executionStatus: 'error', error: { message: 'failed' } }],
				},
			});
			(activeExecutions.getPostExecutePromise as Mock).mockResolvedValue({
				status: 'error',
				data: { resultData: { error: { message: 'failed' } } },
			});

			await expect(callHandler()).resolves.toMatchObject({ status: 'error', error: 'failed' });
		});

		test('timeout result matches the output schema', async () => {
			(activeExecutions.getPostExecutePromise as Mock).mockRejectedValue(
				new McpExecutionTimeoutError('exec-1', 300_000),
			);
			(activeExecutions.stopExecution as Mock).mockImplementation(() => {});

			await expect(callHandler()).resolves.toMatchObject({ executionId: 'exec-1' });
		});

		test('credential refusal result matches the output schema', async () => {
			const httpNode = {
				...triggerNode,
				id: 'node-2',
				name: 'HTTP',
				type: 'n8n-nodes-base.httpRequest',
				credentials: { httpHeaderAuth: { id: 'cred-1', name: 'Owner API Key' } },
			} as INode;
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(
				createWorkflow({ settings: { availableInMCP: true }, nodes: [triggerNode, httpNode] }),
			);
			mockInstance(CredentialsPermissionChecker).check.mockRejectedValue(
				Object.assign(new UserError('Credential refused'), { node: httpNode }),
			);
			(activeExecutions.has as Mock).mockReturnValue(false);

			await expect(callHandler()).resolves.toMatchObject({ error: 'Credential refused' });
		});

		test('thrown error result matches the output schema', async () => {
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(null);

			await expect(callHandler()).resolves.toMatchObject({ executionId: null });
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
				logger,
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
				logger,
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
				logger,
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
				logger,
				true,
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
				logger,
				true,
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
				logger,
				true,
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

		// CONTEXT-416
		test('returns executionId and refusal reason when the runner refuses the run', async () => {
			const refusalMessage =
				'Node "HTTP" uses the credential "Owner API Key", which you cannot use';
			const refusalDescription = 'Ask its owner to share this credential with you.';
			const httpNode = {
				id: 'node-2',
				name: 'HTTP',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4,
				position: [200, 0],
				disabled: false,
				parameters: {},
				credentials: { httpHeaderAuth: { id: 'cred-1', name: 'Owner API Key' } },
			} as INode;
			const workflow = createWorkflow({
				settings: { availableInMCP: true },
				nodes: [
					{
						id: 'node-1',
						name: 'Trigger',
						type: MANUAL_TRIGGER_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						disabled: false,
						parameters: {},
					} as INode,
					httpNode,
				],
			});
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);

			// The user cannot use the credential, so the permission check refuses the run.
			const credentialsPermissionChecker = mockInstance(CredentialsPermissionChecker);
			credentialsPermissionChecker.check.mockRejectedValue(
				Object.assign(new UserError(refusalMessage, { description: refusalDescription }), {
					node: httpNode,
				}),
			);

			// `WorkflowRunner.run` saves the refused run as a failed execution and
			// finalizes it before it returns the ID. So the execution is no longer
			// active, and `getPostExecutePromise` throws for it.
			(workflowRunner.run as Mock).mockResolvedValue('exec-refused');
			(activeExecutions.has as Mock).mockReturnValue(false);
			(activeExecutions.getPostExecutePromise as Mock).mockRejectedValue(
				new ExecutionNotFoundError('exec-refused'),
			);

			const tool = createTestWorkflowTool(
				user,
				workflowFinderService,
				activeExecutions,
				workflowRunner,
				nodeTypes,
				telemetry,
				mcpService,
				logger,
				true,
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
				executionId: 'exec-refused',
				status: 'error',
				error: expect.stringContaining(refusalMessage),
			});
			expect(result.structuredContent).toMatchObject({
				error: expect.stringContaining(refusalDescription),
			});
			expect(result.structuredContent).not.toMatchObject({
				error: expect.stringContaining('No active execution found'),
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
				logger,
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
				logger,
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
				logger,
				true,
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
				logger,
				true,
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
