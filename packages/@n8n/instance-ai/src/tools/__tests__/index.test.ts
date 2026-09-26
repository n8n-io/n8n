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
	CREDENTIALS_TOOL_ID: 'credentials',
	createCredentialsTool: vi.fn(() => ({ id: 'credentials' })),
}));

vi.mock('../data-tables.tool', () => ({
	DATA_TABLES_TOOL_ID: 'data-tables',
	createDataTablesTool: vi.fn((_context: unknown, scope?: string) => ({
		id: scope ? `data-tables-${scope}` : 'data-tables',
	})),
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
	createSearchModelsTool: vi.fn(() => ({ id: 'searchModels' })),
}));

vi.mock('../n8n-docs.tool', () => ({
	createN8nDocsTool: vi.fn(() => ({ id: 'n8n-docs' })),
}));

vi.mock('../mcp-servers.tool', () => ({
	createMcpServersTool: vi.fn(() => ({ id: 'mcp-servers' })),
}));

vi.mock('../orchestration/select-agent.tool', () => ({
	createSelectAgentTool: vi.fn(() => ({ id: 'select-agent' })),
}));

vi.mock('../orchestration/list-agent-capabilities.tool', () => ({
	createListAgentCapabilitiesTool: vi.fn(() => ({ id: 'list-agent-capabilities' })),
}));

vi.mock('../orchestration/report-verification-verdict.tool', () => ({
	createReportVerificationVerdictTool: vi.fn(() => ({ id: 'report-verification-verdict' })),
}));

vi.mock('../orchestration/verify-built-workflow.tool', () => ({
	createVerifyBuiltWorkflowTool: vi.fn(() => ({ id: 'verify-built-workflow' })),
}));

vi.mock('../research.tool', () => ({
	createResearchTool: vi.fn(() => ({ id: 'research' })),
}));

vi.mock('../shared/ask-user.tool', () => ({
	ASK_USER_TOOL_ID: 'ask-user',
	createAskUserTool: vi.fn(() => ({ id: 'ask-user' })),
}));

vi.mock('../workflows/apply-workflow-credentials.tool', () => ({
	createApplyWorkflowCredentialsTool: vi.fn(() => ({ id: 'apply-workflow-credentials' })),
}));

vi.mock('../workflows/build-workflow.tool', () => ({
	createBuildWorkflowTool: vi.fn(() => ({ id: 'build-workflow' })),
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
			'data-tables': { id: 'data-tables' },
			workspace: { id: 'workspace' },
			research: { id: 'research' },
			'n8n-docs': { id: 'n8n-docs' },
			nodes: { id: 'nodes' },
			searchModels: { id: 'searchModels' },
			'ask-user': { id: 'ask-user' },
			'build-workflow': { id: 'build-workflow' },
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

	it('loads model catalog search on every turn so a mid-build activation does not rewrite the prompt cache', () => {
		expect(getActiveOrchestratorDomainToolNames(makeContext())).toContain('searchModels');
		expect(ALWAYS_LOADED_TOOL_NAMES.has('searchModels')).toBe(true);
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

	it('pairs list-agent-capabilities with select-agent in the always-loaded set', () => {
		// Both are gated on the agents feature flag at module load time, so they
		// must always be in or out together — the orchestrator needs to check
		// support before it chooses a workflow or Agent, on the same footing as select-agent.
		expect(ALWAYS_LOADED_TOOL_NAMES.has('list-agent-capabilities')).toBe(
			ALWAYS_LOADED_TOOL_NAMES.has('select-agent'),
		);
	});

	it('does not construct retired orchestration tools', () => {
		const context = mock<OrchestrationContext>();

		const orchestrationTools = createOrchestrationTools(context);

		expect(orchestrationTools.has('create-tasks')).toBe(false);
		expect(orchestrationTools.has('task-control')).toBe(false);
		expect(orchestrationTools.has('complete-checkpoint')).toBe(false);
		expect(orchestrationTools.has('plan')).toBe(false);
		expect(orchestrationTools.has('delegate')).toBe(false);
		expect(orchestrationTools.has('eval-setup-with-agent')).toBe(false);
		expect(orchestrationTools.has('eval-data')).toBe(false);
	});

	it('registers the agent building tools only when a builder delegate is present on the domain context', () => {
		const withoutDelegate = createOrchestrationTools(
			makeContext({ domainContext: {} } as Partial<InstanceAiContext>) as never,
		);
		expect(withoutDelegate.has('select-agent')).toBe(false);
		expect(withoutDelegate.has('list-agent-capabilities')).toBe(false);

		const readConfig = { name: 'read_config', description: 'Read', handler: vi.fn() };
		const context = makeContext({
			domainContext: { builderDelegate: { createBuilderTools: () => [readConfig] } },
		} as unknown as Partial<InstanceAiContext>) as unknown as OrchestrationContext;
		const withDelegate = createOrchestrationTools(context);
		expect(Object.fromEntries(withDelegate)).toMatchObject({
			'select-agent': { id: 'select-agent' },
			'list-agent-capabilities': { id: 'list-agent-capabilities' },
			read_config: { name: 'read_config' },
		});
		expect(context.agentBuilderToolNames).toEqual(new Set(['read_config']));
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
