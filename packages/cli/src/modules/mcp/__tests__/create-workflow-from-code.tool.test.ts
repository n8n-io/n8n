import { mockInstance } from '@n8n/backend-test-utils';
import { ProjectRepository, SharedWorkflowRepository, User, WorkflowEntity } from '@n8n/db';
import type { INode } from 'n8n-workflow';

import { createCreateWorkflowFromCodeTool } from '../tools/workflow-builder/create-workflow-from-code.tool';

import { ProjectService } from '@/services/project.service.ee';
import { UrlService } from '@/services/url.service';
import { Telemetry } from '@/telemetry';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';

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
	CODE_BUILDER_SEARCH_NODES_TOOL: { toolName: 'search', displayTitle: 'Search' },
	CODE_BUILDER_GET_NODE_TYPES_TOOL: { toolName: 'get', displayTitle: 'Get' },
	CODE_BUILDER_GET_SUGGESTED_NODES_TOOL: { toolName: 'suggest', displayTitle: 'Suggest' },
	MCP_GET_SDK_REFERENCE_TOOL: { toolName: 'sdk_ref', displayTitle: 'SDK Ref' },
}));

jest.mock('@/generic-helpers', () => ({
	validateEntity: jest.fn(),
}));

jest.mock('@/workflow-helpers', () => ({
	replaceInvalidCredentials: jest.fn(),
	addNodeIds: jest.fn(),
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
	let projectRepository: ProjectRepository;
	let projectService: ProjectService;
	let sharedWorkflowRepository: SharedWorkflowRepository;
	let workflowHistoryService: WorkflowHistoryService;
	let urlService: UrlService;
	let telemetry: Telemetry;

	const mockTransactionManager = {
		save: jest.fn(),
	};

	beforeEach(() => {
		jest.clearAllMocks();

		projectRepository = mockInstance(ProjectRepository);
		projectService = mockInstance(ProjectService);
		sharedWorkflowRepository = mockInstance(SharedWorkflowRepository, {
			create: jest.fn().mockReturnValue({ role: 'workflow:owner' }),
		});
		workflowHistoryService = mockInstance(WorkflowHistoryService);
		urlService = mockInstance(UrlService, {
			getInstanceBaseUrl: jest.fn().mockReturnValue('https://n8n.example.com'),
		});
		telemetry = mockInstance(Telemetry, {
			track: jest.fn(),
		});

		mockParseAndValidate.mockResolvedValue({ workflow: mockWorkflowJson });
		mockStripImportStatements.mockImplementation((code: string) => code);

		// Mock transaction to execute callback and return a saved workflow
		(projectRepository as unknown as { manager: { transaction: jest.Mock } }).manager = {
			transaction: jest.fn().mockImplementation(async (cb: Function) => {
				return await cb(mockTransactionManager);
			}),
		};

		// Default: personal project resolution
		(projectRepository.getPersonalProjectForUserOrFail as jest.Mock).mockResolvedValue({
			id: 'personal-project-id',
		});

		// Default: project with scope returns project
		(projectService.getProjectWithScope as jest.Mock).mockResolvedValue({
			id: 'personal-project-id',
		});

		// Default: transaction save returns a workflow entity
		mockTransactionManager.save.mockImplementation((entity: unknown) => {
			if (entity instanceof WorkflowEntity) {
				return { ...entity, id: 'wf-saved-1' };
			}
			return entity;
		});
	});

	const createTool = () =>
		createCreateWorkflowFromCodeTool(
			user,
			projectRepository,
			projectService,
			sharedWorkflowRepository,
			workflowHistoryService,
			urlService,
			telemetry,
		);

	// Helper to call handler with proper typing (optional fields default to undefined)
	const callHandler = async (
		input: {
			code: string;
			name?: string;
			description?: string;
			projectId?: string;
		},
		tool = createTool(),
	) =>
		await tool.handler(
			{
				code: input.code,
				name: input.name as string,
				description: input.description as string,
				projectId: input.projectId as string,
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

			// Check the entity passed to transaction save
			const saveCall = mockTransactionManager.save.mock.calls[0][0];
			expect(saveCall).toBeInstanceOf(WorkflowEntity);
			expect(saveCall.active).toBe(false);
			expect(saveCall.settings).toEqual(
				expect.objectContaining({
					executionOrder: 'v1',
					availableInMCP: true,
				}),
			);
			expect(saveCall.meta).toEqual(
				expect.objectContaining({
					aiBuilderAssisted: true,
				}),
			);
			expect(saveCall.versionId).toBeDefined();
		});

		test('uses provided name over code name', async () => {
			await callHandler({ code: 'const wf = ...', name: 'My Custom Name' });

			const saveCall = mockTransactionManager.save.mock.calls[0][0];
			expect(saveCall.name).toBe('My Custom Name');
		});

		test('uses code name when no name provided', async () => {
			await callHandler({ code: 'const wf = ...' });

			const saveCall = mockTransactionManager.save.mock.calls[0][0];
			expect(saveCall.name).toBe('Code Workflow');
		});

		test('falls back to "Untitled Workflow" when neither name nor code name exists', async () => {
			mockParseAndValidate.mockResolvedValue({
				workflow: { ...mockWorkflowJson, name: undefined },
			});

			await callHandler({ code: 'const wf = ...' });

			const saveCall = mockTransactionManager.save.mock.calls[0][0];
			expect(saveCall.name).toBe('Untitled Workflow');
		});

		test('includes description when provided', async () => {
			await callHandler({ code: 'const wf = ...', description: 'A test workflow' });

			const saveCall = mockTransactionManager.save.mock.calls[0][0];
			expect(saveCall.description).toBe('A test workflow');
		});

		test('omits description when not provided', async () => {
			await callHandler({ code: 'const wf = ...' });

			const saveCall = mockTransactionManager.save.mock.calls[0][0];
			expect(saveCall.description).toBeUndefined();
		});

		test('uses personal project when projectId not provided', async () => {
			await callHandler({ code: 'const wf = ...' });

			expect(projectRepository.getPersonalProjectForUserOrFail).toHaveBeenCalledWith(
				'user-1',
				mockTransactionManager,
			);
			expect(projectService.getProjectWithScope).toHaveBeenCalledWith(
				user,
				'personal-project-id',
				['workflow:create'],
				mockTransactionManager,
			);
		});

		test('uses provided projectId instead of personal project', async () => {
			await callHandler({ code: 'const wf = ...', projectId: 'custom-project-id' });

			expect(projectRepository.getPersonalProjectForUserOrFail).not.toHaveBeenCalled();
			expect(projectService.getProjectWithScope).toHaveBeenCalledWith(
				user,
				'custom-project-id',
				['workflow:create'],
				mockTransactionManager,
			);
		});

		test('returns error when permission denied', async () => {
			(projectService.getProjectWithScope as jest.Mock).mockResolvedValue(null);

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
