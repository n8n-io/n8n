#!/usr/bin/env node
/**
 * Cache Quality Testing Script
 *
 * This script runs specialized tests to measure prompt caching effectiveness:
 * 1. Sequential test runs to measure cache hit rates
 * 2. Multi-turn conversations to test cache reuse
 * 3. Cost analysis and cache effectiveness metrics
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { MemorySaver } from '@langchain/langgraph';
import Table from 'cli-table3';
import { promises as fs } from 'fs';
import path from 'path';
import pc from 'picocolors';

import { basicTestCases } from './chains/test-case-generator.js';
import { setupTestEnvironment } from './core/environment.js';
import { runSingleTest } from './core/test-runner.js';
import type { TestCase } from './types/evaluation.js';
import type { TestResult, CacheStatistics } from './types/test-result.js';
import {
	aggregateCacheStats,
	formatCacheStats,
	calculateCacheEffectiveness,
} from './utils/cache-analyzer.js';
import { CacheLogger } from './utils/cache-logger.js';
import { createAgent } from './utils/evaluation-helpers.js';

interface CacheTestConfig {
	iterations: number;
	testCases: TestCase[];
	outputDir: string;
}

/**
 * Run cache quality tests with multiple iterations
 */
async function runCacheQualityTest(config: CacheTestConfig): Promise<void> {
	console.log(pc.cyan('\n╔════════════════════════════════════════════════════════╗'));
	console.log(pc.cyan('║      Prompt Caching Quality Test                      ║'));
	console.log(pc.cyan('╚════════════════════════════════════════════════════════╝\n'));

	const { llm, parsedNodeTypes, tracer } = await setupTestEnvironment();
	const allResults: TestResult[][] = [];
	const iterationStats: CacheStatistics[] = [];
	console.log(
		pc.dim(
			`Running ${config.iterations} iterations with ${config.testCases.length} test cases...\n`,
		),
	);

	// Run multiple iterations
	for (let iteration = 0; iteration < config.iterations; iteration++) {
		console.log(pc.cyan(`\n═══ Iteration ${iteration + 1}/${config.iterations} ═══\n`));
		const checkpointer = new MemorySaver();
		const iterationResults: TestResult[] = [];

		for (const testCase of config.testCases) {
			console.log(pc.dim(`  Running: ${testCase.name}...`));

			const cacheLogger = new CacheLogger(iteration + 1, testCase.id, config.outputDir);
			cacheLogger.logTestHeader(testCase.name, iteration + 1);

			const agent = createAgent(parsedNodeTypes, llm, tracer, checkpointer);

			const result = await runSingleTest(
				agent,
				llm,
				testCase,
				parsedNodeTypes,
				`test-user-iter-${iteration}`,
				cacheLogger,
			);

			if (result.error) {
				console.log(pc.red(`    ✗ Failed: ${result.error}`));
			} else {
				const score = (result.evaluationResult.overallScore * 100).toFixed(1);
				const cacheInfo = result.cacheStats
					? ` [Cache: ${(result.cacheStats.cacheHitRate * 100).toFixed(1)}%]`
					: '';
				console.log(pc.green(`    ✓ Score: ${score}%${cacheInfo}`));

				// Log test footer with summary
				if (result.cacheStats) {
					cacheLogger.logTestFooter(
						1, // We don't track exact message count here
						result.cacheStats.cacheReadTokens,
						result.cacheStats.cacheCreationTokens,
						result.cacheStats.cacheHitRate,
					);
				}
			}

			// Write cache log to file
			await cacheLogger.flush();

			iterationResults.push(result);
		}

		allResults.push(iterationResults);

		// Calculate stats for this iteration
		const validResults = iterationResults.filter((r) => r.cacheStats);
		if (validResults.length > 0) {
			const stats = validResults.map((r) => r.cacheStats!);
			const iterationAggregate = aggregateCacheStats(stats);
			iterationStats.push(iterationAggregate);

			console.log(
				pc.dim(
					`\n  Iteration Cache Hit Rate: ${pc.bold((iterationAggregate.cacheHitRate * 100).toFixed(2))}%`,
				),
			);
		}
	}

	// Analyze and display results
	await analyzeCacheQuality(allResults, iterationStats, config, llm);
}

/**
 * Analyze cache quality across iterations
 */
async function analyzeCacheQuality(
	allResults: TestResult[][],
	iterationStats: CacheStatistics[],
	config: CacheTestConfig,
	llm: BaseChatModel,
): Promise<void> {
	console.log(pc.cyan('\n\n╔════════════════════════════════════════════════════════╗'));
	console.log(pc.cyan('║      Cache Quality Analysis                            ║'));
	console.log(pc.cyan('╚════════════════════════════════════════════════════════╝\n'));

	// Overall statistics
	const overallStats = aggregateCacheStats(iterationStats);
	const formatted = formatCacheStats(overallStats);

	const statsTable = new Table({
		head: ['Metric', 'Value'],
		style: { head: ['cyan'] },
	});

	const hitRateColor =
		overallStats.cacheHitRate > 0.6
			? pc.green
			: overallStats.cacheHitRate > 0.3
				? pc.yellow
				: pc.red;

	statsTable.push(
		['Total Iterations', config.iterations.toString()],
		['Test Cases per Iteration', config.testCases.length.toString()],
		[pc.dim('─'.repeat(25)), pc.dim('─'.repeat(25))],
		['Total Input Tokens', formatted.inputTokens],
		['Total Output Tokens', formatted.outputTokens],
		['Cache Creation Tokens', formatted.cacheCreationTokens],
		['Cache Read Tokens', formatted.cacheReadTokens],
		[pc.dim('─'.repeat(25)), pc.dim('─'.repeat(25))],
		['Overall Cache Hit Rate', hitRateColor(formatted.cacheHitRate)],
		['Total Cost Savings', pc.green(formatted.costSavings)],
		[
			'Cache Effectiveness',
			hitRateColor((calculateCacheEffectiveness(overallStats) * 100).toFixed(1) + '%'),
		],
	);

	console.log(statsTable.toString());

	// Iteration-by-iteration analysis
	if (iterationStats.length > 1) {
		console.log(pc.cyan('\n\n═══ Cache Hit Rate Progression ═══\n'));

		const progressTable = new Table({
			head: ['Iteration', 'Hit Rate', 'Cache Reads', 'Cost Savings'],
			style: { head: ['cyan'] },
		});

		iterationStats.forEach((stats, idx) => {
			const hitRate = (stats.cacheHitRate * 100).toFixed(2) + '%';
			const hitRateColored =
				stats.cacheHitRate > 0.6
					? pc.green(hitRate)
					: stats.cacheHitRate > 0.3
						? pc.yellow(hitRate)
						: pc.red(hitRate);

			progressTable.push([
				(idx + 1).toString(),
				hitRateColored,
				stats.cacheReadTokens.toLocaleString(),
				`$${stats.estimatedCostSavings.toFixed(4)}`,
			]);
		});

		console.log(progressTable.toString());

		// Check if cache improves over iterations
		const firstHitRate = iterationStats[0].cacheHitRate;
		const lastHitRate = iterationStats[iterationStats.length - 1].cacheHitRate;
		const improvement = lastHitRate - firstHitRate;

		if (improvement > 0.1) {
			console.log(
				pc.green(
					`\n  ✓ Cache hit rate improved by ${(improvement * 100).toFixed(1)}% from first to last iteration`,
				),
			);
		} else if (improvement < -0.1) {
			console.log(
				pc.red(
					`\n  ✗ Cache hit rate decreased by ${Math.abs(improvement * 100).toFixed(1)}% - potential issue`,
				),
			);
		}
	}

	// Per-test-case analysis
	console.log(pc.cyan('\n\n═══ Per Test Case Analysis ═══\n'));

	const testTable = new Table({
		head: ['Test Case', 'Avg Hit Rate', 'Avg Score', 'Total Savings'],
		style: { head: ['cyan'] },
	});

	for (const testCase of config.testCases) {
		const testResults = allResults.flatMap((iter) =>
			iter.filter((r) => r.testCase.id === testCase.id && r.cacheStats),
		);

		if (testResults.length > 0) {
			const avgHitRate =
				testResults.reduce((sum, r) => sum + (r.cacheStats?.cacheHitRate ?? 0), 0) /
				testResults.length;
			const avgScore =
				testResults.reduce((sum, r) => sum + r.evaluationResult.overallScore, 0) /
				testResults.length;
			const totalSavings = testResults.reduce(
				(sum, r) => sum + (r.cacheStats?.estimatedCostSavings ?? 0),
				0,
			);

			const hitRateStr = (avgHitRate * 100).toFixed(1) + '%';
			const hitRateColored =
				avgHitRate > 0.6
					? pc.green(hitRateStr)
					: avgHitRate > 0.3
						? pc.yellow(hitRateStr)
						: pc.red(hitRateStr);

			testTable.push([
				testCase.name,
				hitRateColored,
				(avgScore * 100).toFixed(1) + '%',
				`$${totalSavings.toFixed(4)}`,
			]);
		}
	}

	console.log(testTable.toString());

	// Recommendations
	console.log(pc.cyan('\n\n═══ Recommendations ═══\n'));

	if (overallStats.cacheHitRate > 0.6) {
		console.log(
			pc.green('  ✓ Excellent caching performance! The current cache configuration is effective.'),
		);
	} else if (overallStats.cacheHitRate > 0.3) {
		console.log(pc.yellow('  ⚠ Moderate caching performance. Consider:'));
		console.log(pc.yellow('    - Review cache_control markers in prompts'));
		console.log(pc.yellow('    - Ensure static content is marked for caching'));
		console.log(pc.yellow('    - Check that dynamic content is excluded from cache'));
	} else {
		console.log(pc.red('  ✗ Low caching performance. Action needed:'));
		console.log(pc.red('    - Verify cache_control markers are set correctly'));
		console.log(pc.red('    - Check that anthropic-beta header is present'));
		console.log(pc.red('    - Review prompt structure for cacheable content'));
	}

	// Save detailed report
	await saveDetailedReport(allResults, iterationStats, config, overallStats, llm);
}

/**
 * Save detailed JSON report
 */
async function saveDetailedReport(
	allResults: TestResult[][],
	iterationStats: CacheStatistics[],
	config: CacheTestConfig,
	overallStats: CacheStatistics,
	llm: BaseChatModel,
): Promise<void> {
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const reportPath = path.join(
		config.outputDir,
		`cache-quality-report-${timestamp.split('T')[0]}.json`,
	);

	const report = {
		metadata: {
			timestamp: new Date().toISOString(),
			iterations: config.iterations,
			testCases: config.testCases.length,
			model: llm._llmType?.() ?? 'unknown',
		},
		summary: {
			overallCacheHitRate: overallStats.cacheHitRate,
			totalCostSavings: overallStats.estimatedCostSavings,
			cacheEffectiveness: calculateCacheEffectiveness(overallStats),
		},
		iterationStats,
		detailedResults: allResults,
	};

	await fs.mkdir(config.outputDir, { recursive: true });
	await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

	console.log(pc.dim(`\n\n  Report saved to: ${reportPath}`));
}

/**
 * Main execution
 */
async function main(): Promise<void> {
	// Choose test cases based on environment variable
	const useBasicTestCases = process.env.CACHE_TEST_USE_BASIC_CASES === 'true';

	const testCases: TestCase[] = useBasicTestCases
		? basicTestCases
		: [
				{
					id: 'simple-http-request',
					name: 'Simple HTTP Request',
					prompt: 'Create a workflow that fetches data from https://api.example.com/users',
				},
				{
					id: 'data-transformation',
					name: 'Data Transformation',
					prompt:
						'Create a workflow that fetches JSON data, filters items where status is "active", and transforms the results',
				},
				{
					id: 'conditional-workflow',
					name: 'Conditional Workflow',
					prompt:
						'Create a workflow with an IF node that checks if data exists, and sends different HTTP requests based on the condition',
				},
			];

	const iterations = parseInt(process.env.CACHE_TEST_ITERATIONS ?? '3', 10);
	const outputDir = path.join(process.cwd(), 'evaluations', 'results', 'cache-tests');

	console.log(
		pc.dim(
			`\nUsing ${useBasicTestCases ? '10 comprehensive test cases' : '3 simple test cases'}\n`,
		),
	);

	const config: CacheTestConfig = {
		iterations,
		testCases,
		outputDir,
	};

	await runCacheQualityTest(config);
}

// Run if executed directly
const isMainModule = require.main === module || process.argv[1]?.includes('test-cache-quality');
if (isMainModule) {
	main().catch((error) => {
		console.error(pc.red('\nCache quality test failed:'), error);
		process.exit(1);
	});
}

export { runCacheQualityTest, analyzeCacheQuality };
