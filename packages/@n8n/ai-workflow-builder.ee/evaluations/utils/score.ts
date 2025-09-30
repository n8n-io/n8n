import type { ProgrammaticEvaluationResult, SingleEvaluatorResult } from '../types/test-result';

export function calculateOverallScore(
	evaluatorResults: Omit<ProgrammaticEvaluationResult, 'overallScore'>,
): number {
	const categories = Object.keys(evaluatorResults) as Array<keyof typeof evaluatorResults>;

	const weights: Record<keyof typeof evaluatorResults, number> = {
		connections: 0.25,
		trigger: 0.25,
		agentPrompt: 0.2,
		tools: 0.2,
		fromAi: 0.1,
	};

	const total = categories.reduce(
		(acc, category) => acc + evaluatorResults[category].score * weights[category],
		0,
	);

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
