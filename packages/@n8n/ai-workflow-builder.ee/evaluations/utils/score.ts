import type { SingleEvaluatorResult } from '../types/test-result';

export function calculateOverallScore(evaluatorResults: SingleEvaluatorResult[]): number {
	if (evaluatorResults.length === 0) return 0;
	const total = evaluatorResults.reduce((acc, res) => acc + res.score, 0);
	return total / evaluatorResults.length;
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
