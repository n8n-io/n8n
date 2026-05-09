import { describe, expect, it } from 'vitest';

import { scoreCrossThreadFactScenario } from './cross-thread-facts-eval-scoring';

describe('cross-thread facts eval scoring', () => {
	it('does not treat same-scope retrieval distractors as cross-scope leaks', () => {
		const result = scoreCrossThreadFactScenario(
			{
				recallPrompt: 'What durable target codename did I give you? Use memory.',
				expectedStoredKeywords: ['Needle1'],
				expectedAnswerKeywords: ['Needle1'],
				forbiddenAnswerKeywords: ['Value1-0'],
			},
			{
				storedFacts: [
					"User's durable target codename is Needle1.",
					'User has durable distractors labeled Value1-0 through Value1-11.',
				],
				recallFacts: [
					"User's durable target codename is Needle1.",
					'User has durable distractors labeled Value1-0 through Value1-11.',
				],
				answer: 'Your durable target codename is Needle1.',
				recallToolCalled: true,
				crossThreadErrors: [],
			},
		);

		expect(result.metrics.answerAccuracy).toBe(true);
		expect(result.metrics.crossScopeSafety).toBe(true);
		expect(result.metrics.endToEnd).toBe(true);
	});

	it('reports actual forbidden scope values separately from answer safety', () => {
		const result = scoreCrossThreadFactScenario(
			{
				recallPrompt: 'What scoped project codename should you remember? Use memory.',
				expectedStoredKeywords: ['ScopeTarget'],
				expectedAnswerKeywords: ['ScopeTarget'],
				forbiddenScopeKeywords: ['OtherUser'],
			},
			{
				storedFacts: ["User's scoped project codename is ScopeTarget."],
				recallFacts: [
					"User's scoped project codename is ScopeTarget.",
					"User's scoped project codename is OtherUser.",
				],
				answer: 'Your scoped project codename is ScopeTarget.',
				recallToolCalled: true,
				crossThreadErrors: [],
			},
		);

		expect(result.metrics.answerAccuracy).toBe(true);
		expect(result.metrics.crossScopeSafety).toBe(false);
		expect(result.metrics.endToEnd).toBe(false);
	});

	it('makes stored-fact dedupe regressions an explicit metric', () => {
		const result = scoreCrossThreadFactScenario(
			{
				recallPrompt: 'What repeated codename did I give you? Use memory.',
				expectedStoredKeywords: ['Echo'],
				expectedAnswerKeywords: ['Echo'],
				expectedMaxStoredFacts: 1,
			},
			{
				storedFacts: ["User's repeated codename is Echo.", "User's codename is Echo."],
				recallFacts: ["User's repeated codename is Echo."],
				answer: 'Your repeated codename is Echo.',
				recallToolCalled: true,
				crossThreadErrors: [],
			},
		);

		expect(result.metrics.maxStoredFacts).toBe(false);
		expect(result.failedMetrics).toContain('maxStoredFacts');
		expect(result.metrics.endToEnd).toBe(false);
	});

	it('allows abstention answers to mention the requested topic without fabricating a value', () => {
		const result = scoreCrossThreadFactScenario(
			{
				recallPrompt: 'What is my remembered codename? Use memory.',
				expectedStoredKeywords: [],
				expectedAnswerKeywords: [],
				expectStoredFacts: false,
			},
			{
				storedFacts: [],
				recallFacts: [],
				answer: "I don't have a remembered codename for you.",
				recallToolCalled: true,
				crossThreadErrors: [],
			},
		);

		expect(result.metrics.answerAccuracy).toBe(true);
		expect(result.metrics.endToEnd).toBe(true);
	});
});
