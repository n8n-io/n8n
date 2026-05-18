import {
	applyMemoryJudgeScore,
	buildMemoryJudgePrompt,
	createMemoryJudge,
	parseMemoryJudgeResponse,
} from '../judge';
import type { MemoryEvalScenario, MemoryEvalScorecard } from '../types';

const scenario: MemoryEvalScenario = {
	id: 'judge-fixture',
	name: 'Judge Fixture',
	description: 'Fixture for judge parsing.',
	tags: ['test'],
	turns: [{ user: 'Remember the launch channel is #alpha.' }],
	finalQuestions: [
		{
			id: 'channel',
			prompt: 'What is the launch channel?',
			expectedAnswerTerms: ['#alpha'],
		},
	],
	oracle: {
		activeFacts: ['The launch channel is #alpha.'],
		staleFacts: [],
		forbiddenFacts: [],
		exactTerms: ['#alpha'],
	},
};

const scorecard: MemoryEvalScorecard = {
	scenarioId: scenario.id,
	overall: 1,
	metrics: {
		activeFactRecall: { score: 1, numerator: 1, denominator: 1 },
		activeFactPrecision: { score: 1, numerator: 1, denominator: 1 },
		staleFactSuppression: { score: 1, numerator: 0, denominator: 0 },
		exactIdentifierRecall: { score: 1, numerator: 1, denominator: 1 },
		lifecycleAccuracy: { score: 1, numerator: 0, denominator: 0 },
		contaminationRate: { score: 1, numerator: 0, denominator: 0 },
		finalAnswerCorrectness: { score: 1, numerator: 1, denominator: 1 },
		answerFaithfulness: { score: 1, numerator: 1, denominator: 1 },
	},
};

describe('memory eval judge', () => {
	it('builds a strict JSON judge prompt with scenario, observations, and answers', () => {
		const prompt = buildMemoryJudgePrompt({
			scenario,
			observations: [
				{
					id: 'obs-1',
					marker: 'important',
					text: 'The launch channel is #alpha.',
					status: 'active',
					parentId: null,
					supersededBy: null,
					createdAt: '2026-05-18T10:00:00.000Z',
				},
			],
			finalAnswers: [
				{
					questionId: 'channel',
					prompt: 'What is the launch channel?',
					answer: '#alpha',
				},
			],
			scorecard,
		});

		expect(prompt).toContain('Return strict JSON only');
		expect(prompt).toContain('semantic evaluator');
		expect(prompt).toContain('Do not require exact prose');
		expect(prompt).toContain('judge-fixture');
		expect(prompt).toContain('#alpha');
	});

	it('parses strict judge JSON', () => {
		const parsed = parseMemoryJudgeResponse(
			JSON.stringify({
				activeFactRecall: {
					score: 5,
					matched: ['The launch channel is #alpha.'],
					missing: [],
					evidenceObservationIds: ['obs-1'],
					notes: [],
				},
				activeFactPrecision: {
					score: 4,
					matched: ['obs-1'],
					missing: [],
					evidenceObservationIds: ['obs-1'],
					irrelevantObservationIds: ['obs-9'],
					notes: ['One irrelevant observation.'],
				},
				lifecycleAccuracy: {
					score: 5,
					matched: [],
					missing: [],
					evidenceObservationIds: [],
					notes: [],
				},
				finalAnswerCorrectness: {
					score: 5,
					matched: ['channel'],
					missing: [],
					evidenceObservationIds: ['obs-1'],
					notes: [],
				},
				answerFaithfulness: {
					score: 4,
					matched: ['#alpha'],
					missing: [],
					evidenceObservationIds: ['obs-1'],
					notes: ['Answer was supported.'],
				},
				overall: 4,
				failures: ['minor lifecycle ambiguity'],
			}),
		);

		expect(parsed.activeFactRecall).toMatchObject({
			score: 5,
			matched: ['The launch channel is #alpha.'],
			evidenceObservationIds: ['obs-1'],
		});
		expect(parsed.activeFactPrecision.irrelevantObservationIds).toEqual(['obs-9']);
		expect(parsed.answerFaithfulness.notes).toEqual(['Answer was supported.']);
		expect(parsed.overall).toBe(4);
	});

	it('rejects non-strict or incomplete judge JSON', () => {
		expect(() => parseMemoryJudgeResponse('```json\n{}\n```')).toThrow();
		expect(() => parseMemoryJudgeResponse(JSON.stringify({ overall: 5 }))).toThrow(
			/activeFactRecall/,
		);
	});

	it('applies judge scores to fuzzy metrics while preserving deterministic exact checks', () => {
		const deterministic: MemoryEvalScorecard = {
			...scorecard,
			overall: 0.5,
			metrics: {
				...scorecard.metrics,
				activeFactRecall: {
					score: 0,
					numerator: 0,
					denominator: 1,
					source: 'deterministic',
					missing: ['The launch channel is #alpha.'],
				},
				exactIdentifierRecall: {
					score: 1,
					numerator: 1,
					denominator: 1,
					source: 'deterministic',
					matched: ['#alpha'],
				},
			},
		};

		const judged = applyMemoryJudgeScore(deterministic, {
			activeFactRecall: {
				score: 5,
				matched: ['The launch channel is #alpha.'],
				missing: [],
				evidenceObservationIds: ['obs-1'],
				notes: ['Paraphrase matched.'],
			},
			activeFactPrecision: {
				score: 4,
				matched: ['obs-1'],
				missing: [],
				evidenceObservationIds: ['obs-1'],
				irrelevantObservationIds: [],
				notes: [],
			},
			lifecycleAccuracy: {
				score: 5,
				matched: [],
				missing: [],
				evidenceObservationIds: [],
				notes: [],
			},
			finalAnswerCorrectness: {
				score: 5,
				matched: ['channel'],
				missing: [],
				evidenceObservationIds: ['obs-1'],
				notes: [],
			},
			answerFaithfulness: {
				score: 5,
				matched: ['#alpha'],
				missing: [],
				evidenceObservationIds: ['obs-1'],
				notes: [],
			},
			overall: 5,
			failures: [],
		});

		expect(judged.metrics.activeFactRecall).toMatchObject({
			score: 1,
			numerator: 5,
			denominator: 5,
			source: 'judge',
			matched: ['The launch channel is #alpha.'],
			evidenceObservationIds: ['obs-1'],
		});
		expect(judged.metrics.exactIdentifierRecall).toBe(deterministic.metrics.exactIdentifierRecall);
		expect(judged.overall).toBeGreaterThan(deterministic.overall);
		expect(judged.judge?.overall).toBe(5);
	});

	it('wraps a judge model function', async () => {
		const judge = createMemoryJudge(
			async () =>
				await Promise.resolve(
					JSON.stringify({
						activeFactRecall: {
							score: 5,
							matched: [],
							missing: [],
							evidenceObservationIds: [],
							notes: [],
						},
						activeFactPrecision: {
							score: 5,
							matched: [],
							missing: [],
							evidenceObservationIds: [],
							irrelevantObservationIds: [],
							notes: [],
						},
						lifecycleAccuracy: {
							score: 5,
							matched: [],
							missing: [],
							evidenceObservationIds: [],
							notes: [],
						},
						finalAnswerCorrectness: {
							score: 5,
							matched: [],
							missing: [],
							evidenceObservationIds: [],
							notes: [],
						},
						answerFaithfulness: {
							score: 5,
							matched: [],
							missing: [],
							evidenceObservationIds: [],
							notes: [],
						},
						overall: 5,
						failures: [],
					}),
				),
		);

		await expect(
			judge.score({ scenario, observations: [], finalAnswers: [], scorecard }),
		).resolves.toMatchObject({ overall: 5, failures: [] });
	});
});
