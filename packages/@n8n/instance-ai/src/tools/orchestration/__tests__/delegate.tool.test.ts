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
		},
		domainTools: domainTools as OrchestrationContext['domainTools'],
		abortSignal: new AbortController().signal,
		taskStorage: {
			get: jest.fn(),
			save: jest.fn(),
		} as TaskStorage,
		planStorage: {
			get: jest.fn(),
			save: jest.fn(),
		},
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

		const output = await tool.execute!({ ...makeValidInput(), tools: ['plan'] }, {} as never);

		expect('result' in output).toBe(true);
		expect((output as { result: string }).result).toContain('plan');
		expect((output as { result: string }).result).toContain('cannot be delegated');
	});

	it('rejects "delegate" in tools array', async () => {
		const context = createMockContext({ 'tool-a': {} });
		const tool = createDelegateTool(context);

		const output = await tool.execute!({ ...makeValidInput(), tools: ['delegate'] }, {} as never);

		expect('result' in output).toBe(true);
		expect((output as { result: string }).result).toContain('delegate');
		expect((output as { result: string }).result).toContain('cannot be delegated');
	});

	it('rejects unknown tool names', async () => {
		const context = createMockContext({ 'tool-a': {} });
		const tool = createDelegateTool(context);

		const output = await tool.execute!(
			{ ...makeValidInput(), tools: ['nonexistent'] },
			{} as never,
		);

		expect('result' in output).toBe(true);
		expect((output as { result: string }).result).toContain('nonexistent');
		expect((output as { result: string }).result).toContain('not a registered domain tool');
	});

	it('rejects workflow-building delegation and directs the orchestrator to the builder tool', async () => {
		const context = createMockContext({ 'patch-workflow': {}, 'tool-a': {} });
		const tool = createDelegateTool(context);

		const output = await tool.execute!(
			{
				role: 'workflow builder',
				instructions: 'Modify the workflow structure to add retries',
				tools: ['patch-workflow'],
				briefing: 'Update the workflow to add an error branch and retry handling',
			},
			{} as never,
		);

		expect('result' in output).toBe(true);
		expect((output as { result: string }).result).toContain('build-workflow-with-agent');
		expect((output as { result: string }).result).toContain('workflow building');
	});
});
