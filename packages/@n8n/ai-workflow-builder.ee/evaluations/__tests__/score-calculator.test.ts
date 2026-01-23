/**
 * Tests for score calculation utilities.
 *
 * These utilities calculate weighted scores and aggregate feedback
 * from multiple evaluators.
 */

import type { Feedback } from '../harness/harness-types';
import {
	parseFeedbackKey,
	extractCategory,
	groupByEvaluator,
	calculateWeightedScore,
	aggregateScores,
	DEFAULT_EVALUATOR_WEIGHTS,
} from '../harness/score-calculator';

/** Helper to create feedback items */
function createFeedback(
	evaluator: string,
	metric: string,
	score: number,
	kind: Feedback['kind'] = 'metric',
	comment?: string,
): Feedback {
	return { evaluator, metric, score, kind, ...(comment ? { comment } : {}) };
}

describe('Score Calculator', () => {
	describe('parseFeedbackKey()', () => {
		it('should parse two-part key', () => {
			const result = parseFeedbackKey('llm-judge.functionality');
			expect(result).toEqual({
				evaluator: 'llm-judge',
				category: 'functionality',
				subcategory: undefined,
			});
		});

		it('should parse three-part key', () => {
			const result = parseFeedbackKey('pairwise.gen1.majorityPass');
			expect(result).toEqual({
				evaluator: 'pairwise',
				category: 'gen1',
				subcategory: 'majorityPass',
			});
		});

		it('should handle single-part key', () => {
			const result = parseFeedbackKey('overall');
			expect(result).toEqual({
				evaluator: 'overall',
				category: '',
				subcategory: undefined,
			});
		});

		it('should handle keys with more than three parts', () => {
			const result = parseFeedbackKey('a.b.c.d.e');
			expect(result).toEqual({
				evaluator: 'a',
				category: 'b',
				subcategory: 'c',
			});
		});
	});

	describe('extractCategory()', () => {
		it('should extract category from llm-judge key', () => {
			expect(extractCategory('llm-judge.functionality')).toBe('functionality');
		});

		it('should extract category from programmatic key', () => {
			expect(extractCategory('programmatic.trigger')).toBe('trigger');
		});

		it('should extract category from pairwise key', () => {
			expect(extractCategory('pairwise.majorityPass')).toBe('majorityPass');
		});

		it('should return empty string for single-part key', () => {
			expect(extractCategory('overall')).toBe('');
		});

		it('should extract first category from multi-part key', () => {
			expect(extractCategory('pairwise.gen1.diagnosticScore')).toBe('gen1');
		});
	});

	describe('groupByEvaluator()', () => {
		it('should group feedback by evaluator prefix', () => {
			const feedback: Feedback[] = [
				createFeedback('llm-judge', 'functionality', 0.8),
				createFeedback('llm-judge', 'connections', 0.9),
				createFeedback('programmatic', 'trigger', 1.0),
			];

			const grouped = groupByEvaluator(feedback);

			expect(Object.keys(grouped)).toHaveLength(2);
			expect(grouped['llm-judge']).toHaveLength(2);
			expect(grouped['programmatic']).toHaveLength(1);
		});

		it('should handle mixed evaluators', () => {
			const feedback: Feedback[] = [
				createFeedback('llm-judge', 'a', 0.5),
				createFeedback('programmatic', 'b', 0.6),
				createFeedback('pairwise', 'c', 0.7),
				createFeedback('similarity', 'd', 0.8),
			];

			const grouped = groupByEvaluator(feedback);

			expect(Object.keys(grouped)).toHaveLength(4);
			expect(grouped['llm-judge']).toHaveLength(1);
			expect(grouped['programmatic']).toHaveLength(1);
			expect(grouped['pairwise']).toHaveLength(1);
			expect(grouped['similarity']).toHaveLength(1);
		});

		it('should handle empty array', () => {
			const grouped = groupByEvaluator([]);
			expect(grouped).toEqual({});
		});

		it('should preserve feedback properties', () => {
			const feedback: Feedback[] = [
				createFeedback('llm-judge', 'test', 0.75, 'metric', 'Test comment'),
			];

			const grouped = groupByEvaluator(feedback);

			expect(grouped['llm-judge'][0]).toEqual({
				evaluator: 'llm-judge',
				metric: 'test',
				score: 0.75,
				kind: 'metric',
				comment: 'Test comment',
			});
		});
	});

	describe('calculateWeightedScore()', () => {
		it('should use default weights', () => {
			const feedback: Feedback[] = [
				createFeedback('llm-judge', 'a', 1.0),
				createFeedback('programmatic', 'b', 0.5),
				createFeedback('pairwise', 'c', 0.5),
				createFeedback('similarity', 'd', 0.5),
			];

			const score = calculateWeightedScore(feedback);

			// llm-judge: 1.0 * 0.35 = 0.35
			// programmatic: 0.5 * 0.25 = 0.125
			// pairwise: 0.5 * 0.25 = 0.125
			// similarity: 0.5 * 0.15 = 0.075
			// Total: 0.675 / 1.0 = 0.675
			expect(score).toBeCloseTo(0.675);
		});

		it('should use custom weights', () => {
			const feedback: Feedback[] = [
				createFeedback('llm-judge', 'a', 1.0),
				createFeedback('programmatic', 'b', 0.0),
			];

			const score = calculateWeightedScore(feedback, {
				'llm-judge': 0.8,
				programmatic: 0.2,
			});

			// llm-judge: 1.0 * 0.8 = 0.8
			// programmatic: 0.0 * 0.2 = 0.0
			// Total: 0.8 / 1.0 = 0.8
			expect(score).toBeCloseTo(0.8);
		});

		it('should handle missing evaluators with default weight', () => {
			const feedback: Feedback[] = [createFeedback('unknown-evaluator', 'a', 0.5)];

			const score = calculateWeightedScore(feedback);

			// unknown-evaluator gets default weight of 0.1
			expect(score).toBeCloseTo(0.5);
		});

		it('should return 0 for empty feedback', () => {
			const score = calculateWeightedScore([]);
			expect(score).toBe(0);
		});

		it('should average multiple items from same evaluator', () => {
			const feedback: Feedback[] = [
				{ ...createFeedback('llm-judge', 'a', 1.0), kind: 'metric' },
				{ ...createFeedback('llm-judge', 'b', 0.5), kind: 'metric' },
				{ ...createFeedback('llm-judge', 'c', 0.5), kind: 'metric' },
			];

			const score = calculateWeightedScore(feedback, { 'llm-judge': 1.0 });

			// avg(1.0, 0.5, 0.5) = 0.666...
			expect(score).toBeCloseTo(0.666, 2);
		});

		it('should ignore detail items when score items exist', () => {
			const feedback: Feedback[] = [
				{ evaluator: 'llm-judge', metric: 'overallScore', score: 0.8, kind: 'score' },
				{
					evaluator: 'llm-judge',
					metric: 'efficiency.nodeCountEfficiency',
					score: 0.0,
					kind: 'detail',
				},
				{
					evaluator: 'llm-judge',
					metric: 'efficiency.pathOptimization',
					score: 0.0,
					kind: 'detail',
				},
			];

			expect(calculateWeightedScore(feedback)).toBeCloseTo(0.8, 5);
		});

		it('should be invariant to extra detail keys', () => {
			const base: Feedback[] = [
				{ evaluator: 'pairwise', metric: 'pairwise_primary', score: 1, kind: 'score' },
			];
			const withDetails: Feedback[] = [
				...base,
				{ evaluator: 'pairwise', metric: 'judge1', score: 0, kind: 'detail' },
				{ evaluator: 'pairwise', metric: 'judge2', score: 0, kind: 'detail' },
			];

			expect(calculateWeightedScore(base)).toBeCloseTo(calculateWeightedScore(withDetails), 10);
		});

		it('should normalize weights', () => {
			const feedback: Feedback[] = [createFeedback('a', 'x', 1.0), createFeedback('b', 'x', 0.0)];

			// Weights don't sum to 1.0
			const score = calculateWeightedScore(feedback, {
				a: 0.5,
				b: 0.5,
			});

			// a: 1.0 * 0.5 = 0.5
			// b: 0.0 * 0.5 = 0.0
			// Total: 0.5 / 1.0 = 0.5
			expect(score).toBeCloseTo(0.5);
		});
	});

	describe('aggregateScores()', () => {
		it('should calculate overall score', () => {
			const feedback: Feedback[] = [
				createFeedback('llm-judge', 'a', 0.8),
				createFeedback('programmatic', 'b', 0.6),
			];

			const result = aggregateScores(feedback);

			// llm-judge: 0.8 * 0.4 = 0.32
			// programmatic: 0.6 * 0.3 = 0.18
			// Total weight: 0.7, Total: 0.5 / 0.7 = 0.714...
			expect(result.overall).toBeCloseTo(0.714, 2);
		});

		it('should calculate by-evaluator averages', () => {
			const feedback: Feedback[] = [
				createFeedback('llm-judge', 'a', 0.8),
				createFeedback('llm-judge', 'b', 0.6),
				createFeedback('programmatic', 'c', 1.0),
			];

			const result = aggregateScores(feedback);

			expect(result.byEvaluator['llm-judge']).toBeCloseTo(0.7); // (0.8 + 0.6) / 2
			expect(result.byEvaluator['programmatic']).toBeCloseTo(1.0);
		});

		it('should calculate by-category averages', () => {
			const feedback: Feedback[] = [
				createFeedback('llm-judge', 'functionality', 0.8),
				createFeedback('llm-judge', 'connections', 0.6),
				createFeedback('programmatic', 'trigger', 1.0),
			];

			const result = aggregateScores(feedback);

			expect(result.byCategory['functionality']).toBeCloseTo(0.8);
			expect(result.byCategory['connections']).toBeCloseTo(0.6);
			expect(result.byCategory['trigger']).toBeCloseTo(1.0);
		});

		it('should average same categories from different evaluators', () => {
			const feedback: Feedback[] = [
				createFeedback('llm-judge', 'functionality', 0.8),
				createFeedback('programmatic', 'functionality', 0.6),
			];

			const result = aggregateScores(feedback);

			expect(result.byCategory['functionality']).toBeCloseTo(0.7); // (0.8 + 0.6) / 2
		});

		it('should handle empty feedback', () => {
			const result = aggregateScores([]);

			expect(result.overall).toBe(0);
			expect(result.byEvaluator).toEqual({});
			expect(result.byCategory).toEqual({});
		});
	});

	describe('DEFAULT_EVALUATOR_WEIGHTS', () => {
		it('should have weights for standard evaluators', () => {
			expect(DEFAULT_EVALUATOR_WEIGHTS['llm-judge']).toBeDefined();
			expect(DEFAULT_EVALUATOR_WEIGHTS['programmatic']).toBeDefined();
			expect(DEFAULT_EVALUATOR_WEIGHTS['pairwise']).toBeDefined();
		});

		it('should have weights that sum to approximately 1', () => {
			const sum = Object.values(DEFAULT_EVALUATOR_WEIGHTS).reduce((a, b) => a + b, 0);
			expect(sum).toBeCloseTo(1.0);
		});
	});
});
