import type { OrchestrationContext, TaskStorage } from '../../../types';
import { delegateInputSchema } from '../delegate.schemas';

// Mock heavy Mastra dependencies to avoid ESM issues in Jest
jest.mock('@mastra/core/agent', () => ({ Agent: jest.fn() }));
jest.mock('@mastra/core/tools', () => ({
	createTool: jest.fn((config: Record<string, unknown>) => config),
}));
jest.mock('@mastra/core/mastra', () => ({ Mastra: jest.fn() }));
jest.mock('@mastra/memory', () => ({ Memory: jest.fn() }));
jest.mock('../../../stream/consume-with-hitl', () => ({ consumeStreamWithHitl: jest.fn() }));
jest.mock('../../../stream/map-chunk', () => ({ mapMastraChunkToEvent: jest.fn() }));
jest.mock('../../../storage/iteration-log', () => ({ formatPreviousAttempts: jest.fn() }));

const { createDelegateTool } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
	require('../delegate.tool') as typeof import('../delegate.tool');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockContext(domainTools: Record<string, unknown> = {}): OrchestrationContext {
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
		logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
		domainTools: domainTools as OrchestrationContext['domainTools'],
		abortSignal: new AbortController().signal,
		taskStorage: {
			get: jest.fn(),
			save: jest.fn(),
		} as TaskStorage,
	};
}

function makeValidInput() {
	return {
		role: 'workflow builder',
		instructions: 'Build a workflow',
		tools: ['tool-a'],
		briefing: 'Create a simple workflow',
	};
}

// ---------------------------------------------------------------------------
// Schema validation
// ---------------------------------------------------------------------------

describe('delegateInputSchema', () => {
	it('accepts valid input', () => {
		const result = delegateInputSchema.safeParse(makeValidInput());
		expect(result.success).toBe(true);
	});

	it('accepts empty tools array (defaults to [])', () => {
		const result = delegateInputSchema.safeParse({
			...makeValidInput(),
			tools: [],
		});
		expect(result.success).toBe(true);
	});

	it('rejects missing required field', () => {
		const { role: _, ...rest } = makeValidInput();
		const result = delegateInputSchema.safeParse(rest);
		expect(result.success).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Tool validation (errors returned before sub-agent creation)
// ---------------------------------------------------------------------------

describe('createDelegateTool', () => {
	it('rejects "plan" in tools array', async () => {
		const context = createMockContext({ 'tool-a': {} });
		const tool = createDelegateTool(context);

		const output = (await tool.execute!(
			{ ...makeValidInput(), tools: ['plan'] },
			{} as never,
		)) as Record<string, unknown>;

		expect('result' in output).toBe(true);
		expect((output as { result: string }).result).toContain('plan');
		expect((output as { result: string }).result).toContain('cannot be delegated');
	});

	it('rejects "delegate" in tools array', async () => {
		const context = createMockContext({ 'tool-a': {} });
		const tool = createDelegateTool(context);

		const output = (await tool.execute!(
			{ ...makeValidInput(), tools: ['delegate'] },
			{} as never,
		)) as Record<string, unknown>;

		expect('result' in output).toBe(true);
		expect((output as { result: string }).result).toContain('delegate');
		expect((output as { result: string }).result).toContain('cannot be delegated');
	});

	it('rejects unknown tool names', async () => {
		const context = createMockContext({ 'tool-a': {} });
		const tool = createDelegateTool(context);

		const output = (await tool.execute!(
			{ ...makeValidInput(), tools: ['nonexistent'] },
			{} as never,
		)) as Record<string, unknown>;

		expect('result' in output).toBe(true);
		expect((output as { result: string }).result).toContain('nonexistent');
		expect((output as { result: string }).result).toContain('not a registered domain tool');
	});
});
