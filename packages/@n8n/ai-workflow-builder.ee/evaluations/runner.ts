import type { BaseMessage } from '@langchain/core/messages';
import { evaluate } from 'langsmith/evaluation';
import type { Run, Example } from 'langsmith/schemas';
import { traceable } from 'langsmith/traceable';

import { toLangsmithEvaluationResult } from './feedback';
import type {
	Evaluator,
	TestCase,
	EvaluationContext,
	GlobalRunContext,
	TestCaseContext,
	Feedback,
	RunConfig,
	LocalRunConfig,
	LangsmithRunConfig,
	ExampleResult,
	RunSummary,
	EvaluationLifecycle,
	LangsmithExampleFilters,
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
		evaluators.map(async (evaluator): Promise<Feedback[]> => {
			try {
				const feedback = await evaluator.evaluate(workflow, context);
				lifecycle?.onEvaluatorComplete?.(evaluator.name, feedback);
				return feedback;
			} catch (error) {
				const evaluatorError = error instanceof Error ? error : new Error(String(error));
				lifecycle?.onEvaluatorError?.(evaluator.name, evaluatorError);
				const errorFeedback: Feedback = {
					evaluator: evaluator.name,
					metric: 'error',
					score: 0,
					kind: 'score',
					comment: evaluatorError.message,
				};
				return [errorFeedback];
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

function isUnknownArray(value: unknown): value is unknown[] {
	return Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
	return isUnknownRecord(value) ? value : {};
}

function isSimpleWorkflow(value: unknown): value is SimpleWorkflow {
	return !!value && typeof value === 'object' && 'nodes' in value && 'connections' in value;
}

function getNotionIdFromMetadata(metadata: unknown): string | undefined {
	const record = asRecord(metadata);
	return typeof record.notion_id === 'string' ? record.notion_id : undefined;
}

function getCategoriesFromMetadata(metadata: unknown): string[] | undefined {
	const record = asRecord(metadata);
	const categories = record.categories;
	if (!Array.isArray(categories)) return undefined;
	const strings = categories.filter((c): c is string => typeof c === 'string');
	return strings.length > 0 ? strings : undefined;
}

function getEvalsFromExampleInputs(exampleInputs: unknown): { dos?: string; donts?: string } {
	const inputs = asRecord(exampleInputs);
	const evals = asRecord(inputs.evals);
	const result: { dos?: string; donts?: string } = {};
	if (typeof evals.dos === 'string') result.dos = evals.dos;
	if (typeof evals.donts === 'string') result.donts = evals.donts;
	return result;
}

function isFeedback(value: unknown): value is Feedback {
	return (
		isUnknownRecord(value) &&
		typeof value.evaluator === 'string' &&
		typeof value.metric === 'string' &&
		typeof value.score === 'number'
	);
}

function exampleMatchesFilters(example: Example, filters: LangsmithExampleFilters): boolean {
	if (filters.notionId) {
		if (getNotionIdFromMetadata(example.metadata) !== filters.notionId) return false;
	}

	if (filters.technique) {
		const categories = getCategoriesFromMetadata(example.metadata) ?? [];
		if (!categories.includes(filters.technique)) return false;
	}

	if (filters.doSearch || filters.dontSearch) {
		const { dos, donts } = getEvalsFromExampleInputs(example.inputs);
		if (filters.doSearch) {
			const haystack = (dos ?? '').toLowerCase();
			if (!haystack.includes(filters.doSearch.toLowerCase())) return false;
		}
		if (filters.dontSearch) {
			const haystack = (donts ?? '').toLowerCase();
			if (!haystack.includes(filters.dontSearch.toLowerCase())) return false;
		}
	}

	return true;
}

async function loadExamplesFromDataset(params: {
	lsClient: {
		readDataset: (args: { datasetName: string }) => Promise<{ id: string }>;
		listExamples: (args: { datasetId: string; limit?: number }) => AsyncIterable<Example>;
	};
	datasetName: string;
	maxExamples?: number;
	filters?: LangsmithExampleFilters;
}): Promise<Example[]> {
	const { lsClient, datasetName, maxExamples, filters } = params;

	const datasetInfo = await lsClient.readDataset({ datasetName });
	const matches: Example[] = [];

	let scanned = 0;
	const listArgs: { datasetId: string; limit?: number } = { datasetId: datasetInfo.id };
	if (!filters && maxExamples) listArgs.limit = maxExamples;

	for await (const example of lsClient.listExamples(listArgs)) {
		scanned++;
		if (filters && !exampleMatchesFilters(example, filters)) continue;
		matches.push(example);
		if (maxExamples && matches.length >= maxExamples) break;
	}

	if (filters && matches.length === 0) {
		const filterSummary = [
			filters.notionId ? `id:${filters.notionId}` : undefined,
			filters.technique ? `technique:${filters.technique}` : undefined,
			filters.doSearch ? `do:${filters.doSearch}` : undefined,
			filters.dontSearch ? `dont:${filters.dontSearch}` : undefined,
		]
			.filter((v): v is string => v !== undefined)
			.join(', ');

		throw new Error(
			`No examples matched filters (${filterSummary}) in dataset "${datasetName}" (scanned ${scanned})`,
		);
	}

	if (!filters && maxExamples && matches.length === 0) {
		throw new Error(`No examples found in dataset "${datasetName}"`);
	}

	return matches;
}

async function resolveLangsmithData(params: {
	dataset: string;
	langsmithOptions: LangsmithRunConfig['langsmithOptions'];
	lsClient: {
		readDataset: (args: { datasetName: string }) => Promise<{ id: string }>;
		listExamples: (args: { datasetId: string; limit?: number }) => AsyncIterable<Example>;
	};
	logger: EvalLogger;
}): Promise<string | Example[]> {
	const { dataset, langsmithOptions, lsClient, logger } = params;

	const datasetName = dataset;
	const maxExamples = langsmithOptions.maxExamples;
	const filters = langsmithOptions.filters;

	const shouldLoadExamples =
		(typeof maxExamples === 'number' && maxExamples > 0) || filters !== undefined;

	if (!shouldLoadExamples) return datasetName;

	logger.info(
		filters
			? `Loading examples from dataset "${datasetName}" with filters...`
			: `Loading up to ${maxExamples} examples from dataset "${datasetName}"...`,
	);

	try {
		return await loadExamplesFromDataset({
			lsClient,
			datasetName,
			maxExamples,
			filters,
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		if (
			errorMessage.startsWith('No examples matched filters') ||
			errorMessage.startsWith('No examples found in dataset')
		) {
			throw error instanceof Error ? error : new Error(errorMessage);
		}
		throw new Error(`Dataset "${datasetName}" not found: ${errorMessage}`);
	}
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
		const evalStartTime = Date.now();
		const feedback = await evaluateWithPlugins(workflow, evaluators, context, lifecycle);
		const evalDurationMs = Date.now() - evalStartTime;

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
			generationDurationMs: genDurationMs,
			evaluationDurationMs: evalDurationMs,
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
function createArtifactSaverIfRequested(outputDir?: string): ArtifactSaver | null {
	if (!outputDir) return null;
	return createArtifactSaver({ outputDir, verbose: true });
}

async function runLocalDataset(params: {
	testCases: TestCase[];
	generateWorkflow: (prompt: string) => Promise<SimpleWorkflow>;
	evaluators: Array<Evaluator<EvaluationContext>>;
	globalContext?: GlobalRunContext;
	lifecycle?: Partial<EvaluationLifecycle>;
	artifactSaver: ArtifactSaver | null;
}): Promise<ExampleResult[]> {
	const { testCases, generateWorkflow, evaluators, globalContext, lifecycle, artifactSaver } =
		params;

	const results: ExampleResult[] = [];
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
	return results;
}

function buildRunSummary(results: ExampleResult[]): RunSummary {
	const passed = results.filter((r) => r.status === 'pass').length;
	const failed = results.filter((r) => r.status === 'fail').length;
	const errors = results.filter((r) => r.status === 'error').length;

	const averageScore =
		results.length > 0 ? results.reduce((sum, r) => sum + r.score, 0) / results.length : 0;
	const totalDurationMs = results.reduce((sum, r) => sum + r.durationMs, 0);

	return {
		totalExamples: results.length,
		passed,
		failed,
		errors,
		averageScore,
		totalDurationMs,
	};
}

async function runLocal(config: LocalRunConfig): Promise<RunSummary> {
	const {
		dataset,
		generateWorkflow,
		evaluators,
		context: globalContext,
		lifecycle,
		outputDir,
	} = config;

	const testCases: TestCase[] = dataset;

	// Create artifact saver if outputDir is provided
	const artifactSaver = createArtifactSaverIfRequested(outputDir);

	lifecycle?.onStart?.(config);

	const results = await runLocalDataset({
		testCases,
		generateWorkflow,
		evaluators,
		globalContext,
		lifecycle,
		artifactSaver,
	});
	const summary = buildRunSummary(results);

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
async function runLangsmith(config: LangsmithRunConfig): Promise<RunSummary> {
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

	// Enable tracing (required in langsmith 0.4.x)
	process.env.LANGSMITH_TRACING = 'true';

	lifecycle?.onStart?.(config);

	// Get properly configured client from setupTestEnvironment
	// This ensures traceable() and evaluate() use the same client configuration
	const { setupTestEnvironment } = await import('./core/environment');
	const { lsClient } = await setupTestEnvironment();

	if (!lsClient) {
		throw new Error('LangSmith client not initialized - check LANGSMITH_API_KEY');
	}

	// Create target function that does ALL work (generation + evaluation)
	// NOTE: Do NOT wrap target with traceable() - evaluate() handles that automatically
	// and applies critical options (on_end callback, reference_example_id, client).
	// Only wrap inner operations with traceable() for child traces.
	let targetCallCount = 0;
	let totalExamples = 0;
	const target = async (inputs: LangsmithDatasetInput): Promise<LangsmithTargetOutput> => {
		targetCallCount++;
		const index = targetCallCount;
		// Extract prompt from inputs (supports both direct prompt and messages array)
		const prompt = extractPrompt(inputs);
		const { evals: datasetContext, ...rest } = inputs;

		lifecycle?.onExampleStart?.(index, totalExamples, prompt);
		const startTime = Date.now();
		const genStart = Date.now();

		// Generate workflow - wrapped in traceable for proper child trace visibility
		const traceableGenerate = traceable(async () => await generateWorkflow(prompt), {
			name: 'workflow_generation',
			run_type: 'chain',
		});
		const workflow = await traceableGenerate();
		const genDurationMs = Date.now() - genStart;
		lifecycle?.onWorkflowGenerated?.(workflow, genDurationMs);

		const extracted = extractContextFromLangsmithInputs({
			...asRecord(datasetContext),
			...asRecord(rest),
		});
		const context = buildContext({ prompt, globalContext, testCaseContext: extracted });

		// Run all evaluators in parallel
		const evalStart = Date.now();
		const feedback = await evaluateWithPlugins(workflow, evaluators, context, lifecycle);
		const evalDurationMs = Date.now() - evalStart;

		const totalDurationMs = Date.now() - startTime;
		const score = calculateExampleScore(feedback);
		const status = determineStatus(score);
		lifecycle?.onExampleComplete?.(index, {
			index,
			prompt,
			status,
			score,
			feedback,
			durationMs: totalDurationMs,
			generationDurationMs: genDurationMs,
			evaluationDurationMs: evalDurationMs,
			workflow,
		});

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
	): Promise<Array<{ key: string; score: number; comment?: string }>> => {
		const outputs = rootRun.outputs;
		const feedback =
			isUnknownRecord(outputs) &&
			isUnknownArray(outputs.feedback) &&
			outputs.feedback.every(isFeedback)
				? outputs.feedback
				: undefined;

		if (!feedback) {
			return [
				{
					key: 'evaluationError',
					score: 0,
					comment: 'No feedback found in target output',
				},
			];
		}

		return feedback.map((fb) => toLangsmithEvaluationResult(fb));
	};

	// Load examples if maxExamples is set
	if (typeof dataset !== 'string') {
		throw new Error('LangSmith mode requires dataset to be a dataset name string');
	}

	const data = await resolveLangsmithData({ dataset, langsmithOptions, lsClient, logger });
	totalExamples = Array.isArray(data) ? data.length : 0;

	logger.verbose(
		Array.isArray(data)
			? `Data source: preloaded examples (${data.length})`
			: 'Data source: dataset (streaming)',
	);

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
