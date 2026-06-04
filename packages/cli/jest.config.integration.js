// The root jest config sets `workerIdleMemoryLimit: '1MB'` which forces a
// fresh worker process for every test file. Removing it lets workers persist
// across files and skip the per-file module-load cost (TypeORM, @n8n/di, the
// n8n CLI surface), which dominates wall time on the Postgres 16 integration
// job. On SQLite we can't yet remove it: TypeORM/sqlite-pooled leaks state
// across migrate() calls and per-file migration time grows linearly until it
// hits the 10s hook timeout. So we keep the 1 MB limit (effective recycling)
// for SQLite and uncap for Postgres. `JEST_WORKER_IDLE_MEMORY_LIMIT` overrides
// both (use empty string to disable; any other value sets the limit).
const { workerIdleMemoryLimit: _drop, ...rootConfig } = require('../../jest.config');

function resolveWorkerIdleMemoryLimit() {
	const override = process.env.JEST_WORKER_IDLE_MEMORY_LIMIT;
	if (override !== undefined) {
		return override === '' ? undefined : override;
	}
	return process.env.DB_TYPE === 'sqlite' ? '1MB' : undefined;
}

const workerIdleMemoryLimit = resolveWorkerIdleMemoryLimit();

/** @type {import('jest').Config} */
const config = {
	...rootConfig,
	testEnvironmentOptions: {
		url: 'http://localhost/',
	},
	globalSetup: '<rootDir>/test/setup.ts',
	globalTeardown: '<rootDir>/test/teardown.ts',
	setupFilesAfterEnv: [
		'<rootDir>/test/setup-test-folder.ts',
		'<rootDir>/test/setup-mocks.ts',
		'<rootDir>/test/extend-expect.ts',
	],
	coveragePathIgnorePatterns: ['/src/databases/migrations/'],
	testTimeout: 10_000,
	prettierPath: null,
	// Run integration tests from test/integration and src/ directories.
	// Migration tests have their own config (jest.config.migration.js) with
	// maxWorkers: 1 because `initDbUpToMigration` rolls the schema back,
	// which pollutes any DB shared by parallel suites. They're invoked via
	// the dedicated `Run Migration Tests` CI step.
	testRegex: undefined, // Override base config testRegex
	testMatch: ['<rootDir>/test/integration/**/*.test.ts', '<rootDir>/src/**/*.integration.test.ts'],
	testPathIgnorePatterns: ['/dist/', '/node_modules/'],
};

if (workerIdleMemoryLimit !== undefined) {
	config.workerIdleMemoryLimit = workerIdleMemoryLimit;
}

module.exports = config;
