import type { Mock } from 'vitest';
import { mockInstance } from '@n8n/backend-test-utils';
import { ProjectRepository, User, WorkflowEntity } from '@n8n/db';
import { NodeConnectionTypes, type INode } from 'n8n-workflow';
import { z } from 'zod';

import { CredentialsService } from '@/credentials/credentials.service';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { NodeTypes } from '@/node-types';
import { UrlService } from '@/services/url.service';
import { Telemetry } from '@/telemetry';
import { WorkflowCreationService } from '@/workflows/workflow-creation.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { createCreateWorkflowFromCodeTool } from '../tools/workflow-builder/create-workflow-from-code.tool';

// Mocks referenced inside vi.mock factories must come from vi.hoisted, otherwise the
// factory (hoisted above these declarations) silently loads the real module.
const { mockAutoPopulateNodeCredentials, mockParseAndValidate, mockStripImportStatements } =
	vi.hoisted(() => ({
		mockAutoPopulateNodeCredentials: vi.fn(),
		mockParseAndValidate: vi.fn(),
		mockStripImportStatements: vi.fn((code: string) => code),
	}));

// Mock credentials auto-assign
vi.mock('../tools/workflow-builder/credentials-auto-assign', () => ({
	autoPopulateNodeCredentials: (...args: unknown[]) =>
		mockAutoPopulateNodeCredentials(...args) as unknown,
	stripNullCredentialStubs: vi.fn(),
}));

// Mock dynamic imports
vi.mock('@n8n/ai-workflow-builder', () => ({
	ParseValidateHandler: vi.fn(function () {
		return { parseAndValidate: mockParseAndValidate };
	}),
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

type DataTableOpsMock = {
	getManyAndCount: Mock;
};

describe('create-workflow-from-code MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	let workflowCreationService: WorkflowCreationService;
	let createWorkflowMock: Mock;
	let urlService: UrlService;
	let telemetry: Telemetry;
	let nodeTypes: ReturnType<typeof mockInstance<NodeTypes>>;
	let dataTableOps: DataTableOpsMock;

	beforeEach(() => {
		vi.clearAllMocks();

		createWorkflowMock = vi
			.fn()
			.mockImplementation(async (_user, workflow) =>
				Object.assign(new WorkflowEntity(), { ...workflow, id: 'wf-saved-1' }),
			);
		workflowCreationService = mockInstance(WorkflowCreationService, {
			createWorkflow: createWorkflowMock,
		});
		urlService = mockInstance(UrlService, {
			getInstanceBaseUrl: vi.fn().mockReturnValue('https://n8n.example.com'),
		});
		telemetry = mockInstance(Telemetry, {
			track: vi.fn(),
		});
		nodeTypes = mockInstance(NodeTypes);
		nodeTypes.getByNameAndVersion.mockImplementation(((type: string) => {
			if (type === '@n8n/n8n-nodes-langchain.agent') {
				return { description: { outputs: [NodeConnectionTypes.Main] } };
			}
			if (type === '@n8n/n8n-nodes-langchain.agentTool') {
				return { description: { outputs: [NodeConnectionTypes.AiTool] } };
			}
			return { description: {} };
		}) as typeof nodeTypes.getByNameAndVersion);

		mockParseAndValidate.mockResolvedValue({ workflow: mockWorkflowJson, warnings: [] });
		mockStripImportStatements.mockImplementation((code: string) => code);
		mockAutoPopulateNodeCredentials.mockResolvedValue({ assignments: [], skippedHttpNodes: [] });

		dataTableOps = {
			getManyAndCount: vi.fn().mockResolvedValue({ data: [], count: 0 }),
		};
	});

	const credentialsService = mockInstance(CredentialsService, {
		getCredentialsAUserCanUseInAWorkflow: vi.fn().mockResolvedValue([]),
	});
	const personalProjectEntity = {
		id: 'personal-project-1',
		name: 'Ricardo Espinoza',
		type: 'personal' as const,
	};
	const projectRepository = mockInstance(ProjectRepository, {
		getPersonalProjectForUserOrFail: vi.fn().mockResolvedValue(personalProjectEntity),
		findOneBy: vi.fn().mockImplementation(async ({ id }: { id: string }) => {
			if (id === 'personal-project-1') return personalProjectEntity;
			if (id === 'custom-project-id') {
				return { id: 'custom-project-id', name: 'Marketing', type: 'team' as const };
			}
			return null;
		}),
	});
	const workflowFinderService = mockInstance(WorkflowFinderService, {
		findWorkflowForUser: vi.fn().mockResolvedValue(null),
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
			dataTableOps as never,
		);

	// Helper to call handler with proper typing (optional fields default to undefined)
	const callHandler = async (
		input: {
			code: string;
			skillsUsed?: string[];
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
				skillsUsed: input.skillsUsed,
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

		test('surfaces validation warnings in the response', async () => {
			const warning = {
				code: 'INVALID_OUTPUT_INDEX',
				message: "'Fetch Google' has a connection from its error output (index 1).",
				nodeName: 'Fetch Google',
			};
			mockParseAndValidate.mockResolvedValue({ workflow: mockWorkflowJson, warnings: [warning] });

			const result = await callHandler({ code: 'const wf = ...' });

			const response = parseResult(result);
			expect(response.warnings).toEqual([warning]);
			expect(result.isError).toBeUndefined();
		});

		test('omits the warnings field when validation produced none', async () => {
			mockParseAndValidate.mockResolvedValue({ workflow: mockWorkflowJson, warnings: [] });

			const result = await callHandler({ code: 'const wf = ...' });

			const response = parseResult(result);
			expect(response).not.toHaveProperty('warnings');
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
				warnings: [],
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

		test('resolves the personal project id and passes it to the service when projectId is not provided', async () => {
			await callHandler({ code: 'const wf = ...' });

			expect(workflowCreationService.createWorkflow).toHaveBeenCalledWith(
				user,
				expect.any(WorkflowEntity),
				{ projectId: 'personal-project-1', source: 'n8n-mcp' },
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

		test('reports targetProject as the personal project when projectId is omitted', async () => {
			const result = await callHandler({ code: 'const wf = ...' });

			const response = parseResult(result);
			expect(response.targetProject).toEqual({
				id: 'personal-project-1',
				name: 'Ricardo Espinoza',
				type: 'personal',
			});
		});

		test('reports targetProject as the requested project when projectId is provided', async () => {
			const result = await callHandler({
				code: 'const wf = ...',
				projectId: 'custom-project-id',
			});

			const response = parseResult(result);
			expect(response.targetProject).toEqual({
				id: 'custom-project-id',
				name: 'Marketing',
				type: 'team',
			});
		});

		test('returns a clear error when the provided projectId does not exist', async () => {
			const result = await callHandler({
				code: 'const wf = ...',
				projectId: 'missing-project-id',
			});

			const response = parseResult(result);
			expect(result.isError).toBe(true);
			expect(response.error).toContain('missing-project-id');
			expect(response.error).toContain('search_projects');
			expect(workflowCreationService.createWorkflow).not.toHaveBeenCalled();
		});

		test('includes targetProject in recovery output when post-save errors but workflow persists', async () => {
			createWorkflowMock.mockImplementation(async (_user, workflow: WorkflowEntity) => {
				workflow.id = 'wf-recovery-1';
				throw new Error('Post-save hook failed');
			});
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValueOnce({
				id: 'wf-recovery-1',
				name: 'Recovered',
				nodes: mockNodes,
			});

			const result = await callHandler({
				code: 'const wf = ...',
				projectId: 'custom-project-id',
			});

			const response = parseResult(result);
			expect(response.workflowId).toBe('wf-recovery-1');
			expect(response.targetProject).toEqual({
				id: 'custom-project-id',
				name: 'Marketing',
				type: 'team',
			});
			expect(response.note).toContain('post-save operation failed');
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
			expect(response.hint).toContain('Workflow SDK reference');
			expect(response.hint).toContain('validate_workflow_code until it returns valid=true');
			expect(response.hint).toContain('create_workflow_from_code again');
		});

		test('does not include SDK reference hint for non-parse errors', async () => {
			mockParseAndValidate.mockRejectedValue(new Error('Permission denied'));

			const result = await callHandler({ code: 'bad code' });

			const response = parseResult(result);
			expect(response.hint).toBeUndefined();
		});

		test('tracks telemetry on success', async () => {
			await callHandler({ code: 'const wf = ...', skillsUsed: ['workflow-builder'] });

			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					user_id: 'user-1',
					tool_name: 'create_workflow_from_code',
					parameters: expect.objectContaining({
						skillsUsed: ['workflow-builder'],
					}),
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

		test('omits skillsUsed from telemetry when not provided', async () => {
			await callHandler({ code: 'const wf = ...' });

			const trackedPayload = (telemetry.track as Mock).mock.calls[0][1] as {
				parameters: Record<string, unknown>;
			};
			expect(trackedPayload.parameters).not.toHaveProperty('skillsUsed');
		});

		test('omits skillsUsed from telemetry when an empty array is passed', async () => {
			await callHandler({ code: 'const wf = ...', skillsUsed: [] });

			const trackedPayload = (telemetry.track as Mock).mock.calls[0][1] as {
				parameters: Record<string, unknown>;
			};
			expect(trackedPayload.parameters).not.toHaveProperty('skillsUsed');
		});

		test('normalizes skillsUsed before tracking telemetry', async () => {
			await callHandler({
				code: 'const wf = ...',
				skillsUsed: ['  Workflow-Builder  ', 'workflow-builder', 'has spaces', 'NODE-SELECTION'],
			});

			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					parameters: expect.objectContaining({
						skillsUsed: ['workflow-builder', 'node-selection'],
					}),
				}),
			);
		});

		test('does not reject the call when skillsUsed overflows the cap', async () => {
			const oversized = Array.from({ length: 60 }, (_, i) => `skill-${i}`);
			const result = await callHandler({ code: 'const wf = ...', skillsUsed: oversized });

			expect(result.isError).toBeUndefined();
			const trackedPayload = (telemetry.track as Mock).mock.calls[0][1] as {
				parameters: { skillsUsed: string[] };
			};
			expect(trackedPayload.parameters.skillsUsed).toHaveLength(50);
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

		describe('data table validation', () => {
			const dataTableLocator = (mode: 'id' | 'name' | 'list', value: string) => ({
				__rl: true as const,
				mode,
				value,
			});

			const dataTableNode = (dataTableId: ReturnType<typeof dataTableLocator>): INode => ({
				id: 'dt-1',
				name: 'Data table',
				type: 'n8n-nodes-base.dataTable',
				typeVersion: 1,
				position: [200, 0],
				parameters: { dataTableId },
			});

			test('rejects workflow whose data table id does not exist', async () => {
				mockParseAndValidate.mockResolvedValue({
					warnings: [],
					workflow: {
						...mockWorkflowJson,
						nodes: [dataTableNode(dataTableLocator('id', 'missing'))],
					},
				});

				const result = await callHandler({ code: 'const wf = ...' });

				const response = parseResult(result);
				expect(result.isError).toBe(true);
				expect(response.error).toContain("data table with id 'missing' not found");
				expect(response.error).toContain('create_data_table');
				expect(workflowCreationService.createWorkflow).not.toHaveBeenCalled();
			});

			test('rejects workflow whose data table name does not exist', async () => {
				mockParseAndValidate.mockResolvedValue({
					warnings: [],
					workflow: {
						...mockWorkflowJson,
						nodes: [dataTableNode(dataTableLocator('name', 'missing-table'))],
					},
				});

				const result = await callHandler({ code: 'const wf = ...' });

				const response = parseResult(result);
				expect(result.isError).toBe(true);
				expect(response.error).toContain("data table with name 'missing-table' not found");
				expect(workflowCreationService.createWorkflow).not.toHaveBeenCalled();
			});

			test('accepts workflow whose data table id resolves in the project', async () => {
				dataTableOps.getManyAndCount.mockResolvedValue({
					data: [{ id: 'dt-existing', name: 'Existing', projectId: 'personal-project-1' }],
					count: 1,
				});
				mockParseAndValidate.mockResolvedValue({
					warnings: [],
					workflow: {
						...mockWorkflowJson,
						nodes: [dataTableNode(dataTableLocator('id', 'dt-existing'))],
					},
				});

				const result = await callHandler({ code: 'const wf = ...' });

				expect(result.isError).toBeUndefined();
				expect(workflowCreationService.createWorkflow).toHaveBeenCalled();
				expect(dataTableOps.getManyAndCount).toHaveBeenCalledWith(
					expect.objectContaining({
						filter: { id: 'dt-existing', projectId: 'personal-project-1' },
						take: 1,
					}),
				);
			});

			test('looks up against the explicit projectId when provided', async () => {
				dataTableOps.getManyAndCount.mockResolvedValue({
					data: [{ id: 'dt-existing', name: 'Existing', projectId: 'custom-project-id' }],
					count: 1,
				});
				mockParseAndValidate.mockResolvedValue({
					warnings: [],
					workflow: {
						...mockWorkflowJson,
						nodes: [dataTableNode(dataTableLocator('id', 'dt-existing'))],
					},
				});

				await callHandler({ code: 'const wf = ...', projectId: 'custom-project-id' });

				expect(dataTableOps.getManyAndCount).toHaveBeenCalledWith(
					expect.objectContaining({
						filter: { id: 'dt-existing', projectId: 'custom-project-id' },
					}),
				);
			});

			test('skips validation for non-data-table nodes', async () => {
				const result = await callHandler({ code: 'const wf = ...' });

				expect(result.isError).toBeUndefined();
				expect(dataTableOps.getManyAndCount).not.toHaveBeenCalled();
			});

			test('skips validation when dataTableId is an expression', async () => {
				mockParseAndValidate.mockResolvedValue({
					warnings: [],
					workflow: {
						...mockWorkflowJson,
						nodes: [dataTableNode(dataTableLocator('id', '={{ $json.id }}'))],
					},
				});

				const result = await callHandler({ code: 'const wf = ...' });

				expect(result.isError).toBeUndefined();
				expect(dataTableOps.getManyAndCount).not.toHaveBeenCalled();
			});
		});

		describe('credential validation', () => {
			const httpNodeWithGithub = (credentialId: string): INode => ({
				id: 'http-1',
				name: 'Fetch PR Comments',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4,
				position: [0, 0],
				parameters: {
					authentication: 'predefinedCredentialType',
					nodeCredentialType: 'githubApi',
				},
				credentials: { githubApi: { id: credentialId, name: 'GitHub account' } },
			});

			afterEach(() => {
				// Restore module-scoped defaults so later suites aren't polluted.
				(credentialsService.getCredentialsAUserCanUseInAWorkflow as Mock).mockResolvedValue([]);
				(credentialsService.getOne as Mock).mockReset();
			});

			test('rejects a credential id that belongs to another project', async () => {
				(credentialsService.getCredentialsAUserCanUseInAWorkflow as Mock).mockResolvedValue([]);
				(credentialsService.getOne as Mock).mockResolvedValue({
					id: '6CoUMkVOJRNsbmr2',
					name: 'GitHub account',
					type: 'githubApi',
				});

				mockParseAndValidate.mockResolvedValue({
					warnings: [],
					workflow: {
						...mockWorkflowJson,
						nodes: [httpNodeWithGithub('6CoUMkVOJRNsbmr2')],
					},
				});

				const result = await callHandler({ code: 'const wf = ...' });

				const response = parseResult(result);
				expect(result.isError).toBe(true);
				expect(response.error).toContain('Fetch PR Comments');
				expect(response.error).toContain("credential '6CoUMkVOJRNsbmr2' is not usable");
				expect(response.error).toContain("this workflow's project");
				expect(workflowCreationService.createWorkflow).not.toHaveBeenCalled();
			});

			test('rejects a credential id that does not exist', async () => {
				(credentialsService.getCredentialsAUserCanUseInAWorkflow as Mock).mockResolvedValue([]);
				(credentialsService.getOne as Mock).mockRejectedValue(
					new NotFoundError('Credential with ID "ghost" could not be found.'),
				);

				mockParseAndValidate.mockResolvedValue({
					warnings: [],
					workflow: {
						...mockWorkflowJson,
						nodes: [httpNodeWithGithub('ghost')],
					},
				});

				const result = await callHandler({ code: 'const wf = ...' });

				const response = parseResult(result);
				expect(result.isError).toBe(true);
				expect(response.error).toContain("credential 'ghost' not found or not accessible");
				expect(workflowCreationService.createWorkflow).not.toHaveBeenCalled();
			});

			test('accepts a credential id that is reachable from the project', async () => {
				(credentialsService.getCredentialsAUserCanUseInAWorkflow as Mock).mockResolvedValue([
					{ id: 'in-project-cred', name: 'GitHub account 2', type: 'githubApi' },
				]);

				mockParseAndValidate.mockResolvedValue({
					warnings: [],
					workflow: {
						...mockWorkflowJson,
						nodes: [httpNodeWithGithub('in-project-cred')],
					},
				});

				const result = await callHandler({ code: 'const wf = ...' });

				expect(result.isError).toBeUndefined();
				expect(workflowCreationService.createWorkflow).toHaveBeenCalled();
			});
		});

		test('refuses to save when an agent is wired as a tool to another agent', async () => {
			mockParseAndValidate.mockResolvedValue({
				workflow: {
					...mockWorkflowJson,
					nodes: [
						{
							id: 'manager',
							name: 'Manager Agent',
							type: '@n8n/n8n-nodes-langchain.agent',
							typeVersion: 3,
							position: [0, 0],
							parameters: {},
						},
						{
							id: 'worker',
							name: 'Worker Agent',
							type: '@n8n/n8n-nodes-langchain.agent',
							typeVersion: 3,
							position: [200, 0],
							parameters: {},
						},
					],
					connections: {
						'Worker Agent': {
							ai_tool: [[{ node: 'Manager Agent', type: 'ai_tool', index: 0 }]],
						},
					},
				},
				warnings: [],
			});

			const result = await callHandler({ code: 'const wf = ...' });

			expect(result.isError).toBe(true);
			expect(createWorkflowMock).not.toHaveBeenCalled();
			const response = parseResult(result);
			expect(response.error).toContain('Worker Agent');
			expect(response.error).toContain('Manager Agent');
			expect(response.error).toContain('@n8n/n8n-nodes-langchain.agentTool');
		});

		test('structuredContent conforms to declared outputSchema under strict validation', async () => {
			// Regression for #28274: MCP publishes outputSchema with additionalProperties: false,
			// so any field returned by the handler but missing from the schema breaks strict clients.
			mockAutoPopulateNodeCredentials.mockResolvedValue({
				assignments: [
					{ nodeName: 'Webhook', credentialName: 'My Cred', credentialType: 'webhookAuth' },
				],
				skippedHttpNodes: [],
			});

			const tool = createTool();
			const result = (await tool.handler({ code: 'const wf = ...' } as never, {} as never)) as {
				structuredContent: unknown;
			};

			const envelopeShape = tool.config.outputSchema as z.ZodRawShape;
			// `autoAssignedCredentials` is optional in the schema, so unwrap the
			// ZodOptional to reach the inner array before tightening its items.
			const itemsField = (
				envelopeShape.autoAssignedCredentials as z.ZodOptional<
					z.ZodArray<z.ZodObject<z.ZodRawShape>>
				>
			).unwrap();
			const strictSchema = z
				.object({
					...envelopeShape,
					autoAssignedCredentials: z.array(itemsField.element.strict()).optional(),
				})
				.strict();

			expect(() => strictSchema.parse(result.structuredContent)).not.toThrow();
		});

		test('error-path structuredContent conforms to declared outputSchema', async () => {
			// Regression for ADO-5448 / GH #32503: a thrown handler error returned
			// `structuredContent: { error }`, which violated the declared
			// outputSchema (additionalProperties: false + required success fields)
			// and made strict MCP clients reject the response with an opaque
			// `-32602` schema mismatch that masked the real error.
			mockParseAndValidate.mockRejectedValue(new Error('boom: invalid SDK code'));

			const tool = createTool();
			const result = (await tool.handler({ code: 'const wf = ...' } as never, {} as never)) as {
				isError?: boolean;
				structuredContent: unknown;
			};

			// The real, previously-masked error is now surfaced...
			expect(result.isError).toBe(true);
			const structured = result.structuredContent as { error?: string };
			expect(structured.error).toContain('boom: invalid SDK code');
			expect(createWorkflowMock).not.toHaveBeenCalled();

			// ...and the error envelope validates against the published schema,
			// so strict clients no longer reject it with -32602.
			const strictSchema = z.object(tool.config.outputSchema as z.ZodRawShape).strict();
			expect(() => strictSchema.parse(result.structuredContent)).not.toThrow();
		});
	});
});
