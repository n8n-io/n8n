import type { Client as LangsmithClient } from 'langsmith/client';
import type pLimit from 'p-limit';

import type { EvalLogger } from './logger.js';
import type { SimpleWorkflow } from '../../src/types/workflow.js';

export type LlmCallLimiter = ReturnType<typeof pLimit>;

/**
 * Shared context passed to all evaluators.
 *
 * Keep this as the single "base" context so callers (CLI/runner) never need casts.
 * Evaluators should validate required fields at runtime when optional fields are needed.
 */
export interface EvaluationContext {
	/** The original user prompt for this example */
	prompt: string;
	/** Pairwise criteria: required behaviors */
	dos?: string;
	/** Pairwise criteria: forbidden behaviors */
	donts?: string;
	/** Optional reference workflows for similarity-based checks (best match wins) */
	referenceWorkflows?: SimpleWorkflow[];
	/**
	 * Optional generator for multi-generation evaluations.
	 * When present, pairwise evaluator can generate multiple workflows from the same prompt.
	 */
	generateWorkflow?: (prompt: string) => Promise<SimpleWorkflow>;
	/**
	 * Optional limiter for LLM-bound work (generation + evaluators).
	 * When provided, treat it as the global knob for overall parallel LLM calls.
	 */
	llmCallLimiter?: LlmCallLimiter;
	/**
	 * Optional timeout used for LLM-bound work (generation + evaluators).
	 * Note: timeouts are best-effort unless underlying calls support cancellation (AbortSignal).
	 */
	timeoutMs?: number;
}

/** Context attached to an individual test case (prompt is provided separately). */
export type TestCaseContext = Omit<Partial<EvaluationContext>, 'prompt'>;

/** Global context attached to a run (prompt is provided per test case). */
export type GlobalRunContext = Omit<Partial<EvaluationContext>, 'prompt'>;

/**
 * What evaluators return - a single piece of feedback.
 */
export interface Feedback {
	/** Evaluator name emitting this feedback (e.g. `llm-judge`, `programmatic`) */
	evaluator: string;
	/** Metric name within the evaluator (e.g. `functionality`, `efficiency.nodeCountEfficiency`) */
	metric: string;
	score: number;
	comment?: string;
	/**
	 * Classification of this feedback item.
	 *
	 * - `score`: the single score used for overall scoring for this evaluator
	 * - `metric`: stable category-level metrics (useful for dashboards)
	 * - `detail`: unstable/verbose metrics that should not affect scoring
	 */
	kind: 'score' | 'metric' | 'detail';
}

/**
 * An evaluator that can assess a generated workflow.
 * Optionally typed with context for evaluator-specific data.
 */
export interface Evaluator<TContext = EvaluationContext> {
	name: string;
	evaluate(workflow: SimpleWorkflow, ctx: TContext): Promise<Feedback[]>;
}

/**
 * A single test case for evaluation.
 */
export interface TestCase {
	prompt: string;
	id?: string;
	/** Context passed to evaluators (e.g., pairwise dos/donts) */
	context?: TestCaseContext;
	/** Reference workflows for similarity comparison (best match wins) */
	referenceWorkflows?: SimpleWorkflow[];
}

/**
 * Configuration for an evaluation run.
 */
export interface RunConfigBase {
	/** Function to generate workflow from prompt */
	generateWorkflow: (prompt: string) => Promise<SimpleWorkflow>;
	/** Evaluators to run on each generated workflow */
	evaluators: Array<Evaluator<EvaluationContext>>;
	/** Global context available to all evaluators */
	context?: GlobalRunContext;
	/** Directory for JSON output files */
	outputDir?: string;
	/** Threshold for pass/fail classification of an example score (0-1). */
	passThreshold?: number;
	/** Timeout for generation/evaluator operations (ms). */
	timeoutMs?: number;
	/** Lifecycle hooks for logging and monitoring */
	lifecycle?: Partial<EvaluationLifecycle>;
	/** Logger for all output (use `createQuietLifecycle()` to suppress output in tests) */
	logger: EvalLogger;
}

export interface LocalRunConfig extends RunConfigBase {
	mode: 'local';
	/** Local mode requires an in-memory dataset */
	dataset: TestCase[];
	langsmithOptions?: never;
}

export interface LangsmithRunConfig extends RunConfigBase {
	mode: 'langsmith';
	/** LangSmith mode uses a remote dataset name */
	dataset: string;
	langsmithOptions: LangsmithOptions;
	/** LangSmith client used by both evaluate() and traceable() */
	langsmithClient: LangsmithClient;
}

export type RunConfig = LocalRunConfig | LangsmithRunConfig;

/**
 * LangSmith-specific configuration.
 */
export interface LangsmithOptions {
	experimentName: string;
	repetitions: number;
	concurrency: number;
	/** Maximum number of examples to evaluate from the dataset */
	maxExamples?: number;
	/** Optional dataset filtering (requires pre-loading examples). */
	filters?: LangsmithExampleFilters;
	/** Enable trace filtering to reduce payload sizes (default: true) */
	enableTraceFiltering?: boolean;
	/** Arbitrary metadata passed to LangSmith experiment (e.g., numJudges, scoringMethod) */
	experimentMetadata?: Record<string, unknown>;
}

export interface LangsmithExampleFilters {
	/** Filter by `example.metadata.notion_id`. */
	notionId?: string;
	/** Filter by `example.metadata.categories` (contains). */
	technique?: string;
	/** Filter by `example.inputs.evals.dos` (substring match, case-insensitive). */
	doSearch?: string;
	/** Filter by `example.inputs.evals.donts` (substring match, case-insensitive). */
	dontSearch?: string;
}

/**
 * Result of evaluating a single example.
 */
export interface ExampleResult {
	index: number;
	prompt: string;
	status: 'pass' | 'fail' | 'error';
	/** Example-level score (0-1). In v2 this should be scoring-strategy aware (not key-count dependent). */
	score: number;
	feedback: Feedback[];
	durationMs: number;
	/** Time spent generating the workflow, when known. */
	generationDurationMs?: number;
	/** Time spent running evaluators, when known. */
	evaluationDurationMs?: number;
	workflow?: SimpleWorkflow;
	error?: string;
}

/**
 * Summary of an entire evaluation run.
 */
export interface RunSummary {
	totalExamples: number;
	passed: number;
	failed: number;
	errors: number;
	averageScore: number;
	totalDurationMs: number;
	evaluatorAverages?: Record<string, number>;
}

/**
 * Lifecycle hooks for centralized logging and monitoring.
 */
export interface EvaluationLifecycle {
	onStart(config: RunConfig): void;
	onExampleStart(index: number, total: number, prompt: string): void;
	onWorkflowGenerated(workflow: SimpleWorkflow, durationMs: number): void;
	onEvaluatorComplete(name: string, feedback: Feedback[]): void;
	onEvaluatorError(name: string, error: Error): void;
	onExampleComplete(index: number, result: ExampleResult): void;
	onEnd(summary: RunSummary): void;
}
