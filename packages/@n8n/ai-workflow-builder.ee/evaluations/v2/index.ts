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
	createPairwiseEvaluator,
	createSimilarityEvaluator,
	type LLMJudgeContext,
	type ProgrammaticContext,
	type PairwiseContext,
	type PairwiseEvaluatorOptions,
	type SimilarityContext,
	type SimilarityEvaluatorOptions,
} from './evaluators';

// Output
export { createArtifactSaver, type ArtifactSaver, type ArtifactSaverOptions } from './output';

// Cache analyzer
export {
	calculateCacheStats,
	aggregateCacheStats,
	formatCacheStats,
	type CacheStatistics,
	type UsageMetadata,
	type FormattedCacheStatistics,
} from './cache-analyzer';

// Multi-generation utilities
export {
	getMajorityThreshold,
	aggregateGenerations,
	type GenerationDetail,
	type MultiGenerationResult,
} from './multi-gen';

// Trace filtering (re-exported from v1 for convenience)
export {
	createTraceFilters,
	isMinimalTracingEnabled,
	type TraceFilters,
} from '../core/trace-filters';
