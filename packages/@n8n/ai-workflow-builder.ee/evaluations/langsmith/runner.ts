import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Client } from 'langsmith/client';
import { evaluate } from 'langsmith/evaluation';
import { getLangchainCallbacks } from 'langsmith/langchain';
import { traceable } from 'langsmith/traceable';
import type { INodeTypeDescription } from 'n8n-workflow';
import pc from 'picocolors';

import { createLangsmithEvaluator } from './evaluator';
import type { BuilderFeatureFlags } from '../../src/workflow-builder-agent';
import type { WorkflowState } from '../../src/workflow-state';
import { DEFAULTS, EVAL_TYPES, EVAL_USERS, TRACEABLE_NAMES } from '../constants';
import { setupTestEnvironment, createAgent } from '../core/environment';
import {
	generateRunId,
	safeExtractUsage,
	isWorkflowStateValues,
	extractMessageContent,
} from '../types/langsmith';
import { consumeGenerator, formatHeader, getChatPayload } from '../utils/evaluation-helpers';
import { createLogger, type EvalLogger } from '../utils/logger';

// Type for evaluation results from LangSmith
type EvaluationResultsIterator = Awaited<ReturnType<typeof evaluate>>;

/**
 * Creates a workflow generation function for Langsmith evaluation
 * Uses traceable wrapper for proper LangSmith context propagation
 * @param parsedNodeTypes - Node types
 * @param llm - Language model
 * @param featureFlags - Optional feature flags to pass to the agent
 * @returns Function that generates workflows from inputs
 */
function createWorkflowGenerator(
	parsedNodeTypes: INodeTypeDescription[],
	llm: BaseChatModel,
	featureFlags?: BuilderFeatureFlags,
) {
	// Wrap the inner function with traceable for proper LangSmith context propagation
	const generateWorkflow = traceable(
		async (inputs: typeof WorkflowState.State) => {
			// Generate a unique ID for this evaluation run
			const runId = generateRunId();

			// Validate inputs
			if (!inputs.messages || !Array.isArray(inputs.messages) || inputs.messages.length === 0) {
				throw new Error('No messages provided in inputs');
			}

			// Extract first message content safely
			const firstMessage = inputs.messages[0];
			const messageContent = extractMessageContent(firstMessage);

			// Get LangChain callbacks linked to current traceable context.
			// This is the official bridge between LangSmith's traceable and LangChain callbacks.
			const callbacks = await getLangchainCallbacks();

			// Create agent for this run (no tracer - callbacks passed at invocation)
			const agent = createAgent({ parsedNodeTypes, llm, featureFlags });
			await consumeGenerator(
				agent.chat(
					getChatPayload({
						evalType: EVAL_TYPES.LANGSMITH,
						message: messageContent,
						workflowId: runId,
						featureFlags,
					}),
					EVAL_USERS.LANGSMITH,
					undefined, // abortSignal
					callbacks, // externalCallbacks for LangSmith tracing
				),
			);

			// Get generated workflow with validation
			const state = await agent.getState(runId, EVAL_USERS.LANGSMITH);

			// Validate state
			if (!state.values) {
				throw new Error('No values in agent state');
			}

			if (!isWorkflowStateValues(state.values)) {
				throw new Error('Invalid workflow state: workflow or messages missing');
			}

			const generatedWorkflow = state.values.workflowJSON;
			const messages = state.values.messages;

			// Extract usage metadata safely
			const usage = safeExtractUsage(messages);

			return {
				workflow: generatedWorkflow,
				prompt: messageContent,
				usage,
			};
		},
		{ name: TRACEABLE_NAMES.WORKFLOW_GENERATION, run_type: 'chain' },
	);

	return generateWorkflow;
}

// ============================================================================
// Verbose Logging Helpers
// ============================================================================

/**
 * Truncate a prompt for display (max 50 chars).
 */
function truncatePrompt(prompt: string, maxLen = 50): string {
	const cleaned = prompt.replace(/\s+/g, ' ').trim();
	return cleaned.length > maxLen ? cleaned.slice(0, maxLen) + '...' : cleaned;
}

/**
 * Extract key scores from evaluation results.
 */
function extractKeyScores(results: Array<{ key: string; score?: number | boolean | null }>): {
	overall: number;
	func: number;
	conn: number;
	cfg: number;
} {
	const findScore = (key: string): number => {
		const result = results.find((r) => r.key === key);
		return typeof result?.score === 'number' ? result.score : 0;
	};
	return {
		overall: findScore('overallScore'),
		func: findScore('functionality'),
		conn: findScore('connections'),
		cfg: findScore('nodeConfiguration'),
	};
}

/**
 * Log a single evaluation result in verbose mode.
 */
function logEvaluationResult(
	log: EvalLogger,
	index: number,
	prompt: string,
	scores: { overall: number; func: number; conn: number; cfg: number },
	hasError: boolean,
): void {
	const passed = !hasError && scores.overall >= 0.7;
	const status = hasError ? pc.red('ERROR') : passed ? pc.green('PASS') : pc.yellow('WARN');
	const score = hasError ? 'N/A' : `${(scores.overall * 100).toFixed(0)}%`;

	log.verbose(`  [${index}] ${status} "${truncatePrompt(prompt)}" (${score})`);

	if (!hasError) {
		const scoreDetails = [
			`func:${(scores.func * 100).toFixed(0)}%`,
			`conn:${(scores.conn * 100).toFixed(0)}%`,
			`cfg:${(scores.cfg * 100).toFixed(0)}%`,
		];
		log.verbose(`    Scores: ${scoreDetails.join(', ')}`);
	}
}

/**
 * Log summary statistics after evaluation completes.
 */
function logEvaluationSummary(
	log: EvalLogger,
	allScores: Array<{ overall: number; func: number; conn: number; cfg: number }>,
	errorCount: number,
): void {
	if (allScores.length === 0) return;

	const avgOf = (key: keyof (typeof allScores)[0]): number =>
		allScores.reduce((sum, s) => sum + s[key], 0) / allScores.length;

	const passCount = allScores.filter((s) => s.overall >= 0.7).length;

	log.verbose('');
	log.verbose(`  Summary: ${passCount}/${allScores.length} passed (${errorCount} errors)`);
	log.verbose(
		`  Avg scores: overall:${(avgOf('overall') * 100).toFixed(0)}%, ` +
			`func:${(avgOf('func') * 100).toFixed(0)}%, ` +
			`conn:${(avgOf('conn') * 100).toFixed(0)}%, ` +
			`cfg:${(avgOf('cfg') * 100).toFixed(0)}%`,
	);
}

/**
 * Iterate evaluation results and log each one in verbose mode.
 */
async function processResultsWithLogging(
	results: EvaluationResultsIterator,
	log: EvalLogger,
	verbose: boolean,
): Promise<void> {
	const allScores: Array<{ overall: number; func: number; conn: number; cfg: number }> = [];
	let errorCount = 0;
	let index = 1;

	for await (const result of results) {
		if (!verbose) continue;

		// Extract prompt from run outputs
		const prompt =
			typeof result.run?.outputs?.prompt === 'string'
				? result.run.outputs.prompt
				: `Example ${index}`;

		// Check for error
		const hasError = result.evaluationResults?.results?.some(
			(r: { key: string; score?: number | boolean | null }) =>
				r.key === 'evaluationError' && r.score === 0,
		);

		if (hasError) {
			errorCount++;
			logEvaluationResult(log, index, prompt, { overall: 0, func: 0, conn: 0, cfg: 0 }, true);
		} else if (result.evaluationResults?.results) {
			const scores = extractKeyScores(result.evaluationResults.results);
			allScores.push(scores);
			logEvaluationResult(log, index, prompt, scores, false);
		}

		index++;
	}

	if (verbose && allScores.length > 0) {
		logEvaluationSummary(log, allScores, errorCount);
	}
}

/**
 * Log verbose configuration info before evaluation starts.
 */
function logVerboseConfig(log: EvalLogger, exampleCount: number, repetitions: number): void {
	if (exampleCount > 0) {
		log.verbose(`➔ Dataset contains ${exampleCount} example(s)`);
		log.verbose(
			`➔ Total runs: ${exampleCount * repetitions} (${exampleCount} examples × ${repetitions} reps)`,
		);
		log.verbose('➔ Concurrency: 7 parallel evaluations');
	}

	const modelName = process.env.LLM_MODEL ?? 'default';
	log.verbose(`➔ Model: ${modelName}`);
	if (process.env.LANGSMITH_PROJECT) {
		log.verbose(`➔ LangSmith project: ${process.env.LANGSMITH_PROJECT}`);
	}
}

/**
 * Verify dataset exists and optionally count examples for verbose output.
 */
async function verifyDatasetAndCountExamples(
	lsClient: Client,
	datasetName: string,
	countExamples: boolean,
): Promise<number> {
	try {
		const dataset = await lsClient.readDataset({ datasetName });

		if (countExamples) {
			let count = 0;
			for await (const _ of lsClient.listExamples({ datasetId: dataset.id })) {
				count++;
			}
			return count;
		}
		return 0;
	} catch {
		// List available datasets for helpful error message
		const availableDatasets: string[] = [];
		for await (const dataset of lsClient.listDatasets()) {
			availableDatasets.push(`${dataset.name} (${dataset.id})`);
		}

		throw new Error(
			`Dataset "${datasetName}" not found. Available datasets: ${availableDatasets.join(', ') || 'none'}. ` +
				'Set LANGSMITH_DATASET_NAME environment variable to use a different dataset.',
		);
	}
}

/**
 * Runs evaluation using Langsmith
 * @param repetitions - Number of times to run each example (default: 1)
 * @param featureFlags - Optional feature flags to pass to the agent
 * @param experimentName - Optional custom experiment name (default: 'workflow-builder-evaluation')
 */
export async function runLangsmithEvaluation(
	repetitions: number = 1,
	featureFlags?: BuilderFeatureFlags,
	experimentName?: string,
	verbose: boolean = false,
): Promise<void> {
	const finalExperimentName = experimentName ?? DEFAULTS.LLM_JUDGE_EXPERIMENT_NAME;
	const log = createLogger(verbose);

	console.log(formatHeader('AI Workflow Builder Langsmith Evaluation', 70));
	log.info(`➔ Experiment: ${finalExperimentName}`);
	if (repetitions > 1) {
		log.warn(`➔ Each example will be run ${repetitions} times`);
	}
	if (featureFlags) {
		const enabledFlags = Object.entries(featureFlags)
			.filter(([, v]) => v === true)
			.map(([k]) => k);
		if (enabledFlags.length > 0) {
			log.success(`➔ Feature flags enabled: ${enabledFlags.join(', ')}`);
		}
	}
	console.log();

	try {
		// Check for Langsmith API key
		if (!process.env.LANGSMITH_API_KEY) {
			throw new Error('LANGSMITH_API_KEY environment variable not set');
		}

		// Setup test environment
		const { parsedNodeTypes, llm, lsClient, traceFilters } = await setupTestEnvironment(log);
		// Note: Don't use the tracer from setupTestEnvironment() here.
		// LangSmith's evaluate() manages its own tracing context - passing a separate
		// tracer would create disconnected runs in a different project.

		if (!lsClient) {
			throw new Error('Langsmith client not initialized');
		}

		// Reset filtering stats for accurate per-run statistics
		traceFilters?.resetStats();

		// Get dataset name from env or use default
		const datasetName = process.env.LANGSMITH_DATASET_NAME ?? 'workflow-builder-canvas-prompts';
		log.info(`➔ Using dataset: ${datasetName}`);

		// Verify dataset exists and get stats
		const exampleCount = await verifyDatasetAndCountExamples(lsClient, datasetName, verbose);

		// Verbose: dataset and model configuration
		if (verbose) {
			logVerboseConfig(log, exampleCount, repetitions);
		}

		console.log();
		const startTime = Date.now();

		// Create workflow generation function
		// Uses traceable wrapper internally for proper LangSmith context propagation
		const generateWorkflow = createWorkflowGenerator(parsedNodeTypes, llm, featureFlags);

		// Create evaluator with both LLM-based and programmatic evaluation
		const evaluator = createLangsmithEvaluator(llm, parsedNodeTypes);

		// Run Langsmith evaluation
		const results = await evaluate(generateWorkflow, {
			data: datasetName,
			evaluators: [evaluator],
			maxConcurrency: 7,
			experimentPrefix: finalExperimentName,
			numRepetitions: repetitions,
			client: lsClient,
			metadata: {
				evaluationType: 'llm-based',
				modelName: process.env.LLM_MODEL ?? 'default',
			},
		});

		// In verbose mode, iterate and log each result as it completes
		if (verbose) {
			log.verbose('');
			log.verbose('Results:');
		}
		await processResultsWithLogging(results, log, verbose);

		const totalTime = Date.now() - startTime;
		log.success(`✓ Evaluation completed in ${(totalTime / 1000).toFixed(1)}s`);

		// Log filtering statistics
		traceFilters?.logStats();

		// Display results information
		log.info('\nView detailed results in Langsmith dashboard');
		log.info(`Experiment name: ${finalExperimentName}-${new Date().toISOString().split('T')[0]}`);
	} catch (error) {
		log.error(
			`✗ Langsmith evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
		);
		process.exit(1);
	}
}
