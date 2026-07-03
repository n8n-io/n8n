/**
 * Files to drop from coverage. vitest 4 ships an empty default `exclude` and
 * only auto-excludes the test files it runs, so type decls, mocks and test
 * helpers otherwise land in the denominator at 0%. Spread these onto
 * `coverageConfigDefaults.exclude` in each config.
 *
 * Mirrors the jest equivalent at the repo root (jest.coverage-excludes.js) —
 * same intent, plain globs here vs `!`-negated globs there. Keep them in sync.
 */
export const coverageExcludes = [
	'**/*.spec.ts',
	'**/*.test.ts',
	'**/__tests__/**',
	'**/__mocks__/**',
	'**/*.d.ts',
];
