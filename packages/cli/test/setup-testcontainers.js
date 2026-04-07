/**
 * Jest global setup - plain JS to bypass Jest's transform system.
 * Uses createServiceStack from n8n-containers for unified service management.
 */
const { createServiceStack } = require('n8n-containers');
const { randomBytes } = require('crypto');

module.exports = async () => {
	const suffix = randomBytes(4).toString('hex');
	const stack = await createServiceStack({
		services: ['postgres'],
		projectName: `n8n-integration-test-${suffix}`,
	});

	const pgResult = stack.serviceResults.postgres;
	if (!pgResult) {
		throw new Error('Failed to start postgres container');
	}

	const container = pgResult.container;

	process.env.DB_TYPE = 'postgresdb';
	process.env.DB_POSTGRESDB_HOST = container.getHost();
	process.env.DB_POSTGRESDB_PORT = String(container.getMappedPort(5432));
	process.env.DB_POSTGRESDB_DATABASE = pgResult.meta.database;
	process.env.DB_POSTGRESDB_USER = pgResult.meta.username;
	process.env.DB_POSTGRESDB_PASSWORD = pgResult.meta.password;
	process.env.DB_POSTGRESDB_SCHEMA = 'alt_schema';
	process.env.DB_TABLE_PREFIX = 'test_';
	process.env.DB_POSTGRESDB_POOL_SIZE = '1'; // Detect connection pooling deadlocks

	globalThis.__TESTCONTAINERS_STACK__ = stack;

	console.log(
		`\n✓ Postgres ready at ${process.env.DB_POSTGRESDB_HOST}:${process.env.DB_POSTGRESDB_PORT}\n`,
	);
};
