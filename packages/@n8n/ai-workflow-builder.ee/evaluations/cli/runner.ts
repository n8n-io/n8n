import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import pLimit from 'p-limit';
import pc from 'picocolors';

import { createProgressBar, updateProgress, displayResults, displayError } from './display.js';
import type { SimpleWorkflow } from '../../src/types/workflow.js';
import type { BuilderFeatureFlags } from '../../src/workflow-builder-agent.js';
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
import type { TestResult } from '../types/test-result.js';
import {
	calculateTestMetrics,
	calculateCategoryAverages,
	countViolationsByType,
} from '../utils/evaluation-calculator.js';
import { formatHeader, saveEvaluationResults } from '../utils/evaluation-helpers.js';
import { generateMarkdownReport } from '../utils/evaluation-reporter.js';
import { createLogger, type EvalLogger } from '../utils/logger.js';

type CliEvaluationOptions = {
	testCaseFilter?: string; // Optional test case ID to run only a specific test
	testCases?: TestCase[]; // Optional array of test cases to run (if not provided, uses defaults and generation)
	repetitions?: number; // Number of times to run each test (e.g. for cache warming analysis)
	featureFlags?: BuilderFeatureFlags; // Optional feature flags to pass to the agent (e.g. templateExamples, multiAgent)
	verbose?: boolean; // Enable verbose logging
};

// ============================================================================
// Verbose Logging Helpers
// ============================================================================

/**
 * Create a compact summary of workflow node types.
 */
function summarizeWorkflowNodes(workflow: SimpleWorkflow): string {
	if (!workflow.nodes?.length) return '0 nodes';

	const types = workflow.nodes.map((n) =>
		n.type
			.replace('n8n-nodes-base.', '')
			.replace('@n8n/n8n-nodes-langchain.', '')
			.replace('n8n-nodes-', ''),
	);

	const counts = new Map<string, number>();
	for (const t of types) {
		counts.set(t, (counts.get(t) ?? 0) + 1);
	}

	const parts = [...counts.entries()].map(([type, count]) =>
		count > 1 ? `${type} x${count}` : type,
	);

	return `${workflow.nodes.length} nodes (${parts.join(', ')})`;
}

/**
 * Log verbose details for a completed test result.
 */
function logTestResultVerbose(
	log: EvalLogger,
	result: TestResult,
	index: number,
	total: number,
): void {
	const { testCase, evaluationResult, generatedWorkflow, generationTime, error } = result;

	// Status with score
	const passed = !error && evaluationResult.overallScore >= 0.7;
	const status = error ? pc.red('ERROR') : passed ? pc.green('PASS') : pc.yellow('WARN');
	const score = error ? 'N/A' : `${(evaluationResult.overallScore * 100).toFixed(0)}%`;

	log.verbose(`  [${index}/${total}] ${status} ${testCase.name} (${score})`);
	log.verbose(`    Timing: ${(generationTime / 1000).toFixed(1)}s`);
	log.verbose(`    Workflow: ${summarizeWorkflowNodes(generatedWorkflow)}`);

	if (error) {
		log.verbose(`    Error: ${error.slice(0, 80)}${error.length > 80 ? '...' : ''}`);
	} else {
		// Show key category scores
		const scores = [
			`func:${(evaluationResult.functionality.score * 100).toFixed(0)}%`,
			`conn:${(evaluationResult.connections.score * 100).toFixed(0)}%`,
			`cfg:${(evaluationResult.nodeConfiguration.score * 100).toFixed(0)}%`,
		];
		log.verbose(`    Scores: ${scores.join(', ')}`);

		// Show critical issues if any
		if (evaluationResult.criticalIssues?.length) {
			const issue = evaluationResult.criticalIssues[0];
			log.verbose(`    Issue: ${issue.slice(0, 60)}${issue.length > 60 ? '...' : ''}`);
		}
	}
}

/**
 * Determine which test cases to run based on options.
 */
async function resolveTestCases(
	options: CliEvaluationOptions,
	llm: BaseChatModel,
	log: EvalLogger,
): Promise<TestCase[]> {
	const { testCaseFilter, testCases: providedTestCases } = options;

	let testCases: TestCase[] =
		providedTestCases && providedTestCases.length > 0 ? providedTestCases : basicTestCases;

	if (providedTestCases && providedTestCases.length > 0) {
		log.info(`➔ Loaded ${providedTestCases.length} test cases from CSV`);
	}

	// Filter to single test case if specified
	if (testCaseFilter) {
		const filteredCase = testCases.find((tc) => tc.id === testCaseFilter);
		if (filteredCase) {
			testCases = [filteredCase];
			log.info(`➔ Running single test case: ${filteredCase.name}`);
		} else {
			throw new Error(
				`Test case '${testCaseFilter}' not found. Available: ${testCases.map((tc) => tc.id).join(', ')}`,
			);
		}
	} else {
		// Optionally generate additional test cases
		if (!(providedTestCases && providedTestCases.length > 0) && shouldGenerateTestCases()) {
			log.info('➔ Generating additional test cases...');
			const generatedCases = await generateTestCases(llm, howManyTestCasesToGenerate());
			testCases = [...testCases, ...generatedCases];
		}
	}

	return testCases;
}

/**
 * Main CLI evaluation runner that executes all test cases in parallel
 * Supports concurrency control via EVALUATION_CONCURRENCY environment variable
 */
export async function runCliEvaluation(options: CliEvaluationOptions = {}): Promise<void> {
	const { repetitions = 1, featureFlags, verbose = false } = options;
	const log = createLogger(verbose);

	console.log(formatHeader('AI Workflow Builder Full Evaluation', 70));
	if (repetitions > 1) {
		log.warn(`➔ Each test will be run ${repetitions} times for cache analysis`);
	}
	if (featureFlags) {
		const enabledFlags = Object.entries(featureFlags)
			.filter(([, v]) => v === true)
			.map(([k]) => k);
		if (enabledFlags.length > 0) {
			log.success(`➔ Feature flags enabled: ${enabledFlags.join(', ')}`);
		}
	}
	console.log();
	try {
		// Setup test environment
		const { parsedNodeTypes, llm, tracer } = await setupTestEnvironment(log);

		// Determine test cases to run
		const testCases = await resolveTestCases(options, llm, log);

		// Get concurrency from environment
		const concurrency = getConcurrencyLimit();
		log.dim(`Running ${testCases.length} test cases with concurrency=${concurrency}`);
		console.log();

		const startTime = Date.now();
		const allRepetitionResults: TestResult[][] = [];

		// Run tests for each repetition
		for (let rep = 0; rep < repetitions; rep++) {
			if (repetitions > 1) {
				console.log(pc.cyan(`\n═══ Repetition ${rep + 1}/${repetitions} ═══\n`));
			}

			// Create progress bar for this repetition (only if not verbose)
			const progressBar = verbose ? null : createProgressBar(testCases.length);

			// Create concurrency limiter
			const limit = pLimit(concurrency);

			// Track progress
			let completed = 0;
			const testResults = initializeTestTracking(testCases);

			// Run all test cases in parallel with concurrency limit
			const promises = testCases.map(
				async (testCase) =>
					await limit(async () => {
						if (progressBar) {
							updateProgress(progressBar, completed, testCases.length, `Running: ${testCase.name}`);
						}

						// Create a dedicated agent for this test to avoid state conflicts
						const testAgent = createAgent({ parsedNodeTypes, llm, tracer });
						const result = await runSingleTest(testAgent, llm, testCase, parsedNodeTypes, {
							featureFlags,
						});

						testResults[testCase.id] = result.error ? 'fail' : 'pass';
						completed++;

						if (progressBar) {
							updateProgress(progressBar, completed, testCases.length);
						} else {
							// Verbose mode: log result immediately
							logTestResultVerbose(log, result, completed, testCases.length);
						}

						return result;
					}),
			);

			const results = await Promise.all(promises);
			progressBar?.stop();
			allRepetitionResults.push(results);

			// Show brief stats for this repetition if running multiple times
			if (repetitions > 1) {
				const repStats = results.map((r) => r.cacheStats).filter((s) => s !== undefined);
				if (repStats.length > 0) {
					const avgHitRate = repStats.reduce((sum, s) => sum + s.cacheHitRate, 0) / repStats.length;
					console.log(
						pc.dim(`\n  Repetition ${rep + 1} cache hit rate: ${(avgHitRate * 100).toFixed(1)}%`),
					);
				}
			}
		}

		const totalTime = Date.now() - startTime;

		// Use last repetition results for display (most representative)
		const results = allRepetitionResults[allRepetitionResults.length - 1];

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
