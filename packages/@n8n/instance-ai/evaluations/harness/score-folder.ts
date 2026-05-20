// ---------------------------------------------------------------------------
// Pure helper: fold binary check results into the scenario state produced by
// the LLM verifier. Deterministic ground truth wins — any binary failure
// overrides a verifier PASS verdict.
// ---------------------------------------------------------------------------

import type { BinaryCheckOutcome, ScenarioResult } from '../types';

export type FoldableScenarioState = Pick<
	ScenarioResult,
	'success' | 'score' | 'reasoning' | 'failureCategory'
>;

export const BINARY_CHECK_FAILURE_CATEGORY = 'binary_check_failure';

export function applyBinaryCheckResults(
	base: FoldableScenarioState,
	binaryCheckResults: BinaryCheckOutcome[] | undefined,
): FoldableScenarioState {
	if (!binaryCheckResults || binaryCheckResults.length === 0) return base;

	const failed = binaryCheckResults.filter((r) => !r.pass);
	if (failed.length === 0) return base;

	return {
		success: false,
		score: 0,
		reasoning: `Binary checks failed (${failed.map((f) => f.name).join(', ')}). Verifier: ${base.reasoning}`,
		failureCategory: BINARY_CHECK_FAILURE_CATEGORY,
	};
}
