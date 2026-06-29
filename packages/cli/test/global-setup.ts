import { testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { DataSource as Connection } from '@n8n/typeorm';
import nock from 'nock';

/**
 * Vitest global setup. Runs once in the main process before any test file.
 * Mirrors the former Jest `globalSetup`/`globalTeardown` pair.
 */
export async function setup() {
	nock.disableNetConnect();
	nock.enableNetConnect('127.0.0.1');
}

export async function teardown() {
	const { type: dbType } = Container.get(GlobalConfig).database;
	if (dbType !== 'postgresdb') return;

	const connection = new Connection(testDb.getBootstrapDBOptions());
	await connection.initialize();

	const query = 'SELECT datname as "Database" FROM pg_database';
	const results: Array<{ Database: string }> = await connection.query(query);
	const databases = results
		.filter(({ Database: dbName }) => dbName.startsWith(testDb.testDbPrefix))
		.map(({ Database: dbName }) => dbName);

	const promises = databases.map(
		async (dbName) => await connection.query(`DROP DATABASE ${dbName};`),
	);
	await Promise.all(promises);
	await connection.destroy();
}
