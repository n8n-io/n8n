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
// Default Values
// ============================================================================

export const DEFAULTS = {
	NUM_JUDGES: 3,
	EXPERIMENT_NAME: 'pairwise-evals',
	LLM_JUDGE_EXPERIMENT_NAME: 'workflow-builder-evaluation',
	CONCURRENCY: 5,
	REPETITIONS: 1,
	/** Per-operation timeout (generation / evaluator) */
	TIMEOUT_MS: 20 * 60 * 1000,
	DATASET_NAME: 'notion-pairwise-workflows',
	FEATURE_FLAGS: {
		templateExamples: false,
	},
} as const;
