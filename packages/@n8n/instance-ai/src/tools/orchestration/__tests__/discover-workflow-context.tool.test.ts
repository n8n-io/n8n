import { executeTool } from '../../../__tests__/tool-test-utils';
import { createToolRegistry } from '../../../tool-registry';
import type { OrchestrationContext } from '../../../types';
import { runSyncSubAgent } from '../sync-sub-agent';
import {
	createDiscoverWorkflowContextTool,
	discoverWorkflowContextInputSchema,
} from '../discover-workflow-context.tool';

vi.mock('../sync-sub-agent', () => ({ runSyncSubAgent: vi.fn() }));

const runSyncSubAgentMock = vi.mocked(runSyncSubAgent);

function createMockContext(domainTools: Record<string, unknown> = {}): OrchestrationContext {
	return {
		threadId: 'test-thread',
		runId: 'test-run',
		userId: 'test-user',
		orchestratorAgentId: 'test-agent',
		modelId: 'test-model',
		eventBus: {
			publish: vi.fn(),
			subscribe: vi.fn(),
			getEventsAfter: vi.fn(),
			getNextEventId: vi.fn(),
			getEventsForRun: vi.fn().mockReturnValue([]),
			getEventsForRuns: vi.fn().mockReturnValue([]),
		},
		logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
		domainTools: createToolRegistry(
			Object.entries(domainTools).map(([name, tool]) => [
				name,
				{ name, description: name, ...(tool as object) },
			]),
		),
		abortSignal: new AbortController().signal,
		taskStorage: { get: vi.fn(), save: vi.fn() },
	} as unknown as OrchestrationContext;
}

beforeEach(() => {
	runSyncSubAgentMock.mockReset();
});

describe('discoverWorkflowContextInputSchema', () => {
	it('accepts valid input', () => {
		const result = discoverWorkflowContextInputSchema.safeParse({
			services: ['Gmail', 'Google Sheets'],
			categories: ['data_persistence'],
			conversationContext: 'Build a lead capture workflow',
		});
		expect(result.success).toBe(true);
	});

	it('rejects an empty services array', () => {
		const result = discoverWorkflowContextInputSchema.safeParse({ services: [] });
		expect(result.success).toBe(false);
	});

	it('rejects missing services', () => {
		const result = discoverWorkflowContextInputSchema.safeParse({ categories: ['chatbot'] });
		expect(result.success).toBe(false);
	});
});

describe('createDiscoverWorkflowContextTool', () => {
	it('errors when the nodes tool is unavailable', async () => {
		const context = createMockContext({ credentials: {} });
		const tool = createDiscoverWorkflowContextTool(context);

		const output = await executeTool<{ result: string }>(
			tool,
			{ services: ['Gmail'] },
			{} as never,
		);

		expect(output.result).toContain('nodes');
		expect(runSyncSubAgentMock).not.toHaveBeenCalled();
	});

	it('runs the scout with the available discovery tools and returns its debrief', async () => {
		runSyncSubAgentMock.mockResolvedValue({ result: 'debrief text' });
		const context = createMockContext({ nodes: {}, credentials: {}, research: {} });
		const tool = createDiscoverWorkflowContextTool(context);

		const output = await executeTool<{ result: string }>(
			tool,
			{ services: ['Gmail', 'OpenAI'], conversationContext: 'ctx' },
			{} as never,
		);

		expect(output.result).toBe('debrief text');
		expect(runSyncSubAgentMock).toHaveBeenCalledTimes(1);
		const callArg = runSyncSubAgentMock.mock.calls[0][1];
		expect(callArg.toolNames).toEqual(['nodes', 'credentials', 'research']);
		expect(callArg.conversationContext).toBe('ctx');
		expect(callArg.briefing).toContain('Gmail, OpenAI');
	});

	it('only resolves the discovery tools that are registered', async () => {
		runSyncSubAgentMock.mockResolvedValue({ result: 'ok' });
		const context = createMockContext({ nodes: {} });
		const tool = createDiscoverWorkflowContextTool(context);

		await executeTool(tool, { services: ['Slack'] }, {} as never);

		const callArg = runSyncSubAgentMock.mock.calls[0][1];
		expect(callArg.toolNames).toEqual(['nodes']);
	});
});
