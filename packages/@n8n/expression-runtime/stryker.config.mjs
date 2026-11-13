/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
	packageManager: 'pnpm',
	testRunner: 'vitest',
	plugins: ['@stryker-mutator/vitest-runner'],
	vitest: {
		configFile: 'vitest.stryker.config.ts',
		// The vm engine needs `forks`: isolated-vm aborts the process when a worker
		// thread that started an isolate exits (laverdet/isolated-vm#464).
		pool: 'forks',
	},
	reporters: ['progress', 'clear-text', 'html', 'json'],
	coverageAnalysis: 'perTest',
	// Skip module-level (static) mutants: each forces a full re-run.
	ignoreStatic: true,
	// Empty: mutate.mjs always passes --mutate <file>.
	mutate: [],
	htmlReporter: { fileName: 'reports/mutation/raw.html' },
	jsonReporter: { fileName: 'reports/mutation/raw.json' },
	timeoutMS: 60_000,
	concurrency: Number(process.env.STRYKER_CONCURRENCY ?? 4),
	// Keeps the --inPlace backup out of vitest's test glob.
	tempDirName: 'node_modules/.stryker-tmp',
	cleanTempDir: true,
};
