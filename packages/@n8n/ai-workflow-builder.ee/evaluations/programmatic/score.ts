import type { ProgrammaticEvaluationResult, SingleEvaluatorResult } from '@/validation/types';

export function calculateOverallScore(
	evaluatorResults: Omit<ProgrammaticEvaluationResult, 'overallScore'>,
): number {
	// Base weights for when similarity is not available
	const baseWeights = {
		connections: 0.25,
		trigger: 0.25,
		agentPrompt: 0.2,
		tools: 0.2,
		fromAi: 0.1,
	};

	// If similarity is available, adjust weights to include it
	let weights: Record<string, number>;
	let applicableCategories: string[];

	if (evaluatorResults.similarity) {
		// Rebalance weights to include similarity (20% weight)
		weights = {
			connections: 0.2,
			trigger: 0.2,
			agentPrompt: 0.16,
			tools: 0.16,
			fromAi: 0.08,
			similarity: 0.2,
		};
		applicableCategories = Object.keys(evaluatorResults).filter(
			(k) => k !== 'similarity' || evaluatorResults.similarity !== null,
		);
	} else {
		weights = baseWeights;
		applicableCategories = Object.keys(evaluatorResults).filter((k) => k !== 'similarity');
	}

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
