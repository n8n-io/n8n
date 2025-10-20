import pLimit from 'p-limit';
import pc from 'picocolors';

import { promptCategorizationChain } from '../src/chains/prompt-categorization';
import { TechniqueDescription, type WorkflowTechniqueType } from '../src/types/categorization';
import { basicTestCases } from './chains/test-case-generator';
import { createProgressBar, updateProgress } from './cli/display';
import { setupTestEnvironment, getConcurrencyLimit } from './core/environment';
import type {
	CategorizationTestCase,
	CategorizationTestResult,
	CategorizationEvaluationOutput,
	TechniqueFrequency,
} from './types/categorization-evaluation';
import { formatHeader } from './utils/evaluation-helpers';

/**
 * Calculate technique frequency statistics from results
 */
function calculateTechniqueFrequencies(results: CategorizationTestResult[]): TechniqueFrequency[] {
	const techniqueCount = new Map<WorkflowTechniqueType, number>();

	// Count occurrences of each technique
	for (const result of results) {
		if (!result.error) {
			for (const technique of result.categorization.techniques) {
				techniqueCount.set(technique, (techniqueCount.get(technique) || 0) + 1);
			}
		}
	}

	// Calculate percentages and create frequency objects
	const totalPrompts = results.filter((r) => !r.error).length;
	const frequencies: TechniqueFrequency[] = [];

	for (const [technique, count] of techniqueCount.entries()) {
		frequencies.push({
			technique,
			description: TechniqueDescription[technique],
			count,
			percentage: (count / totalPrompts) * 100,
		});
	}

	// Sort by frequency (descending)
	frequencies.sort((a, b) => b.count - a.count);

	return frequencies;
}

/**
 * Calculate summary statistics
 */
function calculateSummary(results: CategorizationTestResult[]): CategorizationEvaluationOutput {
	const successful = results.filter((r) => !r.error);
	const failed = results.filter((r) => r.error);

	const averageConfidence =
		successful.reduce((sum, r) => sum + (r.categorization.confidence || 0), 0) / successful.length;

	const averageExecutionTime =
		results.reduce((sum, r) => sum + r.executionTime, 0) / results.length;

	const techniqueFrequencies = calculateTechniqueFrequencies(results);

	return {
		timestamp: new Date().toISOString(),
		summary: {
			totalPrompts: results.length,
			successfulCategorizations: successful.length,
			failedCategorizations: failed.length,
			averageConfidence,
			averageExecutionTime,
			techniqueFrequencies,
		},
		results,
	};
}

/**
 * Run categorization on a single prompt
 */
async function runSingleCategorization(
	testCase: CategorizationTestCase,
	llm: any,
): Promise<CategorizationTestResult> {
	try {
		const startTime = Date.now();
		const categorization = await promptCategorizationChain(llm, testCase.prompt);
		const executionTime = Date.now() - startTime;

		// Get descriptions for the identified techniques
		const techniqueDescriptions: Record<WorkflowTechniqueType, string> = {} as Record<
			WorkflowTechniqueType,
			string
		>;
		for (const technique of categorization.techniques) {
			techniqueDescriptions[technique] = TechniqueDescription[technique];
		}

		return {
			testCase,
			categorization,
			techniqueDescriptions,
			executionTime,
		};
	} catch (error) {
		return {
			testCase,
			categorization: { techniques: [], confidence: 0 },
			techniqueDescriptions: {} as Record<WorkflowTechniqueType, string>,
			executionTime: 0,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Format results as markdown
 */
function formatMarkdownReport(output: CategorizationEvaluationOutput): string {
	const lines: string[] = [];

	// Header
	lines.push('# Prompt Categorization Evaluation Report\n');
	lines.push(`**Date:** ${new Date(output.timestamp).toLocaleString()}\n`);

	// Summary statistics
	lines.push('## Summary\n');
	lines.push(`- **Total Prompts:** ${output.summary.totalPrompts}`);
	lines.push(`- **Successful:** ${output.summary.successfulCategorizations}`);
	lines.push(`- **Failed:** ${output.summary.failedCategorizations}`);
	lines.push(`- **Average Confidence:** ${(output.summary.averageConfidence * 100).toFixed(1)}%`);
	lines.push(`- **Average Execution Time:** ${output.summary.averageExecutionTime.toFixed(0)}ms\n`);

	// Technique frequency table
	lines.push('## Technique Frequency\n');
	lines.push('| Rank | Technique | Count | Percentage | Description |');
	lines.push('|------|-----------|-------|------------|-------------|');

	output.summary.techniqueFrequencies.forEach((freq, index) => {
		lines.push(
			`| ${index + 1} | \`${freq.technique}\` | ${freq.count} | ${freq.percentage.toFixed(1)}% | ${freq.description} |`,
		);
	});

	// Individual results
	lines.push('\n## Individual Results\n');

	for (const result of output.results) {
		const truncatedPrompt =
			result.testCase.prompt.length > 100
				? result.testCase.prompt.substring(0, 100) + '...'
				: result.testCase.prompt;

		lines.push(`### ${result.testCase.id}\n`);
		lines.push(`**Prompt:** ${truncatedPrompt}\n`);

		if (result.error) {
			lines.push(`**Error:** ${result.error}\n`);
		} else {
			lines.push(`**Confidence:** ${((result.categorization.confidence || 0) * 100).toFixed(1)}%`);
			lines.push(`**Execution Time:** ${result.executionTime}ms\n`);

			lines.push('**Techniques:**\n');
			for (const technique of result.categorization.techniques) {
				const description = result.techniqueDescriptions[technique];
				lines.push(`- \`${technique}\`: ${description}`);
			}
			lines.push('');
		}
	}

	return lines.join('\n');
}

/**
 * Save results to disk
 */
function saveResults(output: CategorizationEvaluationOutput): {
	jsonPath: string;
	markdownPath: string;
} {
	const fs = require('fs');
	const path = require('path');

	const resultsDir = path.join(process.cwd(), 'evaluations', 'results');
	fs.mkdirSync(resultsDir, { recursive: true });

	const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
	const jsonPath = path.join(resultsDir, `categorization-${timestamp}.json`);
	const markdownPath = path.join(resultsDir, `categorization-${timestamp}.md`);

	// Save JSON
	fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2));

	// Save Markdown
	const markdown = formatMarkdownReport(output);
	fs.writeFileSync(markdownPath, markdown);

	return { jsonPath, markdownPath };
}

/**
 * Convert basic test cases to categorization test cases
 */
function convertTestCases(): CategorizationTestCase[] {
	return basicTestCases.map((tc) => ({
		id: tc.id,
		prompt: tc.prompt,
	}));
}

/**
 * Convert string prompts to categorization test cases
 */
function convertStringPrompts(prompts: string[]): CategorizationTestCase[] {
	return prompts.map((prompt, index) => ({
		id: `prompt-${index + 1}`,
		prompt,
	}));
}

/**
 * Display summary in console
 */
function displaySummary(output: CategorizationEvaluationOutput): void {
	console.log('\n' + formatHeader('Evaluation Summary', 70));
	console.log(`\n${pc.bold('Total Prompts:')} ${output.summary.totalPrompts}`);
	console.log(
		`${pc.bold('Successful:')} ${pc.green(String(output.summary.successfulCategorizations))}`,
	);
	console.log(`${pc.bold('Failed:')} ${pc.red(String(output.summary.failedCategorizations))}`);
	console.log(
		`${pc.bold('Average Confidence:')} ${(output.summary.averageConfidence * 100).toFixed(1)}%`,
	);
	console.log(
		`${pc.bold('Average Execution Time:')} ${output.summary.averageExecutionTime.toFixed(0)}ms`,
	);

	console.log('\n' + formatHeader('Technique Frequencies', 70));
	console.log(
		`\n${pc.bold('Rank')}  ${pc.bold('Technique')}                      ${pc.bold('Count')}  ${pc.bold('Percentage')}`,
	);
	console.log('─'.repeat(70));

	output.summary.techniqueFrequencies.forEach((freq, index) => {
		const rank = String(index + 1).padEnd(4);
		const technique = freq.technique.padEnd(30);
		const count = String(freq.count).padStart(5);
		const percentage = `${freq.percentage.toFixed(1)}%`.padStart(10);

		console.log(`${rank}  ${technique}  ${count}  ${percentage}`);
	});

	console.log('');
}

/**
 * Main evaluation runner
 * @param customPrompts - Optional array of prompts (strings) or test cases (objects with id and prompt)
 */
export async function runCategorizationEvaluation(
	customPrompts?: string[] | CategorizationTestCase[],
): Promise<void> {
	console.log(formatHeader('Prompt Categorization Evaluation', 70));
	console.log();

	try {
		// Setup environment
		const { llm } = await setupTestEnvironment();

		// Get test cases
		let testCases: CategorizationTestCase[];
		if (!customPrompts) {
			testCases = convertTestCases();
		} else if (typeof customPrompts[0] === 'string') {
			testCases = convertStringPrompts(customPrompts as string[]);
		} else {
			testCases = customPrompts as CategorizationTestCase[];
		}
		console.log(pc.blue(`➔ Evaluating ${testCases.length} prompts`));

		// Get concurrency limit
		const concurrency = getConcurrencyLimit();
		console.log(pc.dim(`Using concurrency=${concurrency}`));
		console.log();

		// Create progress bar
		const progressBar = createProgressBar(testCases.length);

		// Create concurrency limiter
		const limit = pLimit(concurrency);

		// Track progress
		let completed = 0;
		const startTime = Date.now();

		// Run all categorizations in parallel
		const promises = testCases.map(async (testCase) =>
			limit(async () => {
				updateProgress(progressBar, completed, testCases.length, `Categorizing: ${testCase.id}`);

				const result = await runSingleCategorization(testCase, llm);

				completed++;
				updateProgress(progressBar, completed, testCases.length);
				return result;
			}),
		);

		const results = await Promise.all(promises);
		const totalTime = Date.now() - startTime;
		progressBar.stop();

		// Calculate summary and save
		const output = calculateSummary(results);
		const { jsonPath, markdownPath } = saveResults(output);

		// Display results
		displaySummary(output);

		console.log(pc.green(`\n✓ Evaluation completed in ${(totalTime / 1000).toFixed(1)}s`));
		console.log(`\nResults saved to:`);
		console.log(`  JSON: ${pc.dim(jsonPath)}`);
		console.log(`  Markdown: ${pc.dim(markdownPath)}`);
	} catch (error) {
		console.error(pc.red('\n✗ Evaluation failed:'), error);
		throw error;
	}
}

// Run if called directly
if (require.main === module) {
	runCategorizationEvaluation().catch(console.error);
}
