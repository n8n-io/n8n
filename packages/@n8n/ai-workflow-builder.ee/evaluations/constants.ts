// ============================================================================
// Evaluation Type Identifiers
// ============================================================================

export const EVAL_TYPES = {
	PAIRWISE_LOCAL: 'pairwise-local',
	PAIRWISE_LANGSMITH: 'pairwise-langsmith',
	LANGSMITH: 'langsmith-evals',
} as const;

export const EVAL_USERS = {
	PAIRWISE_LOCAL: 'pairwise-local-user',
	LANGSMITH: 'langsmith-eval-user',
} as const;

export const TRACEABLE_NAMES = {
	PAIRWISE_EVALUATION: 'pairwise_evaluation',
	WORKFLOW_GENERATION: 'workflow_generation',
} as const;

// ============================================================================
// LangSmith Metric Keys
// ============================================================================

/**
 * Metric keys for LangSmith evaluation results.
 */
export const METRIC_KEYS = {
	// Single generation metrics
	PAIRWISE_DIAGNOSTIC: 'pairwise_diagnostic',
	PAIRWISE_JUDGES_PASSED: 'pairwise_judges_passed',
	PAIRWISE_PRIMARY: 'pairwise_primary',
	PAIRWISE_TOTAL_PASSES: 'pairwise_total_passes',
	PAIRWISE_TOTAL_VIOLATIONS: 'pairwise_total_violations',

	// Multi-generation metrics
	PAIRWISE_AGGREGATED_DIAGNOSTIC: 'pairwise_aggregated_diagnostic',
	PAIRWISE_GENERATION_CORRECTNESS: 'pairwise_generation_correctness',
	PAIRWISE_GENERATIONS_PASSED: 'pairwise_generations_passed',
	PAIRWISE_TOTAL_JUDGE_CALLS: 'pairwise_total_judge_calls',
} as const;

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULTS = {
	NUM_JUDGES: 3,
	NUM_GENERATIONS: 1,
	EXPERIMENT_NAME: 'pairwise-evals',
	CONCURRENCY: 5,
	REPETITIONS: 1,
	DATASET_NAME: 'notion-pairwise-workflows',
	FEATURE_FLAGS: {
		multiAgent: true,
		templateExamples: false,
	},
} as const;
