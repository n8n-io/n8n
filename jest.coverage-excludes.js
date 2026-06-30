// Shared `collectCoverageFrom` exclusions for all jest packages. `**`-anchored
// so they apply regardless of the source roots a package collects from.
// Mirrored by packages/@n8n/vitest-config/coverage-excludes.ts (vitest) and the
// V8 path filter in packages/testing/playwright/coverage-options.ts — keep in sync.
module.exports = [
	'!**/*.spec.ts',
	'!**/*.test.ts',
	'!**/__tests__/**',
	'!**/__mocks__/**',
	'!**/*.d.ts',
];
