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
	UserError,
} from 'n8n-workflow';

import { createWorkflow } from './mock.utils';
import { createExecuteWorkflowTool, executeWorkflow } from '../tools/execute-workflow.tool';

import { ActiveExecutions } from '@/active-executions';
import { Telemetry } from '@/telemetry';
import { WorkflowRunner } from '@/workflow-runner';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

describe('execute-workflow MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	let workflowFinderService: WorkflowFinderService;
	let activeExecutions: ActiveExecutions;
	let workflowRunner: WorkflowRunner;
	let telemetry: Telemetry;

	beforeEach(() => {
		workflowFinderService = mockInstance(WorkflowFinderService);
		activeExecutions = mockInstance(ActiveExecutions);
		workflowRunner = mockInstance(WorkflowRunner);
		telemetry = mockInstance(Telemetry, {
			track: jest.fn(),
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
			);

			expect(tool.name).toBe('execute_workflow');
			expect(tool.config).toBeDefined();
			expect(typeof tool.config.description).toBe('string');
			expect(tool.config.description).toBe(
				'Execute a workflow by ID. Before executing always ensure you know the input schema by first using the get_workflow_details tool and consulting workflow description',
			);
			expect(tool.config.inputSchema).toBeDefined();
			expect(tool.config.outputSchema).toBeDefined();
			expect(typeof tool.handler).toBe('function');
		});
	});

	describe('handler tests', () => {
		describe('workflow validation', () => {
			test('throws error when workflow is not found', async () => {
				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(null);

				await expect(
					executeWorkflow(
						user,
						workflowFinderService,
						activeExecutions,
						workflowRunner,
						'missing-workflow',
						undefined,
					),
				).rejects.toThrow(UserError);

				await expect(
					executeWorkflow(
						user,
						workflowFinderService,
						activeExecutions,
						workflowRunner,
						'missing-workflow',
						undefined,
					),
				).rejects.toThrow('Workflow not found');
			});

			test('throws error when workflow is archived', async () => {
				const workflow = createWorkflow({ isArchived: true });
				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);

				await expect(
					executeWorkflow(
						user,
						workflowFinderService,
						activeExecutions,
						workflowRunner,
						'archived-workflow',
						undefined,
					),
				).rejects.toThrow(UserError);
			});

			test('throws error when workflow is not available in MCP', async () => {
				const workflow = createWorkflow({ settings: { availableInMCP: false } });
				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);

				await expect(
					executeWorkflow(
						user,
						workflowFinderService,
						activeExecutions,
						workflowRunner,
						'unavailable-workflow',
						undefined,
					),
				).rejects.toThrow(UserError);
			});

			test('throws error when workflow has unsupported trigger nodes', async () => {
				const workflow = createWorkflow({
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

				await expect(
					executeWorkflow(
						user,
						workflowFinderService,
						activeExecutions,
						workflowRunner,
						'unsupported-trigger',
						undefined,
					),
				).rejects.toThrow(UserError);

				await expect(
					executeWorkflow(
						user,
						workflowFinderService,
						activeExecutions,
						workflowRunner,
						'unsupported-trigger',
						undefined,
					),
				).rejects.toThrow(/Only workflows with the following trigger nodes can be executed/);
			});

			test('throws error when no supported trigger node is found', async () => {
				const workflow = createWorkflow({
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
						'disabled-trigger',
						undefined,
					),
				).rejects.toThrow(UserError);
			});
		});

		describe('webhook trigger execution', () => {
			test('executes workflow with webhook trigger and webhook data', async () => {
				const workflow = createWorkflow({
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
					success: true,
					executionId: 'exec-123',
					result: expect.objectContaining({
						runData: expect.any(Object),
					}),
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
					'chat-workflow',
					{
						type: 'chat',
						chatInput: 'Hello, how can I help?',
					},
				);

				expect(result).toMatchObject({
					success: true,
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
					success: true,
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
					'success-workflow',
					undefined,
				);

				expect(result).toMatchObject({
					success: true,
					executionId: 'exec-success',
					result: expect.objectContaining({
						runData: expect.any(Object),
					}),
				});
			});

			test('handles execution with error status', async () => {
				const workflow = createWorkflow({
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
					'error-workflow',
					undefined,
				);

				expect(result).toMatchObject({
					success: false,
					executionId: 'exec-error',
					error: {
						message: 'Workflow execution failed',
						name: 'ExecutionError',
					},
				});
			});

			test('handles execution with result data error', async () => {
				const workflow = createWorkflow({
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
					'data-error-workflow',
					undefined,
				);

				expect(result).toMatchObject({
					success: false,
					executionId: 'exec-data-error',
					error: {
						message: 'Node execution failed',
						name: 'NodeExecutionError',
					},
				});
			});

			test('handles workflow returning undefined data', async () => {
				const workflow = createWorkflow({
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
						'no-data-workflow',
						undefined,
					),
				).rejects.toThrow('Workflow did not return any data');
			});
		});

		describe('workflow with no inputs', () => {
			test('executes workflow without any inputs', async () => {
				const workflow = createWorkflow({
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
				);

				// Call through the tool handler to test telemetry
				await tool.handler(
					{ workflowId: 'telemetry-workflow', inputs: { type: 'chat', chatInput: 'test' } },
					{} as any,
				);

				expect(telemetry.track).toHaveBeenCalledWith(
					'User called mcp tool',
					expect.objectContaining({
						user_id: 'user-1',
						tool_name: 'execute_workflow',
						parameters: {
							workflowId: 'telemetry-workflow',
							inputs: { type: 'chat', parameter_count: 1 },
						},
						results: {
							success: true,
							data: {
								executionId: 'exec-telemetry',
							},
						},
					}),
				);
			});

			test('tracks failed execution with tool handler', async () => {
				const error = new UserError('Test error');
				(workflowFinderService.findWorkflowForUser as jest.Mock).mockRejectedValue(error);

				const tool = createExecuteWorkflowTool(
					user,
					workflowFinderService,
					activeExecutions,
					workflowRunner,
					telemetry,
				);

				// Call through the tool handler to test telemetry
				await tool.handler({ workflowId: 'error-tracking' }, {} as any);

				expect(telemetry.track).toHaveBeenCalledWith(
					'User called mcp tool',
					expect.objectContaining({
						user_id: 'user-1',
						tool_name: 'execute_workflow',
						parameters: {
							workflowId: 'error-tracking',
							inputs: undefined,
						},
						results: {
							success: false,
							error: 'Test error',
						},
					}),
				);
			});
		});

		describe('multiple trigger nodes', () => {
			test('uses first eligible trigger node when multiple are present', async () => {
				const workflow = createWorkflow({
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
	});
});
