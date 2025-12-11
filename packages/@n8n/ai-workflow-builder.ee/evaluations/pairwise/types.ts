import type { EvaluationResult as LangsmithEvaluationResult } from 'langsmith/evaluation';

import type { EvalCriteria } from './judge-panel';

// ============================================================================
// Dataset Input/Output Types
// ============================================================================

export interface PairwiseDatasetInput {
	evals: EvalCriteria;
	prompt: string;
}

export interface PairwiseTargetOutput {
	prompt: string;
	evals: EvalCriteria;
	/** Pre-computed feedback results */
	feedback: LangsmithEvaluationResult[];
}

// ============================================================================
// Type Guards
// ============================================================================

export function isPairwiseTargetOutput(outputs: unknown): outputs is PairwiseTargetOutput {
	if (!outputs || typeof outputs !== 'object') return false;
	const obj = outputs as Record<string, unknown>;
	return (
		typeof obj.prompt === 'string' &&
		Array.isArray(obj.feedback) &&
		obj.evals !== undefined &&
		typeof obj.evals === 'object'
	);
}
