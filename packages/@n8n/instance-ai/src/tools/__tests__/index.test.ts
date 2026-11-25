import { mock } from 'vitest-mock-extended';

import {
	createOrchestrationTools,
	createOrchestratorDomainTools,
	getActiveOrchestratorDomainToolNames,
} from '..';
import type { InstanceAiContext, InstanceAiListedFile, OrchestrationContext } from '../../types';
import { ALWAYS_LOADED_TOOL_NAMES, getMcpToolGroup, getToolGroup } from '../tool-ids';

vi.mock('../attachments/parse-file.tool', () => ({
	createParseFileTool: vi.fn(() => ({ id: 'parse-file' })),
	createParseStoredFileTool: vi.fn(() => ({ id: 'parse-file', storedFiles: true })),
}));

vi.mock('../attachments/import-files.tool', () => ({
	createImportFilesTool: vi.fn(() => ({ id: 'import-files' })),
}));

vi.mock('../attachments/list-files.tool', () => ({
	createListFilesTool: vi.fn((list: unknown) => ({ id: 'list-files', list })),
}));

vi.mock('../attachments/view-file.tool', () => ({
	createViewFileTool: vi.fn((storedFiles: unknown) => ({ id: 'view-file', storedFiles })),
}));

vi.mock('../attachments/share-files.tool', () => ({
	createShareFilesTool: vi.fn(() => ({ id: 'share-files' })),
}));

vi.mock('../credentials.tool', () => ({
	createListCredentialsTool: vi.fn(() => ({ id: 'list_credentials' })),
	createUpdateCredentialDescriptionTool: vi.fn(() => ({ id: 'update_credential_description' })),
	createSearchCredentialTypesTool: vi.fn(() => ({ id: 'search_credential_types' })),
	createSetupCredentialsTool: vi.fn(() => ({ id: 'setup_credentials' })),
	createTestCredentialTool: vi.fn(() => ({ id: 'test_credential' })),
	createDeleteCredentialTool: vi.fn(() => ({ id: 'delete_credential' })),
}));

vi.mock('../data-tables.tool', () => ({
	createDataTableTool: vi.fn((_context: unknown, action: string) => ({
		id: `data-table:${action}`,
	})),
}));

vi.mock('../data-tables/change-data-tables.tool', () => ({
	createChangeDataTablesTool: vi.fn(() => ({ id: 'change_data_tables' })),
}));

vi.mock('../agent-context.tool', () => ({
	createAgentContextTool: vi.fn(() => ({ id: 'agent-context' })),
}));

vi.mock('../executions.tool', () => ({
	createExecutionTool: vi.fn((_context: unknown, action: string) => ({
		id: `execution:${action}`,
	})),
}));

vi.mock('../nodes.tool', () => ({
	createSearchNodesTool: vi.fn(() => ({ id: 'search_nodes' })),
	createGetNodeTypesTool: vi.fn(() => ({ id: 'get_node_types' })),
	createGetNodeParameterOptionsTool: vi.fn(() => ({ id: 'get_node_parameter_options' })),
	createExecuteNodeTool: vi.fn(() => ({ id: 'execute_node' })),
}));

vi.mock('../search-models.tool', () => ({
	createSearchModelsTool: vi.fn(() => ({ id: 'search_models' })),
}));

vi.mock('../n8n-docs.tool', () => ({
	createN8nDocsTool: vi.fn(() => ({ id: 'n8n-docs' })),
}));

vi.mock('../mcp-servers.tool', () => ({
	createMcpServersTool: vi.fn(() => ({ id: 'mcp-servers' })),
}));

vi.mock('../orchestration/select-agent.tool', () => ({
	createSelectAgentTool: vi.fn(() => ({ id: 'agent_builder_select_agent' })),
}));

vi.mock('../orchestration/builder-tools', () => ({
	createAgentBuilderTools: vi.fn(() => [
		{ name: 'agent_builder_write_config', id: 'agent_builder_write_config' },
	]),
}));

vi.mock('../orchestration/report-verification-verdict.tool', () => ({
	createReportVerificationVerdictTool: vi.fn(() => ({
		id: 'workflow_builder_report_verification_verdict',
	})),
}));

vi.mock('../orchestration/verify-built-workflow.tool', () => ({
	createVerifyBuiltWorkflowTool: vi.fn(() => ({ id: 'workflow_builder_verify_built_workflow' })),
}));

vi.mock('../research.tool', () => ({
	createResearchTool: vi.fn(() => ({ id: 'research' })),
}));

vi.mock('../shared/ask-user.tool', () => ({
	ASK_USER_TOOL_ID: 'ask_user',
	createAskUserTool: vi.fn(() => ({ id: 'ask_user' })),
}));

vi.mock('../task-control.tool', () => ({
	createTaskControlTool: vi.fn(() => ({ id: 'workflow_builder_task_control' })),
}));

vi.mock('../workflows/apply-workflow-credentials.tool', () => ({
	createApplyWorkflowCredentialsTool: vi.fn(() => ({
		id: 'workflow_builder_apply_workflow_credentials',
	})),
}));

vi.mock('../workflows/build-workflow.tool', () => ({
	createBuildWorkflowTool: vi.fn(() => ({ id: 'workflow_builder_build_workflow' })),
}));

vi.mock('../workflows.tool', () => ({
	createWorkflowTool: vi.fn((_context: unknown, action: string) => ({ id: `workflow:${action}` })),
}));

vi.mock('../workspace.tool', () => ({
	createWorkspaceActionTool: vi.fn((_context: unknown, action: string) => ({
		id: `workspace:${action}`,
	})),
}));

vi.mock('../create-tools-from-mcp-server', () => ({
	createToolsFromLocalMcpServer: vi.fn(() => ({
		browser_connect: { id: 'browser_connect' },
		browser_navigate: { id: 'browser_navigate' },
	})),
}));

function makeContext(overrides: Partial<InstanceAiContext> = {}): InstanceAiContext {
	return {
		userId: 'user-a',
		logger: { warn: vi.fn() },
		workflowService: {},
		...overrides,
	} as unknown as InstanceAiContext;
}

describe('domain tool construction', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('creates the native orchestrator domain tool map', async () => {
		const context = makeContext();

		const orchestratorTools = createOrchestratorDomainTools(context);

		expect(Object.fromEntries(orchestratorTools)).toMatchObject({
			list_workflows: { id: 'workflow:list' },
			get_workflow: { id: 'workflow:get' },
			get_workflow_as_code: { id: 'workflow:get-as-code' },
			archive_workflow: { id: 'workflow:delete' },
			unarchive_workflow: { id: 'workflow:unarchive' },
			setup_workflow: { id: 'workflow:setup' },
			validate_workflow: { id: 'workflow:validate' },
			publish_workflow: { id: 'workflow:publish' },
			unpublish_workflow: { id: 'workflow:unpublish' },
			list_executions: { id: 'execution:list' },
			run_workflow: { id: 'execution:run' },
			get_resolved_node_parameters: { id: 'execution:get-resolved-node-parameters' },
			list_credentials: { id: 'list_credentials' },
			search_credential_types: { id: 'search_credential_types' },
			setup_credentials: { id: 'setup_credentials' },
			test_credential: { id: 'test_credential' },
			delete_credential: { id: 'delete_credential' },
			list_data_tables: { id: 'data-table:list' },
			get_data_table_schema: { id: 'data-table:schema' },
			query_data_table: { id: 'data-table:query' },
			change_data_tables: { id: 'change_data_tables' },
			list_projects: { id: 'workspace:list-projects' },
			list_tags: { id: 'workspace:list-tags' },
			tag_workflow: { id: 'workspace:tag-workflow' },
			cleanup_test_executions: { id: 'workspace:cleanup-test-executions' },
			research: { id: 'research' },
			'n8n-docs': { id: 'n8n-docs' },
			search_nodes: { id: 'search_nodes' },
			get_node_types: { id: 'get_node_types' },
			get_node_parameter_options: { id: 'get_node_parameter_options' },
			execute_node: { id: 'execute_node' },
			search_models: { id: 'search_models' },
			ask_user: { id: 'ask_user' },
			workflow_builder_build_workflow: { id: 'workflow_builder_build_workflow' },
		});
		expect(orchestratorTools.has('workflow_builder_workflows')).toBe(false);
		expect(orchestratorTools.has('workflows')).toBe(false);
		expect(orchestratorTools.has('workspace')).toBe(false);
		// This context has no folder support, so no folder tools.
		for (const name of [
			'list_folders',
			'create_folder',
			'delete_folder',
			'move_workflow_to_folder',
		]) {
			expect(orchestratorTools.has(name)).toBe(false);
		}
		expect(orchestratorTools.has('workflow_builder_nodes')).toBe(false);
		expect(orchestratorTools.has('templates')).toBe(false);
		expect(orchestratorTools.has('evals')).toBe(false);

		const { createWorkflowTool } = await import('../workflows.tool.js');
		const {
			createSearchNodesTool,
			createGetNodeTypesTool,
			createGetNodeParameterOptionsTool,
			createExecuteNodeTool,
		} = await import('../nodes.tool.js');
		const { createSearchModelsTool } = await import('../search-models.tool.js');
		const { createDataTableTool } = await import('../data-tables.tool.js');
		expect(createWorkflowTool).toHaveBeenCalledWith(context, 'list');
		// Version and node-usage tools need host methods this context does not provide.
		expect(orchestratorTools.has('list_workflow_versions')).toBe(false);
		expect(orchestratorTools.has('get_workflow_node_usage')).toBe(false);
		expect(createSearchNodesTool).toHaveBeenCalledWith(context);
		expect(createGetNodeTypesTool).toHaveBeenCalledWith(context);
		expect(createGetNodeParameterOptionsTool).toHaveBeenCalledWith(context);
		expect(createExecuteNodeTool).toHaveBeenCalledWith(context);
		expect(createSearchModelsTool).toHaveBeenCalledOnce();
		expect(createDataTableTool).toHaveBeenCalledWith(context, 'list');
		expect(createDataTableTool).toHaveBeenCalledTimes(3);
		expect(orchestratorTools.has('data_tables')).toBe(false);
		for (const name of [
			'create_data_table',
			'delete_data_table',
			'add_data_table_column',
			'delete_data_table_column',
			'rename_data_table_column',
			'insert_data_table_rows',
			'update_data_table_rows',
			'delete_data_table_rows',
		]) {
			expect(orchestratorTools.has(name)).toBe(false);
		}
		expect(orchestratorTools.has('workflow_builder_executions')).toBe(false);
	});

	it('registers the folder tools when the workspace service supports folders', () => {
		const context = makeContext({
			workspaceService: {
				listFolders: vi.fn(),
			} as unknown as InstanceAiContext['workspaceService'],
		});

		expect(Object.fromEntries(createOrchestratorDomainTools(context))).toMatchObject({
			list_projects: { id: 'workspace:list-projects' },
			list_tags: { id: 'workspace:list-tags' },
			tag_workflow: { id: 'workspace:tag-workflow' },
			cleanup_test_executions: { id: 'workspace:cleanup-test-executions' },
			list_folders: { id: 'workspace:list-folders' },
			create_folder: { id: 'workspace:create-folder' },
			delete_folder: { id: 'workspace:delete-folder' },
			move_workflow_to_folder: { id: 'workspace:move-workflow-to-folder' },
		});
	});

	it('lists n8n resource tools in the tool catalog under their tool group', () => {
		expect(getActiveOrchestratorDomainToolNames(makeContext())).toContain('search_models');
		expect(ALWAYS_LOADED_TOOL_NAMES.has('search_models')).toBe(false);
		expect(getToolGroup('search_models')).toBe('nodes');
		expect(getToolGroup('list_workflows')).toBe('workflows');
		expect(getToolGroup('workflow_builder_build_workflow')).toBe('workflows');
		expect(getToolGroup('run_workflow')).toBe('executions');
		expect(getToolGroup('query_data_table')).toBe('data_tables');
		expect(getToolGroup('change_data_tables')).toBe('data_tables');
		expect(getToolGroup('setup_credentials')).toBe('credentials');
		expect(getToolGroup('agent_builder_write_config')).toBe('agents');
		expect(getToolGroup('list_folders')).toBe('instance');
		expect(getToolGroup('ask_user')).toBeUndefined();
	});

	it('keeps an MCP server named like an n8n tool group in a group of its own', () => {
		expect(getMcpToolGroup('linear')).toBe('linear');
		expect(getMcpToolGroup('credentials')).toBe('mcp_credentials');
		expect(getMcpToolGroup('instance')).toBe('mcp_instance');
		expect(getMcpToolGroup('tools')).toBe('mcp_tools');
		expect(getMcpToolGroup('constructor')).toBe('constructor');
	});

	it('does not include local MCP server tools in orchestrator domain tools', () => {
		const context = makeContext({
			localMcpServer: {} as InstanceAiContext['localMcpServer'],
		});

		const orchestratorTools = createOrchestratorDomainTools(context);

		expect(orchestratorTools.has('browser_connect')).toBe(false);
		expect(orchestratorTools.has('browser_navigate')).toBe(false);
	});

	it('registers the current-message parse-file on a turn without files', () => {
		expect(createOrchestratorDomainTools(makeContext()).get('parse-file')).toEqual({
			id: 'parse-file',
		});
	});

	it('registers the stored-file parse-file on every turn when a file reader is wired', () => {
		const context = makeContext({ storedFiles: { read: vi.fn() } });

		expect(createOrchestratorDomainTools(context).get('parse-file')).toMatchObject({
			id: 'parse-file',
			storedFiles: true,
		});
	});

	it('prefers the stored-file parse-file over the current-message version', () => {
		const context = makeContext({
			storedFiles: { read: vi.fn() },
			currentUserAttachments: [
				{ type: 'file', data: '', mimeType: 'text/csv', fileName: 'data.csv' },
			],
		});

		expect(createOrchestratorDomainTools(context).get('parse-file')).toMatchObject({
			storedFiles: true,
		});
	});

	describe('import-files registration', () => {
		const storedFiles = { read: vi.fn() };
		const workspace = {} as InstanceAiContext['workspace'];
		const sandboxFiles = { maxImportBytes: 1024, importFiles: vi.fn(), storeOutput: vi.fn() };

		it.each([
			['nothing', {}],
			['only a file reader', { storedFiles }],
			['no workspace', { storedFiles, sandboxFiles }],
			['the feature off', { storedFiles, workspace }],
			['no file reader', { workspace, sandboxFiles }],
		])('leaves the tool out with %s', (_label, overrides) => {
			expect(createOrchestratorDomainTools(makeContext(overrides)).has('import-files')).toBe(false);
		});

		it('registers the tool with a file reader, a workspace and the feature on', () => {
			const context = makeContext({ storedFiles, workspace, sandboxFiles });

			expect(createOrchestratorDomainTools(context).get('import-files')).toEqual({
				id: 'import-files',
			});
			expect(ALWAYS_LOADED_TOOL_NAMES.has('import-files')).toBe(true);
		});
	});

	describe('list-files registration', () => {
		it.each([
			['nothing', {}],
			['a file reader without a list', { storedFiles: { read: vi.fn() } }],
		])('leaves the tool out with %s', (_label, overrides) => {
			expect(createOrchestratorDomainTools(makeContext(overrides)).has('list-files')).toBe(false);
		});

		it('registers the tool when the file reader can list the files', async () => {
			const files: InstanceAiListedFile[] = [
				{
					fileId: 'file-1',
					fileName: 'report.csv',
					mimeType: 'text/csv',
					sizeBytes: 3,
					origin: 'sandbox',
					createdAt: '2026-11-18T10:00:00.000Z',
				},
			];
			const storedFiles = { read: vi.fn(), list: vi.fn(async () => await Promise.resolve(files)) };
			const context = makeContext({ storedFiles });

			const tool = createOrchestratorDomainTools(context).get('list-files') as unknown as {
				list: () => Promise<unknown>;
			};

			// The list keeps the reader as `this`.
			await expect(tool.list()).resolves.toBe(files);
			expect(ALWAYS_LOADED_TOOL_NAMES.has('list-files')).toBe(true);
		});
	});

	describe('view-file registration', () => {
		it.each([
			['nothing', {}],
			['a file reader without a list', { storedFiles: { read: vi.fn(), canView: vi.fn() } }],
			[
				'a file reader without the viewable types',
				{ storedFiles: { read: vi.fn(), list: vi.fn() } },
			],
		])('leaves the tool out with %s', (_label, overrides) => {
			expect(createOrchestratorDomainTools(makeContext(overrides)).has('view-file')).toBe(false);
		});

		it('registers the tool with the file reader when the sandbox files feature is on', async () => {
			const file = {
				fileName: 'hat.png',
				mimeType: 'image/png',
				sizeBytes: 3,
				hasContent: vi.fn(),
				readContent: vi.fn(),
			};
			const storedFiles = {
				read: vi.fn(async () => await Promise.resolve(file)),
				list: vi.fn(),
				canView: vi.fn(() => true),
			};

			const tool = createOrchestratorDomainTools(makeContext({ storedFiles })).get(
				'view-file',
			) as unknown as {
				storedFiles: {
					read: (fileId: string) => Promise<unknown>;
					canView: (type: string) => boolean;
				};
			};

			await expect(tool.storedFiles.read('file-1')).resolves.toBe(file);
			expect(tool.storedFiles.canView('image/png')).toBe(true);
			expect(storedFiles.canView).toHaveBeenCalledWith('image/png');
			expect(ALWAYS_LOADED_TOOL_NAMES.has('view-file')).toBe(true);
		});
	});

	describe('share-files registration', () => {
		const workspace = {} as InstanceAiContext['workspace'];
		const sandboxFiles = { maxImportBytes: 1024, importFiles: vi.fn(), storeOutput: vi.fn() };

		it.each([
			['nothing', {}],
			['the feature off', { workspace }],
			['no workspace', { sandboxFiles }],
		])('leaves the tool out with %s', (_label, overrides) => {
			expect(createOrchestratorDomainTools(makeContext(overrides)).has('share-files')).toBe(false);
		});

		it('registers the tool with a workspace and the feature on', () => {
			const context = makeContext({ workspace, sandboxFiles });

			expect(createOrchestratorDomainTools(context).get('share-files')).toEqual({
				id: 'share-files',
			});
			expect(ALWAYS_LOADED_TOOL_NAMES.has('share-files')).toBe(true);
		});
	});

	it('gates the eval-config tool on the config-evals flag (evaluationConfigService presence)', () => {
		// Flag off: adapter leaves evaluationConfigService unset → tool absent.
		const disabled = makeContext();
		expect(createOrchestratorDomainTools(disabled).get('eval-config')).toBeUndefined();

		// Flag on: adapter wires evaluationConfigService → tool exposed.
		const enabled = makeContext({
			evaluationConfigService: {} as InstanceAiContext['evaluationConfigService'],
		});
		expect(createOrchestratorDomainTools(enabled).get('eval-config')).toBeDefined();
	});

	it('gates the mcp-servers tool on the host-wired mcpService', () => {
		// Gates off: adapter leaves mcpService unset → tool absent.
		const disabled = makeContext();
		expect(createOrchestratorDomainTools(disabled).get('mcp-servers')).toBeUndefined();

		const enabled = makeContext({ mcpService: {} as InstanceAiContext['mcpService'] });
		expect(createOrchestratorDomainTools(enabled).get('mcp-servers')).toBeDefined();
	});

	it('gates the skills tool on the host-wired skillService', () => {
		expect(createOrchestratorDomainTools(makeContext()).get('skills')).toBeUndefined();

		const enabled = makeContext({ skillService: {} as InstanceAiContext['skillService'] });
		expect(createOrchestratorDomainTools(enabled).get('skills')).toBeDefined();
	});

	it.each([
		['the current Instance AI runtime', {}],
		['the Assistant agent', { storedFiles: { read: vi.fn() } }],
	])(
		'keeps the same tool names with and without files on %s, so the cached prefix stays valid',
		(_label, runtimeContext: Partial<InstanceAiContext>) => {
			const withoutFiles = makeContext(runtimeContext);
			const withFiles = makeContext({
				...runtimeContext,
				currentUserAttachments: [
					{ type: 'file', data: '', mimeType: 'text/csv', fileName: 'data.csv' },
				],
			});

			expect(getActiveOrchestratorDomainToolNames(withFiles)).toEqual(
				getActiveOrchestratorDomainToolNames(withoutFiles),
			);
		},
	);

	it('reports the same active names that the domain registry exposes', () => {
		const context = makeContext({
			evaluationConfigService: {} as InstanceAiContext['evaluationConfigService'],
			mcpService: {} as InstanceAiContext['mcpService'],
			currentUserAttachments: [
				{ type: 'file', data: '', mimeType: 'text/csv', fileName: 'input.csv' },
			],
		});

		expect(getActiveOrchestratorDomainToolNames(context)).toEqual(
			new Set(createOrchestratorDomainTools(context).keys()),
		);
	});

	it('gates the activity tool on the host-wired activityService', () => {
		// Gates off: the adapter leaves activityService unset when the reader is disabled.
		const disabled = makeContext();
		expect(createOrchestratorDomainTools(disabled).get('activity')).toBeUndefined();

		const enabled = makeContext({
			activityService: {} as InstanceAiContext['activityService'],
		});
		expect(createOrchestratorDomainTools(enabled).get('activity')).toBeDefined();
		expect(getActiveOrchestratorDomainToolNames(enabled)).toContain('activity');
	});

	it('never defers activity behind search_tools', () => {
		expect(ALWAYS_LOADED_TOOL_NAMES.has('activity')).toBe(true);
	});

	it('registers save_user_preference only when the preference service is wired', () => {
		const without = getActiveOrchestratorDomainToolNames(makeContext());
		expect(without.has('save_user_preference')).toBe(false);

		const context = makeContext();
		context.aiPreferenceService = { create: vi.fn(), recordRejection: vi.fn() };
		const withService = getActiveOrchestratorDomainToolNames(context);
		expect(withService.has('save_user_preference')).toBe(true);
	});

	it('registers send_feedback only when the feedback service is wired', () => {
		expect(createOrchestratorDomainTools(makeContext()).get('send_feedback')).toBeUndefined();

		const enabled = makeContext({ agentFeedbackService: { send: vi.fn() } });
		expect(createOrchestratorDomainTools(enabled).get('send_feedback')).toBeDefined();
		expect(getActiveOrchestratorDomainToolNames(enabled)).toContain('send_feedback');
	});

	it('does not register send_feedback when the instance does not share data', () => {
		const context = makeContext({
			agentFeedbackService: { send: vi.fn() },
			allowSendingParameterValues: false,
		});
		expect(createOrchestratorDomainTools(context).get('send_feedback')).toBeUndefined();
	});

	it('never defers send_feedback behind search_tools', () => {
		expect(ALWAYS_LOADED_TOOL_NAMES.has('send_feedback')).toBe(true);
	});

	it('never defers mcp-servers behind search_tools', () => {
		expect(ALWAYS_LOADED_TOOL_NAMES.has('mcp-servers')).toBe(true);
	});

	it('never defers skills behind search_tools', () => {
		expect(ALWAYS_LOADED_TOOL_NAMES.has('skills')).toBe(true);
	});

	it('gates Agent context on the project-scoped reader', () => {
		const disabled = makeContext();
		expect(createOrchestratorDomainTools(disabled).get('agent-context')).toBeUndefined();

		const enabled = makeContext({
			agentContextService: {} as InstanceAiContext['agentContextService'],
		});
		expect(createOrchestratorDomainTools(enabled).get('agent-context')).toBeDefined();
		expect(getActiveOrchestratorDomainToolNames(enabled)).toContain('agent-context');
	});

	it('never defers Agent context lookup behind search_tools', () => {
		expect(ALWAYS_LOADED_TOOL_NAMES.has('agent-context')).toBe(true);
	});

	it('does not construct removed orchestration tools', () => {
		const context = mock<OrchestrationContext>();

		const orchestrationTools = createOrchestrationTools(context);

		expect(orchestrationTools.has('workflow_builder_create_tasks')).toBe(false);
		expect(orchestrationTools.has('workflow_builder_complete_checkpoint')).toBe(false);
		expect(orchestrationTools.has('plan')).toBe(false);
		expect(orchestrationTools.has('delegate')).toBe(false);
		expect(orchestrationTools.has('eval-setup-with-agent')).toBe(false);
		expect(orchestrationTools.has('eval-data')).toBe(false);
	});

	it('registers the agent builder tools only when a builder delegate is present on the domain context', () => {
		const withoutDelegate = createOrchestrationTools(
			makeContext({ domainContext: {} } as Partial<InstanceAiContext>) as never,
		);
		expect(withoutDelegate.has('agent_builder_select_agent')).toBe(false);
		expect(withoutDelegate.has('agent_builder_write_config')).toBe(false);

		const withDelegate = createOrchestrationTools(
			makeContext({
				domainContext: { builderDelegate: {} },
			} as Partial<InstanceAiContext>) as never,
		);
		expect(Object.fromEntries(withDelegate)).toMatchObject({
			agent_builder_select_agent: { id: 'agent_builder_select_agent' },
			agent_builder_write_config: { id: 'agent_builder_write_config' },
		});
		expect(withDelegate.has('agent_builder_build_agent')).toBe(false);
	});

	it('registers get-session only when a preview session and resolver are present', () => {
		const withoutSession = createOrchestrationTools(
			makeContext({ domainContext: {} } as Partial<InstanceAiContext>) as never,
		);
		expect(withoutSession.has('get-session')).toBe(false);

		const withSession = createOrchestrationTools(
			makeContext({
				domainContext: {
					agentPreviewSession: { agentId: 'agent-1', threadId: 'preview-1' },
					resolvePreviewSession: async () => await Promise.resolve(null),
				},
			} as Partial<InstanceAiContext>) as never,
		);
		expect(withSession.has('get-session')).toBe(true);
	});

	it('registers start-cloud-browser-task only when the host sets startCloudBrowserTask', () => {
		const withoutCloudBrowser = createOrchestrationTools(
			makeContext({ domainContext: {} } as Partial<InstanceAiContext>) as never,
		);
		expect(withoutCloudBrowser.has('start-cloud-browser-task')).toBe(false);

		const withCloudBrowser = createOrchestrationTools({
			...makeContext({ domainContext: {} } as Partial<InstanceAiContext>),
			startCloudBrowserTask: vi.fn(),
		} as never);
		expect(withCloudBrowser.has('start-cloud-browser-task')).toBe(true);
	});
});

it.each([true, false, undefined])(
	'gates description updates when the flag is %s',
	(credentialDescriptionsEnabled) => {
		const context = mock<InstanceAiContext>({
			credentialDescriptionsEnabled,
			currentUserAttachments: [],
		});
		const names = getActiveOrchestratorDomainToolNames(context);
		expect(names.has('update_credential_description')).toBe(credentialDescriptionsEnabled === true);
	},
);
