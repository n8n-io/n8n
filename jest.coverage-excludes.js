// Shared `collectCoverageFrom` exclusions for all jest packages. `**`-anchored
// so they apply regardless of the source roots a package collects from.
// The V8 path filter in packages/testing/playwright/coverage-options.ts mirrors
// this list — keep them in sync.
module.exports = [
	'!**/*.spec.ts',
	'!**/*.test.ts',
	'!**/__tests__/**',
	'!**/__mocks__/**',
	'!**/*.d.ts',
];
