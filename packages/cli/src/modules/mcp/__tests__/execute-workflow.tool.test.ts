import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';
import {
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
	type INode,
	type IWorkflowExecutionDataProcess,
	UnexpectedError,
} from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { createWorkflow } from './mock.utils';
import { WorkflowAccessError } from '../mcp.errors';
import { createExecuteWorkflowTool, executeWorkflow } from '../tools/execute-workflow.tool';

import { ActiveExecutions } from '@/active-executions';
import { McpService } from '@/modules/mcp/mcp.service';
import { Telemetry } from '@/telemetry';
import { WorkflowRunner } from '@/workflow-runner';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

describe('execute-workflow MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	let workflowFinderService: WorkflowFinderService;
	let activeExecutions: ActiveExecutions;
	let workflowRunner: WorkflowRunner;
	let telemetry: Telemetry;
	let mcpService: McpService;

	beforeEach(() => {
		workflowFinderService = mockInstance(WorkflowFinderService);
		activeExecutions = mockInstance(ActiveExecutions);
		workflowRunner = mockInstance(WorkflowRunner);
		telemetry = mockInstance(Telemetry, {
			track: jest.fn(),
		});
		mcpService = mockInstance(McpService, {
			isQueueMode: false,
		});
	});

	describe('smoke tests', () => {
		test('it creates tool correctly', () => {
			const tool = createExecuteWorkflowTool(
				user,
				workflowFinderService,
				activeExecutions,
				workflowRunner,
				telemetry,
				mcpService,
			);

			expect(tool.name).toBe('execute_workflow');
			expect(tool.config).toBeDefined();
			expect(typeof tool.config.description).toBe('string');
			expect(tool.config.description).toBe(
				'Execute a workflow by ID. Returns execution ID and status. To get the full execution results, use the get_execution tool with the returned execution ID. Before executing always ensure you know the input schema by first using the get_workflow_details tool and consulting workflow description',
			);
			expect(tool.config.inputSchema).toBeDefined();
			expect(tool.config.outputSchema).toBeDefined();
			expect(typeof tool.handler).toBe('function');
		});
	});

	describe('handler tests', () => {
		describe('workflow validation', () => {
			test('propagates errors from getMcpWorkflow', async () => {
				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(null);

				await expect(
					executeWorkflow(
						user,
						workflowFinderService,
						activeExecutions,
						workflowRunner,
						mcpService,
						'any-workflow',
						undefined,
					),
				).rejects.toThrow(WorkflowAccessError);
			});

			test('throws when production mode is requested for unpublished workflow', async () => {
				const workflow = createWorkflow({
					activeVersionId: null,
					settings: { availableInMCP: true },
				});
				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);

				await expect(
					executeWorkflow(
						user,
						workflowFinderService,
						activeExecutions,
						workflowRunner,
						mcpService,
						'unpublished-workflow',
						undefined,
						'production',
					),
				).rejects.toMatchObject({
					reason: 'workflow_not_active',
				});
			});

			test('allows manual mode for unpublished workflow', async () => {
				const workflow = createWorkflow({
					activeVersionId: null,
					settings: { availableInMCP: true },
				});
				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);
				(workflowRunner.run as jest.Mock).mockResolvedValue('execution-id');
				(activeExecutions.getPostExecutePromise as jest.Mock).mockResolvedValue({
					status: 'success',
					data: { resultData: { runData: {} } },
				});

				const result = await executeWorkflow(
					user,
					workflowFinderService,
					activeExecutions,
					workflowRunner,
					mcpService,
					'unpublished-workflow',
					undefined,
					'manual',
				);

				expect(result.status).toBe('success');
				expect(result.executionId).toBe('execution-id');
			});

			test('allows manual mode for workflows with only manual trigger', async () => {
				const workflow = createWorkflow({
					activeVersionId: null,
					settings: { availableInMCP: true },
					nodes: [
						{
							id: 'node-1',
							name: 'Manual',
							type: MANUAL_TRIGGER_NODE_TYPE,
							typeVersion: 1,
							position: [0, 0],
							disabled: false,
							parameters: {},
						} as INode,
					],
				});
				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);
				(workflowRunner.run as jest.Mock).mockResolvedValue('execution-id');
				(activeExecutions.getPostExecutePromise as jest.Mock).mockResolvedValue({
					status: 'success',
					data: { resultData: { runData: {} } },
				});

				const result = await executeWorkflow(
					user,
					workflowFinderService,
					activeExecutions,
					workflowRunner,
					mcpService,
					'manual-trigger-workflow',
					undefined,
					'manual',
				);

				expect(result.status).toBe('success');
				expect(result.executionId).toBe('execution-id');
				expect(workflowRunner.run).toHaveBeenCalledWith(
					expect.objectContaining({
						executionMode: 'manual',
						startNodes: [{ name: 'Manual', sourceData: null }],
					}),
				);
			});

			test('includes workflow pinData for manual executions', async () => {
				const workflowPinData = {
					SomeNode: [{ json: { pinned: 'data' } }],
					AnotherNode: [{ json: { more: 'pinned' } }],
				};
				const workflow = createWorkflow({
					activeVersionId: null,
					settings: { availableInMCP: true },
					pinData: workflowPinData,
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
				(workflowRunner.run as jest.Mock).mockResolvedValue('execution-id');
				(activeExecutions.getPostExecutePromise as jest.Mock).mockResolvedValue({
					status: 'success',
					data: { resultData: { runData: {} } },
				});

				await executeWorkflow(
					user,
					workflowFinderService,
					activeExecutions,
					workflowRunner,
					mcpService,
					'manual-workflow-with-pindata',
					{ type: 'webhook', webhookData: { method: 'POST', body: { test: 'input' } } },
					'manual',
				);

				const runCall = (workflowRunner.run as jest.Mock).mock
					.calls[0][0] as IWorkflowExecutionDataProcess;

				expect(runCall.pinData).toMatchObject({
					WebhookNode: [{ json: { headers: {}, query: {}, body: { test: 'input' } } }], // Trigger pin data
					SomeNode: [{ json: { pinned: 'data' } }], // Workflow pin data
					AnotherNode: [{ json: { more: 'pinned' } }], // Workflow pin data
				});
			});

			test('does not include workflow pinData for production executions', async () => {
				const workflowPinData = {
					SomeNode: [{ json: { pinned: 'data' } }],
				};
				const workflow = createWorkflow({
					activeVersionId: uuid(),
					settings: { availableInMCP: true },
					pinData: workflowPinData,
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
				(workflowRunner.run as jest.Mock).mockResolvedValue('execution-id');
				(activeExecutions.getPostExecutePromise as jest.Mock).mockResolvedValue({
					status: 'success',
					data: { resultData: { runData: {} } },
				});

				await executeWorkflow(
					user,
					workflowFinderService,
					activeExecutions,
					workflowRunner,
					mcpService,
					'production-workflow-with-pindata',
					undefined,
					'production',
				);

				const runCall = (workflowRunner.run as jest.Mock).mock
					.calls[0][0] as IWorkflowExecutionDataProcess;

				expect(runCall.pinData).toMatchObject({
					WebhookNode: [{ json: { headers: {}, query: {}, body: {} } }],
				});
				expect(runCall.pinData).not.toHaveProperty('SomeNode');
			});

			test('throws error when workflow has unsupported trigger nodes', async () => {
				const workflow = createWorkflow({
					activeVersionId: uuid(),
					nodes: [
						{
							id: 'node-1',
							name: 'Error Trigger',
							type: 'n8n-nodes-base.errorTrigger',
							typeVersion: 1,
							position: [0, 0],
							disabled: false,
							parameters: {},
						} as INode,
					],
				});
				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);

				await expect(
					executeWorkflow(
						user,
						workflowFinderService,
						activeExecutions,
						workflowRunner,
						mcpService,
						'unsupported-trigger',
						undefined,
					),
				).rejects.toThrow(WorkflowAccessError);

				await expect(
					executeWorkflow(
						user,
						workflowFinderService,
						activeExecutions,
						workflowRunner,
						mcpService,
						'unsupported-trigger',
						undefined,
					),
				).rejects.toThrow(/Only workflows with the following trigger nodes can be executed/);
			});

			test('throws error with correct reason when workflow has unsupported trigger', async () => {
				const workflow = createWorkflow({
					activeVersionId: uuid(),
					nodes: [
						{
							id: 'node-1',
							name: 'Error Trigger',
							type: 'n8n-nodes-base.errorTrigger',
							typeVersion: 1,
							position: [0, 0],
							disabled: false,
							parameters: {},
						} as INode,
					],
				});
				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);

				await expect(
					executeWorkflow(
						user,
						workflowFinderService,
						activeExecutions,
						workflowRunner,
						mcpService,
						'unsupported-trigger',
						undefined,
					),
				).rejects.toMatchObject({
					reason: 'unsupported_trigger',
				});
			});

			test('throws error when no supported trigger node is found', async () => {
				const workflow = createWorkflow({
					activeVersionId: uuid(),
					nodes: [
						{
							id: 'node-1',
							name: 'Webhook',
							type: WEBHOOK_NODE_TYPE,
							typeVersion: 1,
							position: [0, 0],
							disabled: true, // disabled node should not be considered
							parameters: {},
						} as INode,
					],
				});
				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);

				await expect(
					executeWorkflow(
						user,
						workflowFinderService,
						activeExecutions,
						workflowRunner,
						mcpService,
						'disabled-trigger',
						undefined,
					),
				).rejects.toThrow(WorkflowAccessError);
			});
		});

		describe('webhook trigger execution', () => {
			test('executes workflow with webhook trigger and webhook data', async () => {
				const workflow = createWorkflow({
					activeVersionId: uuid(),
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
				(workflowRunner.run as jest.Mock).mockResolvedValue('exec-123');
				(activeExecutions.getPostExecutePromise as jest.Mock).mockResolvedValue({
					status: 'success',
					data: {
						resultData: {
							runData: {
								WebhookNode: [{ data: { main: [[{ json: { result: 'webhook success' } }]] } }],
							},
						},
					},
				});

				const result = await executeWorkflow(
					user,
					workflowFinderService,
					activeExecutions,
					workflowRunner,
					mcpService,
					'webhook-workflow',
					{
						type: 'webhook',
						webhookData: {
							method: 'POST',
							headers: { 'content-type': 'application/json' },
							query: { page: '1' },
							body: { message: 'test' },
						},
					},
				);

				expect(result).toMatchObject({
					status: 'success',
					executionId: 'exec-123',
				});

				// Verify the runner was called with correct pin data
				const runCall = (workflowRunner.run as jest.Mock).mock
					.calls[0][0] as IWorkflowExecutionDataProcess;
				expect(runCall.startNodes).toEqual([{ name: 'WebhookNode', sourceData: null }]);
				expect(runCall.pinData).toMatchObject({
					WebhookNode: [
						{
							json: {
								headers: { 'content-type': 'application/json' },
								query: { page: '1' },
								body: { message: 'test' },
							},
						},
					],
				});
			});

			test('executes workflow with webhook trigger and default GET method', async () => {
				const workflow = createWorkflow({
					activeVersionId: uuid(),
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
				(workflowRunner.run as jest.Mock).mockResolvedValue('exec-456');
				(activeExecutions.getPostExecutePromise as jest.Mock).mockResolvedValue({
					status: 'success',
					data: { resultData: {} },
				});

				await executeWorkflow(
					user,
					workflowFinderService,
					activeExecutions,
					workflowRunner,
					mcpService,
					'webhook-workflow',
					{
						type: 'webhook',
						webhookData: {
							method: 'GET',
							query: { id: '123' },
						},
					},
				);

				const runCall = (workflowRunner.run as jest.Mock).mock
					.calls[0][0] as IWorkflowExecutionDataProcess;
				expect(runCall.pinData).toMatchObject({
					WebhookNode: [
						{
							json: {
								headers: {},
								query: { id: '123' },
								body: {},
							},
						},
					],
				});
			});
		});

		describe('chat trigger execution', () => {
			test('executes workflow with chat trigger and chat input', async () => {
				const workflow = createWorkflow({
					activeVersionId: uuid(),
					nodes: [
						{
							id: 'node-1',
							name: 'ChatNode',
							type: CHAT_TRIGGER_NODE_TYPE,
							typeVersion: 1,
							position: [0, 0],
							disabled: false,
							parameters: {},
						} as INode,
					],
				});
				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);
				(workflowRunner.run as jest.Mock).mockResolvedValue('exec-789');
				(activeExecutions.getPostExecutePromise as jest.Mock).mockResolvedValue({
					status: 'success',
					data: { resultData: {} },
				});

				const result = await executeWorkflow(
					user,
					workflowFinderService,
					activeExecutions,
					workflowRunner,
					mcpService,
					'chat-workflow',
					{
						type: 'chat',
						chatInput: 'Hello, how can I help?',
					},
				);

				expect(result).toMatchObject({
					status: 'success',
					executionId: 'exec-789',
				});

				const runCall = (workflowRunner.run as jest.Mock).mock
					.calls[0][0] as IWorkflowExecutionDataProcess;
				expect(runCall.executionMode).toBe('chat');
				expect(runCall.pinData).toMatchObject({
					ChatNode: [
						{
							json: {
								sessionId: expect.stringMatching(/^mcp-session-\d+$/),
								action: 'sendMessage',
								chatInput: 'Hello, how can I help?',
							},
						},
					],
				});
			});
		});

		describe('form trigger execution', () => {
			test('executes workflow with form trigger and form data', async () => {
				const workflow = createWorkflow({
					activeVersionId: uuid(),
					nodes: [
						{
							id: 'node-1',
							name: 'FormNode',
							type: FORM_TRIGGER_NODE_TYPE,
							typeVersion: 1,
							position: [0, 0],
							disabled: false,
							parameters: {},
						} as INode,
					],
				});
				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);
				(workflowRunner.run as jest.Mock).mockResolvedValue('exec-101');
				(activeExecutions.getPostExecutePromise as jest.Mock).mockResolvedValue({
					status: 'success',
					data: { resultData: {} },
				});

				const result = await executeWorkflow(
					user,
					workflowFinderService,
					activeExecutions,
					workflowRunner,
					mcpService,
					'form-workflow',
					{
						type: 'form',
						formData: {
							name: 'John Doe',
							email: 'john@example.com',
							age: 30,
						},
					},
				);

				expect(result).toMatchObject({
					status: 'success',
					executionId: 'exec-101',
				});

				const runCall = (workflowRunner.run as jest.Mock).mock
					.calls[0][0] as IWorkflowExecutionDataProcess;
				expect(runCall.executionMode).toBe('trigger');
				expect(runCall.pinData).toMatchObject({
					FormNode: [
						{
							json: {
								submittedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
								formMode: 'mcp',
								name: 'John Doe',
								email: 'john@example.com',
								age: 30,
							},
						},
					],
				});
			});
		});

		describe('execution results handling', () => {
			test('handles successful execution', async () => {
				const workflow = createWorkflow({
					activeVersionId: uuid(),
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
				(workflowRunner.run as jest.Mock).mockResolvedValue('exec-success');
				(activeExecutions.getPostExecutePromise as jest.Mock).mockResolvedValue({
					status: 'success',
					data: {
						resultData: {
							runData: {
								WebhookNode: [{ data: { main: [[{ json: { output: 'success' } }]] } }],
							},
						},
					},
				});

				const result = await executeWorkflow(
					user,
					workflowFinderService,
					activeExecutions,
					workflowRunner,
					mcpService,
					'success-workflow',
					undefined,
				);

				expect(result).toMatchObject({
					status: 'success',
					executionId: 'exec-success',
				});
			});

			test('handles execution with error status', async () => {
				const workflow = createWorkflow({
					activeVersionId: uuid(),
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
				(workflowRunner.run as jest.Mock).mockResolvedValue('exec-error');
				(activeExecutions.getPostExecutePromise as jest.Mock).mockResolvedValue({
					status: 'error',
					data: {
						resultData: {
							error: {
								message: 'Workflow execution failed',
								name: 'ExecutionError',
							},
						},
					},
				});

				const result = await executeWorkflow(
					user,
					workflowFinderService,
					activeExecutions,
					workflowRunner,
					mcpService,
					'error-workflow',
					undefined,
				);

				expect(result).toMatchObject({
					status: 'error',
					executionId: 'exec-error',
					error: 'Workflow execution failed',
				});
			});

			test('handles execution with result data error', async () => {
				const workflow = createWorkflow({
					activeVersionId: uuid(),
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
				(workflowRunner.run as jest.Mock).mockResolvedValue('exec-data-error');
				(activeExecutions.getPostExecutePromise as jest.Mock).mockResolvedValue({
					status: 'success',
					data: {
						resultData: {
							error: {
								message: 'Node execution failed',
								name: 'NodeExecutionError',
							},
						},
					},
				});

				const result = await executeWorkflow(
					user,
					workflowFinderService,
					activeExecutions,
					workflowRunner,
					mcpService,
					'data-error-workflow',
					undefined,
				);

				expect(result).toMatchObject({
					status: 'error',
					executionId: 'exec-data-error',
					error: 'Node execution failed',
				});
			});

			test('handles workflow returning undefined data', async () => {
				const workflow = createWorkflow({
					activeVersionId: uuid(),
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
				(workflowRunner.run as jest.Mock).mockResolvedValue('exec-no-data');
				(activeExecutions.getPostExecutePromise as jest.Mock).mockResolvedValue(undefined);

				await expect(
					executeWorkflow(
						user,
						workflowFinderService,
						activeExecutions,
						workflowRunner,
						mcpService,
						'no-data-workflow',
						undefined,
					),
				).rejects.toThrow(UnexpectedError);

				await expect(
					executeWorkflow(
						user,
						workflowFinderService,
						activeExecutions,
						workflowRunner,
						mcpService,
						'no-data-workflow',
						undefined,
					),
				).rejects.toThrow('Workflow did not return any data');
			});
		});

		describe('workflow with no inputs', () => {
			test('executes workflow without any inputs', async () => {
				const workflow = createWorkflow({
					activeVersionId: uuid(),
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
				(workflowRunner.run as jest.Mock).mockResolvedValue('exec-no-inputs');
				(activeExecutions.getPostExecutePromise as jest.Mock).mockResolvedValue({
					status: 'success',
					data: { resultData: {} },
				});

				await executeWorkflow(
					user,
					workflowFinderService,
					activeExecutions,
					workflowRunner,
					mcpService,
					'no-inputs-workflow',
					undefined,
				);

				const runCall = (workflowRunner.run as jest.Mock).mock
					.calls[0][0] as IWorkflowExecutionDataProcess;
				expect(runCall.pinData).toMatchObject({
					WebhookNode: [
						{
							json: {
								headers: {},
								query: {},
								body: {},
							},
						},
					],
				});
			});
		});

		describe('telemetry tracking', () => {
			test('tracks successful execution with tool handler', async () => {
				const workflow = createWorkflow({
					activeVersionId: uuid(),
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
				(workflowRunner.run as jest.Mock).mockResolvedValue('exec-telemetry');
				(activeExecutions.getPostExecutePromise as jest.Mock).mockResolvedValue({
					status: 'success',
					data: { resultData: {} },
				});

				const tool = createExecuteWorkflowTool(
					user,
					workflowFinderService,
					activeExecutions,
					workflowRunner,
					telemetry,
					mcpService,
				);

				// Call through the tool handler to test telemetry
				await tool.handler(
					{
						workflowId: 'telemetry-workflow',
						executionMode: 'production',
						inputs: { type: 'chat', chatInput: 'test' },
					},
					{} as any,
				);

				expect(telemetry.track).toHaveBeenCalledWith(
					'User called mcp tool',
					expect.objectContaining({
						user_id: 'user-1',
						tool_name: 'execute_workflow',
						parameters: {
							workflowId: 'telemetry-workflow',
							executionMode: 'production',
							inputs: { type: 'chat', parameter_count: 1 },
						},
						results: {
							success: true,
							data: {
								executionId: 'exec-telemetry',
								status: 'success',
							},
						},
					}),
				);
			});

			test('tracks failed execution when workflow not found', async () => {
				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(null);

				const tool = createExecuteWorkflowTool(
					user,
					workflowFinderService,
					activeExecutions,
					workflowRunner,
					telemetry,
					mcpService,
				);

				await tool.handler(
					{ workflowId: 'non-existent', executionMode: 'production', inputs: undefined },
					{} as any,
				);

				expect(telemetry.track).toHaveBeenCalledWith(
					'User called mcp tool',
					expect.objectContaining({
						user_id: 'user-1',
						tool_name: 'execute_workflow',
						parameters: {
							workflowId: 'non-existent',
							executionMode: 'production',
							inputs: undefined,
						},
						results: {
							success: false,
							error: expect.objectContaining({
								message: "Workflow not found or you don't have permission to access it.",
							}),
							error_reason: 'no_permission',
						},
					}),
				);
			});

			test('tracks failed execution when user lacks permission (same error as not found)', async () => {
				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(null);

				const tool = createExecuteWorkflowTool(
					user,
					workflowFinderService,
					activeExecutions,
					workflowRunner,
					telemetry,
					mcpService,
				);

				await tool.handler(
					{ workflowId: 'no-permission-workflow', executionMode: 'production', inputs: undefined },
					{} as any,
				);

				expect(telemetry.track).toHaveBeenCalledWith(
					'User called mcp tool',
					expect.objectContaining({
						user_id: 'user-1',
						tool_name: 'execute_workflow',
						parameters: {
							workflowId: 'no-permission-workflow',
							executionMode: 'production',
							inputs: undefined,
						},
						results: {
							success: false,
							error: expect.objectContaining({
								message: "Workflow not found or you don't have permission to access it.",
							}),
							error_reason: 'no_permission',
						},
					}),
				);
			});
		});

		describe('multiple trigger nodes', () => {
			test('uses first eligible trigger node when multiple are present', async () => {
				const workflow = createWorkflow({
					activeVersionId: uuid(),
					nodes: [
						{
							id: 'node-1',
							name: 'Manual',
							type: MANUAL_TRIGGER_NODE_TYPE,
							typeVersion: 1,
							position: [0, 0],
							disabled: false,
							parameters: {},
						} as INode,
						{
							id: 'node-2',
							name: 'WebhookNode',
							type: WEBHOOK_NODE_TYPE,
							typeVersion: 1,
							position: [100, 0],
							disabled: false,
							parameters: {},
						} as INode,
						{
							id: 'node-3',
							name: 'ChatNode',
							type: CHAT_TRIGGER_NODE_TYPE,
							typeVersion: 1,
							position: [200, 0],
							disabled: false,
							parameters: {},
						} as INode,
					],
				});
				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);
				(workflowRunner.run as jest.Mock).mockResolvedValue('exec-multi');
				(activeExecutions.getPostExecutePromise as jest.Mock).mockResolvedValue({
					status: 'success',
					data: { resultData: {} },
				});

				await executeWorkflow(
					user,
					workflowFinderService,
					activeExecutions,
					workflowRunner,
					mcpService,
					'multi-trigger-workflow',
					undefined,
				);

				const runCall = (workflowRunner.run as jest.Mock).mock
					.calls[0][0] as IWorkflowExecutionDataProcess;
				// Should use the WebhookNode (first eligible trigger)
				expect(runCall.startNodes).toEqual([{ name: 'WebhookNode', sourceData: null }]);
				expect(runCall.pinData).toHaveProperty('WebhookNode');
				expect(runCall.executionMode).toBe('webhook');
			});
		});

		describe('queue mode support', () => {
			let queueModeMcpService: McpService;

			beforeEach(() => {
				queueModeMcpService = mockInstance(McpService, {
					isQueueMode: true,
					createPendingResponse: jest.fn().mockReturnValue({
						promise: Promise.resolve({
							status: 'success',
							data: { resultData: { runData: {} } },
						}),
						resolve: jest.fn(),
						reject: jest.fn(),
					}),
				});
			});

			test('uses pending response promise in queue mode', async () => {
				const workflow = createWorkflow({
					activeVersionId: uuid(),
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
				(workflowRunner.run as jest.Mock).mockResolvedValue('exec-queue');

				const result = await executeWorkflow(
					user,
					workflowFinderService,
					activeExecutions,
					workflowRunner,
					queueModeMcpService,
					'queue-workflow',
					undefined,
				);

				expect(queueModeMcpService.createPendingResponse).toHaveBeenCalledWith('exec-queue');
				expect(activeExecutions.getPostExecutePromise).not.toHaveBeenCalled();
				expect(result).toMatchObject({
					status: 'success',
					executionId: 'exec-queue',
				});
			});

			test('passes MCP metadata in run data for queue mode', async () => {
				const workflow = createWorkflow({
					activeVersionId: uuid(),
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
				(workflowRunner.run as jest.Mock).mockResolvedValue('exec-mcp-meta');

				await executeWorkflow(
					user,
					workflowFinderService,
					activeExecutions,
					workflowRunner,
					queueModeMcpService,
					'mcp-meta-workflow',
					undefined,
				);

				const runCall = (workflowRunner.run as jest.Mock).mock
					.calls[0][0] as IWorkflowExecutionDataProcess;
				expect(runCall.isMcpExecution).toBe(true);
				expect(runCall.mcpType).toBe('service');
				expect(runCall.mcpSessionId).toBeDefined();
				expect(runCall.mcpMessageId).toBeDefined();
			});

			test('sets isMcpExecution to false in regular mode', async () => {
				const workflow = createWorkflow({
					activeVersionId: uuid(),
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
				(workflowRunner.run as jest.Mock).mockResolvedValue('exec-regular');
				(activeExecutions.getPostExecutePromise as jest.Mock).mockResolvedValue({
					status: 'success',
					data: { resultData: {} },
				});

				await executeWorkflow(
					user,
					workflowFinderService,
					activeExecutions,
					workflowRunner,
					mcpService,
					'regular-workflow',
					undefined,
				);

				const runCall = (workflowRunner.run as jest.Mock).mock
					.calls[0][0] as IWorkflowExecutionDataProcess;
				// isMcpExecution should be false in regular mode - this is the key flag that
				// determines whether queue mode MCP handling is applied
				expect(runCall.isMcpExecution).toBe(false);
			});

			test('uses activeExecutions.getPostExecutePromise in regular mode', async () => {
				const workflow = createWorkflow({
					activeVersionId: uuid(),
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
				(workflowRunner.run as jest.Mock).mockResolvedValue('exec-regular-2');
				(activeExecutions.getPostExecutePromise as jest.Mock).mockResolvedValue({
					status: 'success',
					data: { resultData: {} },
				});

				await executeWorkflow(
					user,
					workflowFinderService,
					activeExecutions,
					workflowRunner,
					mcpService,
					'regular-workflow-2',
					undefined,
				);

				expect(activeExecutions.getPostExecutePromise).toHaveBeenCalledWith('exec-regular-2');
			});
		});
	});
});
