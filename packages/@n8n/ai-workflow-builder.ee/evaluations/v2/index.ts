/**
 * V2 Evaluation Harness
 *
 * A factory-based, testable evaluation system for AI workflow generation.
 *
 * Key features:
 * - Factory pattern for evaluator creation
 * - Parallel evaluator execution
 * - Both local and LangSmith modes
 * - Centralized lifecycle hooks for logging
 * - Pre-computed feedback pattern for LangSmith compatibility
 */

// Core runner
export { runEvaluation, getLastResults } from './runner';

// Types
export type {
	Feedback,
	Evaluator,
	TestCase,
	RunConfig,
	ExampleResult,
	RunSummary,
	EvaluationLifecycle,
	LangsmithOptions,
} from './types';

// Lifecycle
export {
	createConsoleLifecycle,
	createQuietLifecycle,
	mergeLifecycles,
	type ConsoleLifecycleOptions,
} from './lifecycle';

// Evaluator factories
export {
	createLLMJudgeEvaluator,
	createProgrammaticEvaluator,
	type LLMJudgeContext,
	type ProgrammaticContext,
} from './evaluators';
