import { createAllTools, createOrchestratorDomainTools } from '..';
import { isParseableAttachment } from '../../parsers/structured-file-parser';
import type { InstanceAiContext } from '../../types';

jest.mock('../../parsers/structured-file-parser', () => ({
	isParseableAttachment: jest.fn(() => false),
}));

jest.mock('../attachments/parse-file.tool', () => ({
	createParseFileTool: jest.fn(() => ({ id: 'parse-file' })),
}));

jest.mock('../credentials.tool', () => ({
	CREDENTIALS_TOOL_ID: 'credentials',
	createCredentialsTool: jest.fn(() => ({ id: 'credentials' })),
}));

jest.mock('../data-tables.tool', () => ({
	DATA_TABLES_TOOL_ID: 'data-tables',
	createDataTablesTool: jest.fn((_context: unknown, scope?: string) => ({
		id: scope ? `data-tables-${scope}` : 'data-tables',
	})),
}));

jest.mock('../executions.tool', () => ({
	createExecutionsTool: jest.fn(() => ({ id: 'executions' })),
}));

jest.mock('../nodes.tool', () => ({
	createNodesTool: jest.fn((_context: unknown, scope?: string) => ({
		id: scope ? `nodes-${scope}` : 'nodes',
	})),
}));

jest.mock('../orchestration/complete-checkpoint.tool', () => ({
	createCompleteCheckpointTool: jest.fn(() => ({ id: 'complete-checkpoint' })),
}));

jest.mock('../orchestration/delegate.tool', () => ({
	createDelegateTool: jest.fn(() => ({ id: 'delegate' })),
}));

jest.mock('../evals/evals.tool', () => ({
	createEvalsTool: jest.fn(() => ({ id: 'evals' })),
}));

jest.mock('../orchestration/eval-setup-agent.tool', () => ({
	createEvalSetupAgentTool: jest.fn(() => ({ id: 'eval-setup-with-agent' })),
}));

jest.mock('../orchestration/eval-data-agent.tool', () => ({
	createEvalDataAgentTool: jest.fn(() => ({ id: 'eval-data' })),
}));

jest.mock('../orchestration/plan-with-agent.tool', () => ({
	createPlanWithAgentTool: jest.fn(() => ({ id: 'plan' })),
}));

jest.mock('../orchestration/plan.tool', () => ({
	createPlanTool: jest.fn(() => ({ id: 'create-tasks' })),
}));

jest.mock('../orchestration/report-verification-verdict.tool', () => ({
	createReportVerificationVerdictTool: jest.fn(() => ({ id: 'report-verification-verdict' })),
}));

jest.mock('../orchestration/verify-built-workflow.tool', () => ({
	createVerifyBuiltWorkflowTool: jest.fn(() => ({ id: 'verify-built-workflow' })),
}));

jest.mock('../research.tool', () => ({
	createResearchTool: jest.fn(() => ({ id: 'research' })),
}));

jest.mock('../shared/ask-user.tool', () => ({
	ASK_USER_TOOL_ID: 'ask-user',
	createAskUserTool: jest.fn(() => ({ id: 'ask-user' })),
}));

jest.mock('../task-control.tool', () => ({
	createTaskControlTool: jest.fn(() => ({ id: 'task-control' })),
}));

jest.mock('../workflows/apply-workflow-credentials.tool', () => ({
	createApplyWorkflowCredentialsTool: jest.fn(() => ({ id: 'apply-workflow-credentials' })),
}));

jest.mock('../workflows.tool', () => ({
	createWorkflowsTool: jest.fn((_context: unknown, options?: unknown) => ({
		id: options ? 'workflows-filtered' : 'workflows',
	})),
}));

jest.mock('../workspace.tool', () => ({
	createWorkspaceTool: jest.fn(() => ({ id: 'workspace' })),
}));

jest.mock('../filesystem/create-tools-from-mcp-server', () => ({
	createToolsFromLocalMcpServer: jest.fn(() => ({
		browser_connect: { id: 'browser_connect' },
		browser_navigate: { id: 'browser_navigate' },
	})),
}));

function makeContext(overrides: Partial<InstanceAiContext> = {}): InstanceAiContext {
	return {
		userId: 'user-a',
		logger: { warn: jest.fn() },
		...overrides,
	} as unknown as InstanceAiContext;
}

describe('domain tool construction', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.mocked(isParseableAttachment).mockReturnValue(false);
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
			nodes: { id: 'nodes' },
			'ask-user': { id: 'ask-user' },
		});
	});

	it('creates the native orchestrator domain tool map', () => {
		const context = makeContext();

		const orchestratorTools = createOrchestratorDomainTools(context);

		expect(Object.fromEntries(orchestratorTools)).toMatchObject({
			workflows: { id: 'workflows-filtered' },
			evals: { id: 'evals' },
			executions: { id: 'executions' },
			credentials: { id: 'credentials' },
			'data-tables': { id: 'data-tables' },
			workspace: { id: 'workspace' },
			research: { id: 'research' },
			nodes: { id: 'nodes-orchestrator' },
			'ask-user': { id: 'ask-user' },
		});

		const { createWorkflowsTool } = jest.requireMock('../workflows.tool');
		const { createDataTablesTool } = jest.requireMock('../data-tables.tool');
		expect(createWorkflowsTool).toHaveBeenCalledWith(context, 'orchestrator');
		expect(createDataTablesTool).toHaveBeenCalledWith(context);
	});

	it('limits planned workflow-build follow-ups for new workflows to create actions', () => {
		const context = makeContext({
			plannedBuildTask: {
				threadId: 'thread-a',
				taskId: 'task-build',
				workItemId: 'wi-1',
				title: 'Build workflow',
				spec: 'Build it',
				plannedTaskService: {},
			} as unknown as InstanceAiContext['plannedBuildTask'],
		});

		createOrchestratorDomainTools(context);

		const { createWorkflowsTool } = jest.requireMock('../workflows.tool');
		expect(createWorkflowsTool).toHaveBeenCalledWith(context, {
			surface: 'orchestrator',
			allowedActions: ['list', 'get', 'get-as-code', 'create'],
			descriptionPrefix: 'Planned workflow-build follow-up for a new workflow',
			descriptionSuffix: 'The workItemId wi-1 is build tracking metadata, not a workflowId.',
		});
	});

	it('limits planned workflow-build follow-ups for existing workflows to update actions', () => {
		const context = makeContext({
			plannedBuildTask: {
				threadId: 'thread-a',
				taskId: 'task-build',
				workItemId: 'wi-1',
				title: 'Build workflow',
				spec: 'Build it',
				workflowId: 'wf-1',
				plannedTaskService: {},
			} as unknown as InstanceAiContext['plannedBuildTask'],
		});

		createOrchestratorDomainTools(context);

		const { createWorkflowsTool } = jest.requireMock('../workflows.tool');
		expect(createWorkflowsTool).toHaveBeenCalledWith(context, {
			surface: 'orchestrator',
			allowedActions: ['list', 'get', 'get-as-code', 'update'],
			descriptionPrefix: 'Planned workflow-build follow-up for existing workflow wf-1',
			descriptionSuffix: 'The workItemId wi-1 is build tracking metadata, not a workflowId.',
		});
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
		jest.mocked(isParseableAttachment).mockReturnValue(true);
		const context = makeContext({
			currentUserAttachments: [{ data: '', mimeType: 'text/html', fileName: 'page.html' }],
		});

		expect(createAllTools(context).get('parse-file')).toMatchObject({ id: 'parse-file' });
		expect(createOrchestratorDomainTools(context).get('parse-file')).toMatchObject({
			id: 'parse-file',
		});
	});
});
