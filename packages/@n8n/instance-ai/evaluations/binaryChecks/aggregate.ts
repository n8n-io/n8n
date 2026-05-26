import type { CheckDimension, CheckOutcome, CheckStatus } from './types';
import type { MultiRunEvaluation } from '../types';

export interface CheckCounts {
	kind: 'deterministic' | 'llm';
	dimension: CheckDimension;
	passes: number;
	fails: number;
	nA: number;
}

export interface WorkflowChecksAggregate {
	/** Number of builds whose outcomes contributed to the aggregate. */
	scoredBuilds: number;
	/** Per check (keyed by `BinaryCheck.name`). */
	perCheck: Record<string, CheckCounts>;
}

/**
 * Roll up per-build `CheckOutcome[]` across every successful build in the
 * evaluation. Returns `undefined` when no run produced outcomes.
 */
export function aggregateWorkflowChecks(
	evaluation: MultiRunEvaluation,
): WorkflowChecksAggregate | undefined {
	const perCheck: Record<string, CheckCounts> = {};
	let scoredBuilds = 0;

	for (const tc of evaluation.testCases) {
		for (const run of tc.runs) {
			if (!run.workflowChecks) continue;
			scoredBuilds++;
			for (const outcome of run.workflowChecks) {
				const entry = perCheck[outcome.name] ?? {
					kind: outcome.kind,
					dimension: outcome.dimension,
					passes: 0,
					fails: 0,
					nA: 0,
				};
				if (outcome.status === 'pass') entry.passes++;
				else if (outcome.status === 'fail') entry.fails++;
				else entry.nA++;
				perCheck[outcome.name] = entry;
			}
		}
	}

	if (scoredBuilds === 0) return undefined;
	return { scoredBuilds, perCheck };
}

/** Per-build view: `{ check_name: 'pass' | 'fail' | 'n_a' }`. */
export function statusMap(outcomes: CheckOutcome[]): Record<string, CheckStatus> {
	const out: Record<string, CheckStatus> = {};
	for (const outcome of outcomes) out[outcome.name] = outcome.status;
	return out;
}

/** Group per-build outcomes by dimension for grouped rendering. */
export function groupOutcomesByDimension(
	outcomes: CheckOutcome[],
): Record<CheckDimension, CheckOutcome[]> {
	const grouped = {} as Record<CheckDimension, CheckOutcome[]>;
	for (const outcome of outcomes) {
		(grouped[outcome.dimension] ??= []).push(outcome);
	}
	return grouped;
}
