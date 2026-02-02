import type { ProgrammaticEvaluationResult, SingleEvaluatorResult } from '@/validation/types';

/**
 * Importance tiers for score weighting.
 * Higher tier = more impact on overall score.
 */
const IMPORTANCE_TIER = {
	high: 3,
	medium: 2,
	low: 1,
} as const;

type ImportanceTier = keyof typeof IMPORTANCE_TIER;

/**
 * Category importance assignments.
 * - high: Critical for workflow correctness (connections, trigger, parameters)
 * - medium: Important for quality (agentPrompt, tools, similarity)
 * - low: Nice to have (fromAi, nodeUsage)
 */
const CATEGORY_IMPORTANCE: Record<string, ImportanceTier> = {
	connections: 'high',
	trigger: 'high',
	parameters: 'high',
	agentPrompt: 'medium',
	tools: 'medium',
	similarity: 'medium',
	fromAi: 'low',
	nodeUsage: 'low',
};

/**
 * Calculate weights from importance tiers.
 * Each category gets a weight proportional to its tier value.
 */
function calculateWeightsFromTiers(categories: string[]): Record<string, number> {
	const tierValues = categories.map((cat) => IMPORTANCE_TIER[CATEGORY_IMPORTANCE[cat] ?? 'low']);
	const totalTierValue = tierValues.reduce((sum, val) => sum + val, 0);

	const weights: Record<string, number> = {};
	for (const category of categories) {
		const tierValue = IMPORTANCE_TIER[CATEGORY_IMPORTANCE[category] ?? 'low'];
		weights[category] = tierValue / totalTierValue;
	}

	return weights;
}

export function calculateOverallScore(
	evaluatorResults: Omit<ProgrammaticEvaluationResult, 'overallScore'>,
): number {
	// Determine which categories to include
	const applicableCategories = Object.keys(evaluatorResults).filter(
		(k) => k !== 'similarity' || evaluatorResults.similarity !== null,
	);

	// Calculate weights based on importance tiers
	const weights = calculateWeightsFromTiers(applicableCategories);

	const total = applicableCategories.reduce((acc, category) => {
		const result = evaluatorResults[category as keyof typeof evaluatorResults];
		if (result && typeof result === 'object' && 'score' in result) {
			return acc + result.score * (weights[category] || 0);
		}
		return acc;
	}, 0);

	return total;
}

export function calcSingleEvaluatorScore(
	result: Pick<SingleEvaluatorResult, 'violations'>,
): number {
	const totalPointsDeducted = result.violations.reduce(
		(acc, violation) => acc + violation.pointsDeducted,
		0,
	);

	return Math.max(0, 100 - totalPointsDeducted) / 100;
}
