import type { Callbacks } from '@langchain/core/callbacks/manager';
import type { BaseMessage } from '@langchain/core/messages';
import { evaluate } from 'langsmith/evaluation';
import type { Run, Example } from 'langsmith/schemas';
import { traceable } from 'langsmith/traceable';
import pLimit from 'p-limit';

import { getTracingCallbacks, runWithOptionalLimiter, withTimeout } from './evaluation-helpers';
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
	LlmCallLimiter,
} from './harness-types.js';
import type { EvalLogger } from './logger';
import { createArtifactSaver, type ArtifactSaver } from './output';
import {
	calculateWeightedScore,
	selectScoringItems,
	calculateFiniteAverage,
} from './score-calculator';
import type { SimpleWorkflow } from '../../src/types/workflow.js';
import { extractMessageContent } from '../langsmith/types';

const DEFAULT_PASS_THRESHOLD = 0.7;

/**
 * Run evaluators in parallel for a single workflow.
 * Handles errors gracefully - skip and continue.
 */
async function evaluateWithPlugins(
	workflow: SimpleWorkflow,
	evaluators: Array<Evaluator<EvaluationContext>>,
	context: EvaluationContext,
	timeoutMs: number | undefined,
	lifecycle?: Partial<EvaluationLifecycle>,
): Promise<Feedback[]> {
	const results = await Promise.all(
		evaluators.map(async (evaluator): Promise<Feedback[]> => {
			try {
				const feedback = await withTimeout({
					promise: evaluator.evaluate(workflow, context),
					timeoutMs,
					label: `evaluator:${evaluator.name}`,
				});
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
function determineStatus(args: { score: number; passThreshold: number }): 'pass' | 'fail' {
	const { score, passThreshold } = args;
	return score >= passThreshold ? 'pass' : 'fail';
}

function hasErrorFeedback(feedback: Feedback[]): boolean {
	return feedback.some((f) => f.metric === 'error');
}

/**
 * Build a typed evaluation context for evaluators.
 */
function buildContext(args: {
	prompt: string;
	globalContext?: GlobalRunContext;
	testCaseContext?: TestCaseContext;
	referenceWorkflows?: SimpleWorkflow[];
}): EvaluationContext {
	const { prompt, globalContext, testCaseContext, referenceWorkflows } = args;

	return {
		prompt,
		...(globalContext ?? {}),
		...(testCaseContext ?? {}),
		...(referenceWorkflows?.length ? { referenceWorkflows } : {}),
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

function isNumberArray2(value: unknown): value is [number, number] {
	return (
		Array.isArray(value) &&
		value.length === 2 &&
		typeof value[0] === 'number' &&
		Number.isFinite(value[0]) &&
		typeof value[1] === 'number' &&
		Number.isFinite(value[1])
	);
}

function isNodeLike(value: unknown): boolean {
	if (!isUnknownRecord(value)) return false;
	const name = value.name;
	const type = value.type;
	const typeVersion = value.typeVersion;
	const position = value.position;
	return (
		typeof name === 'string' &&
		name.length > 0 &&
		typeof type === 'string' &&
		type.length > 0 &&
		typeof typeVersion === 'number' &&
		Number.isFinite(typeVersion) &&
		isNumberArray2(position)
	);
}

function isConnectionsLike(value: unknown): boolean {
	if (!isUnknownRecord(value)) return false;
	for (const nodeConnections of Object.values(value)) {
		if (!isUnknownRecord(nodeConnections)) return false;
		for (const connectionTypeValue of Object.values(nodeConnections)) {
			if (!Array.isArray(connectionTypeValue)) return false;
			for (const output of connectionTypeValue) {
				if (!Array.isArray(output)) return false;
				for (const connection of output) {
					if (!isUnknownRecord(connection)) return false;
				}
			}
		}
	}
	return true;
}

function isSimpleWorkflow(value: unknown): value is SimpleWorkflow {
	if (!isUnknownRecord(value)) return false;
	if (!Array.isArray(value.nodes)) return false;
	if (!isConnectionsLike(value.connections)) return false;
	return value.nodes.every(isNodeLike);
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
	const kinds = new Set(['score', 'metric', 'detail'] as const);
	return (
		isUnknownRecord(value) &&
		typeof value.evaluator === 'string' &&
		typeof value.metric === 'string' &&
		typeof value.score === 'number' &&
		typeof value.kind === 'string' &&
		kinds.has(value.kind as 'score' | 'metric' | 'detail')
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

	// Support both legacy referenceWorkflow (single) and referenceWorkflows (array) from dataset
	if (
		Array.isArray(record.referenceWorkflows) &&
		record.referenceWorkflows.every((wf) => isSimpleWorkflow(wf))
	) {
		context.referenceWorkflows = record.referenceWorkflows;
	} else if (isSimpleWorkflow(record.referenceWorkflow)) {
		// Convert legacy single reference to array
		context.referenceWorkflows = [record.referenceWorkflow];
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
	passThreshold: number;
	timeoutMs: number | undefined;
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
		passThreshold,
		timeoutMs,
		lifecycle,
		artifactSaver,
	} = args;

	const startTime = Date.now();
	lifecycle?.onExampleStart?.(index, total, testCase.prompt);

	try {
		// Generate workflow
		const genStartTime = Date.now();
		const workflow = await runWithOptionalLimiter(async () => {
			return await withTimeout({
				promise: generateWorkflow(testCase.prompt),
				timeoutMs,
				label: 'workflow_generation',
			});
		}, globalContext?.llmCallLimiter);
		const genDurationMs = Date.now() - genStartTime;
		lifecycle?.onWorkflowGenerated?.(workflow, genDurationMs);

		const context = buildContext({
			prompt: testCase.prompt,
			globalContext: {
				...(globalContext ?? {}),
				timeoutMs,
			},
			testCaseContext: testCase.context,
			referenceWorkflows: testCase.referenceWorkflows,
		});

		// Run evaluators in parallel
		const evalStartTime = Date.now();
		const feedback = await evaluateWithPlugins(workflow, evaluators, context, timeoutMs, lifecycle);
		const evalDurationMs = Date.now() - evalStartTime;

		// Calculate result
		const score = calculateExampleScore(feedback);
		const status = hasErrorFeedback(feedback) ? 'error' : determineStatus({ score, passThreshold });
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
		const errorMessage = error instanceof Error ? error.message : String(error);
		const result: ExampleResult = {
			index,
			prompt: testCase.prompt,
			status: 'error',
			score: 0,
			feedback: [
				{
					evaluator: 'runner',
					metric: 'error',
					score: 0,
					kind: 'score',
					comment: errorMessage,
				},
			],
			durationMs,
			error: errorMessage,
		};

		artifactSaver?.saveExample(result);
		lifecycle?.onExampleComplete?.(index, result);
		return result;
	}
}

/**
 * Run evaluation in local mode.
 */
function createArtifactSaverIfRequested(args: {
	outputDir?: string;
	logger: EvalLogger;
}): ArtifactSaver | null {
	const { outputDir, logger } = args;
	if (!outputDir) return null;
	return createArtifactSaver({ outputDir, logger });
}

async function runLocalDataset(params: {
	testCases: TestCase[];
	generateWorkflow: (prompt: string) => Promise<SimpleWorkflow>;
	evaluators: Array<Evaluator<EvaluationContext>>;
	globalContext?: GlobalRunContext;
	passThreshold: number;
	timeoutMs: number | undefined;
	lifecycle?: Partial<EvaluationLifecycle>;
	artifactSaver: ArtifactSaver | null;
}): Promise<ExampleResult[]> {
	const {
		testCases,
		generateWorkflow,
		evaluators,
		globalContext,
		passThreshold,
		timeoutMs,
		lifecycle,
		artifactSaver,
	} = params;

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
			passThreshold,
			timeoutMs,
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

/**
 * Compute average scores per evaluator from example results.
 */
function computeEvaluatorAverages(
	results: ExampleResult[],
	logger?: EvalLogger,
): Record<string, number> {
	const evaluatorStats: Record<string, { scores: number[] }> = {};

	for (const result of results) {
		// Group feedback by evaluator
		const byEvaluator: Record<string, Feedback[]> = {};
		for (const fb of result.feedback) {
			if (!byEvaluator[fb.evaluator]) byEvaluator[fb.evaluator] = [];
			byEvaluator[fb.evaluator].push(fb);
		}

		// Calculate per-evaluator average for this example
		for (const [evaluator, items] of Object.entries(byEvaluator)) {
			if (!evaluatorStats[evaluator]) {
				evaluatorStats[evaluator] = { scores: [] };
			}
			const scoringItems = selectScoringItems(items);
			const avg = calculateFiniteAverage(scoringItems);
			evaluatorStats[evaluator].scores.push(avg);
		}
	}

	// Compute overall average per evaluator
	const evaluatorAverages: Record<string, number> = {};
	for (const [name, stats] of Object.entries(evaluatorStats)) {
		const avg = stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length;
		logger?.verbose(
			`[computeEvaluatorAverages] Final avg for "${name}": ${stats.scores.join(', ')} -> ${avg}`,
		);
		evaluatorAverages[name] = avg;
	}

	logger?.verbose(`[computeEvaluatorAverages] Final result: ${JSON.stringify(evaluatorAverages)}`);
	return evaluatorAverages;
}

interface LangsmithSummaryParams {
	stats: {
		total: number;
		passed: number;
		failed: number;
		errors: number;
		scoreSum: number;
		durationSumMs: number;
	};
	langsmithData: {
		experimentName?: string;
		experimentId?: string;
		datasetId?: string;
	};
	evaluatorAverages?: Record<string, number>;
}

function buildLangsmithSummary(params: LangsmithSummaryParams): RunSummary {
	const { stats, langsmithData, evaluatorAverages } = params;
	const { experimentName, experimentId, datasetId } = langsmithData;

	const summary: RunSummary = {
		totalExamples: stats.total,
		passed: stats.passed,
		failed: stats.failed,
		errors: stats.errors,
		averageScore: stats.total > 0 ? stats.scoreSum / stats.total : 0,
		totalDurationMs: stats.durationSumMs,
		evaluatorAverages,
	};

	// Add LangSmith IDs if available
	if (experimentName && experimentId && datasetId) {
		summary.langsmith = { experimentName, experimentId, datasetId };
	}

	return summary;
}

async function runLocal(config: LocalRunConfig): Promise<RunSummary> {
	const {
		dataset,
		generateWorkflow,
		evaluators,
		context: globalContext,
		passThreshold = DEFAULT_PASS_THRESHOLD,
		timeoutMs,
		lifecycle,
		outputDir,
		logger,
	} = config;

	const testCases: TestCase[] = dataset;
	if (testCases.length === 0) {
		logger.warn('No test cases provided');
	}

	const effectiveGlobalContext: GlobalRunContext = {
		...(globalContext ?? {}),
		llmCallLimiter: globalContext?.llmCallLimiter ?? pLimit(4),
		timeoutMs,
	};

	// Create artifact saver if outputDir is provided
	const artifactSaver = createArtifactSaverIfRequested({ outputDir, logger });

	lifecycle?.onStart?.(config);

	const results = await runLocalDataset({
		testCases,
		generateWorkflow,
		evaluators,
		globalContext: effectiveGlobalContext,
		passThreshold,
		timeoutMs,
		lifecycle,
		artifactSaver,
	});
	const summary = buildRunSummary(results);

	// Save summary to disk if outputDir is provided
	artifactSaver?.saveSummary(summary, results);

	lifecycle?.onEnd?.(summary);

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

function createLangsmithFeedbackExtractor(): (
	rootRun: Run,
	_example?: Example,
) => Promise<Array<{ key: string; score: number; comment?: string }>> {
	return async (rootRun: Run, _example?: Example) => {
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
}

function applyRepetitions(data: string | Example[], repetitions: number): string | Example[] {
	if (!Array.isArray(data) || repetitions <= 1) return data;
	return Array.from({ length: repetitions }, () => data).flat();
}

function computeFilterMetadata(filters?: LangsmithExampleFilters): {
	runType: string;
	filterValue?: string;
} {
	if (!filters) return { runType: 'full' };

	const parts: string[] = [];
	const values: string[] = [];

	if (filters.notionId) {
		parts.push('id');
		values.push(`id:${filters.notionId}`);
	}
	if (filters.technique) {
		parts.push('category');
		values.push(`category:${filters.technique}`);
	}
	if (filters.doSearch) {
		parts.push('do');
		values.push(`do:${filters.doSearch}`);
	}
	if (filters.dontSearch) {
		parts.push('dont');
		values.push(`dont:${filters.dontSearch}`);
	}

	if (parts.length === 0) return { runType: 'full' };

	return {
		runType: `by-${parts.join('-and-')}`,
		filterValue: values.join(' '),
	};
}

function logLangsmithInputsSummary(logger: EvalLogger, effectiveData: string | Example[]): void {
	if (!Array.isArray(effectiveData)) {
		logger.verbose('Data source: dataset (streaming)');
		return;
	}

	logger.verbose(`Data source: preloaded examples (${effectiveData.length})`);
	logger.verbose(
		`Example IDs in data: ${effectiveData
			.slice(0, 20)
			.map((e) => e.id)
			.join(', ')}`,
	);
}

async function runLangsmithEvaluateAndFlush(params: {
	target: (inputs: LangsmithDatasetInput) => Promise<LangsmithTargetOutput>;
	effectiveData: string | Example[];
	feedbackExtractor: ReturnType<typeof createLangsmithFeedbackExtractor>;
	langsmithOptions: LangsmithRunConfig['langsmithOptions'];
	lsClient: LangsmithRunConfig['langsmithClient'];
	logger: EvalLogger;
	targetCallCount: () => number;
}): Promise<{
	experimentName?: string;
	experimentId?: string;
	datasetId?: string;
}> {
	const {
		target,
		effectiveData,
		feedbackExtractor,
		langsmithOptions,
		lsClient,
		logger,
		targetCallCount,
	} = params;

	const exampleCount = Array.isArray(effectiveData) ? effectiveData.length : 'dataset';

	logger.info(
		`Starting LangSmith evaluate() with ${exampleCount} examples, ${langsmithOptions.repetitions} repetitions, concurrency ${langsmithOptions.concurrency}...`,
	);

	const { runType, filterValue } = computeFilterMetadata(langsmithOptions.filters);

	const evalStartTime = Date.now();
	const experimentResults = await evaluate(target, {
		data: effectiveData,
		evaluators: [feedbackExtractor],
		experimentPrefix: langsmithOptions.experimentName,
		// Repetitions are applied explicitly when pre-loading examples to keep behavior consistent.
		// When streaming from a dataset name, the SDK may support repetitions internally.
		...(!Array.isArray(effectiveData) &&
			langsmithOptions.repetitions > 1 && { numRepetitions: langsmithOptions.repetitions }),
		maxConcurrency: langsmithOptions.concurrency,
		client: lsClient,
		metadata: {
			repetitions: langsmithOptions.repetitions,
			concurrency: langsmithOptions.concurrency,
			runType,
			...(filterValue && { filterValue }),
			...langsmithOptions.experimentMetadata,
		},
	});
	logger.info(
		`Evaluation completed in ${((Date.now() - evalStartTime) / 1000).toFixed(1)}s (target called ${targetCallCount()} times)`,
	);

	// Flush pending traces to ensure all data is sent to LangSmith
	logger.verbose('Flushing pending trace batches...');
	const flushStartTime = Date.now();
	await lsClient.awaitPendingTraceBatches();
	logger.verbose(`Flush completed in ${((Date.now() - flushStartTime) / 1000).toFixed(1)}s`);

	const experimentName = experimentResults.experimentName;
	logger.info(`Experiment completed: ${experimentName}`);

	let experimentId: string | undefined;
	let datasetId: string | undefined;

	try {
		const manager = (
			experimentResults as unknown as {
				manager?: { _getExperiment?: () => { id: string }; datasetId?: Promise<string> };
			}
		).manager;
		if (manager?._getExperiment) {
			experimentId = manager._getExperiment().id;
		}
		if (manager?.datasetId) {
			datasetId = await manager.datasetId;
		}
	} catch {
		logger.verbose('Could not extract LangSmith IDs from experiment results');
	}

	return { experimentName, experimentId, datasetId };
}

/**
 * Run evaluation in LangSmith mode.
 */
async function runLangsmith(config: LangsmithRunConfig): Promise<RunSummary> {
	const {
		dataset,
		generateWorkflow,
		evaluators,
		context: globalContext,
		outputDir,
		passThreshold = DEFAULT_PASS_THRESHOLD,
		timeoutMs,
		langsmithOptions,
		langsmithClient: lsClient,
		lifecycle,
		logger,
	} = config;

	// Enable tracing (required in langsmith 0.4.x)
	process.env.LANGSMITH_TRACING = 'true';

	lifecycle?.onStart?.(config);

	const effectiveGlobalContext: GlobalRunContext = {
		...(globalContext ?? {}),
		llmCallLimiter: globalContext?.llmCallLimiter ?? pLimit(langsmithOptions.concurrency),
		timeoutMs,
	};

	const artifactSaver = createArtifactSaverIfRequested({ outputDir, logger });
	const capturedResults: ExampleResult[] = [];

	// Create traceable wrapper ONCE outside target function to avoid context leaking
	// when running concurrent evaluations. Pass all parameters explicitly (no closures).
	// IMPORTANT: Get callbacks INSIDE the traceable wrapper where AsyncLocalStorage context
	// is correctly set, then pass them explicitly to genFn to avoid race conditions.
	const traceableGenerateWorkflow = traceable(
		async (args: {
			prompt: string;
			genFn: (prompt: string, callbacks?: Callbacks) => Promise<SimpleWorkflow>;
			limiter?: LlmCallLimiter;
			genTimeoutMs?: number;
		}): Promise<SimpleWorkflow> => {
			// Get callbacks inside traceable where context is correct
			// Returns undefined if not in a traceable context (e.g., unit tests)
			const callbacks = await getTracingCallbacks();

			return await runWithOptionalLimiter(async () => {
				return await withTimeout({
					promise: args.genFn(args.prompt, callbacks),
					timeoutMs: args.genTimeoutMs,
					label: 'workflow_generation',
				});
			}, args.limiter);
		},
		{
			name: 'workflow_generation',
			run_type: 'chain',
			client: lsClient,
		},
	);

	// Create target function that does ALL work (generation + evaluation)
	// NOTE: Do NOT wrap target with traceable() - evaluate() handles tracing automatically.
	let targetCallCount = 0;
	let totalExamples = 0;
	const stats = {
		total: 0,
		passed: 0,
		failed: 0,
		errors: 0,
		scoreSum: 0,
		durationSumMs: 0,
	};
	const target = async (inputs: LangsmithDatasetInput): Promise<LangsmithTargetOutput> => {
		targetCallCount++;
		const index = targetCallCount;
		// Extract prompt from inputs (supports both direct prompt and messages array)
		const prompt = extractPrompt(inputs);
		const { evals: datasetContext, ...rest } = inputs;

		lifecycle?.onExampleStart?.(index, totalExamples, prompt);
		const startTime = Date.now();
		const genStart = Date.now();

		try {
			const workflow = await traceableGenerateWorkflow({
				prompt,
				genFn: generateWorkflow,
				limiter: effectiveGlobalContext.llmCallLimiter,
				genTimeoutMs: timeoutMs,
			});
			const genDurationMs = Date.now() - genStart;
			lifecycle?.onWorkflowGenerated?.(workflow, genDurationMs);

			const extracted = extractContextFromLangsmithInputs({
				...asRecord(datasetContext),
				...asRecord(rest),
			});
			const context = buildContext({
				prompt,
				globalContext: effectiveGlobalContext,
				testCaseContext: extracted,
			});

			// Run all evaluators in parallel
			const evalStart = Date.now();
			const feedback = await evaluateWithPlugins(
				workflow,
				evaluators,
				context,
				timeoutMs,
				lifecycle,
			);
			const evalDurationMs = Date.now() - evalStart;
			const totalDurationMs = Date.now() - startTime;

			const score = calculateExampleScore(feedback);
			const status = hasErrorFeedback(feedback)
				? 'error'
				: determineStatus({ score, passThreshold });

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
				workflow,
			};

			artifactSaver?.saveExample(result);
			capturedResults.push(result);
			lifecycle?.onExampleComplete?.(index, result);

			return {
				workflow,
				prompt,
				feedback,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			const workflow: SimpleWorkflow = { name: 'Evaluation Error', nodes: [], connections: {} };
			const feedback: Feedback[] = [
				{
					evaluator: 'runner',
					metric: 'error',
					score: 0,
					kind: 'score',
					comment: errorMessage,
				},
			];

			const totalDurationMs = Date.now() - startTime;
			const genDurationMs = Date.now() - genStart;
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
				generationDurationMs: genDurationMs,
				workflow,
				error: errorMessage,
			};

			artifactSaver?.saveExample(result);
			capturedResults.push(result);
			lifecycle?.onExampleComplete?.(index, result);

			return { workflow, prompt, feedback };
		}
	};

	const feedbackExtractor = createLangsmithFeedbackExtractor();

	// Load examples if maxExamples is set
	if (typeof dataset !== 'string') {
		throw new Error('LangSmith mode requires dataset to be a dataset name string');
	}

	let data = await resolveLangsmithData({ dataset, langsmithOptions, lsClient, logger });
	// Defensive: if maxExamples/filters were requested but we still got a dataset name,
	// fall back to preloading so we can honor limits instead of streaming everything.
	if (
		typeof data === 'string' &&
		((langsmithOptions.maxExamples ?? 0) > 0 || langsmithOptions.filters !== undefined)
	) {
		data = await loadExamplesFromDataset({
			lsClient,
			datasetName: data,
			maxExamples: langsmithOptions.maxExamples,
			filters: langsmithOptions.filters,
		});
	}

	const effectiveData = applyRepetitions(data, langsmithOptions.repetitions);

	totalExamples = Array.isArray(effectiveData) ? effectiveData.length : 0;

	logLangsmithInputsSummary(logger, effectiveData);
	const { experimentName, experimentId, datasetId } = await runLangsmithEvaluateAndFlush({
		target,
		effectiveData,
		feedbackExtractor,
		langsmithOptions,
		lsClient,
		logger,
		targetCallCount: () => targetCallCount,
	});

	// Compute evaluator averages from captured results

	const evaluatorAverages = computeEvaluatorAverages(capturedResults, logger);

	const summary: RunSummary = buildLangsmithSummary({
		stats,
		langsmithData: { experimentName, experimentId, datasetId },
		evaluatorAverages,
	});

	if (artifactSaver) {
		artifactSaver.saveSummary(summary, capturedResults);
	}

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
