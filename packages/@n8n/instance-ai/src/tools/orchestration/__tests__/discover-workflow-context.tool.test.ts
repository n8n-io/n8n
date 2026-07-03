import { isRecord } from '@n8n/utils/is-record';

import { executeTool } from '../../../__tests__/tool-test-utils';
import { createToolRegistry } from '../../../tool-registry';
import type { OrchestrationContext } from '../../../types';
import {
	createDiscoverWorkflowContextTool,
	discoverWorkflowContextInputSchema,
} from '../discover-workflow-context.tool';
import { runSyncSubAgent } from '../sync-sub-agent';

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

	it('runs as the workflow-context-scout sub-agent definition', async () => {
		runSyncSubAgentMock.mockResolvedValue({ result: 'debrief text' });
		const context = createMockContext({ nodes: {}, credentials: {}, research: {} });
		const tool = createDiscoverWorkflowContextTool(context);

		await executeTool(tool, { services: ['Gmail'] }, {} as never);

		const callArg = runSyncSubAgentMock.mock.calls[0][1];
		expect(callArg.role).toBe('workflow-context-scout');
		expect(callArg.instructions).toContain('workflow discovery specialist');
		expect(callArg.maxIterations).toBe(25);
	});

	it('appends host-captured type definitions after the scout debrief', async () => {
		const nodesHandler = vi.fn((input: unknown) => {
			if (isRecord(input) && input.action === 'type-definition' && Array.isArray(input.nodeTypes)) {
				return {
					definitions: input.nodeTypes.map((nodeType: unknown) => ({
						nodeType,
						version: 1,
						content: `content-for-${String(nodeType)}`,
					})),
				};
			}
			return {};
		});

		runSyncSubAgentMock.mockImplementation(async (_context, input) => {
			// Simulate the scout fetching a type definition mid-run.
			const nodesTool = input.validTools.get('nodes');
			await nodesTool?.handler?.(
				{ action: 'type-definition', nodeTypes: ['n8n-nodes-base.gmail'] },
				{} as never,
			);
			return { result: 'Nodes: gmail\nCredentials: gmail exists' };
		});

		const context = createMockContext({ nodes: { handler: nodesHandler }, credentials: {} });
		const tool = createDiscoverWorkflowContextTool(context);

		const output = await executeTool<{ result: string }>(
			tool,
			{ services: ['Gmail'] },
			{} as never,
		);

		expect(output.result).toContain('Nodes: gmail');
		expect(output.result).toContain('## Type definitions');
		expect(output.result).toContain('### n8n-nodes-base.gmail (v1)');
		expect(output.result).toContain('content-for-n8n-nodes-base.gmail');
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
