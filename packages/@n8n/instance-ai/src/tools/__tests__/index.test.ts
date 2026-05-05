import type { ToolsInput } from '@mastra/core/agent';
import type { McpTool } from '@n8n/api-types';

import { createAllTools, createOrchestratorDomainTools } from '..';
import type { InstanceAiContext, LocalMcpServer } from '../../types';
import { createToolsFromLocalMcpServer } from '../filesystem/create-tools-from-mcp-server';

jest.mock('../../parsers/structured-file-parser', () => ({
	isStructuredAttachment: jest.fn(() => false),
}));

jest.mock('../attachments/parse-file.tool', () => ({
	createParseFileTool: jest.fn(() => ({ id: 'parse-file' })),
}));

jest.mock('../credentials.tool', () => ({
	createCredentialsTool: jest.fn(() => ({ id: 'credentials' })),
}));

jest.mock('../data-tables.tool', () => ({
	createDataTablesTool: jest.fn((_context: unknown, scope?: string) => ({
		id: scope ? `data-tables-${scope}` : 'data-tables',
	})),
}));

jest.mock('../executions.tool', () => ({
	createExecutionsTool: jest.fn(() => ({ id: 'executions' })),
}));

jest.mock('../filesystem/create-tools-from-mcp-server', () => ({
	createToolsFromLocalMcpServer: jest.fn(),
}));

jest.mock('../nodes.tool', () => ({
	createNodesTool: jest.fn((_context: unknown, scope?: string) => ({
		id: scope ? `nodes-${scope}` : 'nodes',
	})),
}));

jest.mock('../orchestration/browser-credential-setup.tool', () => ({
	createBrowserCredentialSetupTool: jest.fn(() => ({ id: 'browser-credential-setup' })),
}));

jest.mock('../orchestration/build-workflow-agent.tool', () => ({
	createBuildWorkflowAgentTool: jest.fn(() => ({ id: 'build-workflow-with-agent' })),
}));

jest.mock('../orchestration/complete-checkpoint.tool', () => ({
	createCompleteCheckpointTool: jest.fn(() => ({ id: 'complete-checkpoint' })),
}));

jest.mock('../orchestration/delegate.tool', () => ({
	createDelegateTool: jest.fn(() => ({ id: 'delegate' })),
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
	createAskUserTool: jest.fn(() => ({ id: 'ask-user' })),
}));

jest.mock('../task-control.tool', () => ({
	createTaskControlTool: jest.fn(() => ({ id: 'task-control' })),
}));

jest.mock('../workflows/apply-workflow-credentials.tool', () => ({
	createApplyWorkflowCredentialsTool: jest.fn(() => ({ id: 'apply-workflow-credentials' })),
}));

jest.mock('../workflows/build-workflow.tool', () => ({
	createBuildWorkflowTool: jest.fn(() => ({ id: 'build-workflow' })),
}));

jest.mock('../workflows.tool', () => ({
	createWorkflowsTool: jest.fn((_context: unknown, scope?: string) => ({
		id: scope ? `workflows-${scope}` : 'workflows',
	})),
}));

jest.mock('../workspace.tool', () => ({
	createWorkspaceTool: jest.fn(() => ({ id: 'workspace' })),
}));

const mockedCreateToolsFromLocalMcpServer = jest.mocked(createToolsFromLocalMcpServer);

const TOOL_SCHEMA: McpTool['inputSchema'] = { type: 'object', properties: {} };

function makeTool(name: string): McpTool {
	return {
		name,
		description: name,
		inputSchema: TOOL_SCHEMA,
	};
}

function makeServer(browserToolNames: string[] = []): jest.Mocked<LocalMcpServer> {
	return {
		getAvailableTools: jest.fn().mockReturnValue([]),
		getToolsByCategory: jest.fn((category: string) =>
			category === 'browser' ? browserToolNames.map(makeTool) : [],
		),
		callTool: jest.fn(),
	};
}

function makeContext(server: LocalMcpServer): InstanceAiContext {
	return {
		userId: 'user-a',
		localMcpServer: server,
		logger: { warn: jest.fn() },
	} as unknown as InstanceAiContext;
}

function tools(input: Record<string, unknown>): ToolsInput {
	return input as ToolsInput;
}

describe('domain tool construction', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockedCreateToolsFromLocalMcpServer.mockReturnValue({});
	});

	it('adds safe local gateway tools to the full domain tool map', () => {
		const server = makeServer(['browser_navigate']);
		const context = makeContext(server);
		mockedCreateToolsFromLocalMcpServer.mockReturnValue(
			tools({
				read_file: { id: 'read_file' },
				browser_navigate: { id: 'browser_navigate' },
			}),
		);

		const domainTools = createAllTools(context);

		expect(domainTools.read_file).toEqual({ id: 'read_file' });
		expect(domainTools.browser_navigate).toEqual({ id: 'browser_navigate' });
		expect(mockedCreateToolsFromLocalMcpServer).toHaveBeenCalledWith(server, context.logger);
	});

	it('keeps browser-category gateway tools out of the orchestrator domain map', () => {
		const server = makeServer(['browser_navigate']);
		const context = makeContext(server);
		mockedCreateToolsFromLocalMcpServer.mockReturnValue(
			tools({
				read_file: { id: 'read_file' },
				browser_navigate: { id: 'browser_navigate' },
			}),
		);

		const orchestratorTools = createOrchestratorDomainTools(context);

		expect(orchestratorTools.read_file).toEqual({ id: 'read_file' });
		expect(orchestratorTools.browser_navigate).toBeUndefined();
	});

	it('skips local gateway tools that collide with native tool names', () => {
		const server = makeServer();
		const context = makeContext(server);
		mockedCreateToolsFromLocalMcpServer.mockReturnValue(
			tools({
				workflows: { id: 'local-workflows' },
				read_file: { id: 'read_file' },
			}),
		);

		const domainTools = createAllTools(context);

		expect(domainTools.workflows).toEqual({ id: 'workflows' });
		expect(domainTools.read_file).toEqual({ id: 'read_file' });
		expect(context.logger?.warn).toHaveBeenCalledWith(
			'Skipped MCP tool with unsafe name',
			expect.objectContaining({
				source: 'local gateway MCP',
				toolName: 'workflows',
			}),
		);
	});
});
