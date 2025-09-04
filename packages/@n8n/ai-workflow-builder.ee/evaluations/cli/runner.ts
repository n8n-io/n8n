import pLimit from 'p-limit';
import pc from 'picocolors';

import { createProgressBar, updateProgress, displayResults, displayError } from './display.js';
import { basicTestCases, generateTestCases } from '../chains/test-case-generator.js';
import {
	setupTestEnvironment,
	createAgent,
	getConcurrencyLimit,
	shouldGenerateTestCases,
	howManyTestCasesToGenerate,
} from '../core/environment.js';
import { runSingleTest, initializeTestTracking } from '../core/test-runner.js';
import type { TestCase } from '../types/evaluation.js';
import {
	calculateTestMetrics,
	calculateCategoryAverages,
	countViolationsByType,
} from '../utils/evaluation-calculator.js';
import { formatHeader, saveEvaluationResults } from '../utils/evaluation-helpers.js';
import { generateMarkdownReport } from '../utils/evaluation-reporter.js';

/**
 * Main CLI evaluation runner that executes all test cases in parallel
 * Supports concurrency control via EVALUATION_CONCURRENCY environment variable
 */
export async function runCliEvaluation(testCaseFilter?: string): Promise<void> {
	console.log(formatHeader('AI Workflow Builder Full Evaluation', 70));
	console.log();
	try {
		// Setup test environment
		const { parsedNodeTypes, llm, tracer } = await setupTestEnvironment();

		// Determine test cases to run
		let testCases: TestCase[] = basicTestCases;

		// Filter to single test case if specified
		if (testCaseFilter) {
			const filteredCase = testCases.find((tc) => tc.id === testCaseFilter);
			if (filteredCase) {
				testCases = [filteredCase];
				console.log(pc.blue(`➔ Running single test case: ${filteredCase.name}`));
			} else {
				console.log(pc.red(`❌ Test case '${testCaseFilter}' not found`));
				console.log(pc.dim(`Available test cases: ${testCases.map((tc) => tc.id).join(', ')}`));
				return;
			}
		} else {
			// Optionally generate additional test cases
			if (shouldGenerateTestCases()) {
				console.log(pc.blue('➔ Generating additional test cases...'));
				const generatedCases = await generateTestCases(llm, howManyTestCasesToGenerate());
				testCases = [...testCases, ...generatedCases];
			}
		}

		// Get concurrency from environment
		const concurrency = getConcurrencyLimit();
		console.log(pc.dim(`Running ${testCases.length} test cases with concurrency=${concurrency}`));
		console.log();

		// Create progress bar
		const progressBar = createProgressBar(testCases.length);

		// Create concurrency limiter
		const limit = pLimit(concurrency);

		// Track progress
		let completed = 0;
		const startTime = Date.now();
		const testResults = initializeTestTracking(testCases);

		// Run all test cases in parallel with concurrency limit
		const promises = testCases.map(
			async (testCase) =>
				await limit(async () => {
					updateProgress(progressBar, completed, testCases.length, `Running: ${testCase.name}`);

					// Create a dedicated agent for this test to avoid state conflicts
					const testAgent = createAgent(parsedNodeTypes, llm, tracer);
					const result = await runSingleTest(testAgent, llm, testCase);

					testResults[testCase.id] = result.error ? 'fail' : 'pass';
					completed++;
					updateProgress(progressBar, completed, testCases.length);
					return result;
				}),
		);

		const results = await Promise.all(promises);
		const totalTime = Date.now() - startTime;
		progressBar.stop();

		// Display results
		displayResults(testCases, results, totalTime);

		// Calculate metrics for report
		const metrics = calculateTestMetrics(results);
		const categoryAverages = calculateCategoryAverages(results);
		const violationCounts = countViolationsByType(results);

		const combinedMetrics = {
			...metrics,
			categoryAverages,
			violationCounts,
		};

		// Generate and save results
		const report = generateMarkdownReport(results, combinedMetrics);
		const { reportPath, resultsPath } = saveEvaluationResults(results, report);

		console.log(`\nReport saved to: ${reportPath}`);
		console.log(`Detailed results saved to: ${resultsPath}`);
	} catch (error) {
		displayError('Evaluation failed', error);
	}
}
