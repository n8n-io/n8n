import { mockInstance } from '@n8n/backend-test-utils';
import { ProjectRepository, User, WorkflowEntity } from '@n8n/db';
import type { INode } from 'n8n-workflow';

import { createCreateWorkflowFromCodeTool } from '../tools/workflow-builder/create-workflow-from-code.tool';

import { CredentialsService } from '@/credentials/credentials.service';
import { NodeTypes } from '@/node-types';
import { UrlService } from '@/services/url.service';
import { Telemetry } from '@/telemetry';
import { WorkflowCreationService } from '@/workflows/workflow-creation.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

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
	MCP_ARCHIVE_WORKFLOW_TOOL: { toolName: 'archive_workflow', displayTitle: 'Archive Workflow' },
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
	name: 'Code Workflow',
	nodes: mockNodes,
	connections: {},
	settings: {},
	pinData: {},
	meta: {},
};

/** Parse the first text content item from a tool result */
const parseResult = (result: { content: Array<{ type: string; text?: string }> }) =>
	JSON.parse((result.content[0] as { type: 'text'; text: string }).text) as Record<string, unknown>;

describe('create-workflow-from-code MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	let workflowCreationService: WorkflowCreationService;
	let createWorkflowMock: jest.Mock;
	let urlService: UrlService;
	let telemetry: Telemetry;
	let nodeTypes: ReturnType<typeof mockInstance<NodeTypes>>;

	beforeEach(() => {
		jest.clearAllMocks();

		createWorkflowMock = jest
			.fn()
			.mockImplementation(async (_user, workflow) =>
				Object.assign(new WorkflowEntity(), { ...workflow, id: 'wf-saved-1' }),
			);
		workflowCreationService = mockInstance(WorkflowCreationService, {
			createWorkflow: createWorkflowMock,
		});
		urlService = mockInstance(UrlService, {
			getInstanceBaseUrl: jest.fn().mockReturnValue('https://n8n.example.com'),
		});
		telemetry = mockInstance(Telemetry, {
			track: jest.fn(),
		});
		nodeTypes = mockInstance(NodeTypes);

		mockParseAndValidate.mockResolvedValue({ workflow: mockWorkflowJson });
		mockStripImportStatements.mockImplementation((code: string) => code);
	});

	const credentialsService = mockInstance(CredentialsService, {
		getCredentialsAUserCanUseInAWorkflow: jest.fn().mockResolvedValue([]),
	});
	const projectRepository = mockInstance(ProjectRepository, {
		getPersonalProjectForUserOrFail: jest.fn().mockResolvedValue({ id: 'personal-project-1' }),
	});
	const workflowFinderService = mockInstance(WorkflowFinderService, {
		findWorkflowForUser: jest.fn().mockResolvedValue(null),
	});

	const createTool = () =>
		createCreateWorkflowFromCodeTool(
			user,
			workflowCreationService,
			workflowFinderService,
			urlService,
			telemetry,
			nodeTypes,
			credentialsService,
			projectRepository,
		);

	// Helper to call handler with proper typing (optional fields default to undefined)
	const callHandler = async (
		input: {
			code: string;
			name?: string;
			description?: string;
			projectId?: string;
			folderId?: string;
		},
		tool = createTool(),
	) =>
		await tool.handler(
			{
				code: input.code,
				name: input.name as string,
				description: input.description as string,
				projectId: input.projectId as string,
				folderId: input.folderId as string,
			},
			{} as never,
		);

	describe('smoke tests', () => {
		test('creates tool with correct name, config, and handler', () => {
			const tool = createTool();

			expect(tool.name).toBe('create_workflow_from_code');
			expect(tool.config).toBeDefined();
			expect(typeof tool.config.description).toBe('string');
			expect(tool.config.inputSchema).toBeDefined();
			expect(tool.config.annotations).toEqual(
				expect.objectContaining({
					readOnlyHint: false,
					destructiveHint: false,
					idempotentHint: false,
					openWorldHint: false,
				}),
			);
			expect(typeof tool.handler).toBe('function');
		});
	});

	describe('validation', () => {
		test('returns error when folderId is provided without projectId', async () => {
			const result = await callHandler({ code: 'const wf = ...', folderId: 'folder-1' });

			expect(result.isError).toBe(true);
			const response = parseResult(result);
			expect(response.error).toBe('projectId is required when folderId is provided');
		});
	});

	describe('handler tests', () => {
		test('successfully creates workflow and returns expected response', async () => {
			const result = await callHandler({ code: 'const wf = ...' });

			const response = parseResult(result);
			expect(response.workflowId).toBe('wf-saved-1');
			expect(response.name).toBeDefined();
			expect(response.nodeCount).toBe(2);
			expect(response.url).toBe('https://n8n.example.com/workflow/wf-saved-1');
			expect(result.isError).toBeUndefined();
		});

		test('sets correct workflow entity defaults', async () => {
			await callHandler({ code: 'const wf = ...' });

			const passedWorkflow = createWorkflowMock.mock.calls[0][1] as WorkflowEntity;
			expect(passedWorkflow).toBeInstanceOf(WorkflowEntity);
			expect(passedWorkflow.settings).toEqual(
				expect.objectContaining({
					executionOrder: 'v1',
					availableInMCP: true,
				}),
			);
			expect(passedWorkflow.meta).toEqual(
				expect.objectContaining({
					aiBuilderAssisted: true,
				}),
			);
		});

		test('uses provided name over code name', async () => {
			await callHandler({ code: 'const wf = ...', name: 'My Custom Name' });

			expect(createWorkflowMock.mock.calls[0][1].name).toBe('My Custom Name');
		});

		test('uses code name when no name provided', async () => {
			await callHandler({ code: 'const wf = ...' });

			expect(createWorkflowMock.mock.calls[0][1].name).toBe('Code Workflow');
		});

		test('falls back to "Untitled Workflow" when neither name nor code name exists', async () => {
			mockParseAndValidate.mockResolvedValue({
				workflow: { ...mockWorkflowJson, name: undefined },
			});

			await callHandler({ code: 'const wf = ...' });

			expect(createWorkflowMock.mock.calls[0][1].name).toBe('Untitled Workflow');
		});

		test('includes description when provided', async () => {
			await callHandler({ code: 'const wf = ...', description: 'A test workflow' });

			expect(createWorkflowMock.mock.calls[0][1].description).toBe('A test workflow');
		});

		test('omits description when not provided', async () => {
			await callHandler({ code: 'const wf = ...' });

			expect(createWorkflowMock.mock.calls[0][1].description).toBeUndefined();
		});

		test('passes undefined projectId to service when not provided', async () => {
			await callHandler({ code: 'const wf = ...' });

			expect(workflowCreationService.createWorkflow).toHaveBeenCalledWith(
				user,
				expect.any(WorkflowEntity),
				{ projectId: undefined, source: 'n8n-mcp' },
			);
		});

		test('passes provided projectId to service', async () => {
			await callHandler({ code: 'const wf = ...', projectId: 'custom-project-id' });

			expect(workflowCreationService.createWorkflow).toHaveBeenCalledWith(
				user,
				expect.any(WorkflowEntity),
				{ projectId: 'custom-project-id', source: 'n8n-mcp' },
			);
		});

		test('returns error when service throws permission error', async () => {
			createWorkflowMock.mockRejectedValue(
				new Error("You don't have the permissions to save the workflow in this project."),
			);

			const result = await callHandler({ code: 'const wf = ...' });

			const response = parseResult(result);
			expect(result.isError).toBe(true);
			expect(response.error).toContain("don't have the permissions");
		});

		test('returns error when parse fails', async () => {
			mockParseAndValidate.mockRejectedValue(new Error('Invalid syntax at line 5'));

			const result = await callHandler({ code: 'bad code' });

			const response = parseResult(result);
			expect(result.isError).toBe(true);
			expect(response.error).toBe('Invalid syntax at line 5');
		});

		test('includes SDK reference hint only for parse errors', async () => {
			const parseError = new Error('Failed to parse generated workflow code: unexpected token');
			parseError.name = 'WorkflowCodeParseError';
			mockParseAndValidate.mockRejectedValue(parseError);

			const result = await callHandler({ code: 'bad code' });

			const response = parseResult(result);
			expect(response.hint).toContain('sdk_ref');
		});

		test('does not include SDK reference hint for non-parse errors', async () => {
			mockParseAndValidate.mockRejectedValue(new Error('Permission denied'));

			const result = await callHandler({ code: 'bad code' });

			const response = parseResult(result);
			expect(response.hint).toBeUndefined();
		});

		test('tracks telemetry on success', async () => {
			await callHandler({ code: 'const wf = ...' });

			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					user_id: 'user-1',
					tool_name: 'create_workflow_from_code',
					results: expect.objectContaining({
						success: true,
						data: expect.objectContaining({
							workflowId: 'wf-saved-1',
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

			await callHandler({ code: 'const wf = ...' });

			const savedWorkflow = createWorkflowMock.mock.calls[0][1] as WorkflowEntity;
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

			await callHandler({ code: 'bad code' });

			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					user_id: 'user-1',
					tool_name: 'create_workflow_from_code',
					results: expect.objectContaining({
						success: false,
						error: 'Parse failed',
					}),
				}),
			);
		});
	});
});
