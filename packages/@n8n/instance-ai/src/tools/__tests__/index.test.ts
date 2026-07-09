import { createAllTools, createOrchestrationTools, createOrchestratorDomainTools } from '..';
import { isParseableAttachment } from '../../parsers/structured-file-parser';
import type { InstanceAiContext } from '../../types';

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

vi.mock('../n8n-docs.tool', () => ({
	createN8nDocsTool: vi.fn(() => ({ id: 'n8n-docs' })),
}));

vi.mock('../orchestration/build-agent.tool', () => ({
	createBuildAgentTool: vi.fn(() => ({ id: 'build-agent' })),
}));

vi.mock('../orchestration/complete-checkpoint.tool', () => ({
	createCompleteCheckpointTool: vi.fn(() => ({ id: 'complete-checkpoint' })),
}));

vi.mock('../evals/evals.tool', () => ({
	createEvalsTool: vi.fn(() => ({ id: 'evals' })),
}));

vi.mock('../orchestration/eval-setup-agent.tool', () => ({
	createEvalSetupAgentTool: vi.fn(() => ({ id: 'eval-setup-with-agent' })),
}));

vi.mock('../orchestration/eval-data-agent.tool', () => ({
	createEvalDataAgentTool: vi.fn(() => ({ id: 'eval-data' })),
}));

vi.mock('../orchestration/plan.tool', () => ({
	createPlanTool: vi.fn(() => ({ id: 'create-tasks' })),
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

vi.mock('../task-control.tool', () => ({
	createTaskControlTool: vi.fn(() => ({ id: 'task-control' })),
}));

vi.mock('../workflows/apply-workflow-credentials.tool', () => ({
	createApplyWorkflowCredentialsTool: vi.fn(() => ({ id: 'apply-workflow-credentials' })),
}));

vi.mock('../workflows/build-workflow.tool', () => ({
	createBuildWorkflowTool: vi.fn(() => ({ id: 'build-workflow' })),
}));

vi.mock('../workflows.tool', () => ({
	createWorkflowsTool: vi.fn((_context: unknown, options?: unknown) => ({
		id: options ? 'workflows-orchestrator' : 'workflows',
	})),
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

	it('creates the native full domain tool map', () => {
		const context = makeContext();

		const domainTools = createAllTools(context);

		expect(Object.fromEntries(domainTools)).toMatchObject({
			workflows: { id: 'workflows' },
			evals: { id: 'evals' },
			executions: { id: 'executions' },
			credentials: { id: 'credentials' },
			'data-tables': { id: 'data-tables' },
			workspace: { id: 'workspace' },
			research: { id: 'research' },
			'n8n-docs': { id: 'n8n-docs' },
			nodes: { id: 'nodes' },
			'ask-user': { id: 'ask-user' },
			'build-workflow': { id: 'build-workflow' },
		});
	});

	it('creates the native orchestrator domain tool map', async () => {
		const context = makeContext();

		const orchestratorTools = createOrchestratorDomainTools(context);

		expect(Object.fromEntries(orchestratorTools)).toMatchObject({
			workflows: { id: 'workflows-orchestrator' },
			evals: { id: 'evals' },
			executions: { id: 'executions' },
			credentials: { id: 'credentials' },
			'data-tables': { id: 'data-tables' },
			workspace: { id: 'workspace' },
			research: { id: 'research' },
			'n8n-docs': { id: 'n8n-docs' },
			nodes: { id: 'nodes' },
			'ask-user': { id: 'ask-user' },
			'build-workflow': { id: 'build-workflow' },
		});

		const { createWorkflowsTool } = await import('../workflows.tool.js');
		const { createNodesTool } = await import('../nodes.tool.js');
		const { createDataTablesTool } = await import('../data-tables.tool.js');
		expect(createWorkflowsTool).toHaveBeenCalledWith(context, 'orchestrator');
		expect(createNodesTool).toHaveBeenCalledWith(context);
		expect(createDataTablesTool).toHaveBeenCalledWith(context);
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

		expect(createAllTools(context).get('parse-file')).toMatchObject({ id: 'parse-file' });
		expect(createOrchestratorDomainTools(context).get('parse-file')).toMatchObject({
			id: 'parse-file',
		});
	});

	it('registers create-tasks but not the removed plan orchestration tool', () => {
		const context = makeContext({
			workflowTaskService: {},
			domainContext: {},
		} as Partial<InstanceAiContext>);

		const orchestrationTools = createOrchestrationTools(context as never);

		expect(orchestrationTools.has('create-tasks')).toBe(true);
		expect(orchestrationTools.has('plan')).toBe(false);
		expect(orchestrationTools.has('delegate')).toBe(false);
	});

	it('registers build-agent only when a builder delegate is present on the domain context', () => {
		const withoutDelegate = createOrchestrationTools(
			makeContext({ domainContext: {} } as Partial<InstanceAiContext>) as never,
		);
		expect(withoutDelegate.has('build-agent')).toBe(false);

		const withDelegate = createOrchestrationTools(
			makeContext({
				domainContext: { builderDelegate: {} },
			} as Partial<InstanceAiContext>) as never,
		);
		expect(Object.fromEntries(withDelegate)).toMatchObject({
			'build-agent': { id: 'build-agent' },
		});
	});
});
