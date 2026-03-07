/**
 * Jest config for migration tests using testcontainers.
 * Migration tests must run sequentially (maxWorkers: 1) because they:
 * - Share the same database instance
 * - Perform rollbacks that affect subsequent tests
 * - Clear and reinitialize the database in beforeEach hooks
 *
 * Usage: pnpm test:postgres:migrations:tc
 */

/** @type {import('jest').Config} */
module.exports = {
	...require('./jest.config.migration.js'),
	globalSetup: '<rootDir>/test/setup-testcontainers.js',
	globalTeardown: '<rootDir>/test/teardown-testcontainers.js',
	// Longer timeout for container startup
	testTimeout: 30_000,
	// Disable caching - testcontainers' signal-exit conflicts with Jest's
	// transform cache (write-file-atomic). Performance impact is minimal
	// since integration tests are I/O-bound, not transform-bound.
	cache: false,
	forceExit: true,
};
