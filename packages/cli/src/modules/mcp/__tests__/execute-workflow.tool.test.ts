import type { Mock } from 'vitest';
import { mockInstance } from '@n8n/backend-test-utils';
import { WorkflowsConfig } from '@n8n/config';
import { User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { MockProxy } from 'vitest-mock-extended';
import {
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
	type INode,
	type IWorkflowExecutionDataProcess,
} from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { createWorkflow, createWorkflowHistoryVersion } from './mock.utils';
import { WorkflowAccessError } from '../mcp.errors';
import { createExecuteWorkflowTool, executeWorkflow } from '../tools/execute-workflow.tool';
import { WORKFLOW_EXECUTION_TIMEOUT_MS } from '../tools/execution-utils';

import { ActiveExecutions } from '@/active-executions';
import { McpService } from '@/modules/mcp/mcp.service';
import { Telemetry } from '@/telemetry';
import { WorkflowRunner } from '@/workflow-runner';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowPublishedDataService } from '@/workflows/workflow-published-data.service';

describe('execute-workflow MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	let workflowFinderService: WorkflowFinderService;
	let activeExecutions: ActiveExecutions;
	let workflowRunner: WorkflowRunner;
	let telemetry: Telemetry;
	let mcpService: McpService;
	let workflowsConfig: WorkflowsConfig;
	let workflowPublishedDataService: MockProxy<WorkflowPublishedDataService>;

	beforeEach(() => {
		workflowFinderService = mockInstance(WorkflowFinderService);
		activeExecutions = mockInstance(ActiveExecutions);
		workflowRunner = mockInstance(WorkflowRunner);
		telemetry = mockInstance(Telemetry, {
			track: vi.fn(),
		});
		mcpService = mockInstance(McpService, {
			isQueueMode: false,
		});
		workflowPublishedDataService = mockInstance(WorkflowPublishedDataService);
		workflowsConfig = Container.get(WorkflowsConfig);
		workflowsConfig.useWorkflowPublicationService = false;
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
				workflowsConfig,
				workflowPublishedDataService,
			);

			expect(tool.name).toBe('execute_workflow');
			expect(tool.config).toBeDefined();
			expect(typeof tool.config.description).toBe('string');
			expect(tool.config.description).toBe(
				'Execute a workflow by ID. By default returns the execution ID immediately without waiting for completion; pass waitForCompletion to wait for the final result. Before executing always ensure you know the input schema by first using the get_workflow_details tool and consulting workflow description',
			);
			expect(tool.config.inputSchema).toBeDefined();
			expect(tool.config.inputSchema?.executionMode.safeParse(undefined).success).toBe(false);
			expect(tool.config.outputSchema).toBeDefined();
			expect(typeof tool.handler).toBe('function');
		});
	});

	describe('handler tests', () => {
		describe('workflow validation', () => {
			test('propagates errors from getMcpWorkflow', async () => {
				(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(null);

				await expect(
					executeWorkflow(
						user,
						workflowFinderService,
						workflowRunner,
						mcpService,
						workflowsConfig,
						workflowPublishedDataService,
						'any-workflow',
						undefined,
						'production',
					),
				).rejects.toThrow(WorkflowAccessError);
			});

			test('throws when production mode is requested for unpublished workflow', async () => {
				const workflow = createWorkflow({
					activeVersionId: null,
					settings: { availableInMCP: true },
				});
				(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);

				await expect(
					executeWorkflow(
						user,
						workflowFinderService,
						workflowRunner,
						mcpService,
						workflowsConfig,
						workflowPublishedDataService,
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
				(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);
				(workflowRunner.run as Mock).mockResolvedValue('execution-id');

				const result = await executeWorkflow(
					user,
					workflowFinderService,
					workflowRunner,
					mcpService,
					workflowsConfig,
					workflowPublishedDataService,
					'unpublished-workflow',
					undefined,
					'manual',
				);

				expect(result.status).toBe('started');
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
				(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);
				(workflowRunner.run as Mock).mockResolvedValue('execution-id');

				const result = await executeWorkflow(
					user,
					workflowFinderService,
					workflowRunner,
					mcpService,
					workflowsConfig,
					workflowPublishedDataService,
					'manual-trigger-workflow',
					undefined,
					'manual',
				);

				expect(result.status).toBe('started');
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
				(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);
				(workflowRunner.run as Mock).mockResolvedValue('execution-id');

				await executeWorkflow(
					user,
					workflowFinderService,
					workflowRunner,
					mcpService,
					workflowsConfig,
					workflowPublishedDataService,
					'manual-workflow-with-pindata',
					{ type: 'webhook', webhookData: { method: 'POST', body: { test: 'input' } } },
					'manual',
				);

				const runCall = (workflowRunner.run as Mock).mock
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
				(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);
				(workflowRunner.run as Mock).mockResolvedValue('execution-id');

				await executeWorkflow(
					user,
					workflowFinderService,
					workflowRunner,
					mcpService,
					workflowsConfig,
					workflowPublishedDataService,
					'production-workflow-with-pindata',
					undefined,
					'production',
				);

				const runCall = (workflowRunner.run as Mock).mock
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
				(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);

				await expect(
					executeWorkflow(
						user,
						workflowFinderService,
						workflowRunner,
						mcpService,
						workflowsConfig,
						workflowPublishedDataService,
						'unsupported-trigger',
						undefined,
						'production',
					),
				).rejects.toThrow(WorkflowAccessError);

				await expect(
					executeWorkflow(
						user,
						workflowFinderService,
						workflowRunner,
						mcpService,
						workflowsConfig,
						workflowPublishedDataService,
						'unsupported-trigger',
						undefined,
						'production',
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
				(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);

				await expect(
					executeWorkflow(
						user,
						workflowFinderService,
						workflowRunner,
						mcpService,
						workflowsConfig,
						workflowPublishedDataService,
						'unsupported-trigger',
						undefined,
						'production',
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
				(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);

				await expect(
					executeWorkflow(
						user,
						workflowFinderService,
						workflowRunner,
						mcpService,
						workflowsConfig,
						workflowPublishedDataService,
						'disabled-trigger',
						undefined,
						'production',
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
				(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);
				(workflowRunner.run as Mock).mockResolvedValue('exec-123');

				const result = await executeWorkflow(
					user,
					workflowFinderService,
					workflowRunner,
					mcpService,
					workflowsConfig,
					workflowPublishedDataService,
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
					'production',
				);

				expect(result).toMatchObject({
					status: 'started',
					executionId: 'exec-123',
				});

				// Verify the runner was called with correct pin data
				const runCall = (workflowRunner.run as Mock).mock
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
				(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);
				(workflowRunner.run as Mock).mockResolvedValue('exec-456');

				await executeWorkflow(
					user,
					workflowFinderService,
					workflowRunner,
					mcpService,
					workflowsConfig,
					workflowPublishedDataService,
					'webhook-workflow',
					{
						type: 'webhook',
						webhookData: {
							method: 'GET',
							query: { id: '123' },
						},
					},
					'production',
				);

				const runCall = (workflowRunner.run as Mock).mock
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
				(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);
				(workflowRunner.run as Mock).mockResolvedValue('exec-789');

				const result = await executeWorkflow(
					user,
					workflowFinderService,
					workflowRunner,
					mcpService,
					workflowsConfig,
					workflowPublishedDataService,
					'chat-workflow',
					{
						type: 'chat',
						chatInput: 'Hello, how can I help?',
					},
					'production',
				);

				expect(result).toMatchObject({
					status: 'started',
					executionId: 'exec-789',
				});

				const runCall = (workflowRunner.run as Mock).mock
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
				(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);
				(workflowRunner.run as Mock).mockResolvedValue('exec-101');

				const result = await executeWorkflow(
					user,
					workflowFinderService,
					workflowRunner,
					mcpService,
					workflowsConfig,
					workflowPublishedDataService,
					'form-workflow',
					{
						type: 'form',
						formData: {
							name: 'John Doe',
							email: 'john@example.com',
							age: 30,
						},
					},
					'production',
				);

				expect(result).toMatchObject({
					status: 'started',
					executionId: 'exec-101',
				});

				const runCall = (workflowRunner.run as Mock).mock
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

		describe('execution start', () => {
			test('returns started status with execution ID', async () => {
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
				(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);
				(workflowRunner.run as Mock).mockResolvedValue('exec-success');

				const result = await executeWorkflow(
					user,
					workflowFinderService,
					workflowRunner,
					mcpService,
					workflowsConfig,
					workflowPublishedDataService,
					'success-workflow',
					undefined,
					'production',
				);

				expect(result).toMatchObject({
					status: 'started',
					executionId: 'exec-success',
				});
				expect(result.error).toBeUndefined();
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
				(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);
				(workflowRunner.run as Mock).mockResolvedValue('exec-no-inputs');

				await executeWorkflow(
					user,
					workflowFinderService,
					workflowRunner,
					mcpService,
					workflowsConfig,
					workflowPublishedDataService,
					'no-inputs-workflow',
					undefined,
					'production',
				);

				const runCall = (workflowRunner.run as Mock).mock
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

		describe('waitForCompletion', () => {
			const createTool = () =>
				createExecuteWorkflowTool(
					user,
					workflowFinderService,
					activeExecutions,
					workflowRunner,
					telemetry,
					mcpService,
					workflowsConfig,
					workflowPublishedDataService,
				);

			const setupExecutableWorkflow = () => {
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
				(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);
				(workflowRunner.run as Mock).mockResolvedValue('exec-wait');
			};

			const callHandler = async (waitForCompletion: boolean | undefined, extra: unknown = {}) => {
				const tool = createTool();
				return await tool.handler(
					{
						workflowId: 'wait-workflow',
						executionMode: 'production',
						inputs: undefined,
						waitForCompletion,
					},
					extra as Parameters<typeof tool.handler>[1],
				);
			};

			test('does not wait when waitForCompletion is not set', async () => {
				setupExecutableWorkflow();

				const result = await callHandler(undefined);

				expect(activeExecutions.getPostExecutePromise).not.toHaveBeenCalled();
				expect(result.structuredContent).toEqual({ executionId: 'exec-wait', status: 'started' });
			});

			test('returns the final status when the execution completes', async () => {
				setupExecutableWorkflow();
				(activeExecutions.getPostExecutePromise as Mock).mockResolvedValue({
					status: 'success',
					data: { resultData: {} },
				});

				const result = await callHandler(true);

				expect(activeExecutions.getPostExecutePromise).toHaveBeenCalledWith('exec-wait');
				expect(result.structuredContent).toEqual({ executionId: 'exec-wait', status: 'success' });
			});

			test('returns error status and message when the execution fails', async () => {
				setupExecutableWorkflow();
				(activeExecutions.getPostExecutePromise as Mock).mockResolvedValue({
					status: 'error',
					data: { resultData: { error: { message: 'node exploded' } } },
				});

				const result = await callHandler(true);

				expect(result.structuredContent).toEqual({
					executionId: 'exec-wait',
					status: 'error',
					error: 'node exploded',
				});
			});

			test('returns running status and leaves the execution running when the wait times out', async () => {
				vi.useFakeTimers();
				try {
					setupExecutableWorkflow();
					(activeExecutions.getPostExecutePromise as Mock).mockReturnValue(new Promise(() => {}));

					const resultPromise = callHandler(true);
					await vi.advanceTimersByTimeAsync(WORKFLOW_EXECUTION_TIMEOUT_MS);
					const result = await resultPromise;

					expect(result.structuredContent).toEqual({
						executionId: 'exec-wait',
						status: 'running',
					});
					expect(activeExecutions.stopExecution).not.toHaveBeenCalled();
				} finally {
					vi.useRealTimers();
				}
			});

			test('sends progress notifications when the client provides a progress token', async () => {
				setupExecutableWorkflow();
				(activeExecutions.getPostExecutePromise as Mock).mockResolvedValue({
					status: 'success',
					data: { resultData: {} },
				});
				const sendNotification = vi.fn().mockResolvedValue(undefined);

				await callHandler(true, {
					_meta: { progressToken: 'token-1' },
					sendNotification,
					signal: new AbortController().signal,
				});

				expect(sendNotification).toHaveBeenCalledWith(
					expect.objectContaining({
						method: 'notifications/progress',
						params: expect.objectContaining({
							progressToken: 'token-1',
							message: expect.stringContaining('"My wf" started'),
						}),
					}),
				);
			});

			test('sends no notifications when the client provides no progress token', async () => {
				setupExecutableWorkflow();
				(activeExecutions.getPostExecutePromise as Mock).mockResolvedValue({
					status: 'success',
					data: { resultData: {} },
				});
				const sendNotification = vi.fn();

				await callHandler(true, { sendNotification });

				expect(sendNotification).not.toHaveBeenCalled();
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
				(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);
				(workflowRunner.run as Mock).mockResolvedValue('exec-telemetry');

				const tool = createExecuteWorkflowTool(
					user,
					workflowFinderService,
					activeExecutions,
					workflowRunner,
					telemetry,
					mcpService,
					workflowsConfig,
					workflowPublishedDataService,
				);

				// Call through the tool handler to test telemetry
				await tool.handler(
					{
						workflowId: 'telemetry-workflow',
						executionMode: 'production',
						inputs: { type: 'chat', chatInput: 'test' },
						waitForCompletion: undefined,
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
								status: 'started',
							},
						},
					}),
				);
			});

			test('tracks failed execution when workflow not found', async () => {
				(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(null);

				const tool = createExecuteWorkflowTool(
					user,
					workflowFinderService,
					activeExecutions,
					workflowRunner,
					telemetry,
					mcpService,
					workflowsConfig,
					workflowPublishedDataService,
				);

				await tool.handler(
					{
						workflowId: 'non-existent',
						executionMode: 'production',
						inputs: undefined,
						waitForCompletion: undefined,
					},
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
				(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(null);

				const tool = createExecuteWorkflowTool(
					user,
					workflowFinderService,
					activeExecutions,
					workflowRunner,
					telemetry,
					mcpService,
					workflowsConfig,
					workflowPublishedDataService,
				);

				await tool.handler(
					{
						workflowId: 'no-permission-workflow',
						executionMode: 'production',
						inputs: undefined,
						waitForCompletion: undefined,
					},
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
				(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);
				(workflowRunner.run as Mock).mockResolvedValue('exec-multi');

				await executeWorkflow(
					user,
					workflowFinderService,
					workflowRunner,
					mcpService,
					workflowsConfig,
					workflowPublishedDataService,
					'multi-trigger-workflow',
					undefined,
					'production',
				);

				const runCall = (workflowRunner.run as Mock).mock
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
				(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);
				(workflowRunner.run as Mock).mockResolvedValue('exec-mcp-meta');

				await executeWorkflow(
					user,
					workflowFinderService,
					workflowRunner,
					queueModeMcpService,
					workflowsConfig,
					workflowPublishedDataService,
					'mcp-meta-workflow',
					undefined,
					'production',
				);

				const runCall = (workflowRunner.run as Mock).mock
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
				(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);
				(workflowRunner.run as Mock).mockResolvedValue('exec-regular');

				await executeWorkflow(
					user,
					workflowFinderService,
					workflowRunner,
					mcpService,
					workflowsConfig,
					workflowPublishedDataService,
					'regular-workflow',
					undefined,
					'production',
				);

				const runCall = (workflowRunner.run as Mock).mock
					.calls[0][0] as IWorkflowExecutionDataProcess;
				// isMcpExecution should be false in regular mode - this is the key flag that
				// determines whether queue mode MCP handling is applied
				expect(runCall.isMcpExecution).toBe(false);
			});
		});
	});

	describe('publication service flag (production reads)', () => {
		test('production reads nodes from the published_version mapping when the flag is on', async () => {
			workflowsConfig.useWorkflowPublicationService = true;

			// The activeVersion relation carries a different trigger than the
			// published_version mapping, so the start node proves which is used.
			const relationTrigger = {
				id: 'relation-node',
				name: 'RelationWebhook',
				type: WEBHOOK_NODE_TYPE,
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			} as INode;
			const mappingTrigger = {
				id: 'mapping-node',
				name: 'MappingWebhook',
				type: WEBHOOK_NODE_TYPE,
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			} as INode;

			const workflow = createWorkflow({ activeVersionId: uuid(), nodes: [relationTrigger] });
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);
			(workflowRunner.run as Mock).mockResolvedValue('exec-1');
			workflowPublishedDataService.getPublishedWorkflowData.mockResolvedValue({
				workflow,
				publishedVersion: createWorkflowHistoryVersion({
					workflowId: 'wf-1',
					versionId: 'mapping-version',
					nodes: [mappingTrigger],
				}),
			});

			await executeWorkflow(
				user,
				workflowFinderService,
				workflowRunner,
				mcpService,
				workflowsConfig,
				workflowPublishedDataService,
				'wf-1',
				{ type: 'webhook', webhookData: { method: 'POST', headers: {}, query: {}, body: {} } },
				'production',
			);

			expect(workflowPublishedDataService.getPublishedWorkflowData).toHaveBeenCalledWith('wf-1');
			const runCall = (workflowRunner.run as Mock).mock
				.calls[0][0] as IWorkflowExecutionDataProcess;
			expect(runCall.startNodes).toEqual([{ name: 'MappingWebhook', sourceData: null }]);
		});

		test('production executes from the mapping even when activeVersionId is stale (flag on)', async () => {
			workflowsConfig.useWorkflowPublicationService = true;

			const mappingTrigger = {
				id: 'mapping-node',
				name: 'MappingWebhook',
				type: WEBHOOK_NODE_TYPE,
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			} as INode;

			// activeVersionId is null, but a valid published_version mapping exists.
			const workflow = createWorkflow({ activeVersionId: null });
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);
			(workflowRunner.run as Mock).mockResolvedValue('exec-1');
			workflowPublishedDataService.getPublishedWorkflowData.mockResolvedValue({
				workflow,
				publishedVersion: createWorkflowHistoryVersion({
					workflowId: 'wf-1',
					versionId: 'mapping-version',
					nodes: [mappingTrigger],
				}),
			});

			await executeWorkflow(
				user,
				workflowFinderService,
				workflowRunner,
				mcpService,
				workflowsConfig,
				workflowPublishedDataService,
				'wf-1',
				{ type: 'webhook', webhookData: { method: 'POST', headers: {}, query: {}, body: {} } },
				'production',
			);

			const runCall = (workflowRunner.run as Mock).mock
				.calls[0][0] as IWorkflowExecutionDataProcess;
			expect(runCall.startNodes).toEqual([{ name: 'MappingWebhook', sourceData: null }]);
		});

		test('production throws when the published-version mapping is missing (flag on)', async () => {
			workflowsConfig.useWorkflowPublicationService = true;
			const workflow = createWorkflow({ activeVersionId: uuid() });
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);
			workflowPublishedDataService.getPublishedWorkflowData.mockResolvedValue(null);

			await expect(
				executeWorkflow(
					user,
					workflowFinderService,
					workflowRunner,
					mcpService,
					workflowsConfig,
					workflowPublishedDataService,
					'wf-1',
					undefined,
					'production',
				),
			).rejects.toThrow(WorkflowAccessError);
			expect(workflowRunner.run).not.toHaveBeenCalled();
		});
	});
});
