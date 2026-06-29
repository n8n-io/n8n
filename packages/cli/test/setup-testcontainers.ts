/**
 * Vitest global setup for integration/migration tests using testcontainers.
 * Starts a postgres container via n8n-containers and exposes its connection
 * details through `process.env`, which the forked test workers inherit.
 *
 * Note: Ryuk handles container cleanup on process exit (crashes/timeouts);
 * `teardown` is the secondary cleanup path.
 */
import { createServiceStack } from 'n8n-containers';
import { randomBytes } from 'node:crypto';

let stack: Awaited<ReturnType<typeof createServiceStack>> | undefined;

export async function setup() {
	const suffix = randomBytes(4).toString('hex');
	stack = await createServiceStack({
		services: ['postgres'],
		projectName: `n8n-integration-test-${suffix}`,
	});

	const pgResult = stack.serviceResults.postgres;
	if (!pgResult) {
		throw new Error('Failed to start postgres container');
	}

	const { container } = pgResult;
	const meta = pgResult.meta as { database: string; username: string; password: string };

	process.env.DB_TYPE = 'postgresdb';
	process.env.DB_POSTGRESDB_HOST = container.getHost();
	process.env.DB_POSTGRESDB_PORT = String(container.getMappedPort(5432));
	process.env.DB_POSTGRESDB_DATABASE = meta.database;
	process.env.DB_POSTGRESDB_USER = meta.username;
	process.env.DB_POSTGRESDB_PASSWORD = meta.password;
	process.env.DB_POSTGRESDB_SCHEMA = 'alt_schema';
	process.env.DB_TABLE_PREFIX = 'test_';
	process.env.DB_POSTGRESDB_POOL_SIZE = '1'; // Detect connection pooling deadlocks

	console.log(
		`\n✓ Postgres ready at ${process.env.DB_POSTGRESDB_HOST}:${process.env.DB_POSTGRESDB_PORT}\n`,
	);

	// Build a template DB once, then each test file's testDb.init() clones it via
	// CREATE DATABASE ... TEMPLATE instead of replaying the full migration history.
	// Set N8N_TEST_DISABLE_TEMPLATE_DB=1 to opt out (e.g. when bisecting migration bugs).
	if (process.env.N8N_TEST_DISABLE_TEMPLATE_DB !== '1') {
		const templateName = `n8n_test_template_${suffix}`;
		const tplStart = Date.now();
		// Dynamic import so the module's DI lookups resolve GlobalConfig after the DB_* env vars are set.
		const { testDb } = await import('@n8n/backend-test-utils');
		await testDb.initTemplateDb(templateName);
		process.env.N8N_TEST_TEMPLATE_DB = templateName;
		console.log(
			`✓ Template DB ${templateName} ready (${Date.now() - tplStart}ms) — workers will clone instead of migrate\n`,
		);
	}
}

export async function teardown() {
	if (stack) {
		await stack.stop();
		console.log('\n✓ Testcontainers stack stopped\n');
	}
}
