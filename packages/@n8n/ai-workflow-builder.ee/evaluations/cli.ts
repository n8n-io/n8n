/**
 * V2 CLI Entry Point
 *
 * Demonstrates how to use the v2 evaluation harness.
 * Can be run directly or used as a reference for custom setups.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { INodeTypeDescription } from 'n8n-workflow';
import pLimit from 'p-limit';

import type { SimpleWorkflow } from '@/types/workflow';
import type { BuilderFeatureFlags } from '@/workflow-builder-agent';

import { EVAL_TYPES, EVAL_USERS } from './constants';
import {
	getDefaultDatasetName,
	getDefaultExperimentName,
	parseEvaluationArgs,
} from './core/argument-parser';
import { setupTestEnvironment, createAgent } from './core/environment';
import {
	runEvaluation,
	createConsoleLifecycle,
	createLLMJudgeEvaluator,
	createProgrammaticEvaluator,
	createPairwiseEvaluator,
	createSimilarityEvaluator,
	basicTestCases,
	type RunConfig,
	type TestCase,
	type Evaluator,
	type EvaluationContext,
} from './index';
import { generateRunId, isWorkflowStateValues } from './types/langsmith';
import { loadTestCasesFromCsv } from './utils/csv-prompt-loader';
import { consumeGenerator, getChatPayload } from './utils/evaluation-helpers';
import { createLogger } from './utils/logger';

/**
 * Create a workflow generator function.
 * NOTE: Don't pass a tracer - LangSmith tracing is handled via traceable() in the runner.
 */
function createWorkflowGenerator(
	parsedNodeTypes: INodeTypeDescription[],
	llm: BaseChatModel,
	featureFlags?: BuilderFeatureFlags,
): (prompt: string) => Promise<SimpleWorkflow> {
	return async (prompt: string): Promise<SimpleWorkflow> => {
		const runId = generateRunId();

		const agent = createAgent({
			parsedNodeTypes,
			llm,
			featureFlags,
		});

		await consumeGenerator(
			agent.chat(
				getChatPayload({
					evalType: EVAL_TYPES.LANGSMITH,
					message: prompt,
					workflowId: runId,
					featureFlags,
				}),
				EVAL_USERS.LANGSMITH,
			),
		);

		const state = await agent.getState(runId, EVAL_USERS.LANGSMITH);

		if (!state.values || !isWorkflowStateValues(state.values)) {
			throw new Error('Invalid workflow state: workflow or messages missing');
		}

		return state.values.workflowJSON;
	};
}

/**
 * Load test cases from various sources.
 */
function loadTestCases(args: ReturnType<typeof parseEvaluationArgs>): TestCase[] {
	// From CSV file
	if (args.promptsCsv) {
		const csvCases = loadTestCasesFromCsv(args.promptsCsv);
		const testCases = csvCases.map((tc) => ({
			prompt: tc.prompt,
			id: tc.id,
		}));
		return args.maxExamples ? testCases.slice(0, args.maxExamples) : testCases;
	}

	// Predefined test case by id
	if (args.testCase) {
		const match = basicTestCases.find((tc) => tc.id === args.testCase);
		if (!match) {
			const options = basicTestCases
				.map((tc) => tc.id)
				.filter((id): id is string => id !== undefined)
				.join(', ');
			throw new Error(`Unknown --test-case "${args.testCase}". Available: ${options}`);
		}

		const testCases: TestCase[] = [
			{
				prompt: match.prompt,
				id: match.id,
				context: { dos: args.dos, donts: args.donts },
			},
		];

		return args.maxExamples ? testCases.slice(0, args.maxExamples) : testCases;
	}

	// Single prompt from CLI
	if (args.prompt) {
		const testCases: TestCase[] = [
			{
				prompt: args.prompt,
				context: {
					dos: args.dos,
					donts: args.donts,
				},
			},
		];
		return args.maxExamples ? testCases.slice(0, args.maxExamples) : testCases;
	}

	// Default test case
	const defaults: TestCase[] = [
		{
			prompt: 'Create a workflow that sends a daily email summary',
		},
	];
	return args.maxExamples ? defaults.slice(0, args.maxExamples) : defaults;
}

/**
 * Main entry point for v2 evaluation CLI.
 */
export async function runV2Evaluation(): Promise<void> {
	const args = parseEvaluationArgs();

	if (args.backend === 'langsmith' && (args.prompt || args.promptsCsv || args.testCase)) {
		throw new Error(
			'LangSmith mode requires `--dataset` and does not support `--prompt`, `--prompts-csv`, or `--test-case`',
		);
	}

	// Setup environment
	const logger = createLogger(args.verbose);
	const lifecycle = createConsoleLifecycle({ verbose: args.verbose, logger });
	const env = await setupTestEnvironment(logger);

	// Create workflow generator (tracing handled via traceable() in runner)
	const generateWorkflow = createWorkflowGenerator(env.parsedNodeTypes, env.llm, args.featureFlags);

	// Create evaluators based on mode
	const evaluators: Array<Evaluator<EvaluationContext>> = [];

	switch (args.suite) {
		case 'llm-judge':
			evaluators.push(createLLMJudgeEvaluator(env.llm, env.parsedNodeTypes));
			evaluators.push(createProgrammaticEvaluator(env.parsedNodeTypes));
			break;
		case 'pairwise':
			evaluators.push(
				createPairwiseEvaluator(env.llm, {
					numJudges: args.numJudges,
					numGenerations: args.numGenerations,
				}),
			);
			evaluators.push(createProgrammaticEvaluator(env.parsedNodeTypes));
			break;
		case 'programmatic':
			evaluators.push(createProgrammaticEvaluator(env.parsedNodeTypes));
			break;
		case 'similarity':
			evaluators.push(createSimilarityEvaluator());
			break;
	}

	// Build context - include generateWorkflow for multi-gen pairwise
	const isMultiGen = args.suite === 'pairwise' && args.numGenerations > 1;
	const llmCallLimiter = pLimit(args.concurrency);

	const baseConfig = {
		generateWorkflow,
		evaluators,
		lifecycle,
		logger,
		outputDir: args.outputDir,
		context: isMultiGen ? { generateWorkflow, llmCallLimiter } : { llmCallLimiter },
	};

	const config: RunConfig =
		args.backend === 'langsmith'
			? {
					...baseConfig,
					mode: 'langsmith',
					dataset: args.datasetName ?? getDefaultDatasetName(args.suite),
					langsmithOptions: {
						experimentName: args.experimentName ?? getDefaultExperimentName(args.suite),
						repetitions: args.repetitions,
						concurrency: args.concurrency,
						maxExamples: args.maxExamples,
						filters: args.filters,
					},
				}
			: {
					...baseConfig,
					mode: 'local',
					dataset: loadTestCases(args),
				};

	// Run evaluation
	const summary = await runEvaluation(config);

	// Exit with appropriate code
	// In LangSmith mode, summary is a placeholder (results are in LangSmith dashboard)
	// so we exit successfully if no errors occurred
	if (config.mode === 'langsmith') {
		process.exit(0);
	}

	// In local mode, check pass rate
	const passRate = summary.totalExamples > 0 ? summary.passed / summary.totalExamples : 0;
	process.exit(passRate >= 0.7 ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
	runV2Evaluation().catch((error) => {
		const logger = createLogger(true);
		const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
		logger.error(`Evaluation failed: ${message}`);
		process.exit(1);
	});
}
