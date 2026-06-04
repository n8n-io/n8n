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

	process.env.DB_TYPE = 'postgresdb';
	process.env.DB_POSTGRESDB_HOST = container.getHost();
	process.env.DB_POSTGRESDB_PORT = String(container.getMappedPort(5432));
	process.env.DB_POSTGRESDB_DATABASE = pgResult.meta.database;
	process.env.DB_POSTGRESDB_USER = pgResult.meta.username;
	process.env.DB_POSTGRESDB_PASSWORD = pgResult.meta.password;
	process.env.DB_POSTGRESDB_SCHEMA = 'alt_schema';
	process.env.DB_TABLE_PREFIX = 'test_';
	process.env.DB_POSTGRESDB_POOL_SIZE = '1'; // Detect connection pooling deadlocks

	console.log(
		`\n✓ Postgres ready at ${process.env.DB_POSTGRESDB_HOST}:${process.env.DB_POSTGRESDB_PORT}\n`,
	);
}

export async function teardown() {
	if (stack) {
		await stack.stop();
		console.log('\n✓ Testcontainers stack stopped\n');
	}
}
