import {
	aggregateScorecard,
	classifyRecallFailure,
	computeDeterministicMetrics,
	computeRankingMetrics,
	parseJudgeScores,
} from '../scoring';
import type { EpisodicEvalEntry, EpisodicEvalRecallResult, EpisodicMemoryScenario } from '../types';

const scenario = {
	id: 'exact-artifacts',
	name: 'Exact artifact inventory',
	threads: [],
	expectedActiveEpisodes: [
		{
			id: 'tracker',
			description: 'Tracker title and Slack channel are remembered',
			match: {
				all: ['North Pier Vendor Queue - Trial', '#vendor-trial-northpier'],
			},
		},
	],
	staleFacts: [
		{
			id: 'old-tool',
			description: 'Airtable was replaced',
			match: { all: ['Airtable'] },
		},
	],
	forbiddenFacts: [
		{
			id: 'other-customer',
			description: 'Harborlight facts must not leak',
			match: { all: ['Harborlight Foods'] },
		},
	],
	exactIdentifiers: ['North Pier Vendor Queue - Trial', '#vendor-trial-northpier'],
	recallQueries: [
		{
			id: 'inventory',
			prompt: 'What exact prior artifacts did we name?',
			shouldCallRecallMemory: true,
			expectedFacts: ['tracker'],
			forbiddenFacts: ['other-customer'],
		},
	],
	finalQuestions: [],
} satisfies EpisodicMemoryScenario;

const activeEntry = {
	id: 'entry-1',
	content:
		'North Pier uses `North Pier Vendor Queue - Trial` and Slack channel `#vendor-trial-northpier`.',
	status: 'active',
	createdAt: '2026-05-19T10:00:00.000Z',
	updatedAt: '2026-05-19T10:00:00.000Z',
	lastSeenAt: '2026-05-19T10:00:00.000Z',
	sources: [
		{
			observationId: 'obs-1',
			threadId: 'thread-1',
			evidenceText: 'The sheet is North Pier Vendor Queue - Trial.',
		},
	],
} satisfies EpisodicEvalEntry;

describe('episodic memory eval scoring', () => {
	it('scores active facts, exact identifiers, source backing, and contamination', () => {
		const metrics = computeDeterministicMetrics({
			scenario,
			entries: [activeEntry],
			recalls: [],
			finalAnswers: [],
		});

		expect(metrics.entryCoverage).toBe(1);
		expect(metrics.sourceBackedPrecision).toBe(1);
		expect(metrics.exactIdentifierRecall).toBe(1);
		expect(metrics.scopeContaminationRate).toBe(0);
		expect(metrics.lifecycleAccuracy).toBe(1);
	});

	it('does not penalize contamination when a scenario has no forbidden facts', () => {
		const metrics = computeDeterministicMetrics({
			scenario: { ...scenario, forbiddenFacts: [] },
			entries: [activeEntry],
			recalls: [],
			finalAnswers: [],
		});

		expect(metrics.scopeContaminationRate).toBe(0);
	});

	it('penalizes stale active facts and source-less entries', () => {
		const metrics = computeDeterministicMetrics({
			scenario,
			entries: [
				{
					...activeEntry,
					id: 'entry-2',
					content: 'The team used Airtable before switching.',
					sources: [],
				},
			],
			recalls: [],
			finalAnswers: [],
		});

		expect(metrics.entryCoverage).toBe(0);
		expect(metrics.sourceBackedPrecision).toBe(0);
		expect(metrics.lifecycleAccuracy).toBe(0);
	});

	it('computes hit rate, MRR, and nDCG for recall rankings', () => {
		const recall = {
			id: 'inventory',
			prompt: 'What exact prior artifacts did we name?',
			shouldCallRecallMemory: true,
			toolCalled: true,
			results: [
				{ entryId: 'entry-noise', content: 'Unrelated memory' },
				{ entryId: 'entry-1', content: activeEntry.content },
			],
			answer: 'The tracker was North Pier Vendor Queue - Trial.',
		} satisfies EpisodicEvalRecallResult;

		const metrics = computeRankingMetrics(scenario, [recall]);

		expect(metrics.recallTopKHitRate).toBe(1);
		expect(metrics.mrr).toBe(0.5);
		expect(metrics.ndcg).toBeCloseTo(0.6309, 4);
	});

	it('parses strict judge JSON scores and clamps valid score range', () => {
		const parsed = parseJudgeScores(`
			{
				"answerCorrectness": 5,
				"answerFaithfulness": 4,
				"historicalFraming": 3,
				"inventoryCompleteness": 2,
				"distractorResistance": 1,
				"notes": ["Good artifact recall"]
			}
		`);

		expect(parsed).toEqual({
			answerCorrectness: 5,
			answerFaithfulness: 4,
			historicalFraming: 3,
			inventoryCompleteness: 2,
			distractorResistance: 1,
			notes: ['Good artifact recall'],
		});
	});

	it('rejects judge output that is not strict JSON with all scores', () => {
		expect(() => parseJudgeScores('answerCorrectness: 5')).toThrow(
			'Judge response must be valid JSON',
		);
		expect(() => parseJudgeScores('{"answerCorrectness": 5}')).toThrow(
			'Judge response is missing answerFaithfulness',
		);
	});

	it('classifies missing recall as tool policy and empty retrieval as retrieval', () => {
		expect(
			classifyRecallFailure({
				toolCalled: false,
				shouldCallRecallMemory: true,
				expectedEntryActive: true,
				expectedObservationActive: true,
			}),
		).toBe('tool_policy');

		expect(
			classifyRecallFailure({
				toolCalled: true,
				shouldCallRecallMemory: true,
				expectedEntryActive: true,
				expectedObservationActive: true,
				retrievedExpectedFact: false,
			}),
		).toBe('retrieval');
	});

	it('aggregates deterministic and judge metrics into a normalized scorecard', () => {
		const scorecard = aggregateScorecard({
			deterministic: {
				entryCoverage: 1,
				sourceBackedPrecision: 1,
				exactIdentifierRecall: 0.5,
				dedupeAccuracy: 1,
				lifecycleAccuracy: 1,
				scopeContaminationRate: 0,
				recallTopKHitRate: 1,
				mrr: 0.5,
				ndcg: 0.75,
				abstentionPrecision: 1,
				toolCallAccuracy: 1,
			},
			judge: {
				answerCorrectness: 5,
				answerFaithfulness: 4,
				historicalFraming: 5,
				inventoryCompleteness: 3,
				distractorResistance: 4,
			},
		});

		expect(scorecard.deterministic).toBeCloseTo(0.88636, 4);
		expect(scorecard.judge).toBeCloseTo(0.84, 4);
		expect(scorecard.overall).toBeCloseTo(0.87245, 4);
	});
});
