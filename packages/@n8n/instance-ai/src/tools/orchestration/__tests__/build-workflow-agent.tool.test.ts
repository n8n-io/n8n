import type { OrchestrationContext, TaskStorage } from '../../../types';

jest.mock('@mastra/core/agent', () => ({ Agent: jest.fn() }));
jest.mock('@mastra/core/tools', () => ({
	createTool: jest.fn((config: Record<string, unknown>) => config),
}));
jest.mock('@n8n/workflow-sdk', () => ({ generateWorkflowCode: jest.fn() }));
jest.mock('../browser-credential-setup.tool', () => ({
	createBrowserCredentialSetupTool: jest.fn(),
}));
jest.mock('../build-workflow-agent.prompt', () => ({
	BUILDER_AGENT_PROMPT: 'builder prompt',
	SANDBOX_BUILDER_AGENT_PROMPT: 'sandbox builder prompt',
}));
jest.mock('../tracing-utils', () => ({
	createDetachedSubAgentTracing: jest.fn(),
	traceSubAgentTools: jest.fn((tools: unknown) => tools),
	withTraceContextActor: jest.fn(async (_trace: unknown, fn: () => Promise<unknown>) => await fn()),
}));
jest.mock('../verify-built-workflow.tool', () => ({
	createVerifyBuiltWorkflowTool: jest.fn(),
}));
jest.mock('../../../agent/register-with-mastra', () => ({
	registerWithMastra: jest.fn(),
}));
jest.mock('../../../runtime/resumable-stream-executor', () => ({
	createLlmStepTraceHooks: jest.fn(),
}));
jest.mock('../../../runtime/working-memory-tracing', () => ({
	traceWorkingMemoryContext: jest.fn(
		async (_ctx: unknown, fn: () => Promise<unknown>) => await fn(),
	),
}));
jest.mock('../../../storage/iteration-log', () => ({
	formatPreviousAttempts: jest.fn(),
}));
jest.mock('../../../stream/consume-with-hitl', () => ({
	consumeStreamWithHitl: jest.fn(),
}));
jest.mock('../../../tracing/langsmith-tracing', () => ({
	buildAgentTraceInputs: jest.fn(),
	getTraceParentRun: jest.fn(),
	mergeTraceRunInputs: jest.fn(),
	withTraceParentContext: jest.fn(
		async (_trace: unknown, fn: () => Promise<unknown>) => await fn(),
	),
}));
jest.mock('../../../workspace/sandbox-fs', () => ({
	readFileViaSandbox: jest.fn(),
}));
jest.mock('../../../workspace/sandbox-setup', () => ({
	getWorkspaceRoot: jest.fn(),
}));
jest.mock('../../workflows/apply-workflow-credentials.tool', () => ({
	createApplyWorkflowCredentialsTool: jest.fn(),
}));
jest.mock('../../workflows/resolve-credentials', () => ({
	buildCredentialMap: jest.fn(),
}));
jest.mock('../../workflows/submit-workflow.tool', () => ({
	createSubmitWorkflowTool: jest.fn(),
}));

const { createBuildWorkflowAgentTool } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
	require('../build-workflow-agent.tool') as typeof import('../build-workflow-agent.tool');

function createMockContext(overrides: Partial<OrchestrationContext> = {}): OrchestrationContext {
	return {
		threadId: 'test-thread',
		runId: 'test-run',
		userId: 'test-user',
		orchestratorAgentId: 'test-agent',
		modelId: 'test-model',
		storage: { id: 'test-storage' } as OrchestrationContext['storage'],
		subAgentMaxSteps: 5,
		eventBus: {
			publish: jest.fn(),
			subscribe: jest.fn(),
			getEventsAfter: jest.fn(),
			getNextEventId: jest.fn(),
			getEventsForRun: jest.fn().mockReturnValue([]),
			getEventsForRuns: jest.fn().mockReturnValue([]),
		},
		domainTools: {} as OrchestrationContext['domainTools'],
		abortSignal: new AbortController().signal,
		taskStorage: {
			get: jest.fn(),
			save: jest.fn(),
		} as TaskStorage,
		spawnBackgroundTask: jest.fn(),
		...overrides,
	};
}

describe('createBuildWorkflowAgentTool', () => {
	it('blocks direct builds while template adaptation still requires plan review', async () => {
		const context = createMockContext({ templateAdaptationRequiresPlanReview: true });
		const tool = createBuildWorkflowAgentTool(context);

		const result = await tool.execute!(
			{ task: 'Build the adapted workflow', conversationContext: 'Template adaptation' },
			{} as never,
		);

		expect(result).toEqual({
			result:
				'Template adaptation must go through plan review first. Call `plan` with a single `build-workflow` task instead of `build-workflow-with-agent`.',
			taskId: '',
		});
		expect(context.spawnBackgroundTask).not.toHaveBeenCalled();
	});
});
