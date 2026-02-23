/**
 * Score Calculation Utilities
 *
 * Provides functions for calculating weighted scores and aggregating
 * feedback from multiple evaluators.
 */

import type { Feedback } from './harness-types';

/**
 * Weights for each evaluator type.
 */
export interface ScoreWeights {
	[evaluatorPrefix: string]: number;
}

/**
 * Result of score aggregation.
 */
export interface AggregatedScore {
	/** Weighted overall score (0-1) */
	overall: number;
	/** Average score per evaluator */
	byEvaluator: Record<string, number>;
	/** Average score per category */
	byCategory: Record<string, number>;
}

/**
 * Parsed feedback key structure.
 */
export interface FeedbackKeyParts {
	evaluator: string;
	category: string;
	subcategory?: string;
}

/**
 * Default weights for standard evaluators (cross-evaluator weighting).
 *
 * This is the *harness-level* weighting between evaluators like `llm-judge`,
 * `programmatic`, and `pairwise`. It is independent from any evaluator-internal
 * weighting (e.g. LLM judge category weights).
 * Weights should sum to approximately 1.0.
 */
export const DEFAULT_EVALUATOR_WEIGHTS: ScoreWeights = {
	'llm-judge': 0.35,
	programmatic: 0.25,
	pairwise: 0.25,
	similarity: 0.15,
};

/**
 * @deprecated Use `DEFAULT_EVALUATOR_WEIGHTS` (kept for backwards compatibility within the package).
 */
export const DEFAULT_WEIGHTS: ScoreWeights = DEFAULT_EVALUATOR_WEIGHTS;

/** Default weight for unknown evaluators */
const UNKNOWN_EVALUATOR_WEIGHT = 0.1;

/**
 * Parse a feedback key into its component parts.
 *
 * @example
 * parseFeedbackKey('llm-judge.functionality')
 * // => { evaluator: 'llm-judge', category: 'functionality' }
 *
 * parseFeedbackKey('pairwise.gen1.majorityPass')
 * // => { evaluator: 'pairwise', category: 'gen1', subcategory: 'majorityPass' }
 */
export function parseFeedbackKey(key: string): FeedbackKeyParts {
	const parts = key.split('.');
	return {
		evaluator: parts[0],
		category: parts[1] ?? '',
		subcategory: parts[2],
	};
}

/**
 * Extract the category from a feedback key.
 *
 * @example
 * extractCategory('llm-judge.functionality') // => 'functionality'
 * extractCategory('programmatic.trigger') // => 'trigger'
 */
export function extractCategory(key: string): string {
	return parseFeedbackKey(key).category;
}

/**
 * Group feedback items by their evaluator prefix.
 *
 * @example
 * groupByEvaluator([
 *   { evaluator: 'llm-judge', metric: 'a', score: 0.8 },
 *   { evaluator: 'programmatic', metric: 'b', score: 0.6 },
 * ])
 * // => { 'llm-judge': [...], 'programmatic': [...] }
 */
export function groupByEvaluator(feedback: Feedback[]): Record<string, Feedback[]> {
	const grouped: Record<string, Feedback[]> = {};

	for (const item of feedback) {
		const evaluator = item.evaluator;
		if (!grouped[evaluator]) {
			grouped[evaluator] = [];
		}
		grouped[evaluator].push(item);
	}

	return grouped;
}

/**
 * Calculate average score for an array of feedback items.
 */
export function calculateFiniteAverage(items: Feedback[]): number {
	if (items.length === 0) return 0;
	const finiteScores = items.map((f) => f.score).filter((s) => Number.isFinite(s));
	if (finiteScores.length === 0) return 0;
	const total = finiteScores.reduce((sum, s) => sum + s, 0);
	return total / finiteScores.length;
}

/**
 * Pick which feedback items should be used for evaluator-level scoring.
 *
 * Order of preference:
 * - `kind: 'score'` (single authoritative score)
 * - `kind: 'metric'` (stable category metrics)
 * - any non-`detail` items
 * - otherwise, all items
 */
export function selectScoringItems(items: Feedback[]): Feedback[] {
	const scoreItems = items.filter((i) => i.kind === 'score');
	if (scoreItems.length > 0) return scoreItems;

	const metricItems = items.filter((i) => i.kind === 'metric');
	if (metricItems.length > 0) return metricItems;

	const nonDetailItems = items.filter((i) => i.kind !== 'detail');
	if (nonDetailItems.length > 0) return nonDetailItems;

	return items;
}

/**
 * Calculate weighted overall score from feedback.
 *
 * Each evaluator's average score is weighted according to the weights map.
 * Unknown evaluators receive the default weight.
 *
 * @param feedback - Array of feedback items
 * @param weights - Weight per evaluator (defaults to DEFAULT_WEIGHTS)
 * @returns Weighted average score (0-1)
 */
export function calculateWeightedScore(
	feedback: Feedback[],
	weights: ScoreWeights = DEFAULT_EVALUATOR_WEIGHTS,
): number {
	if (feedback.length === 0) return 0;

	const byEvaluator = groupByEvaluator(feedback);

	let totalWeight = 0;
	let weightedSum = 0;

	for (const [evaluator, items] of Object.entries(byEvaluator)) {
		const avgScore = calculateFiniteAverage(selectScoringItems(items));
		const weight = weights[evaluator] ?? UNKNOWN_EVALUATOR_WEIGHT;
		weightedSum += avgScore * weight;
		totalWeight += weight;
	}

	return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Compute per-evaluator average scores from a set of example results.
 *
 * Groups feedback by evaluator, selects scoring items, and averages
 * across all examples. Shared between local and LangSmith evaluation runners.
 */
export function computeEvaluatorAverages(
	results: Array<{ feedback: Feedback[] }>,
): Record<string, number> {
	const evaluatorStats: Record<string, number[]> = {};

	for (const result of results) {
		const byEvaluator = groupByEvaluator(result.feedback);
		for (const [evaluator, items] of Object.entries(byEvaluator)) {
			if (!evaluatorStats[evaluator]) evaluatorStats[evaluator] = [];
			const scoringItems = selectScoringItems(items);
			evaluatorStats[evaluator].push(calculateFiniteAverage(scoringItems));
		}
	}

	const averages: Record<string, number> = {};
	for (const [name, scores] of Object.entries(evaluatorStats)) {
		averages[name] = scores.reduce((a, b) => a + b, 0) / scores.length;
	}
	return averages;
}

/**
 * Aggregate scores by evaluator and category.
 *
 * @param feedback - Array of feedback items
 * @returns Aggregated scores with overall, by-evaluator, and by-category breakdowns
 */
export function aggregateScores(feedback: Feedback[]): AggregatedScore {
	if (feedback.length === 0) {
		return {
			overall: 0,
			byEvaluator: {},
			byCategory: {},
		};
	}

	// Calculate overall weighted score
	const overall = calculateWeightedScore(feedback);

	// Calculate by-evaluator averages
	const byEvaluator: Record<string, number> = {};
	const grouped = groupByEvaluator(feedback);
	for (const [evaluator, items] of Object.entries(grouped)) {
		byEvaluator[evaluator] = calculateFiniteAverage(selectScoringItems(items));
	}

	// Calculate by-category averages
	const byCategory: Record<string, number> = {};
	const categoryGroups: Record<string, Feedback[]> = {};

	for (const item of feedback) {
		if (item.kind === 'detail') continue;
		const category = item.metric.split('.')[0] ?? '';
		if (category) {
			if (!categoryGroups[category]) {
				categoryGroups[category] = [];
			}
			categoryGroups[category].push(item);
		}
	}

	for (const [category, items] of Object.entries(categoryGroups)) {
		byCategory[category] = calculateFiniteAverage(items);
	}

	return {
		overall,
		byEvaluator,
		byCategory,
	};
}
