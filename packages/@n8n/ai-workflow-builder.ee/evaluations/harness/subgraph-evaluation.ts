/**
 * Subgraph evaluation runner.
 *
 * Orchestrates running evaluations targeting a specific subgraph (e.g., responder)
 * using pre-computed state from LangSmith dataset examples.
 */

import type { Client as LangsmithClient } from 'langsmith/client';
import { evaluate } from 'langsmith/evaluation';
import type { Run, Example } from 'langsmith/schemas';
import { traceable } from 'langsmith/traceable';
import type { INodeTypeDescription } from 'n8n-workflow';
import pLimit from 'p-limit';

import { runWithOptionalLimiter, withTimeout, runEvaluatorsOnExample } from './evaluation-helpers';
import { toLangsmithEvaluationResult } from './feedback';
import type {
	Evaluator,
	EvaluationContext,
	Feedback,
	RunSummary,
	EvaluationLifecycle,
	LangsmithOptions,
	ExampleResult,
} from './harness-types';
import {
	writeBackToLangSmithDataset,
	type LangSmithWriteBackEntry,
} from './langsmith-dataset-writer';
import type { EvalLogger } from './logger';
import { createArtifactSaver } from './output';
import { calculateWeightedScore, computeEvaluatorAverages } from './score-calculator';
import {
	extractPreComputedState,
	deserializeMessages,
	type SubgraphRunFn,
	type SubgraphResult,
	type PreComputedState,
	type SubgraphName,
} from './subgraph-runner';
import { regenerateWorkflowState } from './workflow-regenerator';
import type { SimpleWorkflow } from '../../src/types/workflow';
import type { ResponderEvalCriteria } from '../evaluators/responder/responder-judge.prompt';
import type { ResolvedStageLLMs } from '../support/environment';

const DEFAULT_PASS_THRESHOLD = 0.7;

interface SubgraphEvaluationConfig {
	subgraph: SubgraphName;
	subgraphRunner: SubgraphRunFn;
	evaluators: Array<Evaluator<EvaluationContext>>;
	datasetName: string;
	langsmithClient: LangsmithClient;
	langsmithOptions: LangsmithOptions;
	lifecycle?: Partial<EvaluationLifecycle>;
	logger: EvalLogger;
	outputDir?: string;
	timeoutMs?: number;
	passThreshold?: number;
	/** Run full workflow generation from prompt instead of using pre-computed state */
	regenerate?: boolean;
	/** Write regenerated state back to LangSmith dataset */
	writeBack?: boolean;
	/** LLMs for regeneration (required if regenerate is true) */
	llms?: ResolvedStageLLMs;
	/** Parsed node types for regeneration (required if regenerate is true) */
	parsedNodeTypes?: INodeTypeDescription[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFeedback(value: unknown): value is Feedback {
	const kinds = new Set(['score', 'metric', 'detail'] as const);
	return (
		isRecord(value) &&
		typeof value.evaluator === 'string' &&
		typeof value.metric === 'string' &&
		typeof value.score === 'number' &&
		typeof value.kind === 'string' &&
		kinds.has(value.kind as 'score' | 'metric' | 'detail')
	);
}

function isUnknownArray(value: unknown): value is unknown[] {
	return Array.isArray(value);
}

function extractPromptFromInputs(inputs: Record<string, unknown>): string {
	if (typeof inputs.prompt === 'string') return inputs.prompt;
	if (Array.isArray(inputs.messages) && inputs.messages.length > 0) {
		const first: unknown = inputs.messages[0];
		if (isRecord(first) && typeof first.content === 'string') return first.content;
	}
	throw new Error('No prompt found in inputs');
}

function extractResponderEvals(
	inputs: Record<string, unknown>,
	logger?: EvalLogger,
	index?: number,
): ResponderEvalCriteria | undefined {
	const raw = inputs.responderEvals;
	if (!isRecord(raw)) {
		logger?.verbose(
			`[${index ?? '?'}] Example missing responderEvals field - evaluator will report an error`,
		);
		return undefined;
	}
	if (typeof raw.type !== 'string' || typeof raw.criteria !== 'string') {
		logger?.verbose(
			`[${index ?? '?'}] Example has invalid responderEvals (missing type or criteria) - evaluator will report an error`,
		);
		return undefined;
	}
	return { type: raw.type, criteria: raw.criteria } as ResponderEvalCriteria;
}

interface SubgraphTargetOutput {
	response?: string;
	workflow?: SimpleWorkflow;
	prompt: string;
	feedback: Feedback[];
	/** Example ID for write-back (only present when regenerate is used) */
	exampleId?: string;
}

interface ResolveStateResult {
	state: PreComputedState;
	writeBackEntry?: LangSmithWriteBackEntry;
}

/**
 * Resolve the pre-computed state for a subgraph evaluation example.
 * Either regenerates from prompt or uses the pre-computed state from the dataset.
 */
async function resolveState(args: {
	inputs: Record<string, unknown>;
	regenerate?: boolean;
	llms?: ResolvedStageLLMs;
	parsedNodeTypes?: INodeTypeDescription[];
	timeoutMs?: number;
	logger: EvalLogger;
	index: number;
	prompt: string;
	exampleId?: string;
	writeBack?: boolean;
}): Promise<ResolveStateResult> {
	if (args.regenerate && args.llms && args.parsedNodeTypes) {
		args.logger.verbose(`[${args.index}] Regenerating workflow state from prompt...`);
		const regenStart = Date.now();
		const regenerated = await regenerateWorkflowState({
			prompt: args.prompt,
			llms: args.llms,
			parsedNodeTypes: args.parsedNodeTypes,
			timeoutMs: args.timeoutMs,
			logger: args.logger,
		});
		args.logger.verbose(`[${args.index}] Regeneration completed in ${Date.now() - regenStart}ms`);

		const state: PreComputedState = {
			messages: deserializeMessages(regenerated.messages),
			coordinationLog: regenerated.coordinationLog,
			workflowJSON: regenerated.workflowJSON,
			discoveryContext: regenerated.discoveryContext,
			previousSummary: regenerated.previousSummary,
		};

		const writeBackEntry =
			args.writeBack && args.exampleId
				? {
						exampleId: args.exampleId,
						messages: regenerated.messages,
						coordinationLog: regenerated.coordinationLog,
						workflowJSON: regenerated.workflowJSON,
					}
				: undefined;

		return { state, writeBackEntry };
	}

	return { state: extractPreComputedState(args.inputs) };
}

/**
 * Pre-load example IDs from a LangSmith dataset for write-back tracking.
 */
async function preloadExampleIds(
	lsClient: LangsmithClient,
	datasetName: string,
	logger: EvalLogger,
): Promise<string[]> {
	logger.verbose('Pre-loading example IDs for write-back tracking...');
	const dataset = await lsClient.readDataset({ datasetName });
	const examples = lsClient.listExamples({ datasetId: dataset.id });
	const ids: string[] = [];
	for await (const example of examples) {
		ids.push(example.id);
	}
	logger.verbose(`Loaded ${ids.length} example IDs for write-back`);
	return ids;
}

/**
 * Extract experiment and dataset IDs from LangSmith evaluate() results.
 */
async function extractExperimentIds(
	experimentResults: Awaited<ReturnType<typeof evaluate>>,
	logger: EvalLogger,
): Promise<{ experimentId?: string; datasetId?: string }> {
	try {
		const manager = (
			experimentResults as unknown as {
				manager?: { _getExperiment?: () => { id: string }; datasetId?: Promise<string> };
			}
		).manager;
		return {
			experimentId: manager?._getExperiment?.()?.id,
			datasetId: manager?.datasetId ? await manager.datasetId : undefined,
		};
	} catch {
		logger.verbose('Could not extract LangSmith IDs from experiment results');
		return {};
	}
}

/**
 * Run a subgraph evaluation against a LangSmith dataset.
 */
export async function runSubgraphEvaluation(config: SubgraphEvaluationConfig): Promise<RunSummary> {
	const {
		subgraph,
		subgraphRunner,
		evaluators,
		datasetName,
		langsmithClient: lsClient,
		langsmithOptions,
		lifecycle,
		logger,
		outputDir,
		timeoutMs,
		passThreshold = DEFAULT_PASS_THRESHOLD,
		regenerate,
		writeBack,
		llms,
		parsedNodeTypes,
	} = config;

	if (regenerate && (!llms || !parsedNodeTypes)) {
		throw new Error('`regenerate` mode requires `llms` and `parsedNodeTypes`');
	}

	process.env.LANGSMITH_TRACING = 'true';

	lifecycle?.onStart?.({
		mode: 'langsmith',
		dataset: datasetName,
		generateWorkflow: async () => ({ name: '', nodes: [], connections: {} }),
		evaluators,
		langsmithOptions,
		langsmithClient: lsClient,
		logger,
	});

	const llmCallLimiter = pLimit(langsmithOptions.concurrency);
	const artifactSaver = outputDir ? createArtifactSaver({ outputDir, logger }) : null;
	const capturedResults: ExampleResult[] = [];
	const writeBackEntries: LangSmithWriteBackEntry[] = [];

	let targetCallCount = 0;
	const stats = {
		total: 0,
		passed: 0,
		failed: 0,
		errors: 0,
		scoreSum: 0,
		durationSumMs: 0,
	};

	const traceableSubgraphRun = traceable(
		async (args: {
			state: PreComputedState;
			runner: SubgraphRunFn;
			genTimeoutMs?: number;
		}): Promise<SubgraphResult> => {
			return await runWithOptionalLimiter(async () => {
				return await withTimeout({
					promise: args.runner(args.state),
					timeoutMs: args.genTimeoutMs,
					label: `subgraph:${subgraph}`,
				});
			}, llmCallLimiter);
		},
		{
			name: `subgraph_${subgraph}`,
			run_type: 'chain',
			client: lsClient,
		},
	);

	// Pre-load example IDs if write-back is needed
	const exampleIds = writeBack ? await preloadExampleIds(lsClient, datasetName, logger) : [];

	const target = async (inputs: Record<string, unknown>): Promise<SubgraphTargetOutput> => {
		targetCallCount++;
		const index = targetCallCount;
		const prompt = extractPromptFromInputs(inputs);
		// Use index-1 since targetCallCount is 1-based
		const exampleId = exampleIds[index - 1];
		const startTime = Date.now();

		try {
			const { state, writeBackEntry } = await resolveState({
				inputs,
				regenerate,
				llms,
				parsedNodeTypes,
				timeoutMs,
				logger,
				index,
				prompt,
				exampleId,
				writeBack,
			});
			if (writeBackEntry) writeBackEntries.push(writeBackEntry);

			const genStart = Date.now();
			const subgraphResult = await traceableSubgraphRun({
				state,
				runner: subgraphRunner,
				genTimeoutMs: timeoutMs,
			});
			const genDurationMs = Date.now() - genStart;

			// Build evaluation context with subgraph-specific fields
			const context: EvaluationContext & Record<string, unknown> = {
				prompt,
				llmCallLimiter,
				timeoutMs,
			};

			if (subgraph === 'responder' && subgraphResult.response) {
				context.responderOutput = subgraphResult.response;
				context.workflowJSON = state.workflowJSON;
				const evalCriteria = extractResponderEvals(inputs, logger, index);
				if (evalCriteria) {
					context.responderEvals = evalCriteria;
				}
			}

			// Use empty workflow for evaluators that expect it
			const emptyWorkflow: SimpleWorkflow = { name: '', nodes: [], connections: {} };

			// Run evaluators
			const evalStart = Date.now();
			const feedback = await runEvaluatorsOnExample(evaluators, emptyWorkflow, context, timeoutMs);
			const evalDurationMs = Date.now() - evalStart;
			const totalDurationMs = Date.now() - startTime;

			const score = calculateWeightedScore(feedback);
			const hasError = feedback.some((f) => f.metric === 'error');
			const status = hasError ? 'error' : score >= passThreshold ? 'pass' : 'fail';

			stats.total++;
			stats.scoreSum += score;
			stats.durationSumMs += totalDurationMs;
			if (status === 'pass') stats.passed++;
			else if (status === 'fail') stats.failed++;
			else stats.errors++;

			const result: ExampleResult = {
				index,
				prompt,
				status,
				score,
				feedback,
				durationMs: totalDurationMs,
				generationDurationMs: genDurationMs,
				evaluationDurationMs: evalDurationMs,
				subgraphOutput: {
					response: subgraphResult.response,
					workflow: subgraphResult.workflow,
				},
			};

			artifactSaver?.saveExample(result);
			capturedResults.push(result);
			lifecycle?.onExampleComplete?.(index, result);

			return {
				response: subgraphResult.response,
				workflow: subgraphResult.workflow,
				prompt,
				feedback,
				exampleId,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			const totalDurationMs = Date.now() - startTime;
			const feedback: Feedback[] = [
				{ evaluator: 'runner', metric: 'error', score: 0, kind: 'score', comment: errorMessage },
			];

			stats.total++;
			stats.errors++;
			stats.durationSumMs += totalDurationMs;

			const result: ExampleResult = {
				index,
				prompt,
				status: 'error',
				score: 0,
				feedback,
				durationMs: totalDurationMs,
				error: errorMessage,
			};

			artifactSaver?.saveExample(result);
			capturedResults.push(result);
			lifecycle?.onExampleComplete?.(index, result);

			return { prompt, feedback, exampleId };
		}
	};

	const feedbackExtractor = async (rootRun: Run, _example?: Example) => {
		const outputs = rootRun.outputs;
		const feedback =
			isRecord(outputs) && isUnknownArray(outputs.feedback) && outputs.feedback.every(isFeedback)
				? outputs.feedback
				: undefined;

		if (!feedback) {
			return [{ key: 'evaluationError', score: 0, comment: 'No feedback found' }];
		}
		return feedback.map((fb) => toLangsmithEvaluationResult(fb));
	};

	logger.info(`Starting subgraph "${subgraph}" evaluation with dataset "${datasetName}"...`);

	const evalStartTime = Date.now();
	const experimentResults = await evaluate(target, {
		data: datasetName,
		evaluators: [feedbackExtractor],
		experimentPrefix: langsmithOptions.experimentName,
		maxConcurrency: langsmithOptions.concurrency,
		client: lsClient,
		...(langsmithOptions.repetitions > 1 && {
			numRepetitions: langsmithOptions.repetitions,
		}),
		metadata: {
			subgraph,
			repetitions: langsmithOptions.repetitions,
			concurrency: langsmithOptions.concurrency,
			...langsmithOptions.experimentMetadata,
		},
	});

	logger.info(
		`Subgraph evaluation completed in ${((Date.now() - evalStartTime) / 1000).toFixed(1)}s (target called ${targetCallCount} times)`,
	);

	logger.verbose('Flushing pending trace batches...');
	await lsClient.awaitPendingTraceBatches();

	const experimentName = experimentResults.experimentName;
	logger.info(`Experiment completed: ${experimentName}`);

	const { experimentId, datasetId } = await extractExperimentIds(experimentResults, logger);

	const evaluatorAverages = computeEvaluatorAverages(capturedResults);

	const summary: RunSummary = {
		totalExamples: stats.total,
		passed: stats.passed,
		failed: stats.failed,
		errors: stats.errors,
		averageScore: stats.total > 0 ? stats.scoreSum / stats.total : 0,
		totalDurationMs: stats.durationSumMs,
		evaluatorAverages,
		...(experimentName &&
			experimentId &&
			datasetId && {
				langsmith: { experimentName, experimentId, datasetId },
			}),
	};

	if (artifactSaver) {
		artifactSaver.saveSummary(summary, capturedResults);
	}

	// Write back regenerated state if requested
	if (writeBack && writeBackEntries.length > 0) {
		await writeBackToLangSmithDataset(lsClient, writeBackEntries, logger);
	}

	await lifecycle?.onEnd?.(summary);

	return summary;
}
