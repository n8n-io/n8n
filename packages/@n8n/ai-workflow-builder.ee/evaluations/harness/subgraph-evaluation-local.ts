/**
 * Local subgraph evaluation runner.
 *
 * Runs subgraph evaluations against a local dataset (JSON file)
 * without requiring LangSmith.
 */

import type { INodeTypeDescription } from 'n8n-workflow';
import pLimit from 'p-limit';

import { runWithOptionalLimiter, withTimeout, runEvaluatorsOnExample } from './evaluation-helpers';
import type {
	Evaluator,
	EvaluationContext,
	Feedback,
	RunSummary,
	ExampleResult,
	EvaluationLifecycle,
} from './harness-types';
import type { EvalLogger } from './logger';
import { createArtifactSaver } from './output';
import { calculateWeightedScore, computeEvaluatorAverages } from './score-calculator';
import {
	extractPreComputedState,
	deserializeMessages,
	type SubgraphRunFn,
	type PreComputedState,
	type SubgraphName,
} from './subgraph-runner';
import { regenerateWorkflowState } from './workflow-regenerator';
import type { SimpleWorkflow } from '../../src/types/workflow';
import { writeBackToDatasetFile, type DatasetWriteBackEntry } from '../cli/dataset-file-loader';
import type { ResponderEvalCriteria } from '../evaluators/responder/responder-judge.prompt';
import type { ResolvedStageLLMs } from '../support/environment';

const DEFAULT_PASS_THRESHOLD = 0.7;

interface LocalSubgraphEvaluationConfig {
	subgraph: SubgraphName;
	subgraphRunner: SubgraphRunFn;
	evaluators: Array<Evaluator<EvaluationContext>>;
	examples: Array<{ inputs: Record<string, unknown> }>;
	concurrency: number;
	lifecycle?: Partial<EvaluationLifecycle>;
	logger: EvalLogger;
	outputDir?: string;
	timeoutMs?: number;
	passThreshold?: number;
	/** Run full workflow generation from prompt instead of using pre-computed state */
	regenerate?: boolean;
	/** Write regenerated state back to dataset file */
	writeBack?: boolean;
	/** Path to the dataset file (required for write-back) */
	datasetFilePath?: string;
	/** LLMs for regeneration (required if regenerate is true) */
	llms?: ResolvedStageLLMs;
	/** Parsed node types for regeneration (required if regenerate is true) */
	parsedNodeTypes?: INodeTypeDescription[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
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

/**
 * Run a subgraph evaluation against a local dataset (no LangSmith required).
 */
export async function runLocalSubgraphEvaluation(
	config: LocalSubgraphEvaluationConfig,
): Promise<RunSummary> {
	const {
		subgraph,
		subgraphRunner,
		evaluators,
		examples,
		concurrency,
		lifecycle,
		logger,
		outputDir,
		timeoutMs,
		passThreshold = DEFAULT_PASS_THRESHOLD,
		regenerate,
		writeBack,
		datasetFilePath,
		llms,
		parsedNodeTypes,
	} = config;

	if (regenerate && (!llms || !parsedNodeTypes)) {
		throw new Error('`regenerate` mode requires `llms` and `parsedNodeTypes`');
	}

	if (writeBack && !datasetFilePath) {
		throw new Error('`writeBack` requires `datasetFilePath`');
	}

	const llmCallLimiter = pLimit(concurrency);
	const artifactSaver = outputDir ? createArtifactSaver({ outputDir, logger }) : null;
	const capturedResults: ExampleResult[] = [];
	const writeBackEntries: DatasetWriteBackEntry[] = [];

	const stats = {
		total: 0,
		passed: 0,
		failed: 0,
		errors: 0,
		scoreSum: 0,
		durationSumMs: 0,
	};

	logger.info(
		`Starting local subgraph "${subgraph}" evaluation with ${examples.length} examples...`,
	);

	const evalStartTime = Date.now();
	const limit = pLimit(concurrency);

	await Promise.all(
		examples.map(
			async (example, idx) =>
				await limit(async () => {
					const index = idx + 1;
					const { inputs } = example;
					const prompt = extractPromptFromInputs(inputs);
					const startTime = Date.now();

					try {
						let state: PreComputedState;

						if (regenerate && llms && parsedNodeTypes) {
							// Regenerate state from prompt
							logger.verbose(`[${index}] Regenerating workflow state from prompt...`);
							const regenStart = Date.now();
							const regenerated = await regenerateWorkflowState({
								prompt,
								llms,
								parsedNodeTypes,
								timeoutMs,
								logger,
							});
							const regenDurationMs = Date.now() - regenStart;
							logger.verbose(`[${index}] Regeneration completed in ${regenDurationMs}ms`);

							state = {
								messages: deserializeMessages(regenerated.messages),
								coordinationLog: regenerated.coordinationLog,
								workflowJSON: regenerated.workflowJSON,
								discoveryContext: regenerated.discoveryContext,
								previousSummary: regenerated.previousSummary,
							};

							if (writeBack) {
								writeBackEntries.push({
									index: idx,
									messages: regenerated.messages,
									coordinationLog: regenerated.coordinationLog,
									workflowJSON: regenerated.workflowJSON,
								});
							}
						} else {
							// Use pre-computed state from dataset
							state = extractPreComputedState(inputs);
						}

						const genStart = Date.now();
						const subgraphResult = await runWithOptionalLimiter(async () => {
							return await withTimeout({
								promise: subgraphRunner(state),
								timeoutMs,
								label: `subgraph:${subgraph}`,
							});
						}, llmCallLimiter);
						const genDurationMs = Date.now() - genStart;

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

						const emptyWorkflow: SimpleWorkflow = { name: '', nodes: [], connections: {} };

						const evalStart = Date.now();
						const feedback = await runEvaluatorsOnExample(
							evaluators,
							emptyWorkflow,
							context,
							timeoutMs,
						);
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
					} catch (error) {
						const errorMessage = error instanceof Error ? error.message : String(error);
						const totalDurationMs = Date.now() - startTime;
						const feedback: Feedback[] = [
							{
								evaluator: 'runner',
								metric: 'error',
								score: 0,
								kind: 'score',
								comment: errorMessage,
							},
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
					}
				}),
		),
	);

	logger.info(
		`Local subgraph evaluation completed in ${((Date.now() - evalStartTime) / 1000).toFixed(1)}s`,
	);

	const evaluatorAverages = computeEvaluatorAverages(capturedResults);

	const summary: RunSummary = {
		totalExamples: stats.total,
		passed: stats.passed,
		failed: stats.failed,
		errors: stats.errors,
		averageScore: stats.total > 0 ? stats.scoreSum / stats.total : 0,
		totalDurationMs: stats.durationSumMs,
		evaluatorAverages,
	};

	if (artifactSaver) {
		artifactSaver.saveSummary(summary, capturedResults);
	}

	// Write back regenerated state if requested
	if (writeBack && datasetFilePath && writeBackEntries.length > 0) {
		logger.info(`Writing back ${writeBackEntries.length} examples to ${datasetFilePath}...`);
		writeBackToDatasetFile(datasetFilePath, writeBackEntries);
		logger.info('Write-back complete');
	}

	await lifecycle?.onEnd?.(summary);

	return summary;
}
