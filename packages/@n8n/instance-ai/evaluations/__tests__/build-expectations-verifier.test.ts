import type { Mock, MockedFunction } from 'vitest';
import { vi } from 'vitest';

vi.mock('../../src/utils/eval-agents', () => ({
	createEvalAgent: vi.fn(),
	EPHEMERAL_CACHE: {},
	SONNET_MODEL: 'test-sonnet-model',
}));

import { createEvalAgent } from '../../src/utils/eval-agents';
import { verifyBuildExpectations } from '../build-expectations/verifier';
import type { ConversationMetrics, TranscriptTurn } from '../types';

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

const TRANSCRIPT: TranscriptTurn[] = [
	{
		userMessage: 'Build a Slack notifier',
		steps: [{ kind: 'agent-text', text: 'Which channel?' }],
	},
	{ userMessage: '#general', steps: [{ kind: 'agent-text', text: 'Done.' }] },
];

describe('verifyBuildExpectations', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);
	});

	it('returns empty and never calls the agent when there are no expectations', async () => {
		const results = await verifyBuildExpectations([], { transcript: TRANSCRIPT });
		expect(results).toEqual([]);
		expect(mockCreateEvalAgent).not.toHaveBeenCalled();
	});

	it('maps verdicts back to the original expectation strings by index', async () => {
		const generate: GenerateMock = vi.fn<GenerateFn>().mockResolvedValue({
			structuredOutput: {
				results: [
					{ index: 1, pass: false, reason: 'no Slack node' },
					{ index: 0, pass: true, reason: 'asked first' },
				],
			},
		});
		mockJudge(generate);

		const results = await verifyBuildExpectations(
			['agent asked which channel', 'workflow posts to Slack'],
			{ transcript: TRANSCRIPT },
		);

		expect(results).toEqual([
			{ expectation: 'agent asked which channel', pass: true, reason: 'asked first' },
			{ expectation: 'workflow posts to Slack', pass: false, reason: 'no Slack node' },
		]);
	});

	it('synthesizes a fail for any expectation the judge omits', async () => {
		const generate: GenerateMock = vi.fn<GenerateFn>().mockResolvedValue({
			structuredOutput: { results: [{ index: 0, pass: true, reason: 'ok' }] },
		});
		mockJudge(generate);

		const results = await verifyBuildExpectations(['first', 'second'], {
			transcript: TRANSCRIPT,
		});

		expect(results).toEqual([
			{ expectation: 'first', pass: true, reason: 'ok' },
			{ expectation: 'second', pass: false, reason: 'no verdict returned', incomplete: true },
		]);
	});

	it('ignores out-of-range indices returned by the judge', async () => {
		const generate: GenerateMock = vi.fn<GenerateFn>().mockResolvedValue({
			structuredOutput: {
				results: [
					{ index: 0, pass: true, reason: 'ok' },
					{ index: 7, pass: true, reason: 'phantom' },
				],
			},
		});
		mockJudge(generate);

		const results = await verifyBuildExpectations(['only one'], { transcript: TRANSCRIPT });

		expect(results).toEqual([{ expectation: 'only one', pass: true, reason: 'ok' }]);
	});

	it('retries on an unparseable attempt then succeeds', async () => {
		const generate: GenerateMock = vi
			.fn<GenerateFn>()
			.mockResolvedValueOnce({})
			.mockResolvedValueOnce({
				structuredOutput: { results: [{ index: 0, pass: true, reason: 'ok' }] },
			});
		mockJudge(generate);

		const results = await verifyBuildExpectations(['only'], { transcript: TRANSCRIPT });

		expect(generate).toHaveBeenCalledTimes(2);
		expect(results).toEqual([{ expectation: 'only', pass: true, reason: 'ok' }]);
	});

	it('returns an all-fail verdict (never throws) when every attempt fails', async () => {
		const generate: GenerateMock = vi.fn<GenerateFn>().mockRejectedValue(new Error('API down'));
		mockJudge(generate);

		const results = await verifyBuildExpectations(['a', 'b'], { transcript: TRANSCRIPT });

		expect(results).toEqual([
			{ expectation: 'a', pass: false, reason: 'judge produced no result', incomplete: true },
			{ expectation: 'b', pass: false, reason: 'judge produced no result', incomplete: true },
		]);
	});

	it('passes the metrics ground-truth block and numbered expectations to the judge', async () => {
		const generate: GenerateMock = vi.fn<GenerateFn>().mockResolvedValue({
			structuredOutput: { results: [{ index: 0, pass: true, reason: 'ok' }] },
		});
		mockJudge(generate);

		const metrics: ConversationMetrics = {
			turnCount: 2,
			perTurn: [],
			confirmationAskedTotal: 0,
			confirmationAskedByKind: {},
			reachedRunFinishCleanly: true,
		};
		await verifyBuildExpectations(['expectation zero'], { transcript: TRANSCRIPT, metrics });

		const sentMessages = JSON.stringify(generate.mock.calls[0]?.[0]);
		expect(sentMessages).toContain('ground truth');
		expect(sentMessages).toContain('0. expectation zero');
		expect(sentMessages).toContain('turnCount');
	});
});
