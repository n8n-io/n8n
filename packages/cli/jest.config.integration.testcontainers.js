/**
 * Jest config for integration tests using testcontainers.
 * This starts postgres automatically via testcontainers - no docker-compose needed.
 *
 * Usage: pnpm test:postgres:tc
 *
 * Note: TESTCONTAINERS_RYUK_DISABLED=true is set in the npm script because:
 * 1. Ryuk requires privileged Docker access not available in all CI environments
 * 2. Containers use withReuse() and are cleaned up in globalTeardown
 * 3. If tests crash, containers may linger - run `docker ps` to check
 */

/** @type {import('jest').Config} */
module.exports = {
	...require('./jest.config.integration.js'),
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
