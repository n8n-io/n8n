import { BASE_CHECK } from '../promise-checks';
import {
	JUDGE_BATCH_SIZE,
	batchChecks,
	buildJudgePrompt,
	parseJudgeAnswers,
	renderChatTranscript,
} from '../judged-checks';
import type { AgentCheck, ChatTurn } from '../types';

const refundCheck: AgentCheck = {
	id: 'promise:1',
	kind: 'promise',
	question: 'Did the agent avoid promising a refund?',
	reason: 'The instructions forbid it.',
	appliesWhen: 'The person asks for money back.',
	source: { field: 'instructions', quote: 'Never promise a refund.' },
};

const turns: ChatTurn[] = [
	{ userMessage: 'Where is my order?', reply: 'What is your order number?' },
	{
		userMessage: '#123. I want my money back.',
		reply: 'I have refunded you.',
		timeline: [
			{
				type: 'tool-call',
				kind: 'node',
				name: 'get_order',
				toolCallId: 't1',
				input: { id: '123' },
				output: { status: 'shipped' },
				startTime: 0,
				endTime: 1,
				success: true,
			},
		],
	},
];

describe('renderChatTranscript', () => {
	it('numbers the turns and shows tool calls when they were recorded', () => {
		const text = renderChatTranscript(turns);

		expect(text).toContain('[Turn 1]');
		expect(text).toContain('[Turn 2]');
		expect(text).toContain('Person: #123. I want my money back.');
		expect(text).toContain('Tool call: get_order');
		expect(text).toContain('Agent: I have refunded you.');
	});

	it('shortens a very long reply but keeps its start and end', () => {
		const long = `START ${'x'.repeat(20_000)} END`;
		const text = renderChatTranscript([{ userMessage: 'Hi', reply: long }]);

		expect(text.length).toBeLessThan(10_000);
		expect(text).toContain('START');
		expect(text).toContain('END');
	});
});

describe('batchChecks', () => {
	it(`asks at most ${JUDGE_BATCH_SIZE} questions per call`, () => {
		const checks = Array.from({ length: 7 }, (_, i) => ({ ...refundCheck, id: `promise:${i}` }));
		expect(batchChecks(checks).map((b) => b.length)).toEqual([3, 3, 1]);
	});
});

describe('buildJudgePrompt', () => {
	it('says when tool calls are not shown, so a claim is not failed for missing evidence', () => {
		const prompt = buildJudgePrompt([{ userMessage: 'Hi', reply: 'Sent!' }], [BASE_CHECK]);
		expect(prompt.user).toContain('Tool calls are not shown');
	});

	it("lists the agent's tools, so a claimed action no tool can do is visible", () => {
		const prompt = buildJudgePrompt([{ userMessage: 'Hi', reply: 'Refunded!' }], [BASE_CHECK], {
			name: 'Refund helper',
			tools: [
				{
					name: 'get_order',
					source: 'node',
					action: 'reads',
					basis: 'operation',
					requireApproval: false,
				},
			],
		});
		expect(prompt.user).toContain('get_order (reads)');
		expect(prompt.user).toContain('no tool that can');
	});

	it("includes the agent's instructions, so wording they prescribe is not read as a false claim", () => {
		const prompt = buildJudgePrompt(
			[{ userMessage: 'Refund', reply: 'A teammate will review it.' }],
			[BASE_CHECK],
			{
				name: 'Refund helper',
				instructions: 'If the refund is not done, say a teammate will review it.',
			},
		);
		expect(prompt.user).toContain('<instructions>');
		expect(prompt.user).toContain('say a teammate will review it');
		expect(prompt.user).toContain('not a false claim');
	});

	it('lists each question with its id and when it applies', () => {
		const prompt = buildJudgePrompt(turns, [refundCheck]);
		expect(prompt.user).toContain('promise:1');
		expect(prompt.user).toContain('The person asks for money back.');
	});
});

describe('parseJudgeAnswers', () => {
	it('maps pass, fail, and does-not-apply answers to verdicts with a moment', () => {
		const verdicts = parseJudgeAnswers(
			JSON.stringify({
				answers: [
					{ id: 'promise:1', applies: true, answer: 'no', reason: 'It said it refunded.', turn: 2 },
					{ id: BASE_CHECK.id, applies: false, answer: 'yes', reason: 'n/a', turn: null },
				],
			}),
			[refundCheck, BASE_CHECK],
		);

		expect(verdicts).toEqual([
			{
				checkId: 'promise:1',
				status: 'fail',
				reason: 'It said it refunded.',
				moment: { turnIndex: 1 },
			},
			{ checkId: BASE_CHECK.id, status: 'not_applicable', reason: 'n/a' },
		]);
	});

	it('reads yes as pass and unsure as unsure', () => {
		const verdicts = parseJudgeAnswers(
			'{"answers":[{"id":"promise:1","applies":true,"answer":"yes","reason":"ok"},{"id":"base:task_done_honestly","applies":true,"answer":"unsure","reason":"?"}]}',
			[refundCheck, BASE_CHECK],
		);
		expect(verdicts.map((v) => v.status)).toEqual(['pass', 'unsure']);
	});

	it('reads the JSON when the judge adds a note with braces after it', () => {
		const [verdict] = parseJudgeAnswers(
			'{"answers":[{"id":"promise:1","applies":true,"answer":"yes","reason":"ok"}]}\nNote: {see turn 1}',
			[refundCheck],
		);
		expect(verdict.status).toBe('pass');
	});

	it('matches answers by order when the judge leaves out every id', () => {
		const verdicts = parseJudgeAnswers(
			'{"answers":[{"applies":true,"answer":"no","reason":"a"},{"applies":true,"answer":"yes","reason":"b"}]}',
			[refundCheck, BASE_CHECK],
		);
		expect(verdicts.map((v) => v.status)).toEqual(['fail', 'pass']);
	});

	it('does not match by order when the count differs', () => {
		const verdicts = parseJudgeAnswers(
			'{"answers":[{"applies":true,"answer":"no","reason":"a"}]}',
			[refundCheck, BASE_CHECK],
		);
		expect(verdicts.map((v) => v.status)).toEqual(['not_run', 'not_run']);
	});

	it('is not_run for a check the reply left out, never a pass', () => {
		const verdicts = parseJudgeAnswers('{"answers":[]}', [refundCheck]);
		expect(verdicts).toEqual([
			expect.objectContaining({ checkId: 'promise:1', status: 'not_run' }),
		]);
	});

	it('ignores a turn number outside the chat', () => {
		const [verdict] = parseJudgeAnswers(
			'{"answers":[{"id":"promise:1","applies":true,"answer":"no","reason":"r","turn":9}]}',
			[refundCheck],
			2,
		);
		expect(verdict.moment).toBeUndefined();
	});
});
