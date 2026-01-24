import type { ProgrammaticEvaluationResult, SingleEvaluatorResult } from '@/validation/types';

export function calculateOverallScore(
	evaluatorResults: Omit<ProgrammaticEvaluationResult, 'overallScore'>,
): number {
	// Base weights for when similarity is not available
	// graphValidation gets 10% weight as it validates code structure
	const baseWeights = {
		connections: 0.22,
		trigger: 0.22,
		agentPrompt: 0.18,
		tools: 0.18,
		fromAi: 0.1,
		graphValidation: 0.1,
	};

	// If similarity is available, adjust weights to include it
	let weights: Record<string, number>;
	let applicableCategories: string[];

	if (evaluatorResults.similarity) {
		// Rebalance weights to include similarity (18% weight)
		weights = {
			connections: 0.18,
			trigger: 0.18,
			agentPrompt: 0.14,
			tools: 0.14,
			fromAi: 0.08,
			similarity: 0.18,
			graphValidation: 0.1,
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
