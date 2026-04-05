import type { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';
import {
	WEBHOOK_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	HTTP_REQUEST_NODE_TYPE,
	type INode,
} from 'n8n-workflow';

import { createWorkflow } from './mock.utils';
import { WorkflowAccessError } from '../mcp.errors';
import {
	createPrepareTestPinDataTool,
	preparePinData,
} from '../tools/prepare-workflow-pin-data.tool';

import { ExecutionService } from '@/executions/execution.service';
import { NodeTypes } from '@/node-types';
import { Telemetry } from '@/telemetry';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

// Mock @n8n/workflow-sdk functions — keep real implementations for shared utils
// (needsPinData, normalizePinData), but mock functions that do file I/O or
// process execution data so tests stay isolated.
const mockDiscoverOutputSchemaForNode = jest.fn();
const mockInferSchemasFromRunData = jest.fn();

jest.mock('@n8n/workflow-sdk', () => {
	const actual = jest.requireActual('@n8n/workflow-sdk');
	return {
		...actual,
		discoverOutputSchemaForNode: (...args: unknown[]) => mockDiscoverOutputSchemaForNode(...args),
		inferSchemasFromRunData: (...args: unknown[]) => mockInferSchemasFromRunData(...args),
	};
});

// Helper: trigger node types
const TRIGGER_NODE_TYPES = new Set([
	WEBHOOK_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	'n8n-nodes-base.scheduleTrigger',
]);

function createMockNodeTypes() {
	const instance = mockInstance(NodeTypes);
	instance.getByNameAndVersion.mockImplementation(((type: string) => {
		if (type === 'n8n-nodes-base.unknownNode') throw new Error(`Unknown node type: ${type}`);
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

describe('prepare-workflow-pin-data MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	const logger = { debug: jest.fn(), warn: jest.fn() } as unknown as Logger;
	let workflowFinderService: WorkflowFinderService;
	let executionService: ExecutionService;
	let nodeTypes: ReturnType<typeof createMockNodeTypes>;
	let telemetry: Telemetry;

	beforeEach(() => {
		jest.clearAllMocks();
		workflowFinderService = mockInstance(WorkflowFinderService);
		executionService = mockInstance(ExecutionService);
		nodeTypes = createMockNodeTypes();
		telemetry = mockInstance(Telemetry, { track: jest.fn() });

		// Default: no execution history, no schema discovery
		(executionService.getLastSuccessfulExecution as jest.Mock).mockResolvedValue(undefined);
		mockDiscoverOutputSchemaForNode.mockReturnValue(undefined);
		mockInferSchemasFromRunData.mockReturnValue({});
	});

	describe('smoke tests', () => {
		test('creates tool with correct name and config', () => {
			const tool = createPrepareTestPinDataTool(
				user,
				workflowFinderService,
				executionService,
				nodeTypes,
				telemetry,
				logger,
			);

			expect(tool.name).toBe('prepare_test_pin_data');
			expect(tool.config).toBeDefined();
			expect(typeof tool.config.description).toBe('string');
			expect(tool.config.inputSchema).toBeDefined();
			expect(tool.config.outputSchema).toBeDefined();
			expect(typeof tool.handler).toBe('function');
		});
	});

	describe('workflow validation', () => {
		test('propagates errors from getMcpWorkflow', async () => {
			(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(null);

			await expect(
				preparePinData(
					'missing-wf',
					user,
					workflowFinderService,
					executionService,
					nodeTypes,
					logger,
				),
			).rejects.toThrow(WorkflowAccessError);
		});
	});

	describe('needsPinData classification', () => {
		test('trigger nodes need pin data', async () => {
			const workflow = createWorkflow({
				settings: { availableInMCP: true },
				nodes: [
					{
						id: 'node-1',
						name: 'WebhookTrigger',
						type: WEBHOOK_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						disabled: false,
						parameters: {},
					} as INode,
				],
			});
			(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);

			const result = await preparePinData(
				'wf-1',
				user,
				workflowFinderService,
				executionService,
				nodeTypes,
				logger,
			);

			// Trigger should need pin data (not in skipped)
			expect(result.nodesSkipped).not.toContain('WebhookTrigger');
			// It will be in nodesWithoutSchema since we have no execution/schema data
			expect(result.nodesWithoutSchema).toContain('WebhookTrigger');
		});

		test('nodes with credentials need pin data', async () => {
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
						name: 'SlackNode',
						type: 'n8n-nodes-base.slack',
						typeVersion: 1,
						position: [200, 0],
						disabled: false,
						parameters: {},
						credentials: { slackApi: { id: 'cred-1', name: 'My Slack' } },
					} as INode,
				],
			});
			(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);

			const result = await preparePinData(
				'wf-1',
				user,
				workflowFinderService,
				executionService,
				nodeTypes,
				logger,
			);

			expect(result.nodesSkipped).not.toContain('SlackNode');
			expect(result.nodesWithoutSchema).toContain('SlackNode');
		});

		test('HTTP Request nodes need pin data', async () => {
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
						name: 'HTTPRequest',
						type: HTTP_REQUEST_NODE_TYPE,
						typeVersion: 4,
						position: [200, 0],
						disabled: false,
						parameters: {},
					} as INode,
				],
			});
			(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);

			const result = await preparePinData(
				'wf-1',
				user,
				workflowFinderService,
				executionService,
				nodeTypes,
				logger,
			);

			expect(result.nodesSkipped).not.toContain('HTTPRequest');
			expect(result.nodesWithoutSchema).toContain('HTTPRequest');
		});

		test('logic nodes (Set, If, Code) are skipped', async () => {
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
						name: 'SetNode',
						type: 'n8n-nodes-base.set',
						typeVersion: 3,
						position: [200, 0],
						disabled: false,
						parameters: {},
					} as INode,
					{
						id: 'node-3',
						name: 'IfNode',
						type: 'n8n-nodes-base.if',
						typeVersion: 2,
						position: [400, 0],
						disabled: false,
						parameters: {},
					} as INode,
				],
			});
			(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);

			const result = await preparePinData(
				'wf-1',
				user,
				workflowFinderService,
				executionService,
				nodeTypes,
				logger,
			);

			expect(result.nodesSkipped).toContain('SetNode');
			expect(result.nodesSkipped).toContain('IfNode');
		});

		test('unknown node types are treated as needing pin data', async () => {
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
						name: 'UnknownNode',
						type: 'n8n-nodes-base.unknownNode',
						typeVersion: 1,
						position: [200, 0],
						disabled: false,
						parameters: {},
					} as INode,
				],
			});
			(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);

			const result = await preparePinData(
				'wf-1',
				user,
				workflowFinderService,
				executionService,
				nodeTypes,
				logger,
			);

			expect(result.nodesSkipped).not.toContain('UnknownNode');
			expect(result.nodesWithoutSchema).toContain('UnknownNode');
		});

		test('disabled nodes are excluded entirely', async () => {
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
						name: 'DisabledNode',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [200, 0],
						disabled: true,
						parameters: {},
					} as INode,
				],
			});
			(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);

			const result = await preparePinData(
				'wf-1',
				user,
				workflowFinderService,
				executionService,
				nodeTypes,
				logger,
			);

			expect(result.nodesSkipped).not.toContain('DisabledNode');
			expect(result.nodesWithoutSchema).not.toContain('DisabledNode');
			expect(result.coverage.total).toBe(1); // Only the trigger
		});
	});

	describe('schema tier priority', () => {
		test('tier 1: uses execution history schema when available', async () => {
			const executionSchema = { type: 'object', properties: { id: { type: 'string' } } };
			(executionService.getLastSuccessfulExecution as jest.Mock).mockResolvedValue({
				data: {
					resultData: {
						runData: {
							SlackNode: [
								{
									data: {
										main: [[{ json: { id: '123', channel: 'general' } }]],
									},
								},
							],
						},
					},
				},
			});
			mockInferSchemasFromRunData.mockReturnValue({ SlackNode: executionSchema });

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
						name: 'SlackNode',
						type: 'n8n-nodes-base.slack',
						typeVersion: 1,
						position: [200, 0],
						disabled: false,
						parameters: { resource: 'message', operation: 'post' },
						credentials: { slackApi: { id: 'cred-1', name: 'Slack' } },
					} as INode,
				],
			});
			(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);

			const result = await preparePinData(
				'wf-1',
				user,
				workflowFinderService,
				executionService,
				nodeTypes,
				logger,
			);

			expect(result.nodeSchemasToGenerate.SlackNode).toEqual(executionSchema);
			expect(result.coverage.withSchemaFromExecution).toBe(1);
		});

		test('tier 2: falls back to node type definition schema', async () => {
			const definitionSchema = { type: 'object', properties: { name: { type: 'string' } } };
			mockDiscoverOutputSchemaForNode.mockReturnValue(definitionSchema);

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
						name: 'SlackNode',
						type: 'n8n-nodes-base.slack',
						typeVersion: 1,
						position: [200, 0],
						disabled: false,
						parameters: { resource: 'message', operation: 'post' },
						credentials: { slackApi: { id: 'cred-1', name: 'Slack' } },
					} as INode,
				],
			});
			(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);

			const result = await preparePinData(
				'wf-1',
				user,
				workflowFinderService,
				executionService,
				nodeTypes,
				logger,
			);

			expect(result.nodeSchemasToGenerate.SlackNode).toEqual(definitionSchema);
			// Both Trigger and SlackNode get definition schemas since the mock returns for all types
			expect(result.coverage.withSchemaFromDefinition).toBe(2);
		});

		test('tier 2: uses single schema when only one exists and no resource/operation', async () => {
			const singleSchema = { type: 'object', properties: { value: { type: 'number' } } };
			mockDiscoverOutputSchemaForNode.mockReturnValue(singleSchema);

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
						name: 'HttpNode',
						type: HTTP_REQUEST_NODE_TYPE,
						typeVersion: 4,
						position: [200, 0],
						disabled: false,
						parameters: {},
					} as INode,
				],
			});
			(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);

			const result = await preparePinData(
				'wf-1',
				user,
				workflowFinderService,
				executionService,
				nodeTypes,
				logger,
			);

			expect(result.nodeSchemasToGenerate.HttpNode).toEqual(singleSchema);
			// Both Trigger and HttpNode get definition schemas since the mock returns for all types
			expect(result.coverage.withSchemaFromDefinition).toBe(2);
		});

		test('tier 3: adds to nodesWithoutSchema when no schema available', async () => {
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
						name: 'SlackNode',
						type: 'n8n-nodes-base.slack',
						typeVersion: 1,
						position: [200, 0],
						disabled: false,
						parameters: {},
						credentials: { slackApi: { id: 'cred-1', name: 'Slack' } },
					} as INode,
				],
			});
			(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);

			const result = await preparePinData(
				'wf-1',
				user,
				workflowFinderService,
				executionService,
				nodeTypes,
				logger,
			);

			expect(result.nodesWithoutSchema).toContain('SlackNode');
			expect(result.coverage.withoutSchema).toBeGreaterThanOrEqual(1);
		});
	});

	describe('execution data extraction', () => {
		test('returns undefined when no execution found', async () => {
			(executionService.getLastSuccessfulExecution as jest.Mock).mockResolvedValue(undefined);

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

			const result = await preparePinData(
				'wf-1',
				user,
				workflowFinderService,
				executionService,
				nodeTypes,
				logger,
			);

			expect(result.coverage.withSchemaFromExecution).toBe(0);
		});

		test('handles executionService throwing gracefully', async () => {
			(executionService.getLastSuccessfulExecution as jest.Mock).mockRejectedValue(
				new Error('DB connection failed'),
			);

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

			// Should not throw — falls through to other tiers
			const result = await preparePinData(
				'wf-1',
				user,
				workflowFinderService,
				executionService,
				nodeTypes,
				logger,
			);

			expect(result.coverage.withSchemaFromExecution).toBe(0);
		});

		test('skips nodes with empty json in execution data', async () => {
			(executionService.getLastSuccessfulExecution as jest.Mock).mockResolvedValue({
				data: {
					resultData: {
						runData: {
							SlackNode: [{ data: { main: [[{ json: {} }]] } }],
						},
					},
				},
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
					{
						id: 'node-2',
						name: 'SlackNode',
						type: 'n8n-nodes-base.slack',
						typeVersion: 1,
						position: [200, 0],
						disabled: false,
						parameters: {},
						credentials: { slackApi: { id: 'cred-1', name: 'Slack' } },
					} as INode,
				],
			});
			(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);

			const result = await preparePinData(
				'wf-1',
				user,
				workflowFinderService,
				executionService,
				nodeTypes,
				logger,
			);

			// Empty json should not produce a schema from execution
			expect(result.coverage.withSchemaFromExecution).toBe(0);
		});
	});

	describe('coverage object', () => {
		test('correctly counts all categories', async () => {
			const executionSchema = { type: 'object', properties: { id: { type: 'string' } } };
			const definitionSchema = { type: 'object', properties: { val: { type: 'number' } } };

			// Execution data for SlackNode
			(executionService.getLastSuccessfulExecution as jest.Mock).mockResolvedValue({
				data: {
					resultData: {
						runData: {
							SlackNode: [{ data: { main: [[{ json: { id: '123' } }]] } }],
						},
					},
				},
			});
			mockInferSchemasFromRunData.mockReturnValue({ SlackNode: executionSchema });

			// Schema discovery for GmailNode
			mockDiscoverOutputSchemaForNode.mockImplementation((type: string) => {
				if (type === 'n8n-nodes-base.gmail') {
					return definitionSchema;
				}
				return undefined;
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
					{
						id: 'node-2',
						name: 'SlackNode',
						type: 'n8n-nodes-base.slack',
						typeVersion: 1,
						position: [200, 0],
						disabled: false,
						parameters: { resource: 'message', operation: 'post' },
						credentials: { slackApi: { id: 'cred-1', name: 'Slack' } },
					} as INode,
					{
						id: 'node-3',
						name: 'GmailNode',
						type: 'n8n-nodes-base.gmail',
						typeVersion: 2,
						position: [400, 0],
						disabled: false,
						parameters: { resource: 'message', operation: 'send' },
						credentials: { gmailOAuth2: { id: 'cred-2', name: 'Gmail' } },
					} as INode,
					{
						id: 'node-4',
						name: 'SetNode',
						type: 'n8n-nodes-base.set',
						typeVersion: 3,
						position: [600, 0],
						disabled: false,
						parameters: {},
					} as INode,
					{
						id: 'node-5',
						name: 'HttpNode',
						type: HTTP_REQUEST_NODE_TYPE,
						typeVersion: 4,
						position: [800, 0],
						disabled: false,
						parameters: {},
					} as INode,
					{
						id: 'node-6',
						name: 'DisabledNode',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [1000, 0],
						disabled: true,
						parameters: {},
					} as INode,
				],
			});
			(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);

			const result = await preparePinData(
				'wf-1',
				user,
				workflowFinderService,
				executionService,
				nodeTypes,
				logger,
			);

			// Trigger: exec schema (via execution data), SlackNode: exec schema
			// GmailNode: definition schema, SetNode: skipped, HttpNode: no schema
			// DisabledNode: excluded from total
			expect(result.coverage.total).toBe(5); // 6 nodes minus 1 disabled
			expect(result.coverage.skipped).toBe(1); // SetNode
			expect(result.nodesSkipped).toContain('SetNode');
		});
	});

	describe('telemetry', () => {
		test('tracks success with coverage data', async () => {
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

			const tool = createPrepareTestPinDataTool(
				user,
				workflowFinderService,
				executionService,
				nodeTypes,
				telemetry,
				logger,
			);

			await tool.handler({ workflowId: 'wf-1' }, {} as any);

			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					user_id: 'user-1',
					tool_name: 'prepare_test_pin_data',
					parameters: { workflowId: 'wf-1' },
					results: expect.objectContaining({
						success: true,
						data: expect.objectContaining({ total: 1 }),
					}),
				}),
			);
		});

		test('tracks failure with error message', async () => {
			(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(null);

			const tool = createPrepareTestPinDataTool(
				user,
				workflowFinderService,
				executionService,
				nodeTypes,
				telemetry,
				logger,
			);

			await tool.handler({ workflowId: 'missing' }, {} as any);

			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					tool_name: 'prepare_test_pin_data',
					results: expect.objectContaining({
						success: false,
						error: expect.any(String),
					}),
				}),
			);
		});
	});

	describe('error handling via handler', () => {
		test('returns isError true with error message on failure', async () => {
			(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(null);

			const tool = createPrepareTestPinDataTool(
				user,
				workflowFinderService,
				executionService,
				nodeTypes,
				telemetry,
				logger,
			);

			const result = await tool.handler({ workflowId: 'missing' }, {} as any);

			expect(result.isError).toBe(true);
			expect(result.structuredContent).toMatchObject({
				error: expect.stringContaining("not found or you don't have permission"),
			});
		});
	});
});
