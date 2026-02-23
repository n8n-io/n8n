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
export {
	isGenerationResult,
	type Feedback,
	type EvaluationContext,
	type TestCaseContext,
	type GlobalRunContext,
	type Evaluator,
	type TestCase,
	type RunConfig,
	type ExampleResult,
	type RunSummary,
	type EvaluationLifecycle,
	type LangsmithOptions,
	type GenerationResult,
	type SubgraphExampleOutput,
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
	createResponderEvaluator,
	createExecutionEvaluator,
	type PairwiseEvaluatorOptions,
	type SimilarityEvaluatorOptions,
	type ResponderEvaluationContext,
} from './evaluators';

// Subgraph evaluation
export {
	createSubgraphRunner,
	type SubgraphName,
	type SubgraphRunFn,
} from './harness/subgraph-runner';
export { runSubgraphEvaluation } from './harness/subgraph-evaluation';
export { runLocalSubgraphEvaluation } from './harness/subgraph-evaluation-local';
// Introspection lifecycle
export {
	createIntrospectionAnalysisLifecycle,
	type IntrospectionAnalysisOptions,
} from './lifecycles/introspection-analysis';

// Output
export {
	createArtifactSaver,
	type ArtifactSaver,
	type ArtifactSaverOptions,
} from './harness/output';

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
