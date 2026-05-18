import { scoreMemoryEval } from '../scoring';
import type { MemoryEvalObservation, MemoryEvalScenario } from '../types';

function observation(overrides: Partial<MemoryEvalObservation>): MemoryEvalObservation {
	return {
		id: overrides.id ?? 'obs-1',
		marker: overrides.marker ?? 'important',
		text: overrides.text ?? '',
		status: overrides.status ?? 'active',
		parentId: overrides.parentId ?? null,
		supersededBy: overrides.supersededBy ?? null,
		createdAt: overrides.createdAt ?? '2026-05-18T10:00:00.000Z',
	};
}

const scenario: MemoryEvalScenario = {
	id: 'scoring-fixture',
	name: 'Scoring Fixture',
	description: 'Small deterministic scoring fixture.',
	tags: ['test'],
	turns: [],
	finalQuestions: [
		{
			id: 'current',
			prompt: 'What is current?',
			expectedAnswerTerms: ['Atlas Billing Exceptions Pilot', '#atlas-billing-pilot'],
			forbiddenAnswerTerms: ['Airtable'],
		},
	],
	oracle: {
		activeFacts: [
			'The tracker is Atlas Billing Exceptions Pilot.',
			'The launch channel is #atlas-billing-pilot.',
		],
		staleFacts: ['The tracker is Airtable.'],
		forbiddenFacts: ['sk-live-secret'],
		exactTerms: ['Atlas Billing Exceptions Pilot', '#atlas-billing-pilot'],
		lifecycle: [{ text: 'The tracker is Airtable.', status: 'superseded' }],
	},
};

describe('memory eval scoring', () => {
	it('scores active facts, stale suppression, lifecycle, and final answers', () => {
		const scorecard = scoreMemoryEval({
			scenario,
			observations: [
				observation({
					id: 'active-1',
					text: 'The tracker is Atlas Billing Exceptions Pilot.',
				}),
				observation({
					id: 'active-2',
					text: 'The launch channel is #atlas-billing-pilot.',
				}),
				observation({
					id: 'old-1',
					text: 'The tracker is Airtable.',
					status: 'superseded',
					supersededBy: 'active-1',
				}),
			],
			finalAnswers: [
				{
					questionId: 'current',
					prompt: 'What is current?',
					answer: 'Use Atlas Billing Exceptions Pilot and #atlas-billing-pilot.',
				},
			],
		});

		expect(scorecard.metrics.activeFactRecall.score).toBe(1);
		expect(scorecard.metrics.staleFactSuppression.score).toBe(1);
		expect(scorecard.metrics.exactIdentifierRecall.score).toBe(1);
		expect(scorecard.metrics.lifecycleAccuracy.score).toBe(1);
		expect(scorecard.metrics.finalAnswerCorrectness.score).toBe(1);
		expect(scorecard.overall).toBeGreaterThan(0.9);
	});

	it('penalizes stale active facts and forbidden final answers', () => {
		const scorecard = scoreMemoryEval({
			scenario,
			observations: [
				observation({
					id: 'active-1',
					text: 'The tracker is Airtable.',
				}),
			],
			finalAnswers: [
				{
					questionId: 'current',
					prompt: 'What is current?',
					answer: 'The tracker is Airtable and the secret is sk-live-secret.',
				},
			],
		});

		expect(scorecard.metrics.activeFactRecall.score).toBe(0);
		expect(scorecard.metrics.staleFactSuppression.score).toBe(0);
		expect(scorecard.metrics.contaminationRate.score).toBe(0);
		expect(scorecard.metrics.finalAnswerCorrectness.score).toBe(0);
		expect(scorecard.overall).toBeLessThan(0.5);
	});
});
