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
	CREDENTIALS_TOOL_ID: 'workflow_builder_credentials',
	createCredentialsTool: vi.fn(() => ({ id: 'workflow_builder_credentials' })),
}));

vi.mock('../data-tables.tool', () => ({
	DATA_TABLES_TOOL_ID: 'workflow_builder_data_tables',
	createDataTablesTool: vi.fn((_context: unknown, scope?: string) => ({
		id: scope ? `workflow_builder_data_tables-${scope}` : 'workflow_builder_data_tables',
	})),
}));

vi.mock('../agent-context.tool', () => ({
	createAgentContextTool: vi.fn(() => ({ id: 'agent-context' })),
}));

vi.mock('../executions.tool', () => ({
	createExecutionsTool: vi.fn(() => ({ id: 'workflow_builder_executions' })),
}));

vi.mock('../nodes.tool', () => ({
	createNodesTool: vi.fn((_context: unknown, scope?: string) => ({
		id: scope ? `workflow_builder_nodes-${scope}` : 'workflow_builder_nodes',
	})),
}));

vi.mock('../search-models.tool', () => ({
	createSearchModelsTool: vi.fn(() => ({ id: 'workflow_builder_search_models' })),
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

vi.mock('../orchestration/complete-checkpoint.tool', () => ({
	createCompleteCheckpointTool: vi.fn(() => ({ id: 'workflow_builder_complete_checkpoint' })),
}));

vi.mock('../orchestration/plan.tool', () => ({
	createPlanTool: vi.fn(() => ({ id: 'workflow_builder_create_tasks' })),
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
	ASK_USER_TOOL_ID: 'workflow_builder_ask_user',
	createAskUserTool: vi.fn(() => ({ id: 'workflow_builder_ask_user' })),
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
	createWorkflowsTool: vi.fn(() => ({ id: 'workflow_builder_workflows' })),
}));

vi.mock('../workspace.tool', () => ({
	createWorkspaceTool: vi.fn(() => ({ id: 'workspace' })),
}));

vi.mock('../filesystem/create-tools-from-mcp-server', () => ({
	createToolsFromLocalMcpServer: vi.fn(() => ({
		browser_connect: { id: 'browser_connect' },
		browser_navigate: { id: 'browser_navigate' },
	})),
}));

function makeContext(overrides: Partial<InstanceAiContext> = {}): InstanceAiContext {
	return {
		userId: 'user-a',
		logger: { warn: vi.fn() },
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
			workflow_builder_workflows: { id: 'workflow_builder_workflows' },
			workflow_builder_executions: { id: 'workflow_builder_executions' },
			workflow_builder_credentials: { id: 'workflow_builder_credentials' },
			workflow_builder_data_tables: { id: 'workflow_builder_data_tables' },
			workspace: { id: 'workspace' },
			research: { id: 'research' },
			'n8n-docs': { id: 'n8n-docs' },
			workflow_builder_nodes: { id: 'workflow_builder_nodes' },
			workflow_builder_search_models: { id: 'workflow_builder_search_models' },
			workflow_builder_ask_user: { id: 'workflow_builder_ask_user' },
			workflow_builder_build_workflow: { id: 'workflow_builder_build_workflow' },
		});
		expect(orchestratorTools.has('templates')).toBe(false);
		expect(orchestratorTools.has('evals')).toBe(false);

		const { createWorkflowsTool } = await import('../workflows.tool.js');
		const { createNodesTool } = await import('../nodes.tool.js');
		const { createSearchModelsTool } = await import('../search-models.tool.js');
		const { createDataTablesTool } = await import('../data-tables.tool.js');
		expect(createWorkflowsTool).toHaveBeenCalledWith(context);
		expect(createNodesTool).toHaveBeenCalledWith(context);
		expect(createSearchModelsTool).toHaveBeenCalledOnce();
		expect(createDataTablesTool).toHaveBeenCalledWith(context);
	});

	it('makes model catalog search discoverable without loading it for every turn', () => {
		expect(getActiveOrchestratorDomainToolNames(makeContext())).toContain(
			'workflow_builder_search_models',
		);
		expect(ALWAYS_LOADED_TOOL_NAMES.has('workflow_builder_search_models')).toBe(false);
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

	it('constructs workflow_builder_create_tasks for the agent to apply profile exclusions', () => {
		const context = mock<OrchestrationContext>();

		const orchestrationTools = createOrchestrationTools(context);

		expect(orchestrationTools.has('workflow_builder_create_tasks')).toBe(true);
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
