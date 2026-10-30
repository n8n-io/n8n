import { mock } from 'vitest-mock-extended';

import {
	createOrchestrationTools,
	createOrchestratorDomainTools,
	getActiveOrchestratorDomainToolNames,
} from '..';
import { isParseableAttachment } from '../../parsers/structured-file-parser';
import type { InstanceAiContext, OrchestrationContext } from '../../types';
import { ALWAYS_LOADED_TOOL_NAMES } from '../tool-ids';

vi.mock('../../parsers/structured-file-parser', () => ({
	isParseableAttachment: vi.fn(() => false),
}));

vi.mock('../attachments/parse-file.tool', () => ({
	createParseFileTool: vi.fn(() => ({ id: 'parse-file' })),
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
	createWorkspaceTool: vi.fn(() => ({ id: 'workspace' })),
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
		vi.mocked(isParseableAttachment).mockReturnValue(false);
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
			query_data_table: { id: 'data-table:query' },
			delete_data_table_rows: { id: 'data-table:delete-rows' },
			workspace: { id: 'workspace' },
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
		expect(createDataTableTool).toHaveBeenCalledWith(context, 'delete-rows');
		expect(orchestratorTools.has('data_tables')).toBe(false);
		expect(orchestratorTools.has('workflow_builder_executions')).toBe(false);
	});

	it('never defers model catalog search behind search_tools', () => {
		expect(getActiveOrchestratorDomainToolNames(makeContext())).toContain('search_models');
		expect(ALWAYS_LOADED_TOOL_NAMES.has('search_models')).toBe(true);
	});

	it('does not include local MCP server tools in orchestrator domain tools', () => {
		const context = makeContext({
			localMcpServer: {} as InstanceAiContext['localMcpServer'],
		});

		const orchestratorTools = createOrchestratorDomainTools(context);

		expect(orchestratorTools.has('browser_connect')).toBe(false);
		expect(orchestratorTools.has('browser_navigate')).toBe(false);
	});

	it('includes parse-file tools when attachments are parseable', () => {
		vi.mocked(isParseableAttachment).mockReturnValue(true);
		const context = makeContext({
			currentUserAttachments: [
				{ type: 'file', data: '', mimeType: 'text/html', fileName: 'page.html' },
			],
		});

		expect(createOrchestratorDomainTools(context).get('parse-file')).toMatchObject({
			id: 'parse-file',
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

	it('reports the same active names that the domain registry exposes', () => {
		vi.mocked(isParseableAttachment).mockReturnValue(true);
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
