import type { BaseMessage } from '@langchain/core/messages';
import type { EvaluationResult as LangsmithEvaluationResult } from 'langsmith/evaluation';
import { evaluate } from 'langsmith/evaluation';
import type { Run, Example } from 'langsmith/schemas';
import { traceable } from 'langsmith/traceable';

import type {
	Evaluator,
	TestCase,
	EvaluationContext,
	GlobalRunContext,
	TestCaseContext,
	Feedback,
	RunConfig,
	ExampleResult,
	RunSummary,
	EvaluationLifecycle,
} from './harness-types.js';
import { createArtifactSaver, type ArtifactSaver } from './output';
import { calculateWeightedScore } from './score-calculator';
import { extractMessageContent } from './types/langsmith';
import { createLogger, type EvalLogger } from './utils/logger';
import type { SimpleWorkflow } from '../src/types/workflow.js';

/** Pass/fail threshold for overall score */
const PASS_THRESHOLD = 0.7;

/** Store last results for testing */
let lastResults: ExampleResult[] = [];

/**
 * Get the results from the last evaluation run.
 * Useful for testing and inspection.
 */
export function getLastResults(): ExampleResult[] {
	return lastResults;
}

/**
 * Run evaluators in parallel for a single workflow.
 * Handles errors gracefully - skip and continue.
 */
async function evaluateWithPlugins(
	workflow: SimpleWorkflow,
	evaluators: Array<Evaluator<EvaluationContext>>,
	context: EvaluationContext,
	lifecycle?: Partial<EvaluationLifecycle>,
): Promise<Feedback[]> {
	const results = await Promise.all(
		evaluators.map(async (evaluator) => {
			try {
				const feedback = await evaluator.evaluate(workflow, context);
				lifecycle?.onEvaluatorComplete?.(evaluator.name, feedback);
				return feedback;
			} catch (error) {
				const evaluatorError = error instanceof Error ? error : new Error(String(error));
				lifecycle?.onEvaluatorError?.(evaluator.name, evaluatorError);
				return [
					{
						key: `${evaluator.name}.error`,
						score: 0,
						comment: evaluatorError.message,
					},
				];
			}
		}),
	);

	return results.flat();
}

/**
 * Calculate example score from feedback using evaluator-weighted scoring.
 */
function calculateExampleScore(feedback: Feedback[]): number {
	return calculateWeightedScore(feedback);
}

/**
 * Determine pass/fail status based on average score.
 */
function determineStatus(score: number): 'pass' | 'fail' {
	return score >= PASS_THRESHOLD ? 'pass' : 'fail';
}

/**
 * Build a typed evaluation context for evaluators.
 */
function buildContext(args: {
	prompt: string;
	globalContext?: GlobalRunContext;
	testCaseContext?: TestCaseContext;
	referenceWorkflow?: SimpleWorkflow;
}): EvaluationContext {
	const { prompt, globalContext, testCaseContext, referenceWorkflow } = args;

	return {
		prompt,
		...(globalContext ?? {}),
		...(testCaseContext ?? {}),
		...(referenceWorkflow ? { referenceWorkflow } : {}),
	};
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
	return isUnknownRecord(value) ? value : {};
}

function isSimpleWorkflow(value: unknown): value is SimpleWorkflow {
	return !!value && typeof value === 'object' && 'nodes' in value && 'connections' in value;
}

function extractContextFromLangsmithInputs(inputs: unknown): TestCaseContext {
	const record = asRecord(inputs);
	const context: TestCaseContext = {};

	if (typeof record.dos === 'string') context.dos = record.dos;
	if (typeof record.donts === 'string') context.donts = record.donts;

	if (isSimpleWorkflow(record.referenceWorkflow))
		context.referenceWorkflow = record.referenceWorkflow;
	if (
		Array.isArray(record.referenceWorkflows) &&
		record.referenceWorkflows.every((wf) => isSimpleWorkflow(wf))
	) {
		context.referenceWorkflows = record.referenceWorkflows;
	}

	return context;
}

async function runLocalExample(args: {
	index: number;
	total: number;
	testCase: TestCase;
	generateWorkflow: (prompt: string) => Promise<SimpleWorkflow>;
	evaluators: Array<Evaluator<EvaluationContext>>;
	globalContext?: GlobalRunContext;
	lifecycle?: Partial<EvaluationLifecycle>;
	artifactSaver?: ArtifactSaver | null;
}): Promise<ExampleResult> {
	const {
		index,
		total,
		testCase,
		generateWorkflow,
		evaluators,
		globalContext,
		lifecycle,
		artifactSaver,
	} = args;

	const startTime = Date.now();
	lifecycle?.onExampleStart?.(index, total, testCase.prompt);

	try {
		// Generate workflow
		const genStartTime = Date.now();
		const workflow = await generateWorkflow(testCase.prompt);
		const genDurationMs = Date.now() - genStartTime;
		lifecycle?.onWorkflowGenerated?.(workflow, genDurationMs);

		const context = buildContext({
			prompt: testCase.prompt,
			globalContext,
			testCaseContext: testCase.context,
			referenceWorkflow: testCase.referenceWorkflow,
		});

		// Run evaluators in parallel
		const feedback = await evaluateWithPlugins(workflow, evaluators, context, lifecycle);

		// Calculate result
		const score = calculateExampleScore(feedback);
		const status = determineStatus(score);
		const durationMs = Date.now() - startTime;

		const result: ExampleResult = {
			index,
			prompt: testCase.prompt,
			status,
			score,
			feedback,
			durationMs,
			workflow,
		};

		artifactSaver?.saveExample(result);
		lifecycle?.onExampleComplete?.(index, result);
		return result;
	} catch (error) {
		const durationMs = Date.now() - startTime;
		const result: ExampleResult = {
			index,
			prompt: testCase.prompt,
			status: 'error',
			score: 0,
			feedback: [],
			durationMs,
			error: error instanceof Error ? error.message : String(error),
		};

		artifactSaver?.saveExample(result);
		lifecycle?.onExampleComplete?.(index, result);
		return result;
	}
}

/**
 * Run evaluation in local mode.
 */
async function runLocal(config: RunConfig): Promise<RunSummary> {
	const {
		dataset,
		generateWorkflow,
		evaluators,
		context: globalContext,
		lifecycle,
		outputDir,
	} = config;

	if (typeof dataset === 'string') {
		throw new Error('Local mode requires dataset to be an array of test cases');
	}

	const testCases: TestCase[] = dataset;
	const results: ExampleResult[] = [];

	// Create artifact saver if outputDir is provided
	const artifactSaver = outputDir ? createArtifactSaver({ outputDir, verbose: true }) : null;

	lifecycle?.onStart?.(config);

	for (let i = 0; i < testCases.length; i++) {
		const testCase = testCases[i];
		const index = i + 1;
		const result = await runLocalExample({
			index,
			total: testCases.length,
			testCase,
			generateWorkflow,
			evaluators,
			globalContext,
			lifecycle,
			artifactSaver,
		});
		results.push(result);
	}

	// Build summary
	const passed = results.filter((r) => r.status === 'pass').length;
	const failed = results.filter((r) => r.status === 'fail').length;
	const errors = results.filter((r) => r.status === 'error').length;

	const averageScore =
		results.length > 0 ? results.reduce((sum, r) => sum + r.score, 0) / results.length : 0;
	const totalDurationMs = results.reduce((sum, r) => sum + r.durationMs, 0);

	const summary: RunSummary = {
		totalExamples: results.length,
		passed,
		failed,
		errors,
		averageScore,
		totalDurationMs,
	};

	// Save summary to disk if outputDir is provided
	artifactSaver?.saveSummary(summary, results);

	lifecycle?.onEnd?.(summary);
	lastResults = results;

	return summary;
}

/**
 * Output from LangSmith target function.
 */
interface LangsmithTargetOutput {
	workflow: SimpleWorkflow;
	prompt: string;
	feedback: Feedback[];
}

/**
 * Input from LangSmith dataset.
 * Supports both direct prompt string and messages array format.
 */
interface LangsmithDatasetInput {
	prompt?: string;
	messages?: BaseMessage[];
	evals?: Record<string, unknown>;
	[key: string]: unknown;
}

/**
 * Extract prompt from dataset input.
 * Supports both direct prompt and messages array format.
 */
function extractPrompt(inputs: LangsmithDatasetInput): string {
	// Direct prompt string
	if (inputs.prompt && typeof inputs.prompt === 'string') {
		return inputs.prompt;
	}

	// Messages array format
	if (inputs.messages && Array.isArray(inputs.messages) && inputs.messages.length > 0) {
		return extractMessageContent(inputs.messages[0]);
	}

	throw new Error('No prompt found in inputs - expected "prompt" string or "messages" array');
}

/**
 * Run evaluation in LangSmith mode.
 * This wraps generation + evaluation in a traceable function.
 */
async function runLangsmith(config: RunConfig): Promise<RunSummary> {
	const {
		dataset,
		generateWorkflow,
		evaluators,
		context: globalContext,
		langsmithOptions,
		lifecycle,
		logger: configLogger,
	} = config;

	// Create logger (defaults to silent if not provided)
	const logger: EvalLogger = configLogger ?? createLogger(false);

	if (!langsmithOptions) {
		throw new Error('langsmithOptions required for LangSmith mode');
	}

	// Enable tracing (required in langsmith 0.4.x)
	process.env.LANGSMITH_TRACING = 'true';

	lifecycle?.onStart?.(config);

	// Get properly configured client from setupTestEnvironment
	// This ensures traceable() and evaluate() use the same client configuration
	const { setupTestEnvironment } = await import('./core/environment');
	const { lsClient, traceFilters } = await setupTestEnvironment();

	if (!lsClient) {
		throw new Error('LangSmith client not initialized - check LANGSMITH_API_KEY');
	}

	// Reset filtering stats for this run
	traceFilters?.resetStats();

	// Create target function that does ALL work (generation + evaluation)
	// NOTE: Do NOT wrap target with traceable() - evaluate() handles that automatically
	// and applies critical options (on_end callback, reference_example_id, client).
	// Only wrap inner operations with traceable() for child traces.
	let targetCallCount = 0;
	const target = async (inputs: LangsmithDatasetInput): Promise<LangsmithTargetOutput> => {
		targetCallCount++;
		// Extract prompt from inputs (supports both direct prompt and messages array)
		const prompt = extractPrompt(inputs);
		const { evals: datasetContext, ...rest } = inputs;

		logger.verbose(`Starting workflow generation for: "${prompt.slice(0, 50)}..."`);
		const genStart = Date.now();

		// Generate workflow - wrapped in traceable for proper child trace visibility
		const traceableGenerate = traceable(async () => await generateWorkflow(prompt), {
			name: 'workflow_generation',
			run_type: 'chain',
		});
		const workflow = await traceableGenerate();
		logger.verbose(`Workflow generated in ${((Date.now() - genStart) / 1000).toFixed(1)}s`);

		const extracted = extractContextFromLangsmithInputs({
			...asRecord(datasetContext),
			...asRecord(rest),
		});
		const context = buildContext({ prompt, globalContext, testCaseContext: extracted });

		// Run all evaluators in parallel
		logger.verbose(`Running ${evaluators.length} evaluator(s)...`);
		const evalStart = Date.now();
		const feedback = await evaluateWithPlugins(workflow, evaluators, context, lifecycle);
		logger.verbose(
			`Evaluators completed in ${((Date.now() - evalStart) / 1000).toFixed(1)}s, ${feedback.length} feedback items`,
		);

		return {
			workflow,
			prompt,
			feedback,
		};
	};

	// Create LangSmith evaluator that extracts pre-computed feedback
	// This does NOT do any LLM calls - just returns outputs.feedback
	const feedbackExtractor = async (
		rootRun: Run,
		_example?: Example,
	): Promise<LangsmithEvaluationResult[]> => {
		const outputs = rootRun.outputs as LangsmithTargetOutput | undefined;

		if (!outputs?.feedback) {
			return [
				{
					key: 'evaluationError',
					score: 0,
					comment: 'No feedback found in target output',
				},
			];
		}

		// Convert our Feedback to LangSmith format (they're compatible)
		return outputs.feedback;
	};

	// Load examples if maxExamples is set
	if (typeof dataset !== 'string') {
		throw new Error('LangSmith mode requires dataset to be a dataset name string');
	}

	const datasetName = dataset;
	let data: string | Example[] = datasetName;

	if (langsmithOptions.maxExamples && langsmithOptions.maxExamples > 0) {
		logger.info(
			`Loading up to ${langsmithOptions.maxExamples} examples from dataset "${datasetName}"...`,
		);
		const examples: Example[] = [];
		try {
			const datasetInfo = await lsClient.readDataset({ datasetName });
			// Use limit parameter directly instead of fetching all and slicing
			for await (const example of lsClient.listExamples({
				datasetId: datasetInfo.id,
				limit: langsmithOptions.maxExamples,
			})) {
				examples.push(example);
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new Error(`Dataset "${datasetName}" not found: ${errorMessage}`);
		}

		data = examples;
		logger.verbose(`Loaded ${examples.length} examples`);
	}

	// Run LangSmith evaluation
	const exampleCount = Array.isArray(data) ? data.length : 'dataset';
	if (Array.isArray(data)) {
		logger.verbose(`Example IDs in data: ${data.map((e) => e.id).join(', ')}`);
	}
	logger.info(
		`Starting LangSmith evaluate() with ${exampleCount} examples, ${langsmithOptions.repetitions} repetitions, concurrency ${langsmithOptions.concurrency}...`,
	);
	const evalStartTime = Date.now();
	await evaluate(target, {
		data,
		evaluators: [feedbackExtractor],
		experimentPrefix: langsmithOptions.experimentName,
		// Only pass numRepetitions if > 1 (default is 1, passing 1 explicitly may cause issues)
		...(langsmithOptions.repetitions > 1 && { numRepetitions: langsmithOptions.repetitions }),
		maxConcurrency: langsmithOptions.concurrency,
		client: lsClient,
	});
	logger.info(
		`Evaluation completed in ${((Date.now() - evalStartTime) / 1000).toFixed(1)}s (target called ${targetCallCount} times)`,
	);

	// Flush pending traces to ensure all data is sent to LangSmith
	logger.verbose('Flushing pending trace batches...');
	const flushStartTime = Date.now();
	await lsClient.awaitPendingTraceBatches();
	logger.verbose(`Flush completed in ${((Date.now() - flushStartTime) / 1000).toFixed(1)}s`);

	// Log trace filtering statistics if enabled
	traceFilters?.logStats();

	// Return placeholder summary - LangSmith handles actual results
	const summary: RunSummary = {
		totalExamples: 0,
		passed: 0,
		failed: 0,
		errors: 0,
		averageScore: 0,
		totalDurationMs: 0,
	};

	lifecycle?.onEnd?.(summary);

	return summary;
}

/**
 * Main entry point for running evaluations.
 */
export async function runEvaluation(config: RunConfig): Promise<RunSummary> {
	if (config.mode === 'langsmith') {
		return await runLangsmith(config);
	}
	return await runLocal(config);
}
