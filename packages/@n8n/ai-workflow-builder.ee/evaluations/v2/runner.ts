import type { BaseMessage } from '@langchain/core/messages';
import type { EvaluationResult as LangsmithEvaluationResult } from 'langsmith/evaluation';
import { evaluate } from 'langsmith/evaluation';
import type { Run, Example } from 'langsmith/schemas';
import { traceable } from 'langsmith/traceable';

import type {
	Evaluator,
	TestCase,
	Feedback,
	RunConfig,
	ExampleResult,
	RunSummary,
	EvaluationLifecycle,
} from './types.js';
import type { SimpleWorkflow } from '../../src/types/workflow.js';
import { extractMessageContent } from '../types/langsmith';

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
	evaluators: Array<Evaluator<unknown>>,
	context: unknown,
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
 * Calculate average score from feedback array.
 */
function calculateAverageScore(feedback: Feedback[]): number {
	if (feedback.length === 0) return 0;
	const total = feedback.reduce((sum, f) => sum + f.score, 0);
	return total / feedback.length;
}

/**
 * Determine pass/fail status based on average score.
 */
function determineStatus(averageScore: number): 'pass' | 'fail' {
	return averageScore >= PASS_THRESHOLD ? 'pass' : 'fail';
}

/**
 * Build context for evaluators by merging global and test case context.
 */
function buildContext(globalContext: unknown, testCaseContext?: Record<string, unknown>): unknown {
	if (!globalContext && !testCaseContext) return undefined;
	if (!globalContext) return testCaseContext;
	if (!testCaseContext) return globalContext;
	return { ...(globalContext as object), ...testCaseContext };
}

/**
 * Run evaluation in local mode.
 */
async function runLocal(config: RunConfig): Promise<RunSummary> {
	const { dataset, generateWorkflow, evaluators, context: globalContext, lifecycle } = config;

	const testCases = dataset as TestCase[];
	const results: ExampleResult[] = [];

	lifecycle?.onStart?.(config);

	for (let i = 0; i < testCases.length; i++) {
		const testCase = testCases[i];
		const index = i + 1;
		const startTime = Date.now();

		lifecycle?.onExampleStart?.(index, testCases.length, testCase.prompt);

		try {
			// Generate workflow
			const genStartTime = Date.now();
			const workflow = await generateWorkflow(testCase.prompt);
			const genDurationMs = Date.now() - genStartTime;
			lifecycle?.onWorkflowGenerated?.(workflow, genDurationMs);

			// Build context - include prompt so LLM-judge evaluator can access it
			const context = buildContext(globalContext, {
				prompt: testCase.prompt,
				...testCase.context,
			});

			// Run evaluators in parallel
			const feedback = await evaluateWithPlugins(workflow, evaluators, context, lifecycle);

			// Calculate result
			const averageScore = calculateAverageScore(feedback);
			const status = determineStatus(averageScore);
			const durationMs = Date.now() - startTime;

			const result: ExampleResult = {
				index,
				prompt: testCase.prompt,
				status,
				feedback,
				durationMs,
				workflow,
			};

			results.push(result);
			lifecycle?.onExampleComplete?.(index, result);
		} catch (error) {
			const durationMs = Date.now() - startTime;
			const result: ExampleResult = {
				index,
				prompt: testCase.prompt,
				status: 'error',
				feedback: [],
				durationMs,
				error: error instanceof Error ? error.message : String(error),
			};

			results.push(result);
			lifecycle?.onExampleComplete?.(index, result);
		}
	}

	// Build summary
	const passed = results.filter((r) => r.status === 'pass').length;
	const failed = results.filter((r) => r.status === 'fail').length;
	const errors = results.filter((r) => r.status === 'error').length;

	const allFeedback = results.flatMap((r) => r.feedback);
	const averageScore = calculateAverageScore(allFeedback);
	const totalDurationMs = results.reduce((sum, r) => sum + r.durationMs, 0);

	const summary: RunSummary = {
		totalExamples: results.length,
		passed,
		failed,
		errors,
		averageScore,
		totalDurationMs,
	};

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
	} = config;

	if (!langsmithOptions) {
		throw new Error('langsmithOptions required for LangSmith mode');
	}

	lifecycle?.onStart?.(config);

	// Create target function that does ALL work (generation + evaluation)
	// This is the key fix for "Run not created by target function" error
	const target = traceable(
		async (inputs: LangsmithDatasetInput): Promise<LangsmithTargetOutput> => {
			// Extract prompt from inputs (supports both direct prompt and messages array)
			const prompt = extractPrompt(inputs);
			const { evals: datasetContext, ...rest } = inputs;

			// Generate workflow
			const workflow = await generateWorkflow(prompt);

			// Build context - merge global context with dataset-level context
			// IMPORTANT: Include prompt so LLM-judge evaluator can access it
			const context = buildContext(globalContext, {
				prompt,
				...datasetContext,
				...rest,
			} as Record<string, unknown>);

			// Run all evaluators in parallel
			const feedback = await evaluateWithPlugins(workflow, evaluators, context, lifecycle);

			return {
				workflow,
				prompt,
				feedback,
			};
		},
		{ name: 'workflow_evaluation', run_type: 'chain' },
	);

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

	// Run LangSmith evaluation
	await evaluate(target, {
		data: dataset as string,
		evaluators: [feedbackExtractor],
		experimentPrefix: langsmithOptions.experimentName,
		numRepetitions: langsmithOptions.repetitions,
		maxConcurrency: langsmithOptions.concurrency,
	});

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
