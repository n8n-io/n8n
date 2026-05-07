import { createAllTools, createOrchestratorDomainTools } from '..';
import type { InstanceAiContext } from '../../types';

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

function makeContext(): InstanceAiContext {
	return {
		userId: 'user-a',
		logger: { warn: jest.fn() },
	} as unknown as InstanceAiContext;
}

describe('domain tool construction', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('creates the native full domain tool map', () => {
		const context = makeContext();

		const domainTools = createAllTools(context);

		expect(domainTools).toMatchObject({
			workflows: { id: 'workflows' },
			executions: { id: 'executions' },
			credentials: { id: 'credentials' },
			'data-tables': { id: 'data-tables' },
			workspace: { id: 'workspace' },
			research: { id: 'research' },
			nodes: { id: 'nodes' },
			'ask-user': { id: 'ask-user' },
			'build-workflow': { id: 'build-workflow' },
		});
	});

	it('creates the native orchestrator domain tool map', () => {
		const context = makeContext();

		const orchestratorTools = createOrchestratorDomainTools(context);

		expect(orchestratorTools).toMatchObject({
			workflows: { id: 'workflows-orchestrator' },
			executions: { id: 'executions' },
			credentials: { id: 'credentials' },
			'data-tables': { id: 'data-tables-orchestrator' },
			workspace: { id: 'workspace' },
			research: { id: 'research' },
			nodes: { id: 'nodes-orchestrator' },
			'ask-user': { id: 'ask-user' },
		});
	});
});
