import type { Message } from '@n8n/agents';
import type { Mock, MockedFunction } from 'vitest';
import { vi } from 'vitest';

vi.mock('../../src/utils/eval-agents', () => ({
	createEvalAgent: vi.fn(),
	EPHEMERAL_CACHE: {},
	SONNET_MODEL: 'test-sonnet-model',
}));

import { createEvalAgent } from '../../src/utils/eval-agents';
import { judgeExpectations } from '../build-expectations/assertion-judge';

const mockCreateEvalAgent = createEvalAgent as MockedFunction<typeof createEvalAgent>;

type JudgeResponse = {
	structuredOutput?: { results: Array<{ index: number; pass: boolean; reason: string }> };
};
type GenerateFn = (messages: unknown, opts: unknown) => Promise<JudgeResponse>;
type GenerateMock = Mock<GenerateFn>;

/** Wire createEvalAgent().structuredOutput().generate() to the given generate mock. */
function mockJudge(generate: GenerateMock): void {
	const structuredOutput = vi.fn().mockReturnValue({ generate });
	mockCreateEvalAgent.mockReturnValue({ structuredOutput } as unknown as ReturnType<
		typeof createEvalAgent
	>);
}

/** A minimal message array — its content is irrelevant here since `generate` is mocked. */
const MESSAGES: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'ctx' }] }];

describe('judgeExpectations', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);
	});

	it('returns empty and never calls the agent when there are no assertions', async () => {
		const results = await judgeExpectations(MESSAGES, []);
		expect(results).toEqual([]);
		expect(mockCreateEvalAgent).not.toHaveBeenCalled();
	});

	it('maps structured judge output to per-assertion results by 0-based index', async () => {
		const generate: GenerateMock = vi.fn<GenerateFn>().mockResolvedValue({
			structuredOutput: {
				results: [
					{ index: 1, pass: false, reason: 'missing skill' },
					{ index: 0, pass: true, reason: 'config looks correct' },
				],
			},
		});
		mockJudge(generate);

		const results = await judgeExpectations(MESSAGES, [
			'agent has a system prompt',
			'agent has a search skill',
		]);

		expect(results).toEqual([
			{ expectation: 'agent has a system prompt', pass: true, reason: 'config looks correct' },
			{ expectation: 'agent has a search skill', pass: false, reason: 'missing skill' },
		]);
	});

	it('marks omitted indices as incomplete', async () => {
		const generate: GenerateMock = vi.fn<GenerateFn>().mockResolvedValue({
			structuredOutput: { results: [{ index: 0, pass: true, reason: 'ok' }] },
		});
		mockJudge(generate);

		const results = await judgeExpectations(MESSAGES, ['first', 'second']);

		expect(results).toEqual([
			{ expectation: 'first', pass: true, reason: 'ok' },
			{ expectation: 'second', pass: false, reason: 'no verdict returned', incomplete: true },
		]);
	});

	it('rejects a fractional index and retries instead of accepting it as a verdict', async () => {
		const generate: GenerateMock = vi
			.fn<GenerateFn>()
			// Attempt 1: a fractional index never maps onto a numbered assertion — the range
			// guard's integer check drops it so the attempt is retried rather than silently
			// yielding no verdict.
			.mockResolvedValueOnce({
				structuredOutput: { results: [{ index: 0.5, pass: true, reason: 'bogus' }] },
			})
			// Attempt 2: a valid integer index.
			.mockResolvedValueOnce({
				structuredOutput: { results: [{ index: 0, pass: true, reason: 'ok' }] },
			});
		mockJudge(generate);

		const results = await judgeExpectations(MESSAGES, ['only assertion']);

		expect(generate).toHaveBeenCalledTimes(2); // attempt 1 rejected → retried
		expect(results).toEqual([{ expectation: 'only assertion', pass: true, reason: 'ok' }]);
	});

	it('returns all-fail incomplete verdicts when every attempt is unparseable', async () => {
		const generate: GenerateMock = vi.fn<GenerateFn>().mockResolvedValue({});
		mockJudge(generate);

		const results = await judgeExpectations(MESSAGES, ['a', 'b']);

		expect(generate).toHaveBeenCalledTimes(2);
		expect(results).toEqual([
			{ expectation: 'a', pass: false, reason: 'judge produced no result', incomplete: true },
			{ expectation: 'b', pass: false, reason: 'judge produced no result', incomplete: true },
		]);
	});

	it('returns all-fail incomplete verdicts when every attempt throws', async () => {
		const generate: GenerateMock = vi.fn<GenerateFn>().mockRejectedValue(new Error('API down'));
		mockJudge(generate);

		const results = await judgeExpectations(MESSAGES, ['a']);

		expect(results).toEqual([
			{ expectation: 'a', pass: false, reason: 'judge produced no result', incomplete: true },
		]);
	});

	it('forwards the caller-built messages verbatim to the agent', async () => {
		const generate: GenerateMock = vi.fn<GenerateFn>().mockResolvedValue({
			structuredOutput: { results: [{ index: 0, pass: true, reason: 'ok' }] },
		});
		mockJudge(generate);

		await judgeExpectations(MESSAGES, ['assertion zero']);

		const [messages] = generate.mock.calls[0] as [Message[], unknown];
		expect(messages).toBe(MESSAGES);
	});
});
