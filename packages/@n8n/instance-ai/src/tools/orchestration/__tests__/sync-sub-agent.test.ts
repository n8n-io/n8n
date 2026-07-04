import { createSubAgent } from '../../../agent/sub-agent-factory';
import { MAX_STEPS } from '../../../constants/max-steps';
import { consumeStreamWithHitl, requireCompletedHitlText } from '../../../stream/consume-with-hitl';
import { createToolRegistry } from '../../../tool-registry';
import type { OrchestrationContext } from '../../../types';
import { runSyncSubAgent } from '../sync-sub-agent';

vi.mock('../../../agent/sub-agent-factory', () => ({
	createSubAgent: vi.fn(),
	SUB_AGENT_PROTOCOL: 'Sub-agent protocol.',
}));

vi.mock('../../../stream/consume-with-hitl', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../../stream/consume-with-hitl')>();
	return {
		...actual,
		consumeStreamWithHitl: vi.fn(),
		requireCompletedHitlText: vi.fn(),
	};
});

const createSubAgentMock = vi.mocked(createSubAgent);
const consumeStreamWithHitlMock = vi.mocked(consumeStreamWithHitl);
const requireCompletedHitlTextMock = vi.mocked(requireCompletedHitlText);

function createMockContext(): OrchestrationContext {
	return {
		threadId: 'thread-1',
		runId: 'run-1',
		orchestratorAgentId: 'orchestrator',
		modelId: 'test-model',
		eventBus: { publish: vi.fn() },
		logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
		abortSignal: new AbortController().signal,
	} as unknown as OrchestrationContext;
}

const emptyWorkSummary = { toolCalls: [], totalToolCalls: 0, totalToolErrors: 0 };

function mockCompletedConsumeResult(overrides: Record<string, unknown> = {}) {
	consumeStreamWithHitlMock.mockResolvedValue({
		status: 'completed',
		agentRunId: 'agent-run-1',
		text: Promise.resolve('done'),
		workSummary: emptyWorkSummary,
		...overrides,
	});
	requireCompletedHitlTextMock.mockResolvedValue('done');
}

beforeEach(() => {
	createSubAgentMock.mockReset();
	consumeStreamWithHitlMock.mockReset();
	requireCompletedHitlTextMock.mockReset();
});

function baseInput() {
	return {
		role: 'test-role',
		instructions: 'instructions',
		briefing: 'briefing',
		validTools: createToolRegistry(),
		toolNames: [] as string[],
	};
}

describe('runSyncSubAgent', () => {
	it('defaults maxIterations to MAX_STEPS.RESEARCH when not provided', async () => {
		const streamMock = vi.fn().mockResolvedValue({});
		createSubAgentMock.mockReturnValue({ stream: streamMock } as never);
		mockCompletedConsumeResult();

		await runSyncSubAgent(createMockContext(), baseInput());

		expect(streamMock).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ maxIterations: MAX_STEPS.RESEARCH }),
		);
	});

	it('uses a custom maxIterations when provided', async () => {
		const streamMock = vi.fn().mockResolvedValue({});
		createSubAgentMock.mockReturnValue({ stream: streamMock } as never);
		mockCompletedConsumeResult();

		await runSyncSubAgent(createMockContext(), { ...baseInput(), maxIterations: 7 });

		expect(streamMock).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ maxIterations: 7 }),
		);
	});

	it('surfaces token usage on the output when the stream reports it', async () => {
		const streamMock = vi.fn().mockResolvedValue({});
		createSubAgentMock.mockReturnValue({ stream: streamMock } as never);
		mockCompletedConsumeResult({
			usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15, costUsd: 0.02, usage: [] },
		});

		const result = await runSyncSubAgent(createMockContext(), baseInput());

		expect(result.usage).toEqual({
			promptTokens: 10,
			completionTokens: 5,
			totalTokens: 15,
			cost: 0.02,
		});
	});

	it('omits usage when the stream reported none', async () => {
		const streamMock = vi.fn().mockResolvedValue({});
		createSubAgentMock.mockReturnValue({ stream: streamMock } as never);
		mockCompletedConsumeResult();

		const result = await runSyncSubAgent(createMockContext(), baseInput());

		expect(result.usage).toBeUndefined();
	});

	it('omits cost from usage when costUsd is zero', async () => {
		const streamMock = vi.fn().mockResolvedValue({});
		createSubAgentMock.mockReturnValue({ stream: streamMock } as never);
		mockCompletedConsumeResult({
			usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2, costUsd: 0, usage: [] },
		});

		const result = await runSyncSubAgent(createMockContext(), baseInput());

		expect(result.usage).toEqual({ promptTokens: 1, completionTokens: 1, totalTokens: 2 });
	});

	it('returns a sub-agent error result instead of throwing when the run fails', async () => {
		createSubAgentMock.mockImplementation(() => {
			throw new Error('boom');
		});

		const result = await runSyncSubAgent(createMockContext(), baseInput());

		expect(result.result).toContain('Sub-agent error: boom');
		expect(result.usage).toBeUndefined();
	});

	it('returns only the last summary segment to the parent agent', async () => {
		const streamMock = vi.fn().mockResolvedValue({});
		createSubAgentMock.mockReturnValue({ stream: streamMock } as never);
		mockCompletedConsumeResult({
			workSummary: {
				toolCalls: [],
				totalToolCalls: 0,
				totalToolErrors: 0,
				lastTextSummary: 'Final summary.',
			},
		});
		requireCompletedHitlTextMock.mockResolvedValue('First summary.Final summary.');

		const result = await runSyncSubAgent(createMockContext(), baseInput());

		expect(result.result).toBe('Final summary.');
	});
});
