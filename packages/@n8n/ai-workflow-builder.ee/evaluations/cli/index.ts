/**
 * V2 CLI Entry Point
 *
 * Demonstrates how to use the v2 evaluation harness.
 * Can be run directly or used as a reference for custom setups.
 */

import type { INodeTypeDescription } from 'n8n-workflow';
import pLimit from 'p-limit';

import { CodeWorkflowBuilder } from '@/code-builder';
import type { CoordinationLogEntry } from '@/types/coordination';
import type { StreamChunk, WorkflowUpdateChunk } from '@/types/streaming';
import type { SimpleWorkflow } from '@/types/workflow';
import type { BuilderFeatureFlags } from '@/workflow-builder-agent';

/** Type guard for SimpleWorkflow */
function isSimpleWorkflow(value: unknown): value is SimpleWorkflow {
	return (
		typeof value === 'object' &&
		value !== null &&
		'name' in value &&
		'nodes' in value &&
		'connections' in value
	);
}

import {
	argsToStageModels,
	getDefaultDatasetName,
	getDefaultExperimentName,
	parseEvaluationArgs,
	type EvaluationArgs,
} from './argument-parser';
import { buildCIMetadata } from './ci-metadata';
import {
	loadTestCasesFromCsv,
	loadDefaultTestCases,
	getDefaultTestCaseIds,
} from './csv-prompt-loader';
import { loadSubgraphDatasetFile } from './dataset-file-loader';
import { sendWebhookNotification } from './webhook';
import { WorkflowGenerationError } from '../errors';
import {
	consumeGenerator,
	extractSubgraphMetrics,
	getChatPayload,
} from '../harness/evaluation-helpers';
import { createLogger } from '../harness/logger';
import type { GenerationCollectors, SubgraphMetricsCollector } from '../harness/runner';
import { TokenUsageTrackingHandler } from '../harness/token-tracking-handler';
import {
	runEvaluation,
	createConsoleLifecycle,
	mergeLifecycles,
	createLLMJudgeEvaluator,
	createProgrammaticEvaluator,
	createPairwiseEvaluator,
	createSimilarityEvaluator,
	createExecutionEvaluator,
	type RunConfig,
	type TestCase,
	type Evaluator,
	type EvaluationContext,
	type GenerationResult,
	createSubgraphRunner,
	createResponderEvaluator,
	type EvaluationLifecycle,
	runLocalSubgraphEvaluation,
	runSubgraphEvaluation,
} from '../index';
import { generateRunId, isWorkflowStateValues } from '../langsmith/types';
import { createIntrospectionAnalysisLifecycle } from '../lifecycles/introspection-analysis';
import { AGENT_TYPES, EVAL_TYPES, EVAL_USERS } from '../support/constants';
import {
	setupTestEnvironment,
	createAgent,
	resolveNodesBasePath,
	type ResolvedStageLLMs,
	type TestEnvironment,
} from '../support/environment';
import { generateEvalPinData } from '../support/pin-data-generator';

/**
 * Type guard for workflow update chunks from streaming output.
 */
function isWorkflowUpdateChunk(chunk: StreamChunk): chunk is WorkflowUpdateChunk {
	return chunk.type === 'workflow-updated';
}

/**
 * Type guard to check if state values contain a coordination log.
 */
function hasCoordinationLog(
	values: unknown,
): values is { coordinationLog: CoordinationLogEntry[] } {
	if (!values || typeof values !== 'object') return false;
	const obj = values as Record<string, unknown>;
	return Array.isArray(obj.coordinationLog);
}

/**
 * Report subgraph metrics from coordination log and workflow.
 */
function reportSubgraphMetrics(
	collector: SubgraphMetricsCollector,
	stateValues: unknown,
	workflow: SimpleWorkflow,
): void {
	const coordinationLog = hasCoordinationLog(stateValues) ? stateValues.coordinationLog : undefined;
	const nodeCount = workflow.nodes?.length;
	const metrics = extractSubgraphMetrics(coordinationLog, nodeCount);

	if (
		metrics.discoveryDurationMs !== undefined ||
		metrics.builderDurationMs !== undefined ||
		metrics.responderDurationMs !== undefined ||
		metrics.nodeCount !== undefined
	) {
		collector(metrics);
	}
}

/**
 * Create a workflow generator function for the multi-agent system.
 * LangSmith tracing is handled via traceable() in the runner.
 * Callbacks are passed explicitly from the runner to ensure correct trace context
 * under high concurrency (avoids AsyncLocalStorage race conditions).
 */
function createWorkflowGenerator(
	parsedNodeTypes: INodeTypeDescription[],
	llms: ResolvedStageLLMs,
	featureFlags?: BuilderFeatureFlags,
): (prompt: string, collectors?: GenerationCollectors) => Promise<SimpleWorkflow> {
	return async (prompt: string, collectors?: GenerationCollectors): Promise<SimpleWorkflow> => {
		const runId = generateRunId();

		const agent = createAgent({
			parsedNodeTypes,
			llms,
			featureFlags,
		});

		// Create token tracking handler to capture usage from all LLM calls
		// (supervisor, discovery, builder, responder agents)
		const tokenTracker = collectors?.tokenUsage ? new TokenUsageTrackingHandler() : undefined;

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
				tokenTracker ? [tokenTracker] : undefined, // externalCallbacks
			),
		);

		const state = await agent.getState(runId, EVAL_USERS.LANGSMITH);

		if (!state.values || !isWorkflowStateValues(state.values)) {
			throw new Error('Invalid workflow state: workflow or messages missing');
		}

		const workflow = state.values.workflowJSON;

		// Report accumulated token usage from all agents
		if (collectors?.tokenUsage && tokenTracker) {
			const usage = tokenTracker.getUsage();
			if (usage.inputTokens > 0 || usage.outputTokens > 0) {
				collectors.tokenUsage(usage);
			}
		}

		// Extract and report subgraph metrics from coordination log
		if (collectors?.subgraphMetrics) {
			reportSubgraphMetrics(collectors.subgraphMetrics, state.values, workflow);
		}

		// Report introspection events
		collectors?.introspectionEvents?.(state.values.introspectionEvents ?? []);

		return workflow;
	};
}

/**
 * Create evaluators based on suite type.
 */
function createEvaluators(params: {
	suite: string;
	judgeLlm: ResolvedStageLLMs['judge'];
	parsedNodeTypes: Parameters<typeof createProgrammaticEvaluator>[0];
	numJudges: number;
}): Array<Evaluator<EvaluationContext>> {
	const { suite, judgeLlm, parsedNodeTypes, numJudges } = params;
	const evaluators: Array<Evaluator<EvaluationContext>> = [];

	switch (suite) {
		case 'llm-judge':
			evaluators.push(createLLMJudgeEvaluator(judgeLlm, parsedNodeTypes));
			evaluators.push(createProgrammaticEvaluator(parsedNodeTypes));
			break;
		case 'pairwise':
			evaluators.push(createPairwiseEvaluator(judgeLlm, { numJudges }));
			evaluators.push(createProgrammaticEvaluator(parsedNodeTypes));
			break;
		case 'programmatic':
			evaluators.push(createProgrammaticEvaluator(parsedNodeTypes));
			break;
		case 'similarity':
			evaluators.push(createSimilarityEvaluator());
			break;
	}

	return evaluators;
}

/**
 * Create a CodeWorkflowBuilder generator function.
 * Uses the CodeWorkflowBuilder which coordinates planning and coding agents to generate
 * workflows via TypeScript SDK code and emits workflow JSON directly in the stream.
 * Returns GenerationResult including the source code for artifact saving.
 *
 * @param timeoutMs - Optional timeout in milliseconds. When provided, the agent will be
 *                    aborted if it exceeds this duration. This ensures the generator
 *                    actually stops instead of continuing to run after timeout rejection.
 */
function createCodeWorkflowBuilderGenerator(
	parsedNodeTypes: INodeTypeDescription[],
	llms: ResolvedStageLLMs,
	timeoutMs?: number,
	nodeDefinitionDirs?: string[],
): (prompt: string, collectors?: GenerationCollectors) => Promise<GenerationResult> {
	// Subgraph metrics are not applicable since CodeWorkflowBuilder doesn't use coordination logs.
	return async (prompt: string, collectors?: GenerationCollectors): Promise<GenerationResult> => {
		const runId = generateRunId();

		// Accumulate token usage across all LLM calls
		let totalInputTokens = 0;
		let totalOutputTokens = 0;

		const builder = new CodeWorkflowBuilder({
			llm: llms.builder,
			nodeTypes: parsedNodeTypes,
			nodeDefinitionDirs,
			onTokenUsage: collectors?.tokenUsage
				? (usage) => {
						totalInputTokens += usage.inputTokens;
						totalOutputTokens += usage.outputTokens;
					}
				: undefined,
		});

		const payload = getChatPayload({
			evalType: EVAL_TYPES.LANGSMITH,
			message: prompt,
			workflowId: runId,
			featureFlags: { codeBuilder: true },
		});

		let workflow: SimpleWorkflow | null = null;
		let generatedCode: string | undefined;

		// Create an AbortController to properly cancel the agent on timeout or error.
		// Without this, the agent continues running even after Promise.race rejects,
		// causing the full timeout duration to elapse before the error surfaces.
		const abortController = new AbortController();
		let timeoutId: NodeJS.Timeout | undefined;

		if (timeoutMs !== undefined && timeoutMs > 0) {
			timeoutId = setTimeout(() => {
				abortController.abort(new Error(`CodeWorkflowBuilder timed out after ${timeoutMs}ms`));
			}, timeoutMs);
		}

		try {
			for await (const output of builder.chat(
				payload,
				EVAL_USERS.LANGSMITH,
				abortController.signal,
			)) {
				for (const message of output.messages) {
					if (isWorkflowUpdateChunk(message)) {
						const parsed: unknown = JSON.parse(message.codeSnippet);
						if (isSimpleWorkflow(parsed)) {
							workflow = parsed;
							generatedCode = message.sourceCode;
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
			throw new WorkflowGenerationError('CodeWorkflowBuilder did not produce a workflow');
		}

		// Report accumulated token usage
		if (collectors?.tokenUsage && (totalInputTokens > 0 || totalOutputTokens > 0)) {
			collectors.tokenUsage({ inputTokens: totalInputTokens, outputTokens: totalOutputTokens });
		}

		return { workflow, generatedCode };
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
 * Handle subgraph evaluation mode (--subgraph flag).
 * Supports both local dataset files and LangSmith datasets.
 */
async function handleSubgraphMode(
	args: EvaluationArgs,
	env: TestEnvironment,
	lifecycle: EvaluationLifecycle,
	logger: ReturnType<typeof createLogger>,
): Promise<void> {
	const { subgraph } = args;
	if (!subgraph) throw new Error('subgraph is required');

	const subgraphRunner = createSubgraphRunner({
		subgraph,
		llms: env.llms,
	});

	const evaluators: Array<Evaluator<EvaluationContext>> = [];
	if (subgraph === 'responder') {
		evaluators.push(createResponderEvaluator(env.llms.judge, { numJudges: args.numJudges }));
	} else {
		logger.warn(`Subgraph evaluation not supported for ${subgraph}`);
	}

	let summary: Awaited<ReturnType<typeof runSubgraphEvaluation>>;

	if (args.datasetFile) {
		const examples = loadSubgraphDatasetFile(args.datasetFile);
		const slicedExamples = args.maxExamples ? examples.slice(0, args.maxExamples) : examples;

		summary = await runLocalSubgraphEvaluation({
			subgraph,
			subgraphRunner,
			evaluators,
			examples: slicedExamples,
			concurrency: args.concurrency,
			lifecycle,
			logger,
			outputDir: args.outputDir,
			timeoutMs: args.timeoutMs,
			regenerate: args.regenerate,
			writeBack: args.writeBack,
			datasetFilePath: args.datasetFile,
			llms: args.regenerate ? env.llms : undefined,
			parsedNodeTypes: args.regenerate ? env.parsedNodeTypes : undefined,
		});
	} else {
		if (!args.datasetName) {
			throw new Error('`--subgraph` requires `--dataset` or `--dataset-file`');
		}
		if (!env.lsClient) {
			throw new Error('LangSmith client not initialized - check LANGSMITH_API_KEY');
		}

		summary = await runSubgraphEvaluation({
			subgraph,
			subgraphRunner,
			evaluators,
			datasetName: args.datasetName,
			langsmithClient: env.lsClient,
			langsmithOptions: {
				experimentName: args.experimentName ?? `${subgraph}-eval`,
				repetitions: args.repetitions,
				concurrency: args.concurrency,
				maxExamples: args.maxExamples,
				filters: args.filters,
				experimentMetadata: {
					...buildCIMetadata(),
					subgraph,
				},
			},
			lifecycle,
			logger,
			outputDir: args.outputDir,
			timeoutMs: args.timeoutMs,
			regenerate: args.regenerate,
			writeBack: args.writeBack,
			llms: args.regenerate ? env.llms : undefined,
			parsedNodeTypes: args.regenerate ? env.parsedNodeTypes : undefined,
		});
	}

	if (args.webhookUrl) {
		await sendWebhookNotification({
			webhookUrl: args.webhookUrl,
			webhookSecret: args.webhookSecret,
			summary,
			dataset: args.datasetFile ?? args.datasetName ?? 'local-dataset',
			suite: args.suite,
			metadata: { ...buildCIMetadata(), subgraph },
			logger,
		});
	}
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

	// Subgraph evaluation mode
	if (args.subgraph) {
		await handleSubgraphMode(args, env, lifecycle, logger);
		process.exit(0);
	}

	// Create workflow generator based on agent type
	const generateWorkflow =
		args.agent === AGENT_TYPES.CODE_BUILDER
			? createCodeWorkflowBuilderGenerator(
					env.parsedNodeTypes,
					env.llms,
					args.timeoutMs,
					env.nodeDefinitionDirs,
				)
			: createWorkflowGenerator(env.parsedNodeTypes, env.llms, args.featureFlags);

	// Create evaluators based on suite type
	const evaluators = createEvaluators({
		suite: args.suite,
		judgeLlm: env.llms.judge,
		parsedNodeTypes: env.parsedNodeTypes,
		numJudges: args.numJudges,
	});

	// Execution evaluator runs for all suites — validates workflows execute with pin data
	evaluators.push(createExecutionEvaluator());

	const llmCallLimiter = pLimit(args.concurrency);

	// Merge console lifecycle with optional introspection analysis lifecycle
	const mergedLifecycle = mergeLifecycles(
		createConsoleLifecycle({ verbose: args.verbose, logger }),
		args.suite === 'introspection'
			? createIntrospectionAnalysisLifecycle({
					judgeLlm: env.llms.judge,
					outputDir: args.outputDir,
					logger,
				})
			: undefined,
	);
	// Create pin data generator for mocking service node outputs in evaluations
	const nodesBasePath = resolveNodesBasePath();
	const pinDataGenerator = async (workflow: SimpleWorkflow) =>
		await generateEvalPinData(workflow, {
			llm: env.llms.judge,
			nodeTypes: env.parsedNodeTypes,
			nodesBasePath,
			logger,
		});

	const baseConfig = {
		generateWorkflow,
		evaluators,
		lifecycle: mergedLifecycle,
		logger,
		outputDir: args.outputDir,
		outputCsv: args.outputCsv,
		suite: args.suite,
		timeoutMs: args.timeoutMs,
		context: { llmCallLimiter },
		passThreshold: args.suite === 'introspection' ? 0 : undefined,
		pinDataGenerator,
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
						experimentMetadata: {
							...buildCIMetadata(),
							...(args.suite === 'pairwise' && {
								numJudges: args.numJudges,
								scoringMethod: 'hierarchical',
							}),
						},
					},
				}
			: {
					...baseConfig,
					mode: 'local',
					dataset: loadTestCases(args),
					concurrency: args.concurrency,
				};

	// Run evaluation
	const summary = await runEvaluation(config);

	if (args.webhookUrl) {
		const dataset =
			args.backend === 'langsmith'
				? (args.datasetName ?? getDefaultDatasetName(args.suite))
				: 'local-dataset';

		await sendWebhookNotification({
			webhookUrl: args.webhookUrl,
			webhookSecret: args.webhookSecret,
			summary,
			dataset,
			suite: args.suite,
			metadata: { ...buildCIMetadata() },
			logger,
		});
	}

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
