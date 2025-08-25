import type { TestResult } from '../types/test-result.js';

/**
 * Calculates average scores for each evaluation category
 * @param results - Array of test results
 * @returns Object with average scores per category
 */
export function calculateCategoryAverages(
	results: TestResult[],
): Record<'functionality' | 'connections' | 'expressions' | 'nodeConfiguration', number> {
	const successfulTests = results.filter((r) => !r.error).length;
	const categoryAverages = {
		functionality: 0,
		connections: 0,
		expressions: 0,
		nodeConfiguration: 0,
	};

	results
		.filter((r) => !r.error)
		.forEach((r) => {
			categoryAverages.functionality += r.evaluationResult.functionality.score;
			categoryAverages.connections += r.evaluationResult.connections.score;
			categoryAverages.expressions += r.evaluationResult.expressions.score;
			categoryAverages.nodeConfiguration += r.evaluationResult.nodeConfiguration.score;
		});

	Object.keys(categoryAverages).forEach((key) => {
		categoryAverages[key as keyof typeof categoryAverages] /= successfulTests || 1;
	});

	return categoryAverages;
}

/**
 * Counts violations by severity type across all test results
 * @param results - Array of test results
 * @returns Object with counts for each violation type
 */
export function countViolationsByType(results: TestResult[]): {
	critical: number;
	major: number;
	minor: number;
} {
	let criticalCount = 0;
	let majorCount = 0;
	let minorCount = 0;

	results.forEach((r) => {
		if (!r.error) {
			const allViolations = [
				...r.evaluationResult.functionality.violations,
				...r.evaluationResult.connections.violations,
				...r.evaluationResult.expressions.violations,
				...r.evaluationResult.nodeConfiguration.violations,
			];
			criticalCount += allViolations.filter((v) => v.type === 'critical').length;
			majorCount += allViolations.filter((v) => v.type === 'major').length;
			minorCount += allViolations.filter((v) => v.type === 'minor').length;
		}
	});

	return { critical: criticalCount, major: majorCount, minor: minorCount };
}

/**
 * Calculates test metrics including success rate and average score
 * @param results - Array of test results
 * @returns Object with calculated metrics
 */
export function calculateTestMetrics(results: TestResult[]): {
	totalTests: number;
	successfulTests: number;
	failedTests: number;
	averageScore: number;
	successRate: number;
} {
	const totalTests = results.length;
	const successfulTests = results.filter((r) => !r.error).length;
	const failedTests = totalTests - successfulTests;

	const averageScore =
		successfulTests > 0
			? results
					.filter((r) => !r.error)
					.reduce((sum, r) => sum + r.evaluationResult.overallScore, 0) / successfulTests
			: 0;

	const successRate = totalTests > 0 ? successfulTests / totalTests : 0;

	return {
		totalTests,
		successfulTests,
		failedTests,
		averageScore,
		successRate,
	};
}

/**
 * Calculates average generation time for successful tests
 * @param results - Array of test results
 * @returns Average generation time in milliseconds
 */
export function calculateAverageGenerationTime(results: TestResult[]): number {
	const successfulResults = results.filter((r) => !r.error);
	if (successfulResults.length === 0) return 0;

	const totalTime = successfulResults.reduce((sum, r) => sum + r.generationTime, 0);
	return totalTime / successfulResults.length;
}

/**
 * Groups test results by their success status
 * @param results - Array of test results
 * @returns Object with grouped results
 */
export function groupResultsByStatus(results: TestResult[]): {
	successful: TestResult[];
	failed: TestResult[];
} {
	return {
		successful: results.filter((r) => !r.error),
		failed: results.filter((r) => r.error),
	};
}
