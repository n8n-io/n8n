export const PAIRWISE_METRICS = {
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
