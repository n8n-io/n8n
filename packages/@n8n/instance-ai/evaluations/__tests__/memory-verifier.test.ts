import type { InstanceAiRunDebugResponse } from '@n8n/api-types';
import type { Mock, MockedFunction } from 'vitest';
import { vi } from 'vitest';

// Only the LLM boundary is mocked. The context extraction under test runs for real,
// including the observation-block parser from @n8n/api-types.
vi.mock('../../src/utils/eval-agents', () => ({
	createEvalAgent: vi.fn(),
	EPHEMERAL_CACHE: {},
	SONNET_MODEL: 'test-sonnet-model',
}));

import { createEvalAgent } from '../../src/utils/eval-agents';
import { verifyMemoryExpectations } from '../build-expectations/memory-verifier';

const mockCreateEvalAgent = createEvalAgent as MockedFunction<typeof createEvalAgent>;

type JudgeResponse = {
	structuredOutput?: { results: Array<{ index: number; pass: boolean; reason: string }> };
};
type GenerateFn = (messages: unknown, opts: unknown) => Promise<JudgeResponse>;
type GenerateMock = Mock<GenerateFn>;

function mockJudge(generate: GenerateMock): void {
	const structuredOutput = vi.fn().mockReturnValue({ generate });
	mockCreateEvalAgent.mockReturnValue({ structuredOutput } as unknown as ReturnType<
		typeof createEvalAgent
	>);
}

function runDebug(system: string): InstanceAiRunDebugResponse[] {
	return [
		{
			threadId: 'thread-1',
			runId: 'run-1',
			startedAt: 1,
			steps: [{ stepNumber: 1, input: { system } }],
			workflowCode: [],
		},
	];
}

describe('verifyMemoryExpectations', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);
	});

	it('returns empty and never calls the judge when there are no memory expectations', async () => {
		const results = await verifyMemoryExpectations([], runDebug('sys'));
		expect(results).toEqual([]);
		expect(mockCreateEvalAgent).not.toHaveBeenCalled();
	});

	it('records incomplete, memory-tagged verdicts when no run debug was captured', async () => {
		const results = await verifyMemoryExpectations(['m1'], undefined);
		expect(results).toHaveLength(1);
		expect(results[0]).toMatchObject({
			expectation: 'm1',
			pass: false,
			incomplete: true,
			kind: 'memory',
		});
		expect(results[0]?.reason).toContain('no run debug');
		// A missing capture is infrastructure, not a product miss — never judged.
		expect(mockCreateEvalAgent).not.toHaveBeenCalled();
	});

	it('tags judged verdicts as memory so they are identifiable in the results file', async () => {
		const generate: GenerateMock = vi.fn().mockResolvedValue({
			structuredOutput: { results: [{ index: 0, pass: true, reason: 'still present' }] },
		});
		mockJudge(generate);

		const results = await verifyMemoryExpectations(
			['the channel survived compression'],
			runDebug('sys\n<observations>Channel is #ops</observations>'),
		);

		expect(results).toEqual([
			{
				expectation: 'the channel survived compression',
				pass: true,
				reason: 'still present',
				kind: 'memory',
			},
		]);
	});

	it('grades against the context state and never the transcript', async () => {
		const generate: GenerateMock = vi.fn().mockResolvedValue({
			structuredOutput: { results: [{ index: 0, pass: true, reason: 'ok' }] },
		});
		mockJudge(generate);

		await verifyMemoryExpectations(
			['the channel survived compression'],
			runDebug('You are a builder.\n<observations>Channel is #ops</observations>'),
		);

		const sent = JSON.stringify(generate.mock.calls[0]?.[0]);
		expect(sent).toContain('Channel is #ops');
		expect(sent).toContain('Compressed observation block');
		// The confound this expectation kind exists to remove: if the transcript were
		// in scope the judge could satisfy recall from the turn the fact was first said.
		expect(sent).not.toContain('Conversation transcript');
	});

	it('uses its own judge rubric, not the conversation one', async () => {
		const generate: GenerateMock = vi.fn().mockResolvedValue({
			structuredOutput: { results: [{ index: 0, pass: false, reason: 'gone' }] },
		});
		mockJudge(generate);

		await verifyMemoryExpectations(['m1'], runDebug('sys'));

		const [agentName, options] = mockCreateEvalAgent.mock.calls[0] ?? [];
		expect(agentName).toBe('eval-memory-expectations-verifier');
		expect(options?.instructions).toContain('memory subsystem');
	});

	it('tags verdicts as memory even when the judge dies', async () => {
		const generate: GenerateMock = vi.fn().mockRejectedValue(new Error('judge exploded'));
		mockJudge(generate);

		const results = await verifyMemoryExpectations(['m1'], runDebug('sys'));

		expect(results).toEqual([
			{
				expectation: 'm1',
				pass: false,
				reason: 'judge produced no result',
				incomplete: true,
				kind: 'memory',
			},
		]);
	});
});

describe('anchored claims', () => {
	/** Probe and turn-end differ: the value appears only in the second run's later step. */
	function twoRunDebug(): InstanceAiRunDebugResponse[] {
		return [
			{
				threadId: 'thread-1',
				runId: 'run-1',
				startedAt: 1,
				steps: [{ stepNumber: 1, input: { system: 'carried in' } }],
				workflowCode: [],
			},
			{
				threadId: 'thread-1',
				runId: 'run-2',
				startedAt: 2,
				steps: [
					{ stepNumber: 1, input: { system: 'at the probe' } },
					{ stepNumber: 2, input: { system: 'fetched while answering' } },
				],
				workflowCode: [],
			},
		];
	}

	it('runs one judge call per anchor, each with its own context block', async () => {
		// Two anchors must not share a block: handing the judge both would put it back to
		// guessing which snapshot a claim meant, which is what the anchor removes.
		const generate: GenerateMock = vi.fn().mockResolvedValue({
			structuredOutput: { results: [{ index: 0, pass: true, reason: 'found' }] },
		});
		mockJudge(generate);

		await verifyMemoryExpectations(
			[
				{ text: 'the rule survived', anchor: 'probe' },
				{ text: 'the sibling was fetched', anchor: 'turn-end' },
			],
			twoRunDebug(),
		);

		expect(generate).toHaveBeenCalledTimes(2);
		const blocks = generate.mock.calls.map((call) => JSON.stringify(call[0]));
		expect(blocks.some((b) => b.includes('as the graded request ARRIVED'))).toBe(true);
		expect(blocks.some((b) => b.includes('at the END of the graded turn'))).toBe(true);
	});

	it('makes one call when every claim shares an anchor', async () => {
		const generate: GenerateMock = vi.fn().mockResolvedValue({
			structuredOutput: {
				results: [
					{ index: 0, pass: true, reason: 'a' },
					{ index: 1, pass: true, reason: 'b' },
				],
			},
		});
		mockJudge(generate);

		await verifyMemoryExpectations(['first', 'second'], twoRunDebug());

		expect(generate).toHaveBeenCalledTimes(1);
	});

	it('returns verdicts in the order the case wrote them, not grouped by anchor', async () => {
		// Grouping reorders internally; a case reads its verdicts against its own list.
		const generate: GenerateMock = vi.fn().mockImplementation(async (messages: unknown) => {
			const turnEnd = JSON.stringify(messages).includes('at the END of the graded turn');
			return await Promise.resolve({
				structuredOutput: {
					results: [{ index: 0, pass: true, reason: turnEnd ? 'from turn-end' : 'from probe' }],
				},
			});
		});
		mockJudge(generate);

		const verdicts = await verifyMemoryExpectations(
			[
				{ text: 'claim A', anchor: 'turn-end' },
				{ text: 'claim B', anchor: 'probe' },
				{ text: 'claim C', anchor: 'turn-end' },
			],
			twoRunDebug(),
		);

		expect(verdicts.map((v) => v.expectation)).toEqual(['claim A', 'claim B', 'claim C']);
		expect(verdicts[1].reason).toBe('from probe');
	});

	it('treats a bare string as probe-anchored', async () => {
		const generate: GenerateMock = vi.fn().mockResolvedValue({
			structuredOutput: { results: [{ index: 0, pass: true, reason: 'ok' }] },
		});
		mockJudge(generate);

		await verifyMemoryExpectations(['a plain claim'], twoRunDebug());

		expect(JSON.stringify(generate.mock.calls[0][0])).toContain('as the graded request ARRIVED');
	});
});
