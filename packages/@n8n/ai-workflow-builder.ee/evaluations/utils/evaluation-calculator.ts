import type { TestResult } from '../types/test-result.js';

/**
 * Calculates average scores for each evaluation category
 * @param results - Array of test results
 * @returns Object with average scores per category
 */
export function calculateCategoryAverages(results: TestResult[]): Record<string, number> {
	const successfulTests = results.filter((r) => !r.error).length;
	const categoryAverages: Record<string, number> = {
		functionality: 0,
		connections: 0,
		expressions: 0,
		nodeConfiguration: 0,
		efficiency: 0,
		dataFlow: 0,
		maintainability: 0,
	};

	results
		.filter((r) => !r.error)
		.forEach((r) => {
			categoryAverages.functionality += r.evaluationResult.functionality.score;
			categoryAverages.connections += r.evaluationResult.connections.score;
			categoryAverages.expressions += r.evaluationResult.expressions.score;
			categoryAverages.nodeConfiguration += r.evaluationResult.nodeConfiguration.score;
			categoryAverages.efficiency += r.evaluationResult.efficiency.score;
			categoryAverages.dataFlow += r.evaluationResult.dataFlow.score;
			categoryAverages.maintainability += r.evaluationResult.maintainability.score;
		});

	Object.keys(categoryAverages).forEach((key) => {
		categoryAverages[key] /= successfulTests || 1;
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
				...r.evaluationResult.efficiency.violations,
				...r.evaluationResult.dataFlow.violations,
				...r.evaluationResult.maintainability.violations,
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

/**
 * Calculates average scores for programmatic evaluators
 * @param results - Array of test results
 * @returns Object with average scores per programmatic evaluator
 */
export function calculateProgrammaticAverages(results: TestResult[]): Record<string, number> {
	const successfulTests = results.filter((r) => !r.error);

	const programmaticAverages: Record<string, number> = {
		connections: 0,
		trigger: 0,
		agentPrompt: 0,
		tools: 0,
		fromAi: 0,
		overall: 0,
	};

	successfulTests.forEach((r) => {
		programmaticAverages.connections += r.programmaticEvaluationResult.connections.score;
		programmaticAverages.trigger += r.programmaticEvaluationResult.trigger.score;
		programmaticAverages.agentPrompt += r.programmaticEvaluationResult.agentPrompt.score;
		programmaticAverages.tools += r.programmaticEvaluationResult.tools.score;
		programmaticAverages.fromAi += r.programmaticEvaluationResult.fromAi.score;
		programmaticAverages.overall += r.programmaticEvaluationResult.overallScore;
	});

	Object.keys(programmaticAverages).forEach((key) => {
		programmaticAverages[key] /= successfulTests.length || 1;
	});

	return programmaticAverages;
}

/**
 * Counts programmatic violations by severity type across all test results
 * @param results - Array of test results
 * @returns Object with counts for each violation type
 */
export function countProgrammaticViolationsByType(results: TestResult[]): {
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
				...r.programmaticEvaluationResult.connections.violations,
				...r.programmaticEvaluationResult.trigger.violations,
				...r.programmaticEvaluationResult.agentPrompt.violations,
				...r.programmaticEvaluationResult.tools.violations,
				...r.programmaticEvaluationResult.fromAi.violations,
			];
			criticalCount += allViolations.filter((v) => v.type === 'critical').length;
			majorCount += allViolations.filter((v) => v.type === 'major').length;
			minorCount += allViolations.filter((v) => v.type === 'minor').length;
		}
	});

	return { critical: criticalCount, major: majorCount, minor: minorCount };
}
