import type { InstanceAiRunDebugResponse } from '@n8n/api-types';
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

	it('appends the artifact context to the cached build block alongside the workflow block', async () => {
		const generate: GenerateMock = vi.fn<GenerateFn>().mockResolvedValue({
			structuredOutput: { results: [{ index: 0, pass: true, reason: 'ok' }] },
		});
		mockJudge(generate);

		await verifyBuildExpectations(['an agent was created'], {
			transcript: TRANSCRIPT,
			artifactContext: '## Agent\n\n(no agent produced)',
		});

		const [messages] = generate.mock.calls[0] as [
			Array<{ content: Array<{ text: string; providerOptions?: unknown }> }>,
			unknown,
		];
		const [buildBlock] = messages[0].content;
		// The workflow fallback and the artifact section share one cached block.
		expect(buildBlock.text).toContain('(no workflow built)');
		expect(buildBlock.text).toContain('## Agent\n\n(no agent produced)');
		expect(buildBlock.providerOptions).toEqual({});
	});

	it('renders the build-wide token total when run debug is captured', async () => {
		const generate: GenerateMock = vi.fn<GenerateFn>().mockResolvedValue({
			structuredOutput: { results: [{ index: 0, pass: true, reason: 'ok' }] },
		});
		mockJudge(generate);

		const runDebug: InstanceAiRunDebugResponse[] = [
			{
				threadId: 't1',
				runId: 'r1',
				startedAt: 0,
				workflowCode: [],
				steps: [
					{ stepNumber: 0, output: { usage: { inputTokens: 100, outputTokens: 20 } } },
					{ stepNumber: 1, output: { usage: { inputTokens: 300, outputTokens: 40 } } },
				],
			},
		];
		await verifyBuildExpectations(['expectation zero'], { transcript: TRANSCRIPT, runDebug });

		const sentMessages = JSON.stringify(generate.mock.calls[0]?.[0]);
		expect(sentMessages).toContain('Token usage totals');
		expect(sentMessages).toContain(
			'Total: 400 tokens in / 60 tokens out across 2 LLM steps, 1 run',
		);
		expect(sentMessages).toContain('Cache: 0 tokens read / 0 tokens written');
		// The opening step alone, separable from what the turns added.
		expect(sentMessages).toContain('Opening step: 100 input tokens on the first LLM call');
	});

	it('sums cache read/write tokens across steps, from the nested inputTokenDetails shape', async () => {
		const generate: GenerateMock = vi.fn<GenerateFn>().mockResolvedValue({
			structuredOutput: { results: [{ index: 0, pass: true, reason: 'ok' }] },
		});
		mockJudge(generate);

		const runDebug: InstanceAiRunDebugResponse[] = [
			{
				threadId: 't1',
				runId: 'r1',
				startedAt: 0,
				workflowCode: [],
				steps: [
					{
						stepNumber: 0,
						output: {
							usage: {
								inputTokens: 100,
								outputTokens: 20,
								inputTokenDetails: { cacheReadTokens: 8000, cacheWriteTokens: 0 },
							},
						},
					},
					{
						stepNumber: 1,
						output: {
							usage: {
								inputTokens: 300,
								outputTokens: 40,
								inputTokenDetails: { cacheReadTokens: 0, cacheWriteTokens: 2500 },
							},
						},
					},
				],
			},
		];
		await verifyBuildExpectations(['expectation zero'], { transcript: TRANSCRIPT, runDebug });

		const sentMessages = JSON.stringify(generate.mock.calls[0]?.[0]);
		expect(sentMessages).toContain('Cache: 8000 tokens read / 2500 tokens written');
	});

	it('renders the observation rows so an expectation can grade the summary itself', async () => {
		// The point of reading the rows: without them a memory case can only check the
		// agent's reply, which passes just as well on a lucky guess.
		const generate: GenerateMock = vi.fn<GenerateFn>().mockResolvedValue({
			structuredOutput: { results: [{ index: 0, pass: true, reason: 'ok' }] },
		});
		mockJudge(generate);

		await verifyBuildExpectations(['memory kept the node decision'], {
			transcript: TRANSCRIPT,
			threadMemory: {
				observations: [
					{
						marker: 'critical',
						text: 'Posting via HTTP Request, not the Slack node',
						tokenCount: 9,
					},
					{ marker: 'info', text: 'Timezone America/New_York', tokenCount: 4 },
				],
				cursor: { lastObservedMessageId: 'm137', lastObservedAt: '2020-01-01T00:00:00.000Z' },
			},
		});

		const sent = JSON.stringify(generate.mock.calls[0]?.[0]);
		expect(sent).toContain('Observational memory after compaction');
		expect(sent).toContain('[CRITICAL] Posting via HTTP Request, not the Slack node');
		expect(sent).toContain('[INFO] Timezone America/New_York');
	});

	it('says so when memory never compacted, rather than showing an empty block', async () => {
		const generate: GenerateMock = vi.fn<GenerateFn>().mockResolvedValue({
			structuredOutput: { results: [{ index: 0, pass: true, reason: 'ok' }] },
		});
		mockJudge(generate);

		await verifyBuildExpectations(['anything'], {
			transcript: TRANSCRIPT,
			threadMemory: { observations: [], cursor: null },
		});

		expect(JSON.stringify(generate.mock.calls[0]?.[0])).toContain(
			'observational memory has not compacted this conversation',
		);
	});

	it('falls back to a placeholder when no run debug was captured', async () => {
		const generate: GenerateMock = vi.fn<GenerateFn>().mockResolvedValue({
			structuredOutput: { results: [{ index: 0, pass: true, reason: 'ok' }] },
		});
		mockJudge(generate);

		await verifyBuildExpectations(['expectation zero'], { transcript: TRANSCRIPT });

		const sentMessages = JSON.stringify(generate.mock.calls[0]?.[0]);
		expect(sentMessages).toContain('(no run debug captured)');
	});

	it('sends only the workflow block when there is no artifact context', async () => {
		const generate: GenerateMock = vi.fn<GenerateFn>().mockResolvedValue({
			structuredOutput: { results: [{ index: 0, pass: true, reason: 'ok' }] },
		});
		mockJudge(generate);

		await verifyBuildExpectations(['the workflow posts to Slack'], { transcript: TRANSCRIPT });

		const [messages] = generate.mock.calls[0] as [
			Array<{ content: Array<{ text: string }> }>,
			unknown,
		];
		const [buildBlock] = messages[0].content;
		expect(buildBlock.text).toContain('(no workflow built)');
		expect(buildBlock.text).not.toContain('## Agent');
	});
});
