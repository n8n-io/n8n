import type { InlineConfig } from 'vitest/node';

import { PhaseReporter } from './phase-reporter.js';

export const profilingReporters = (
	reporters: NonNullable<InlineConfig['reporters']>,
): NonNullable<InlineConfig['reporters']> =>
	process.env.VITEST_PHASE_PROFILE === 'true'
		? [...(Array.isArray(reporters) ? reporters : [reporters]), new PhaseReporter()]
		: reporters;

export const profilingConfig = (): InlineConfig => {
	const profileDir = process.env.VITEST_RUNNER_PROFILE_DIR;
	const profileKinds = new Set(process.env.VITEST_RUNNER_PROFILE_KINDS?.split(',') ?? []);
	if (!profileDir) return {};

	const execArgv = [
		...(profileKinds.has('cpu') ? ['--cpu-prof', `--cpu-prof-dir=${profileDir}`] : []),
		...(profileKinds.has('heap') ? ['--heap-prof', `--heap-prof-dir=${profileDir}`] : []),
	];

	// Keep diagnostic profiles readable. These settings are only active through the local profiler.
	return execArgv.length > 0 ? { execArgv, fileParallelism: false } : {};
};
