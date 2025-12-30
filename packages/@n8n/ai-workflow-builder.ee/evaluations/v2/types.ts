import type { SimpleWorkflow } from '../../src/types/workflow.js';

/**
 * What evaluators return - a single piece of feedback.
 */
export interface Feedback {
	key: string;
	score: number;
	comment?: string;
}

/**
 * An evaluator that can assess a generated workflow.
 * Optionally typed with context for evaluator-specific data.
 */
export interface Evaluator<TContext = void> {
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
	context?: Record<string, unknown>;
	/** Reference workflow for similarity comparison */
	referenceWorkflow?: SimpleWorkflow;
}

/**
 * Configuration for an evaluation run.
 */
export interface RunConfig {
	mode: 'local' | 'langsmith';
	/** Dataset name (for LangSmith) or test cases array (for local) */
	dataset: string | TestCase[];
	/** Function to generate workflow from prompt */
	generateWorkflow: (prompt: string) => Promise<SimpleWorkflow>;
	/** Evaluators to run on each generated workflow */
	evaluators: Evaluator<unknown>[];
	/** Global context available to all evaluators */
	context?: unknown;
	/** Directory for JSON output files */
	outputDir?: string;
	/** LangSmith-specific options */
	langsmithOptions?: LangsmithOptions;
	/** Lifecycle hooks for logging and monitoring */
	lifecycle?: Partial<EvaluationLifecycle>;
}

/**
 * LangSmith-specific configuration.
 */
export interface LangsmithOptions {
	experimentName: string;
	repetitions: number;
	concurrency: number;
}

/**
 * Result of evaluating a single example.
 */
export interface ExampleResult {
	index: number;
	prompt: string;
	status: 'pass' | 'fail' | 'error';
	feedback: Feedback[];
	durationMs: number;
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
