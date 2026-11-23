import { MIN_RUNS_FOR_ANALYSIS } from './agent-determinism.constants';
import type { RunCount } from './database/determinism-source.repository';

export function shouldAnalyze({
	runsSinceAnalysis,
	versionChanged,
	analyzedVersionHash,
}: RunCount) {
	if (versionChanged && analyzedVersionHash !== null) return true;
	return runsSinceAnalysis >= MIN_RUNS_FOR_ANALYSIS;
}
