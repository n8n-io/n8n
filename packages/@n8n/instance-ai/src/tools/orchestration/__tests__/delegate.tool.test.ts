/* eslint-disable import-x/order */
import { executeTool } from '../../../__tests__/tool-test-utils';
import { createToolRegistry } from '../../../tool-registry';
import type { OrchestrationContext, TaskStorage } from '../../../types';
import { delegateInputSchema } from '../delegate.schemas';

vi.mock('../../../stream/consume-with-hitl', () => ({ consumeStreamWithHitl: vi.fn() }));
vi.mock('../../../storage/iteration-log', () => ({ formatPreviousAttempts: vi.fn() }));

import { createDelegateTool } from '../delegate.tool';

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
		subAgentMaxSteps: 5,
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
		taskStorage: {
			get: vi.fn(),
			save: vi.fn(),
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
	it('rejects "create-tasks" in tools array', async () => {
		const context = createMockContext({ 'tool-a': {} });
		const tool = createDelegateTool(context);

		const output = await executeTool(
			tool,
			{ ...makeValidInput(), tools: ['create-tasks'] },
			{} as never,
		);

		expect('result' in output).toBe(true);
		expect((output as { result: string }).result).toContain('create-tasks');
		expect((output as { result: string }).result).toContain('cannot be delegated');
	});

	it('rejects "delegate" in tools array', async () => {
		const context = createMockContext({ 'tool-a': {} });
		const tool = createDelegateTool(context);

		const output = await executeTool(
			tool,
			{ ...makeValidInput(), tools: ['delegate'] },
			{} as never,
		);

		expect('result' in output).toBe(true);
		expect((output as { result: string }).result).toContain('delegate');
		expect((output as { result: string }).result).toContain('cannot be delegated');
	});

	it('rejects unknown tool names', async () => {
		const context = createMockContext({ 'tool-a': {} });
		const tool = createDelegateTool(context);

		const output = await executeTool(
			tool,
			{ ...makeValidInput(), tools: ['nonexistent'] },
			{} as never,
		);

		expect('result' in output).toBe(true);
		expect((output as { result: string }).result).toContain('nonexistent');
		expect((output as { result: string }).result).toContain('not a registered domain tool');
	});
});
