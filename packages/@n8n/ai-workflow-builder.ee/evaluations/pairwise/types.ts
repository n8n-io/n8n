import type { EvaluationResult as LangsmithEvaluationResult } from 'langsmith/evaluation';
import type { Example } from 'langsmith/schemas';

// ============================================================================
// Evaluation Criteria
// ============================================================================

/** Evaluation criteria requiring at least one of dos or donts */
export type EvalCriteria = { dos: string; donts?: string } | { dos?: string; donts: string };

// ============================================================================
// Dataset Input/Output Types
// ============================================================================

export interface PairwiseDatasetInput {
	evals: EvalCriteria;
	prompt: string;
}

/** LangSmith Example with typed inputs for pairwise evaluation */
export interface PairwiseExample extends Omit<Example, 'inputs'> {
	inputs: PairwiseDatasetInput;
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

export function isPairwiseExample(example: Example): example is PairwiseExample {
	const inputs = example.inputs as Record<string, unknown> | undefined;
	if (!inputs || typeof inputs !== 'object') return false;

	const evals = inputs.evals as Record<string, unknown> | undefined;
	if (!evals || typeof evals !== 'object') return false;

	return (
		typeof inputs.prompt === 'string' &&
		(typeof evals.dos === 'string' || typeof evals.donts === 'string')
	);
}
