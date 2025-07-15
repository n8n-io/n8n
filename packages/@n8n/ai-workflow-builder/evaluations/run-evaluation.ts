import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import * as cliProgress from 'cli-progress';
import Table from 'cli-table3';
import { writeFileSync, mkdirSync } from 'fs';
import type { INodeTypeDescription } from 'n8n-workflow';
import pLimit from 'p-limit';
import { join } from 'path';
import pc from 'picocolors';

import type { WorkflowState } from '@/workflow-state.js';

import { loadNodesFromFile } from './load-nodes.js';
import type { ChatPayload } from '../src/workflow-builder-agent.js';
import { basicTestCases, generateTestCases } from './chains/test-case-generator.js';
import { evaluateWorkflow } from './chains/workflow-evaluator.js';
import type { EvaluationInput, TestCase, EvaluationResult, Violation } from './types/evaluation.js';
import {
	setupLLM,
	createTracer,
	createAgent,
	formatPercentage,
	formatColoredScore,
	formatHeader,
	formatStatusBadge,
	formatTestName,
	formatViolationType,
} from './utils/evaluation-helpers.js';
import type { SimpleWorkflow } from '../src/types/workflow';

interface TestResult {
	testCase: TestCase;
	generatedWorkflow: SimpleWorkflow;
	evaluationResult: EvaluationResult;
	generationTime: number;
	error?: string;
}

interface TestEnvironment {
	parsedNodeTypes: INodeTypeDescription[];
	llm: BaseChatModel;
	tracer?: LangChainTracer;
}

/**
 * Sets up the test environment with LLM, nodes, and tracing
 * @returns Test environment configuration
 */
async function setupTestEnvironment(): Promise<TestEnvironment> {
	const parsedNodeTypes = loadNodesFromFile();
	const llm = await setupLLM();
	const tracer = createTracer('workflow-builder-evaluation');

	return { parsedNodeTypes, llm, tracer };
}

/**
 * Runs a single test case by generating a workflow and evaluating it
 * @param agent - The workflow builder agent to use
 * @param llm - Language model for evaluation
 * @param testCase - Test case to execute
 * @param index - Current test index (0-based)
 * @param totalTests - Total number of tests being run
 * @param userId - User ID for the session
 * @returns Test result with generated workflow and evaluation
 */
async function runTestCase(
	agent: ReturnType<typeof createAgent>,
	llm: BaseChatModel,
	testCase: TestCase,
	_index: number,
	_totalTests: number,
	userId: string = 'test-user',
): Promise<TestResult> {
	// Skip detailed logging in parallel mode - it will be shown in the progress bar
	try {
		const chatPayload: ChatPayload = {
			question: testCase.prompt,
			workflowId: testCase.id,
			executionData: {
				runData: {},
			},
		};

		// Generate workflow
		const startTime = Date.now();
		let messageCount = 0;
		for await (const _output of agent.chat(chatPayload, userId)) {
			messageCount++;
		}
		const generationTime = Date.now() - startTime;

		// Get generated workflow
		const state = await agent.getState(testCase.id, userId);
		const generatedWorkflow = (state.values as typeof WorkflowState.State).workflowJSON;

		// Evaluate
		const evaluationInput: EvaluationInput = {
			userPrompt: testCase.prompt,
			generatedWorkflow,
			referenceWorkflow: testCase.referenceWorkflow,
		};

		const evaluationResult = await evaluateWorkflow(llm, evaluationInput);

		return {
			testCase,
			generatedWorkflow,
			evaluationResult,
			generationTime,
		};
	} catch (error) {
		return {
			testCase,
			generatedWorkflow: { nodes: [], connections: {} },
			evaluationResult: {
				overallScore: 0,
				functionality: { score: 0, violations: [] },
				connections: { score: 0, violations: [] },
				expressions: { score: 0, violations: [] },
				nodeConfiguration: { score: 0, violations: [] },
				structuralSimilarity: { score: 0, violations: [], applicable: false },
				summary: 'Evaluation failed due to error',
				criticalIssues: [`Error: ${String(error)}`],
			} as EvaluationResult,
			generationTime: 0,
			error: String(error),
		};
	}
}

/**
 * Calculates average scores for each evaluation category
 * @param results - Array of test results
 * @returns Object with average scores per category
 */
function calculateCategoryAverages(
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
function countViolationsByType(results: TestResult[]): {
	critical: number;
	major: number;
	minor: number;
} {
	let criticalCount = 0;
	let majorCount = 0;
	let minorCount = 0;

	results.forEach((r) => {
		const allViolations = [
			...r.evaluationResult.functionality.violations,
			...r.evaluationResult.connections.violations,
			...r.evaluationResult.expressions.violations,
			...r.evaluationResult.nodeConfiguration.violations,
		];
		criticalCount += allViolations.filter((v) => v.type === 'critical').length;
		majorCount += allViolations.filter((v) => v.type === 'major').length;
		minorCount += allViolations.filter((v) => v.type === 'minor').length;
	});

	return { critical: criticalCount, major: majorCount, minor: minorCount };
}

/**
 * Generates a markdown report from evaluation results
 * @param results - Array of test results
 * @returns Formatted markdown report string
 */
function generateReport(results: TestResult[]): string {
	const totalTests = results.length;
	const successfulTests = results.filter((r) => !r.error).length;
	const averageScore =
		results.filter((r) => !r.error).reduce((sum, r) => sum + r.evaluationResult.overallScore, 0) /
			successfulTests || 0;

	const categoryAverages = calculateCategoryAverages(results);
	const violationCounts = countViolationsByType(results);

	let report = `# AI Workflow Builder Evaluation Report

## Summary
- Total Tests: ${totalTests}
- Successful: ${successfulTests}
- Failed: ${totalTests - successfulTests}
- Average Score: ${formatPercentage(averageScore)}

## Category Averages
- Functionality: ${formatPercentage(categoryAverages.functionality)}
- Connections: ${formatPercentage(categoryAverages.connections)}
- Expressions: ${formatPercentage(categoryAverages.expressions)}
- Node Configuration: ${formatPercentage(categoryAverages.nodeConfiguration)}

## Violations Summary
- Critical: ${violationCounts.critical}
- Major: ${violationCounts.major}
- Minor: ${violationCounts.minor}

## Detailed Results

`;

	results.forEach((result) => {
		report += `### ${result.testCase.name} (${result.testCase.id})
- **Score**: ${formatPercentage(result.evaluationResult.overallScore)}
- **Generation Time**: ${result.generationTime}ms
- **Nodes Generated**: ${result.generatedWorkflow.nodes.length}
- **Summary**: ${result.evaluationResult.summary}

`;

		if (result.evaluationResult.criticalIssues.length > 0) {
			report += '**Critical Issues**:\n';
			result.evaluationResult.criticalIssues.forEach((issue) => {
				report += `- ${issue}\n`;
			});
			report += '\n';
		}

		const allViolations = [
			...result.evaluationResult.functionality.violations.map((v) => ({
				...v,
				category: 'Functionality',
			})),
			...result.evaluationResult.connections.violations.map((v) => ({
				...v,
				category: 'Connections',
			})),
			...result.evaluationResult.expressions.violations.map((v) => ({
				...v,
				category: 'Expressions',
			})),
			...result.evaluationResult.nodeConfiguration.violations.map((v) => ({
				...v,
				category: 'Node Configuration',
			})),
		];

		if (allViolations.length > 0) {
			report += '**Violations**:\n';
			allViolations.forEach((v) => {
				report += `- [${v.type.toUpperCase()}] ${v.category}: ${v.description}\n`;
			});
			report += '\n';
		}
	});

	return report;
}

/**
 * Saves evaluation results to disk
 * @param results - Array of test results
 * @param report - Generated markdown report
 * @returns Paths to saved files
 */
function saveResults(
	results: TestResult[],
	report: string,
): { reportPath: string; resultsPath: string } {
	const resultsDir = join(__dirname, 'results');
	mkdirSync(resultsDir, { recursive: true });

	const timestamp = new Date().toISOString().replace(/:/g, '-');
	const reportPath = join(resultsDir, `evaluation-report-${timestamp}.md`);
	const resultsPath = join(resultsDir, `evaluation-results-${timestamp}.json`);

	writeFileSync(reportPath, report);
	writeFileSync(resultsPath, JSON.stringify(results, null, 2));

	return { reportPath, resultsPath };
}

/**
 * Main evaluation runner that executes all test cases in parallel
 * Supports concurrency control via EVALUATION_CONCURRENCY environment variable
 */
async function runFullEvaluation(): Promise<void> {
	console.log(formatHeader('AI Workflow Builder Full Evaluation', 70));
	console.log();

	try {
		// Setup test environment
		const { parsedNodeTypes, llm, tracer } = await setupTestEnvironment();

		// Determine test cases to run
		let testCases: TestCase[] = basicTestCases;

		// Optionally generate additional test cases
		if (process.env.GENERATE_TEST_CASES === 'true') {
			console.log(pc.blue('➔ Generating additional test cases...'));
			const generatedCases = await generateTestCases(llm, 2);
			testCases = [...testCases, ...generatedCases];
		}

		// Get concurrency from environment
		const concurrency = parseInt(process.env.EVALUATION_CONCURRENCY ?? '3', 10);
		console.log(pc.dim(`Running ${testCases.length} test cases with concurrency=${concurrency}`));
		console.log();

		// Create progress bar
		const progressBar = new cliProgress.SingleBar(
			{
				format: '{bar} {percentage}% | ETA: {eta}s | {value}/{total} | {testName}',
				barCompleteChar: '█',
				barIncompleteChar: '░',
				hideCursor: true,
			},
			cliProgress.Presets.shades_classic,
		);

		// Create concurrency limiter
		const limit = pLimit(concurrency);

		// Track progress
		let completed = 0;
		const startTime = Date.now();
		const testResults: { [key: string]: 'pending' | 'pass' | 'fail' } = {};

		// Initialize all tests as pending
		testCases.forEach((tc) => {
			testResults[tc.id] = 'pending';
		});

		progressBar.start(testCases.length, 0, {
			testName: 'Starting...',
		});

		// Run all test cases in parallel with concurrency limit
		const promises = testCases.map(
			async (testCase, index) =>
				await limit(async () => {
					progressBar.update(completed, {
						testName: `Running: ${testCase.name}`,
					});

					// Create a dedicated agent for this test to avoid state conflicts
					const testAgent = createAgent(parsedNodeTypes, llm, tracer);
					const result = await runTestCase(testAgent, llm, testCase, index, testCases.length);

					testResults[testCase.id] = result.error ? 'fail' : 'pass';
					completed++;
					progressBar.update(completed, {
						testName: completed === testCases.length ? 'Complete!' : 'Waiting...',
					});
					return result;
				}),
		);

		const results = await Promise.all(promises);
		const totalTime = Date.now() - startTime;
		progressBar.stop();

		console.log();
		console.log(formatHeader('Test Results', 70));
		console.log();

		// Display test results summary
		for (const testCase of testCases) {
			const result = results.find((r) => r.testCase.id === testCase.id);
			if (result) {
				const status = result.error ? 'fail' : 'pass';
				const badge = formatStatusBadge(status);
				const score = result.error
					? 'N/A'
					: formatColoredScore(result.evaluationResult.overallScore);
				console.log(`  ${badge} ${formatTestName(testCase.name, testCase.id)}`);
				console.log(
					`     Score: ${score} | Nodes: ${result.generatedWorkflow.nodes.length} | Time: ${result.generationTime}ms`,
				);
				if (result.error) {
					console.log(`     ${pc.red('Error:')} ${pc.dim(result.error)}`);
				}
			}
		}

		console.log();
		console.log(pc.green(`✓ All tests completed in ${(totalTime / 1000).toFixed(1)}s`));

		// Generate and save results
		const report = generateReport(results);
		const { reportPath, resultsPath } = saveResults(results, report);

		console.log(`\nReport saved to: ${reportPath}`);
		console.log(`Detailed results saved to: ${resultsPath}`);

		// Print summary table
		const summaryTable = new Table({
			head: ['Metric', 'Value'],
			style: { head: ['cyan'] },
		});

		const successfulTests = results.filter((r) => !r.error).length;
		const failedTests = results.length - successfulTests;
		const averageScore =
			results.filter((r) => !r.error).reduce((sum, r) => sum + r.evaluationResult.overallScore, 0) /
				successfulTests || 0;

		const categoryAverages = calculateCategoryAverages(results);
		const violationCounts = countViolationsByType(results);

		summaryTable.push(
			['Total Tests', results.length.toString()],
			['Successful', pc.green(successfulTests.toString())],
			['Failed', failedTests > 0 ? pc.red(failedTests.toString()) : '0'],
			['Average Score', formatColoredScore(averageScore)],
			[pc.dim('─'.repeat(20)), pc.dim('─'.repeat(20))],
			['Functionality', formatColoredScore(categoryAverages.functionality)],
			['Connections', formatColoredScore(categoryAverages.connections)],
			['Expressions', formatColoredScore(categoryAverages.expressions)],
			['Node Config', formatColoredScore(categoryAverages.nodeConfiguration)],
			[pc.dim('─'.repeat(20)), pc.dim('─'.repeat(20))],
			[
				'Critical Issues',
				violationCounts.critical > 0 ? pc.red(violationCounts.critical.toString()) : '0',
			],
			[
				'Major Issues',
				violationCounts.major > 0 ? pc.yellow(violationCounts.major.toString()) : '0',
			],
			['Minor Issues', pc.dim(violationCounts.minor.toString())],
		);

		console.log();
		console.log(formatHeader('Summary', 70));
		console.log(summaryTable.toString());

		// Display all violations if any exist
		if (violationCounts.critical > 0 || violationCounts.major > 0 || violationCounts.minor > 0) {
			console.log();
			console.log(formatHeader('Violations Detail', 70));

			// Collect all violations with test context
			const allViolations: Array<{
				violation: Violation & { category: string };
				testName: string;
			}> = [];

			results.forEach((result) => {
				if (!result.error) {
					const testViolations = [
						...result.evaluationResult.functionality.violations.map((v) => ({
							violation: { ...v, category: 'Functionality' },
							testName: result.testCase.name,
						})),
						...result.evaluationResult.connections.violations.map((v) => ({
							violation: { ...v, category: 'Connections' },
							testName: result.testCase.name,
						})),
						...result.evaluationResult.expressions.violations.map((v) => ({
							violation: { ...v, category: 'Expressions' },
							testName: result.testCase.name,
						})),
						...result.evaluationResult.nodeConfiguration.violations.map((v) => ({
							violation: { ...v, category: 'Node Config' },
							testName: result.testCase.name,
						})),
					];
					allViolations.push(...testViolations);
				}
			});

			// Group violations by severity
			const criticalViolations = allViolations.filter((v) => v.violation.type === 'critical');
			const majorViolations = allViolations.filter((v) => v.violation.type === 'major');
			const minorViolations = allViolations.filter((v) => v.violation.type === 'minor');

			// Display critical violations
			if (criticalViolations.length > 0) {
				console.log();
				console.log(pc.red('Critical Violations:'));
				criticalViolations.forEach(({ violation, testName }) => {
					console.log(
						`  ${formatViolationType('critical')} [${violation.category}] ${violation.description}`,
					);
					console.log(`     ${pc.dim(`Test: ${testName} | Points: -${violation.pointsDeducted}`)}`);
				});
			}

			// Display major violations
			if (majorViolations.length > 0) {
				console.log();
				console.log(pc.yellow('Major Violations:'));
				majorViolations.forEach(({ violation, testName }) => {
					console.log(
						`  ${formatViolationType('major')} [${violation.category}] ${violation.description}`,
					);
					console.log(`     ${pc.dim(`Test: ${testName} | Points: -${violation.pointsDeducted}`)}`);
				});
			}

			// Display minor violations
			if (minorViolations.length > 0) {
				console.log();
				console.log(pc.gray('Minor Violations:'));
				minorViolations.forEach(({ violation, testName }) => {
					console.log(
						`  ${formatViolationType('minor')} [${violation.category}] ${violation.description}`,
					);
					console.log(`     ${pc.dim(`Test: ${testName} | Points: -${violation.pointsDeducted}`)}`);
				});
			}
		}
	} catch (error) {
		console.error(pc.red('✗ Evaluation failed:'), error);
		process.exit(1);
	}
}

// Run if called directly
if (require.main === module) {
	runFullEvaluation().catch(console.error);
}

export { runFullEvaluation, runTestCase };
