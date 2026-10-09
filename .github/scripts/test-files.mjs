import { matchesGlob } from './glob.mjs';

export const TEST_PATTERNS = [
	// Test files (by extension)
	'**/*.test.ts',
	'**/*.test.js',
	'**/*.test.mjs',
	'**/*.spec.ts',
	'**/*.spec.js',
	'**/*.spec.mjs',
	// Test directories
	'**/test/**',
	'**/tests/**',
	'**/__tests__/**',
	// Snapshots
	'**/__snapshots__/**',
	'**/*.snap',
	// Fixtures and mocks
	'**/fixtures/**',
	'**/__mocks__/**',
	// Former packages/testing workspaces
	'packages/quality/policy/**',
	'packages/quality/testing/**',
	'packages/quality/environments/**',
	'packages/quality/efficiency/microbenchmarks/**',
];

/**
 * @param { string } filename
 * @returns { boolean }
 */
export function isTestFile(filename) {
	return TEST_PATTERNS.some((pattern) => matchesGlob(filename, pattern));
}
