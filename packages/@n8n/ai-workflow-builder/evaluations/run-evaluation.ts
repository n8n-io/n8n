import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import type { INodeTypeDescription } from 'n8n-workflow';
import pLimit from 'p-limit';
import pc from 'picocolors';

import type { WorkflowState } from '@/workflow-state.js';

import { loadNodesFromFile } from './load-nodes.js';
import type { ChatPayload } from '../src/workflow-builder-agent.js';
import { basicTestCases, generateTestCases } from './chains/test-case-generator.js';
import { evaluateWorkflow } from './chains/workflow-evaluator.js';
import type { EvaluationInput, TestCase } from './types/evaluation.js';
import type { TestResult } from './types/test-result.js';
import {
	calculateCategoryAverages,
	calculateTestMetrics,
	countViolationsByType,
} from './utils/evaluation-calculator.js';
import { setupLLM, createTracer, createAgent, formatHeader } from './utils/evaluation-helpers.js';
import {
	generateMarkdownReport,
	displayTestResults,
	displaySummaryTable,
	displayViolationsDetail,
} from './utils/evaluation-reporter.js';
import {
	createProgressBar,
	updateProgress,
	saveEvaluationResults,
	initializeTestTracking,
	getConcurrencyLimit,
	shouldGenerateTestCases,
} from './utils/evaluation-runner.js';

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
			},
			generationTime: 0,
			error: String(error),
		};
	}
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
		if (shouldGenerateTestCases()) {
			console.log(pc.blue('➔ Generating additional test cases...'));
			const generatedCases = await generateTestCases(llm, 2);
			testCases = [...testCases, ...generatedCases];
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
			async (testCase, index) =>
				await limit(async () => {
					updateProgress(progressBar, completed, testCases.length, `Running: ${testCase.name}`);

					// Create a dedicated agent for this test to avoid state conflicts
					const testAgent = createAgent(parsedNodeTypes, llm, tracer);
					const result = await runTestCase(testAgent, llm, testCase, index, testCases.length);

					testResults[testCase.id] = result.error ? 'fail' : 'pass';
					completed++;
					updateProgress(progressBar, completed, testCases.length);
					return result;
				}),
		);

		const results = await Promise.all(promises);
		const totalTime = Date.now() - startTime;
		progressBar.stop();

		// Display test results
		displayTestResults(testCases, results);

		console.log();
		console.log(pc.green(`✓ All tests completed in ${(totalTime / 1000).toFixed(1)}s`));

		// Calculate metrics
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

		// Display summary
		displaySummaryTable(results, combinedMetrics);

		// Display violations if any exist
		if (violationCounts.critical > 0 || violationCounts.major > 0 || violationCounts.minor > 0) {
			displayViolationsDetail(results);
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
