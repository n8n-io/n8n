import cliProgress from 'cli-progress';
import pc from 'picocolors';

import type { TestCase } from '../types/evaluation.js';
import type { TestResult } from '../types/test-result.js';
import {
	calculateTestMetrics,
	calculateCategoryAverages,
	countViolationsByType,
	calculateProgrammaticAverages,
	countProgrammaticViolationsByType,
} from '../utils/evaluation-calculator.js';
import {
	displayTestResults,
	displaySummaryTable,
	displayViolationsDetail,
} from '../utils/evaluation-reporter.js';

/**
 * Creates a progress bar for test execution
 * @param total - Total number of tests
 * @returns Progress bar instance
 */
export function createProgressBar(total: number): cliProgress.SingleBar {
	const progressBar = new cliProgress.SingleBar(
		{
			format: 'Progress |{bar}| {percentage}% | {value}/{total} Tests | {status}',
			barCompleteChar: '█',
			barIncompleteChar: '░',
			hideCursor: true,
		},
		cliProgress.Presets.shades_classic,
	);
	progressBar.start(total, 0, { status: 'Starting...' });
	return progressBar;
}

/**
 * Updates progress bar with current status
 * @param progressBar - Progress bar instance
 * @param completed - Number of completed tests
 * @param total - Total number of tests
 * @param status - Optional status message
 */
export function updateProgress(
	progressBar: cliProgress.SingleBar,
	completed: number,
	total: number,
	status?: string,
): void {
	progressBar.update(completed, {
		status: status ?? `${completed}/${total} completed`,
	});
}

/**
 * Displays evaluation results in the console
 * @param testCases - Array of test cases
 * @param results - Array of test results
 * @param totalTime - Total execution time in milliseconds
 */
export function displayResults(
	testCases: TestCase[],
	results: TestResult[],
	totalTime: number,
): void {
	// Display test results
	displayTestResults(testCases, results);

	console.log();
	console.log(pc.green(`✓ All tests completed in ${(totalTime / 1000).toFixed(1)}s`));

	// Calculate metrics
	const metrics = calculateTestMetrics(results);
	const categoryAverages = calculateCategoryAverages(results);
	const violationCounts = countViolationsByType(results);
	const programmaticAverages = calculateProgrammaticAverages(results);
	const programmaticViolationCounts = countProgrammaticViolationsByType(results);

	const combinedMetrics = {
		...metrics,
		categoryAverages,
		violationCounts,
		programmaticAverages,
		programmaticViolationCounts,
	};

	// Display summary
	displaySummaryTable(results, combinedMetrics);

	// Display violations if any exist (from either LLM or programmatic evaluation)
	const hasLLMViolations =
		violationCounts.critical > 0 || violationCounts.major > 0 || violationCounts.minor > 0;
	const hasProgViolations =
		programmaticViolationCounts.critical > 0 ||
		programmaticViolationCounts.major > 0 ||
		programmaticViolationCounts.minor > 0;

	if (hasLLMViolations || hasProgViolations) {
		displayViolationsDetail(results);
	}
}

/**
 * Displays error message and exits
 * @param message - Error message
 * @param error - Optional error object
 */
export function displayError(message: string, error?: unknown): void {
	console.error(pc.red(`✗ ${message}`));
	if (error) {
		console.error(error);
	}
	process.exit(1);
}
