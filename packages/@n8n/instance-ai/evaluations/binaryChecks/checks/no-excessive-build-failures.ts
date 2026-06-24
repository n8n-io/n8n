import type { BinaryCheck } from '../types';

// Fails when a turn exceeds this many FAILED build-workflow calls (error-forced rebuilds). Lenient for now; tighten as we gather signal.
const THRASHING_THRESHOLD = 4;

export const noExcessiveBuildFailures: BinaryCheck = {
	name: 'no_excessive_build_failures',
	description: 'Builder lands the build without repeatedly failing within a single turn',
	kind: 'deterministic',
	dimension: 'efficiency',
	run(_workflow, ctx) {
		const perTurn = ctx.failedBuildsPerTurn;
		// No transcript (e.g. prebuilt-workflow scoring) → nothing to score.
		if (!perTurn || perTurn.length === 0) return { pass: true, applicable: false };
		const max = Math.max(...perTurn);
		if (max <= THRASHING_THRESHOLD) return { pass: true };

		return {
			pass: false,
			comment: `build-workflow failed ${String(max)} times within a single turn — the agent repeatedly failed to build`,
		};
	},
};
