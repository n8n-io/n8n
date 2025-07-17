import * as cliProgress from 'cli-progress';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

import type { TestResult } from '../types/test-result.js';

/**
 * Creates and configures a progress bar for test execution
 * @param totalTests - Total number of tests to run
 * @returns Configured progress bar instance
 */
export function createProgressBar(totalTests: number): cliProgress.SingleBar {
	const progressBar = new cliProgress.SingleBar(
		{
			format: '{bar} {percentage}% | ETA: {eta}s | {value}/{total} | {testName}',
			barCompleteChar: '█',
			barIncompleteChar: '░',
			hideCursor: true,
		},
		cliProgress.Presets.shades_classic,
	);

	progressBar.start(totalTests, 0, {
		testName: 'Starting...',
	});

	return progressBar;
}

/**
 * Updates progress bar with current test information
 * @param progressBar - Progress bar instance
 * @param completed - Number of completed tests
 * @param totalTests - Total number of tests
 * @param currentTestName - Name of the currently running test
 */
export function updateProgress(
	progressBar: cliProgress.SingleBar,
	completed: number,
	totalTests: number,
	currentTestName?: string,
): void {
	const testName = currentTestName ?? (completed === totalTests ? 'Complete!' : 'Waiting...');
	progressBar.update(completed, { testName });
}

/**
 * Saves evaluation results to disk in both JSON and markdown formats
 * @param results - Array of test results
 * @param report - Generated markdown report
 * @returns Paths to saved files
 */
export function saveEvaluationResults(
	results: TestResult[],
	report: string,
): { reportPath: string; resultsPath: string } {
	const resultsDir = join(process.cwd(), 'evaluations', 'results');
	mkdirSync(resultsDir, { recursive: true });

	const timestamp = new Date().toISOString().replace(/:/g, '-');
	const reportPath = join(resultsDir, `evaluation-report-${timestamp}.md`);
	const resultsPath = join(resultsDir, `evaluation-results-${timestamp}.json`);

	writeFileSync(reportPath, report);
	writeFileSync(resultsPath, JSON.stringify(results, null, 2));

	return { reportPath, resultsPath };
}

/**
 * Initializes test results tracking map
 * @param testCases - Array of test cases
 * @returns Map of test IDs to their status
 */
export function initializeTestTracking(testCases: Array<{ id: string }>): {
	[key: string]: 'pending' | 'pass' | 'fail';
} {
	const testResults: { [key: string]: 'pending' | 'pass' | 'fail' } = {};

	testCases.forEach((tc) => {
		testResults[tc.id] = 'pending';
	});

	return testResults;
}

/**
 * Gets concurrency limit from environment variable
 * @param defaultConcurrency - Default concurrency if not specified
 * @returns Concurrency limit
 */
export function getConcurrencyLimit(defaultConcurrency: number = 3): number {
	const envConcurrency = process.env.EVALUATION_CONCURRENCY;
	if (!envConcurrency) return defaultConcurrency;

	const parsed = parseInt(envConcurrency, 10);
	return isNaN(parsed) || parsed < 1 ? defaultConcurrency : parsed;
}

/**
 * Determines if additional test cases should be generated
 * @returns Boolean indicating whether to generate test cases
 */
export function shouldGenerateTestCases(): boolean {
	return process.env.GENERATE_TEST_CASES === 'true';
}
