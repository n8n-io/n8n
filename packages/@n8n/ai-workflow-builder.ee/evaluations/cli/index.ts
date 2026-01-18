/**
 * V2 CLI Entry Point
 *
 * Demonstrates how to use the v2 evaluation harness.
 * Can be run directly or used as a reference for custom setups.
 */

import type { Callbacks } from '@langchain/core/callbacks/manager';
import type { INodeTypeDescription } from 'n8n-workflow';
import pLimit from 'p-limit';

import type { SimpleWorkflow } from '@/types/workflow';
import type { BuilderFeatureFlags } from '@/workflow-builder-agent';

import {
	argsToStageModels,
	getDefaultDatasetName,
	getDefaultExperimentName,
	parseEvaluationArgs,
} from './argument-parser';
import {
	runEvaluation,
	createConsoleLifecycle,
	createLLMJudgeEvaluator,
	createProgrammaticEvaluator,
	createPairwiseEvaluator,
	createSimilarityEvaluator,
	type RunConfig,
	type TestCase,
	type Evaluator,
	type EvaluationContext,
} from '../index';
import {
	loadTestCasesFromCsv,
	loadDefaultTestCases,
	getDefaultTestCaseIds,
} from './csv-prompt-loader';
import { consumeGenerator, getChatPayload } from '../harness/evaluation-helpers';
import { createLogger } from '../harness/logger';
import { generateRunId, isWorkflowStateValues } from '../langsmith/types';
import { EVAL_TYPES, EVAL_USERS } from '../support/constants';
import { setupTestEnvironment, createAgent, type ResolvedStageLLMs } from '../support/environment';

/**
 * Create a workflow generator function.
 * LangSmith tracing is handled via traceable() in the runner.
 * Callbacks are passed explicitly from the runner to ensure correct trace context
 * under high concurrency (avoids AsyncLocalStorage race conditions).
 */
function createWorkflowGenerator(
	parsedNodeTypes: INodeTypeDescription[],
	llms: ResolvedStageLLMs,
	featureFlags?: BuilderFeatureFlags,
): (prompt: string, callbacks?: Callbacks) => Promise<SimpleWorkflow> {
	return async (prompt: string, callbacks?: Callbacks): Promise<SimpleWorkflow> => {
		const runId = generateRunId();

		const agent = createAgent({
			parsedNodeTypes,
			llms,
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
				undefined, // abortSignal
				callbacks,
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
		const testCases = loadTestCasesFromCsv(args.promptsCsv);
		return args.maxExamples ? testCases.slice(0, args.maxExamples) : testCases;
	}

	// Predefined test case by id
	if (args.testCase) {
		const defaultCases = loadDefaultTestCases();
		const match = defaultCases.find((tc) => tc.id === args.testCase);
		if (!match) {
			const options = getDefaultTestCaseIds().join(', ');
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

	// Default: use bundled test cases
	const defaultCases = loadDefaultTestCases();
	return args.maxExamples ? defaultCases.slice(0, args.maxExamples) : defaultCases;
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

	// Setup environment with per-stage model configuration
	const logger = createLogger(args.verbose);
	const lifecycle = createConsoleLifecycle({ verbose: args.verbose, logger });
	const stageModels = argsToStageModels(args);
	const env = await setupTestEnvironment(stageModels, logger);

	// Validate LangSmith client early if langsmith backend is requested
	if (args.backend === 'langsmith' && !env.lsClient) {
		throw new Error('LangSmith client not initialized - check LANGSMITH_API_KEY');
	}

	// Create workflow generator with per-stage LLMs
	const generateWorkflow = createWorkflowGenerator(
		env.parsedNodeTypes,
		env.llms,
		args.featureFlags,
	);

	// Create evaluators based on mode (using judge LLM for evaluation)
	const evaluators: Array<Evaluator<EvaluationContext>> = [];

	switch (args.suite) {
		case 'llm-judge':
			evaluators.push(createLLMJudgeEvaluator(env.llms.judge, env.parsedNodeTypes));
			evaluators.push(createProgrammaticEvaluator(env.parsedNodeTypes));
			break;
		case 'pairwise':
			evaluators.push(
				createPairwiseEvaluator(env.llms.judge, {
					numJudges: args.numJudges,
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

	const llmCallLimiter = pLimit(args.concurrency);

	const baseConfig = {
		generateWorkflow,
		evaluators,
		lifecycle,
		logger,
		outputDir: args.outputDir,
		timeoutMs: args.timeoutMs,
		context: { llmCallLimiter },
	};

	const config: RunConfig =
		args.backend === 'langsmith'
			? {
					...baseConfig,
					mode: 'langsmith',
					dataset: args.datasetName ?? getDefaultDatasetName(args.suite),
					langsmithClient: env.lsClient!,
					langsmithOptions: {
						experimentName: args.experimentName ?? getDefaultExperimentName(args.suite),
						repetitions: args.repetitions,
						concurrency: args.concurrency,
						maxExamples: args.maxExamples,
						filters: args.filters,
						experimentMetadata:
							args.suite === 'pairwise'
								? {
										numJudges: args.numJudges,
										scoringMethod: 'hierarchical',
									}
								: undefined,
					},
				}
			: {
					...baseConfig,
					mode: 'local',
					dataset: loadTestCases(args),
				};

	// Run evaluation
	await runEvaluation(config);

	// Always exit 0 on successful completion - pass/fail is informational, not an error
	process.exit(0);
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
