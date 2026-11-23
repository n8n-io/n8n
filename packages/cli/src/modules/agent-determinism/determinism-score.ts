import {
	MIN_GAIN_POINTS,
	MIN_HOLDOUT_RUNS,
	MIN_MATCH_RATE,
	MIN_RUNS_FOR_ANALYSIS,
} from './agent-determinism.constants';
import type { DeterminismResult, StepCounts } from './agent-determinism.contracts';

export type ReplayedRun = {
	recorded: StepCounts;
	draft: StepCounts | null;
	matched: boolean;
	recordedTokens: number | null;
	draftTokens: number | null;
};

function codeDecidedShare({ llmDecided, codeDecided }: StepCounts) {
	const total = llmDecided + codeDecided;
	return total === 0 ? 0 : codeDecided / total;
}

const mean = (values: number[]) =>
	values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

function tokenDelta(runs: ReplayedRun[]) {
	const matched = runs.filter((run) => run.matched);
	const deltas: number[] = [];
	for (const { draftTokens, recordedTokens } of matched) {
		if (draftTokens === null || recordedTokens === null) return null;
		deltas.push(draftTokens - recordedTokens);
	}
	return deltas.length === 0 ? null : Math.round(mean(deltas));
}

export function scoreDraft(
	runs: ReplayedRun[],
	totalRuns: number,
	clusterTrafficShare: number,
): DeterminismResult {
	const baselines = runs.map((run) => codeDecidedShare(run.recorded));
	const effective = runs.map((run, index) =>
		run.matched && run.draft ? codeDecidedShare(run.draft) : baselines[index],
	);
	const baselinePct = Math.round(mean(baselines) * 100);
	const effectivePct = Math.round(mean(effective) * 100);
	const gainPoints = Math.round((mean(effective) - mean(baselines)) * 100);
	const matchRate = runs.length === 0 ? 0 : runs.filter((run) => run.matched).length / runs.length;

	return {
		baselinePct,
		effectivePct,
		gainPoints,
		matchRate,
		holdoutRuns: runs.length,
		totalRuns,
		tokenDelta: tokenDelta(runs),
		clusterTrafficShare,
		showCta:
			totalRuns >= MIN_RUNS_FOR_ANALYSIS &&
			runs.length >= MIN_HOLDOUT_RUNS &&
			matchRate >= MIN_MATCH_RATE &&
			gainPoints >= MIN_GAIN_POINTS,
	};
}
