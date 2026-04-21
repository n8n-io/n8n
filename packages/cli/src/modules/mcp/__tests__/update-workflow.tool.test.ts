import { mockInstance } from '@n8n/backend-test-utils';
import { SharedWorkflowRepository, User, WorkflowEntity } from '@n8n/db';
import type { INode } from 'n8n-workflow';

import { createUpdateWorkflowTool } from '../tools/workflow-builder/update-workflow.tool';

import { CredentialsService } from '@/credentials/credentials.service';
import { NodeTypes } from '@/node-types';
import { UrlService } from '@/services/url.service';
import { Telemetry } from '@/telemetry';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowService } from '@/workflows/workflow.service';

// Mock credentials auto-assign
const mockAutoPopulateNodeCredentials = jest.fn();
jest.mock('../tools/workflow-builder/credentials-auto-assign', () => ({
	autoPopulateNodeCredentials: (...args: unknown[]) =>
		mockAutoPopulateNodeCredentials(...args) as unknown,
	stripNullCredentialStubs: jest.fn(),
}));

// Mock dynamic imports
const mockParseAndValidate = jest.fn();
const mockStripImportStatements = jest.fn((code: string) => code);

jest.mock('@n8n/ai-workflow-builder', () => ({
	ParseValidateHandler: jest.fn().mockImplementation(() => ({
		parseAndValidate: mockParseAndValidate,
	})),
	stripImportStatements: (code: string) => mockStripImportStatements(code),
	CODE_BUILDER_VALIDATE_TOOL: { toolName: 'validate_workflow_code', displayTitle: 'Validate' },
	MCP_CREATE_WORKFLOW_FROM_CODE_TOOL: {
		toolName: 'create_workflow_from_code',
		displayTitle: 'Create Workflow from Code',
	},
	MCP_DELETE_WORKFLOW_TOOL: { toolName: 'delete_workflow', displayTitle: 'Delete Workflow' },
	MCP_UPDATE_WORKFLOW_TOOL: {
		toolName: 'update_workflow',
		displayTitle: 'Update Workflow',
	},
	CODE_BUILDER_SEARCH_NODES_TOOL: { toolName: 'search', displayTitle: 'Search' },
	CODE_BUILDER_GET_NODE_TYPES_TOOL: { toolName: 'get', displayTitle: 'Get' },
	CODE_BUILDER_GET_SUGGESTED_NODES_TOOL: { toolName: 'suggest', displayTitle: 'Suggest' },
	MCP_GET_SDK_REFERENCE_TOOL: { toolName: 'sdk_ref', displayTitle: 'SDK Ref' },
}));

const mockNodes: INode[] = [
	{
		id: 'node-1',
		name: 'Webhook',
		type: 'n8n-nodes-base.webhook',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	},
	{
		id: 'node-2',
		name: 'Set',
		type: 'n8n-nodes-base.set',
		typeVersion: 1,
		position: [200, 0],
		parameters: {},
	},
];

const mockWorkflowJson = {
	name: 'Updated Workflow',
	nodes: mockNodes,
	connections: {},
	settings: { saveManualExecutions: true },
	pinData: {},
	meta: {},
};

/** Parse the first text content item from a tool result */
const parseResult = (result: { content: Array<{ type: string; text?: string }> }) =>
	JSON.parse((result.content[0] as { type: 'text'; text: string }).text) as Record<string, unknown>;

describe('update-workflow MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	let workflowFinderService: WorkflowFinderService;
	let findWorkflowMock: jest.Mock;
	let workflowService: WorkflowService;
	let updateMock: jest.Mock;
	let urlService: UrlService;
	let telemetry: Telemetry;
	let credentialsService: CredentialsService;
	let sharedWorkflowRepository: SharedWorkflowRepository;
	let nodeTypes: ReturnType<typeof mockInstance<NodeTypes>>;

	const mockExistingWorkflow = Object.assign(new WorkflowEntity(), {
		id: 'wf-1',
		name: 'Existing Workflow',
		nodes: [] as INode[],
		settings: { availableInMCP: true },
	});

	beforeEach(() => {
		jest.clearAllMocks();

		findWorkflowMock = jest.fn().mockResolvedValue(mockExistingWorkflow);
		workflowFinderService = mockInstance(WorkflowFinderService, {
			findWorkflowForUser: findWorkflowMock,
		});
		updateMock = jest
			.fn()
			.mockImplementation(async (_user, workflow, workflowId) =>
				Object.assign(new WorkflowEntity(), { ...workflow, id: workflowId }),
			);
		workflowService = mockInstance(WorkflowService, {
			update: updateMock,
		});
		urlService = mockInstance(UrlService, {
			getInstanceBaseUrl: jest.fn().mockReturnValue('https://n8n.example.com'),
		});
		telemetry = mockInstance(Telemetry, {
			track: jest.fn(),
		});
		credentialsService = mockInstance(CredentialsService);
		sharedWorkflowRepository = mockInstance(SharedWorkflowRepository, {
			findOneOrFail: jest.fn().mockResolvedValue({ projectId: 'project-1' }),
		});
		nodeTypes = mockInstance(NodeTypes);

		mockParseAndValidate.mockImplementation(async () => ({
			workflow: { ...mockWorkflowJson, nodes: mockNodes.map((n) => ({ ...n })) },
		}));
		mockStripImportStatements.mockImplementation((code: string) => code);
		mockAutoPopulateNodeCredentials.mockResolvedValue({ assignments: [], skippedHttpNodes: [] });
	});

	const createTool = () =>
		createUpdateWorkflowTool(
			user,
			workflowFinderService,
			workflowService,
			urlService,
			telemetry,
			nodeTypes,
			credentialsService,
			sharedWorkflowRepository,
		);

	// Helper to call handler with proper typing (optional fields default to undefined)
	const callHandler = async (
		input: {
			workflowId: string;
			code: string;
			name?: string;
			description?: string;
		},
		tool = createTool(),
	) =>
		await tool.handler(
			{
				workflowId: input.workflowId,
				code: input.code,
				name: input.name as string,
				description: input.description as string,
			},
			{} as never,
		);

	describe('smoke tests', () => {
		test('creates tool with correct name, config, and handler', () => {
			const tool = createTool();

			expect(tool.name).toBe('update_workflow');
			expect(tool.config).toBeDefined();
			expect(typeof tool.config.description).toBe('string');
			expect(tool.config.inputSchema).toBeDefined();
			expect(tool.config.annotations).toEqual(
				expect.objectContaining({
					readOnlyHint: false,
					destructiveHint: true,
					idempotentHint: true,
					openWorldHint: false,
				}),
			);
			expect(typeof tool.handler).toBe('function');
		});
	});

	describe('handler tests', () => {
		test('successfully updates workflow and returns expected response', async () => {
			const result = await callHandler({ workflowId: 'wf-1', code: 'const wf = ...' });

			const response = parseResult(result);
			expect(response.workflowId).toBe('wf-1');
			expect(response.name).toBeDefined();
			expect(response.nodeCount).toBe(2);
			expect(response.url).toBe('https://n8n.example.com/workflow/wf-1');
			expect(response.autoAssignedCredentials).toEqual([]);
			expect(result.isError).toBeUndefined();
		});

		test('sets correct workflow entity defaults', async () => {
			await callHandler({ workflowId: 'wf-1', code: 'const wf = ...' });

			const passedWorkflow = updateMock.mock.calls[0][1] as WorkflowEntity;
			expect(passedWorkflow).toBeInstanceOf(WorkflowEntity);
			expect(passedWorkflow.meta).toEqual(
				expect.objectContaining({
					aiBuilderAssisted: true,
				}),
			);
		});

		test('ignores settings from parsed code', async () => {
			await callHandler({ workflowId: 'wf-1', code: 'const wf = ...' });

			const passedWorkflow = updateMock.mock.calls[0][1] as WorkflowEntity;
			expect(passedWorkflow.settings).toBeUndefined();
		});

		test('uses provided name over code name', async () => {
			await callHandler({ workflowId: 'wf-1', code: 'const wf = ...', name: 'My Custom Name' });

			expect(updateMock.mock.calls[0][1].name).toBe('My Custom Name');
		});

		test('uses code name when no name provided', async () => {
			await callHandler({ workflowId: 'wf-1', code: 'const wf = ...' });

			expect(updateMock.mock.calls[0][1].name).toBe('Updated Workflow');
		});

		test('includes description when provided', async () => {
			await callHandler({
				workflowId: 'wf-1',
				code: 'const wf = ...',
				description: 'A test workflow',
			});

			expect(updateMock.mock.calls[0][1].description).toBe('A test workflow');
		});

		test('omits description when not provided', async () => {
			await callHandler({ workflowId: 'wf-1', code: 'const wf = ...' });

			expect(updateMock.mock.calls[0][1].description).toBeUndefined();
		});

		test('passes correct workflowId to service', async () => {
			await callHandler({ workflowId: 'custom-wf-id', code: 'const wf = ...' });

			expect(workflowService.update).toHaveBeenCalledWith(
				user,
				expect.any(WorkflowEntity),
				'custom-wf-id',
				{ aiBuilderAssisted: true },
			);
		});

		test('propagates errors from getMcpWorkflow', async () => {
			findWorkflowMock.mockResolvedValue(null);

			const result = await callHandler({ workflowId: 'wf-missing', code: 'const wf = ...' });

			const response = parseResult(result);
			expect(result.isError).toBe(true);
			expect(response.error).toBe("Workflow not found or you don't have permission to access it.");
		});

		test('returns error when parse fails', async () => {
			mockParseAndValidate.mockRejectedValue(new Error('Invalid syntax at line 5'));

			const result = await callHandler({ workflowId: 'wf-1', code: 'bad code' });

			const response = parseResult(result);
			expect(result.isError).toBe(true);
			expect(response.error).toBe('Invalid syntax at line 5');
		});

		test('includes SDK reference hint only for parse errors', async () => {
			const parseError = new Error('Failed to parse generated workflow code: unexpected token');
			parseError.name = 'WorkflowCodeParseError';
			mockParseAndValidate.mockRejectedValue(parseError);

			const result = await callHandler({ workflowId: 'wf-1', code: 'bad code' });

			const response = parseResult(result);
			expect(response.hint).toContain('sdk_ref');
		});

		test('does not include SDK reference hint for non-parse errors', async () => {
			mockParseAndValidate.mockRejectedValue(new Error('Service unavailable'));

			const result = await callHandler({ workflowId: 'wf-1', code: 'bad code' });

			const response = parseResult(result);
			expect(response.hint).toBeUndefined();
		});

		test('tracks telemetry on success', async () => {
			await callHandler({ workflowId: 'wf-1', code: 'const wf = ...' });

			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					user_id: 'user-1',
					tool_name: 'update_workflow',
					results: expect.objectContaining({
						success: true,
						data: expect.objectContaining({
							workflowId: 'wf-1',
							nodeCount: 2,
						}),
					}),
				}),
			);
		});

		test('assigns webhookId to webhook nodes before saving', async () => {
			nodeTypes.getByNameAndVersion.mockImplementation(((type: string) => {
				if (type === 'n8n-nodes-base.webhook') {
					return { description: { webhooks: [{ httpMethod: 'GET', path: '' }] } };
				}
				return { description: {} };
			}) as typeof nodeTypes.getByNameAndVersion);

			await callHandler({ workflowId: 'wf-1', code: 'const wf = ...' });

			const savedWorkflow = updateMock.mock.calls[0][1] as WorkflowEntity;
			const webhookNode = savedWorkflow.nodes.find(
				(n: INode) => n.type === 'n8n-nodes-base.webhook',
			);
			const setNode = savedWorkflow.nodes.find((n: INode) => n.type === 'n8n-nodes-base.set');

			expect(webhookNode!.webhookId).toBeDefined();
			expect(typeof webhookNode!.webhookId).toBe('string');
			expect(setNode!.webhookId).toBeUndefined();
		});

		test('tracks telemetry on failure', async () => {
			mockParseAndValidate.mockRejectedValue(new Error('Parse failed'));

			await callHandler({ workflowId: 'wf-1', code: 'bad code' });

			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					user_id: 'user-1',
					tool_name: 'update_workflow',
					results: expect.objectContaining({
						success: false,
						error: 'Parse failed',
					}),
				}),
			);
		});

		test('calls autoPopulateNodeCredentials with correct arguments', async () => {
			await callHandler({ workflowId: 'wf-1', code: 'const wf = ...' });

			expect(mockAutoPopulateNodeCredentials).toHaveBeenCalledWith(
				expect.any(WorkflowEntity),
				user,
				nodeTypes,
				credentialsService,
				'project-1',
			);
		});

		test('includes auto-assigned credentials in response', async () => {
			mockAutoPopulateNodeCredentials.mockResolvedValue({
				assignments: [
					{ nodeName: 'Webhook', credentialName: 'My Cred', credentialType: 'webhookAuth' },
				],
				skippedHttpNodes: [],
			});

			const result = await callHandler({ workflowId: 'wf-1', code: 'const wf = ...' });

			const response = parseResult(result);
			expect(response.autoAssignedCredentials).toEqual([
				{ nodeName: 'Webhook', credentialName: 'My Cred', credentialType: 'webhookAuth' },
			]);
			expect(response.note).toBeUndefined();
		});

		test('includes note about skipped HTTP nodes', async () => {
			mockAutoPopulateNodeCredentials.mockResolvedValue({
				assignments: [],
				skippedHttpNodes: ['HTTP Request', 'HTTP Request1'],
			});

			const result = await callHandler({ workflowId: 'wf-1', code: 'const wf = ...' });

			const response = parseResult(result);
			expect(response.note).toBe(
				'HTTP Request nodes (HTTP Request, HTTP Request1) were skipped during credential auto-assignment. Their credentials must be configured manually.',
			);
		});

		describe('credential preservation from existing workflow', () => {
			test('copies credentials from existing node when name and type match and updated node has none', async () => {
				findWorkflowMock.mockResolvedValue(
					Object.assign(new WorkflowEntity(), {
						id: 'wf-1',
						name: 'Existing Workflow',
						settings: { availableInMCP: true },
						nodes: [
							{
								id: 'node-2',
								name: 'Set',
								type: 'n8n-nodes-base.set',
								typeVersion: 1,
								position: [200, 0] as [number, number],
								parameters: {},
								credentials: { setApi: { id: 'cred-1', name: 'My Set Cred' } },
							},
						] as INode[],
					}),
				);

				await callHandler({ workflowId: 'wf-1', code: 'const wf = ...' });

				const savedWorkflow = updateMock.mock.calls[0][1] as WorkflowEntity;
				const setNode = savedWorkflow.nodes.find((n: INode) => n.name === 'Set');
				expect(setNode!.credentials).toEqual({ setApi: { id: 'cred-1', name: 'My Set Cred' } });
			});

			test('does not copy credentials when node type differs', async () => {
				findWorkflowMock.mockResolvedValue(
					Object.assign(new WorkflowEntity(), {
						id: 'wf-1',
						name: 'Existing Workflow',
						settings: { availableInMCP: true },
						nodes: [
							{
								id: 'node-2',
								name: 'Set',
								type: 'n8n-nodes-base.differentType',
								typeVersion: 1,
								position: [200, 0] as [number, number],
								parameters: {},
								credentials: { setApi: { id: 'cred-1', name: 'My Set Cred' } },
							},
						] as INode[],
					}),
				);

				await callHandler({ workflowId: 'wf-1', code: 'const wf = ...' });

				const savedWorkflow = updateMock.mock.calls[0][1] as WorkflowEntity;
				const setNode = savedWorkflow.nodes.find((n: INode) => n.name === 'Set');
				expect(setNode!.credentials).toBeUndefined();
			});

			test('does not overwrite credentials already set on the updated node', async () => {
				const newNodeCredentials = { setApi: { id: 'cred-new', name: 'New Cred' } };
				mockParseAndValidate.mockResolvedValue({
					workflow: {
						...mockWorkflowJson,
						nodes: mockNodes.map((n) =>
							n.name === 'Set' ? { ...n, credentials: newNodeCredentials } : n,
						),
					},
				});
				findWorkflowMock.mockResolvedValue(
					Object.assign(new WorkflowEntity(), {
						id: 'wf-1',
						name: 'Existing Workflow',
						settings: { availableInMCP: true },
						nodes: [
							{
								id: 'node-2',
								name: 'Set',
								type: 'n8n-nodes-base.set',
								typeVersion: 1,
								position: [200, 0] as [number, number],
								parameters: {},
								credentials: { setApi: { id: 'cred-old', name: 'Old Cred' } },
							},
						] as INode[],
					}),
				);

				await callHandler({ workflowId: 'wf-1', code: 'const wf = ...' });

				const savedWorkflow = updateMock.mock.calls[0][1] as WorkflowEntity;
				const setNode = savedWorkflow.nodes.find((n: INode) => n.name === 'Set');
				expect(setNode!.credentials).toEqual(newNodeCredentials);
			});

			test('handles existing workflow with no nodes without error', async () => {
				// mockExistingWorkflow already has nodes: [] — verify no crash and no credentials copied
				await callHandler({ workflowId: 'wf-1', code: 'const wf = ...' });

				const savedWorkflow = updateMock.mock.calls[0][1] as WorkflowEntity;
				for (const node of savedWorkflow.nodes) {
					expect(node.credentials).toBeUndefined();
				}
			});
		});
	});
});
