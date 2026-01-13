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
export { runEvaluation } from './harness/runner';

// Types
export type {
	Feedback,
	EvaluationContext,
	TestCaseContext,
	GlobalRunContext,
	Evaluator,
	TestCase,
	RunConfig,
	ExampleResult,
	RunSummary,
	EvaluationLifecycle,
	LangsmithOptions,
} from './harness/harness-types';

// Lifecycle
export {
	createConsoleLifecycle,
	createQuietLifecycle,
	mergeLifecycles,
	type ConsoleLifecycleOptions,
} from './harness/lifecycle';

// Evaluator factories
export {
	createLLMJudgeEvaluator,
	createProgrammaticEvaluator,
	createPairwiseEvaluator,
	createSimilarityEvaluator,
	type PairwiseEvaluatorOptions,
	type SimilarityEvaluatorOptions,
} from './evaluators';

// Output
export {
	createArtifactSaver,
	type ArtifactSaver,
	type ArtifactSaverOptions,
} from './harness/output';

// Multi-generation utilities
export {
	getMajorityThreshold,
	aggregateGenerations,
	type GenerationDetail,
	type MultiGenerationResult,
} from './harness/multi-gen';

// Trace filtering (re-exported from v1 for convenience)
export {
	createTraceFilters,
	isMinimalTracingEnabled,
	type TraceFilters,
} from './langsmith/trace-filters';

// Score calculation utilities
export {
	parseFeedbackKey,
	extractCategory,
	groupByEvaluator,
	calculateWeightedScore,
	aggregateScores,
	DEFAULT_EVALUATOR_WEIGHTS,
	DEFAULT_WEIGHTS,
	type ScoreWeights,
	type AggregatedScore,
	type FeedbackKeyParts,
} from './harness/score-calculator';

// Report generation
export {
	extractViolationSeverity,
	calculateReportMetrics,
	generateMarkdownReport,
	type ViolationSeverity,
	type ReportOptions,
	type ReportMetrics,
} from './support/report-generator';

// Test case generation
export {
	createTestCaseGenerator,
	type TestCaseGeneratorOptions,
	type GeneratedTestCase,
	type TestCaseGenerator,
} from './support/test-case-generator';

// CSV loader utilities
export { loadDefaultTestCases, getDefaultTestCaseIds } from './cli/csv-prompt-loader';
