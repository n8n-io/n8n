import { mock } from 'vitest-mock-extended';

import {
	createOrchestrationTools,
	createOrchestratorDomainTools,
	getActiveOrchestratorDomainToolNames,
} from '..';
import { isParseableAttachment } from '../../parsers/structured-file-parser';
import type { InstanceAiContext, OrchestrationContext } from '../../types';
import { ALWAYS_LOADED_TOOL_NAMES, getAlwaysLoadedToolNames } from '../tool-ids';

vi.mock('../../parsers/structured-file-parser', () => ({
	isParseableAttachment: vi.fn(() => false),
}));

vi.mock('../attachments/parse-file.tool', () => ({
	createParseFileTool: vi.fn(() => ({ id: 'file_parse' })),
}));

vi.mock('../credentials.tool', () => ({
	CREDENTIALS_TOOL_ID: 'credentials',
	createCredentialsTool: vi.fn(() => ({ id: 'credentials' })),
}));

vi.mock('../data-tables.tool', () => ({
	DATA_TABLES_TOOL_ID: 'data_tables',
	createDataTablesTool: vi.fn((_context: unknown, scope?: string) => ({
		id: scope ? `data-tables-${scope}` : 'data_tables',
	})),
}));

vi.mock('../agent-context.tool', () => ({
	createAgentContextTool: vi.fn(() => ({ id: 'agent_context' })),
}));

vi.mock('../executions.tool', () => ({
	createExecutionsTool: vi.fn(() => ({ id: 'executions' })),
}));

vi.mock('../nodes.tool', () => ({
	createNodesTool: vi.fn((_context: unknown, scope?: string) => ({
		id: scope ? `nodes-${scope}` : 'nodes',
	})),
}));

vi.mock('../search-models.tool', () => ({
	createSearchModelsTool: vi.fn(() => ({ id: 'models_search' })),
}));

vi.mock('../n8n-docs.tool', () => ({
	createN8nDocsTool: vi.fn(() => ({ id: 'n8n_docs' })),
}));

vi.mock('../mcp-servers.tool', () => ({
	createMcpServersTool: vi.fn(() => ({ id: 'mcp_servers' })),
}));

vi.mock('../orchestration/build-agent.tool', () => ({
	createBuildAgentTool: vi.fn(() => ({ id: 'agent_build' })),
}));

vi.mock('../orchestration/complete-checkpoint.tool', () => ({
	createCompleteCheckpointTool: vi.fn(() => ({ id: 'checkpoint_complete' })),
}));

vi.mock('../orchestration/plan.tool', () => ({
	createPlanTool: vi.fn(() => ({ id: 'plan_create' })),
}));

vi.mock('../orchestration/report-verification-verdict.tool', () => ({
	createReportVerificationVerdictTool: vi.fn(() => ({ id: 'verification_report' })),
}));

vi.mock('../orchestration/verify-built-workflow.tool', () => ({
	createVerifyBuiltWorkflowTool: vi.fn(() => ({ id: 'workflow_verify' })),
}));

vi.mock('../research.tool', () => ({
	createResearchTool: vi.fn(() => ({ id: 'research' })),
}));

vi.mock('../shared/ask-user.tool', () => ({
	ASK_USER_TOOL_ID: 'user_ask',
	createAskUserTool: vi.fn(() => ({ id: 'user_ask' })),
}));

vi.mock('../task-control.tool', () => ({
	createTaskControlTool: vi.fn(() => ({ id: 'task_control' })),
}));

vi.mock('../workflows/apply-workflow-credentials.tool', () => ({
	createApplyWorkflowCredentialsTool: vi.fn(() => ({ id: 'workflow_credentials_apply' })),
}));

vi.mock('../workflows/build-workflow.tool', () => ({
	createBuildWorkflowTool: vi.fn(() => ({ id: 'workflow_build' })),
}));

vi.mock('../workflows.tool', () => ({
	createWorkflowsTool: vi.fn(() => ({ id: 'workflows' })),
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
			workflows: { id: 'workflows' },
			executions: { id: 'executions' },
			credentials: { id: 'credentials' },
			data_tables: { id: 'data_tables' },
			workspace: { id: 'workspace' },
			research: { id: 'research' },
			n8n_docs: { id: 'n8n_docs' },
			nodes: { id: 'nodes' },
			models_search: { id: 'models_search' },
			user_ask: { id: 'user_ask' },
			workflow_build: { id: 'workflow_build' },
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
		expect(getActiveOrchestratorDomainToolNames(makeContext())).toContain('models_search');
		expect(ALWAYS_LOADED_TOOL_NAMES.has('models_search')).toBe(false);
	});

	it('uses one naming convention for every orchestrator domain tool', () => {
		for (const name of getActiveOrchestratorDomainToolNames(makeContext())) {
			expect(name).toMatch(/^[a-z0-9]+(?:_[a-z0-9]+)*$/);
		}
	});

	it('loads only a small hot set when the provider runs tool search', () => {
		expect(getAlwaysLoadedToolNames({ nativeToolSearch: false })).toBe(ALWAYS_LOADED_TOOL_NAMES);
		expect([...getAlwaysLoadedToolNames({ nativeToolSearch: true })].sort()).toEqual(
			[
				'user_ask',
				'workflow_build',
				'onboarding_leave',
				'nodes',
				'file_parse',
				'workflow_verify',
				'workflows',
			].sort(),
		);
	});

	it('does not include local MCP server tools in orchestrator domain tools', () => {
		const context = makeContext({
			localMcpServer: {} as InstanceAiContext['localMcpServer'],
		});

		const orchestratorTools = createOrchestratorDomainTools(context);

		expect(orchestratorTools.has('browser_connect')).toBe(false);
		expect(orchestratorTools.has('browser_navigate')).toBe(false);
	});

	it('includes file_parse tools when attachments are parseable', () => {
		vi.mocked(isParseableAttachment).mockReturnValue(true);
		const context = makeContext({
			currentUserAttachments: [
				{ type: 'file', data: '', mimeType: 'text/html', fileName: 'page.html' },
			],
		});

		expect(createOrchestratorDomainTools(context).get('file_parse')).toMatchObject({
			id: 'file_parse',
		});
	});

	it('gates the eval_config tool on the config-evals flag (evaluationConfigService presence)', () => {
		// Flag off: adapter leaves evaluationConfigService unset → tool absent.
		const disabled = makeContext();
		expect(createOrchestratorDomainTools(disabled).get('eval_config')).toBeUndefined();

		// Flag on: adapter wires evaluationConfigService → tool exposed.
		const enabled = makeContext({
			evaluationConfigService: {} as InstanceAiContext['evaluationConfigService'],
		});
		expect(createOrchestratorDomainTools(enabled).get('eval_config')).toBeDefined();
	});

	it('gates the mcp_servers tool on the host-wired mcpService', () => {
		// Gates off: adapter leaves mcpService unset → tool absent.
		const disabled = makeContext();
		expect(createOrchestratorDomainTools(disabled).get('mcp_servers')).toBeUndefined();

		const enabled = makeContext({ mcpService: {} as InstanceAiContext['mcpService'] });
		expect(createOrchestratorDomainTools(enabled).get('mcp_servers')).toBeDefined();
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

	it('registers user_preference_save only when the preference service is wired', () => {
		const without = getActiveOrchestratorDomainToolNames(makeContext());
		expect(without.has('user_preference_save')).toBe(false);

		const context = makeContext();
		context.aiPreferenceService = { create: vi.fn(), recordRejection: vi.fn() };
		const withService = getActiveOrchestratorDomainToolNames(context);
		expect(withService.has('user_preference_save')).toBe(true);
	});

	it('never defers mcp_servers behind search_tools', () => {
		expect(ALWAYS_LOADED_TOOL_NAMES.has('mcp_servers')).toBe(true);
	});

	it('gates Agent context on the project-scoped reader', () => {
		const disabled = makeContext();
		expect(createOrchestratorDomainTools(disabled).get('agent_context')).toBeUndefined();

		const enabled = makeContext({
			agentContextService: {} as InstanceAiContext['agentContextService'],
		});
		expect(createOrchestratorDomainTools(enabled).get('agent_context')).toBeDefined();
		expect(getActiveOrchestratorDomainToolNames(enabled)).toContain('agent_context');
	});

	it('never defers Agent context lookup behind search_tools', () => {
		expect(ALWAYS_LOADED_TOOL_NAMES.has('agent_context')).toBe(true);
	});

	it('constructs plan_create for the agent to apply profile exclusions', () => {
		const context = mock<OrchestrationContext>();

		const orchestrationTools = createOrchestrationTools(context);

		expect(orchestrationTools.has('plan_create')).toBe(true);
		expect(orchestrationTools.has('plan')).toBe(false);
		expect(orchestrationTools.has('delegate')).toBe(false);
		expect(orchestrationTools.has('eval-setup-with-agent')).toBe(false);
		expect(orchestrationTools.has('eval-data')).toBe(false);
	});

	it('registers agent_build only when a builder delegate is present on the domain context', () => {
		const withoutDelegate = createOrchestrationTools(
			makeContext({ domainContext: {} } as Partial<InstanceAiContext>) as never,
		);
		expect(withoutDelegate.has('agent_build')).toBe(false);

		const withDelegate = createOrchestrationTools(
			makeContext({
				domainContext: { builderDelegate: {} },
			} as Partial<InstanceAiContext>) as never,
		);
		expect(Object.fromEntries(withDelegate)).toMatchObject({
			agent_build: { id: 'agent_build' },
		});
	});

	it('registers agent_session_get only when a preview session and resolver are present', () => {
		const withoutSession = createOrchestrationTools(
			makeContext({ domainContext: {} } as Partial<InstanceAiContext>) as never,
		);
		expect(withoutSession.has('agent_session_get')).toBe(false);

		const withSession = createOrchestrationTools(
			makeContext({
				domainContext: {
					agentPreviewSession: { agentId: 'agent-1', threadId: 'preview-1' },
					resolvePreviewSession: async () => await Promise.resolve(null),
				},
			} as Partial<InstanceAiContext>) as never,
		);
		expect(withSession.has('agent_session_get')).toBe(true);
	});
});
