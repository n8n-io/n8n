/**
 * V2 CLI Entry Point
 *
 * Demonstrates how to use the v2 evaluation harness.
 * Can be run directly or used as a reference for custom setups.
 */

import type { Callbacks } from '@langchain/core/callbacks/manager';
import type { INodeTypeDescription } from 'n8n-workflow';
import pLimit from 'p-limit';

import { OneShotWorkflowCodeAgent } from '@/one-shot-workflow-code-agent';
import type { SimpleWorkflow } from '@/types/workflow';
import type { StreamChunk, WorkflowUpdateChunk } from '@/types/streaming';
import type { TokenUsage, GenerationError } from '../harness/harness-types.js';
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
	createCodeTypecheckEvaluator,
	createCodeLLMJudgeEvaluator,
	type RunConfig,
	type TestCase,
	type Evaluator,
	type EvaluationContext,
	type GenerationResult,
} from '../index';
import {
	loadTestCasesFromCsv,
	loadDefaultTestCases,
	getDefaultTestCaseIds,
} from './csv-prompt-loader';
import { consumeGenerator, getChatPayload } from '../harness/evaluation-helpers';
import { createLogger } from '../harness/logger';
import { generateRunId, isWorkflowStateValues } from '../langsmith/types';
import { AGENT_TYPES, EVAL_TYPES, EVAL_USERS } from '../support/constants';
import { setupTestEnvironment, createAgent, type ResolvedStageLLMs } from '../support/environment';

/**
 * Type guard for workflow update chunks from streaming output.
 */
function isWorkflowUpdateChunk(chunk: StreamChunk): chunk is WorkflowUpdateChunk {
	return chunk.type === 'workflow-updated';
}

/**
 * Create a workflow generator function for the multi-agent system.
 * LangSmith tracing is handled via traceable() in the runner.
 * Callbacks are passed explicitly from the runner to ensure correct trace context
 * under high concurrency (avoids AsyncLocalStorage race conditions).
 *
 * IMPORTANT: This generator explicitly sets oneShotAgent: false to ensure the
 * multi-agent system is used. The WorkflowBuilderAgent.chat() method defaults
 * to oneShotAgent: true, so we must override it here.
 */
function createWorkflowGenerator(
	parsedNodeTypes: INodeTypeDescription[],
	llms: ResolvedStageLLMs,
	featureFlags?: BuilderFeatureFlags,
): (prompt: string, callbacks?: Callbacks) => Promise<SimpleWorkflow> {
	// Ensure oneShotAgent is explicitly set to false for multi-agent evaluation
	const multiAgentFeatureFlags: BuilderFeatureFlags = {
		...featureFlags,
		oneShotAgent: false,
	};

	return async (prompt: string, callbacks?: Callbacks): Promise<SimpleWorkflow> => {
		const runId = generateRunId();

		const agent = createAgent({
			parsedNodeTypes,
			llms,
			featureFlags: multiAgentFeatureFlags,
		});

		await consumeGenerator(
			agent.chat(
				getChatPayload({
					evalType: EVAL_TYPES.LANGSMITH,
					message: prompt,
					workflowId: runId,
					featureFlags: multiAgentFeatureFlags,
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
 * Create a one-shot workflow generator function.
 * Uses the OneShotWorkflowCodeAgent which generates workflows via TypeScript SDK code
 * and emits workflow JSON directly in the stream.
 * Returns GenerationResult including the source code for artifact saving.
 *
 * @param timeoutMs - Optional timeout in milliseconds. When provided, the agent will be
 *                    aborted if it exceeds this duration. This ensures the generator
 *                    actually stops instead of continuing to run after timeout rejection.
 * @param captureLog - When true, captures debug logs for artifact saving.
 */
function createOneShotWorkflowGenerator(
	parsedNodeTypes: INodeTypeDescription[],
	llms: ResolvedStageLLMs,
	timeoutMs?: number,
	captureLog?: boolean,
): (prompt: string, callbacks?: Callbacks) => Promise<GenerationResult> {
	return async (prompt: string): Promise<GenerationResult> => {
		const runId = generateRunId();

		const agent = new OneShotWorkflowCodeAgent({
			llm: llms.builder,
			nodeTypes: parsedNodeTypes,
			captureLog,
		});

		const payload = getChatPayload({
			evalType: EVAL_TYPES.LANGSMITH,
			message: prompt,
			workflowId: runId,
			featureFlags: { oneShotAgent: true },
		});

		let workflow: SimpleWorkflow | null = null;
		let generatedCode: string | undefined;
		let tokenUsage: TokenUsage | undefined;
		let iterationCount: number | undefined;
		let generationErrors: GenerationError[] | undefined;

		// Create an AbortController to properly cancel the agent on timeout or error.
		// Without this, the agent continues running even after Promise.race rejects,
		// causing the full timeout duration to elapse before the error surfaces.
		const abortController = new AbortController();
		let timeoutId: NodeJS.Timeout | undefined;

		if (timeoutMs !== undefined && timeoutMs > 0) {
			timeoutId = setTimeout(() => {
				abortController.abort(new Error(`One-shot agent timed out after ${timeoutMs}ms`));
			}, timeoutMs);
		}

		try {
			for await (const output of agent.chat(
				payload,
				EVAL_USERS.LANGSMITH,
				abortController.signal,
			)) {
				for (const message of output.messages) {
					if (isWorkflowUpdateChunk(message)) {
						workflow = JSON.parse(message.codeSnippet) as SimpleWorkflow;
						generatedCode = message.sourceCode;
						if (message.tokenUsage) {
							tokenUsage = {
								inputTokens: message.tokenUsage.inputTokens,
								outputTokens: message.tokenUsage.outputTokens,
							};
						}
						iterationCount = message.iterationCount;
						if (message.generationErrors) {
							generationErrors = message.generationErrors;
						}
					}
				}
			}
		} finally {
			if (timeoutId !== undefined) {
				clearTimeout(timeoutId);
			}
		}

		if (!workflow) {
			throw new Error('One-shot agent did not produce a workflow');
		}

		// Get captured logs if log capture was enabled
		const logs = captureLog ? agent.getCapturedLogs() : undefined;

		return { workflow, generatedCode, tokenUsage, iterationCount, generationErrors, logs };
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

	// Create workflow generator based on agent type
	// Enable log capture for one-shot agent when outputDir is set
	const generateWorkflow =
		args.agent === AGENT_TYPES.ONE_SHOT
			? createOneShotWorkflowGenerator(
					env.parsedNodeTypes,
					env.llms,
					args.timeoutMs,
					!!args.outputDir,
				)
			: createWorkflowGenerator(env.parsedNodeTypes, env.llms, args.featureFlags);

	// Create evaluators based on mode (using judge LLM for evaluation)
	// For one-shot agent, run all 4 evaluators regardless of suite
	const evaluators: Array<Evaluator<EvaluationContext>> = [];

	if (args.agent === AGENT_TYPES.ONE_SHOT) {
		// One-shot agent: run all evaluators for comprehensive code analysis
		evaluators.push(createLLMJudgeEvaluator(env.llms.judge, env.parsedNodeTypes));
		evaluators.push(createProgrammaticEvaluator(env.parsedNodeTypes));
		evaluators.push(createCodeTypecheckEvaluator());
		evaluators.push(createCodeLLMJudgeEvaluator(env.llms.judge));
	} else {
		// Multi-agent: use suite-specific evaluators
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
			case 'code-typecheck':
				evaluators.push(createCodeTypecheckEvaluator());
				evaluators.push(createProgrammaticEvaluator(env.parsedNodeTypes));
				break;
			case 'code-llm-judge':
				evaluators.push(createCodeLLMJudgeEvaluator(env.llms.judge));
				evaluators.push(createProgrammaticEvaluator(env.parsedNodeTypes));
				break;
		}
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
