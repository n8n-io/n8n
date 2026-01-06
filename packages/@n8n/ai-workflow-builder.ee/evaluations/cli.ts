/**
 * V2 CLI Entry Point
 *
 * Demonstrates how to use the v2 evaluation harness.
 * Can be run directly or used as a reference for custom setups.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { INodeTypeDescription } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types/workflow';
import type { BuilderFeatureFlags } from '@/workflow-builder-agent';

import { EVAL_TYPES, EVAL_USERS } from './constants';
import { parseEvaluationArgs } from './core/argument-parser';
import { setupTestEnvironment, createAgent } from './core/environment';
import {
	runEvaluation,
	createConsoleLifecycle,
	createLLMJudgeEvaluator,
	createProgrammaticEvaluator,
	createPairwiseEvaluator,
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
		return csvCases.map((tc) => ({
			prompt: tc.prompt,
			id: tc.id,
		}));
	}

	// Single prompt from CLI
	if (args.prompt) {
		return [
			{
				prompt: args.prompt,
				context: {
					dos: args.dos,
					donts: args.donts,
				},
			},
		];
	}

	// Default test case
	return [
		{
			prompt: 'Create a workflow that sends a daily email summary',
		},
	];
}

/**
 * Main entry point for v2 evaluation CLI.
 */
export async function runV2Evaluation(): Promise<void> {
	const args = parseEvaluationArgs();

	// Setup environment
	const logger = createLogger(args.verbose);
	const lifecycle = createConsoleLifecycle({ verbose: args.verbose });
	const env = await setupTestEnvironment(logger);

	// Create workflow generator (tracing handled via traceable() in runner)
	const generateWorkflow = createWorkflowGenerator(env.parsedNodeTypes, env.llm, args.featureFlags);

	// Create evaluators based on mode
	const evaluators: Array<Evaluator<EvaluationContext>> = [];

	if (args.mode === 'llm-judge-langsmith' || args.mode === 'llm-judge-local') {
		evaluators.push(createLLMJudgeEvaluator(env.llm, env.parsedNodeTypes));
		evaluators.push(createProgrammaticEvaluator(env.parsedNodeTypes));
	} else if (args.mode === 'pairwise-local' || args.mode === 'pairwise-langsmith') {
		evaluators.push(
			createPairwiseEvaluator(env.llm, {
				numJudges: args.numJudges,
				numGenerations: args.numGenerations,
			}),
		);
		evaluators.push(createProgrammaticEvaluator(env.parsedNodeTypes));
	}

	// Build context - include generateWorkflow for multi-gen pairwise
	const isMultiGen =
		(args.mode === 'pairwise-local' || args.mode === 'pairwise-langsmith') &&
		args.numGenerations > 1;

	// Build config
	const config: RunConfig = {
		mode: args.mode.includes('langsmith') ? 'langsmith' : 'local',
		dataset: args.mode.includes('langsmith')
			? (args.datasetName ?? 'workflow-builder-canvas-prompts')
			: loadTestCases(args),
		generateWorkflow,
		evaluators,
		lifecycle,
		logger,
		outputDir: args.outputDir,
		// For multi-gen, pass generateWorkflow in context so evaluator can create multiple workflows
		context: isMultiGen ? { generateWorkflow } : undefined,
		langsmithOptions: args.mode.includes('langsmith')
			? {
					experimentName: args.experimentName ?? 'v2-evaluation',
					repetitions: args.repetitions,
					concurrency: args.concurrency,
					maxExamples: args.maxExamples,
				}
			: undefined,
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
		console.error('Evaluation failed:', error);
		process.exit(1);
	});
}
