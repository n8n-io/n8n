/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
	packageManager: 'pnpm',
	testRunner: 'vitest',
	plugins: ['@stryker-mutator/vitest-runner'],
	// Scheduler is a pure package (no isolated-vm engine to swap out), so this
	// just points at a Stryker-only vitest config for the colocated test layout.
	vitest: {
		configFile: 'vitest.stryker.config.ts',
	},
	// No `progress` reporter: these runs are non-interactive, nobody watches the stream.
	reporters: ['clear-text', 'json'],
	coverageAnalysis: 'perTest',
	// Cache mutant results so the property-testing edit/re-run loop only re-tests
	// mutants whose covering tests changed. Keep the cache under the gitignored `reports/mutation/`.
	incremental: true,
	incrementalFile: 'reports/mutation/stryker-incremental.json',
	// Skip module-level (static) mutants: each forces a full re-instrument.
	ignoreStatic: true,
	// Default empty: the `mutate` npm script always passes --mutate <file>.
	// Direct invocation with no --mutate will fail fast (allowEmpty: false).
	mutate: [],
	jsonReporter: { fileName: 'reports/mutation/raw.json' },
	// Cap low: a string/utils mutant running 15s+ is a spinning loop-condition mutant; fail it fast.
	timeoutMS: 15_000,
	// Each Stryker worker spawns vitest with one project, via vitest.stryker.config.ts.
	// Default 4 is fine on CI runners; lower locally if you hit OOM during the
	// initial dry run via `STRYKER_CONCURRENCY=1`.
	concurrency: Number(process.env.STRYKER_CONCURRENCY ?? 4),
	tempDirName: '.stryker-tmp',
	cleanTempDir: true,
};
