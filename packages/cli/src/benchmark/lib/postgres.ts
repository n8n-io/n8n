import { DataSource } from '@n8n/typeorm';
import type { DataSourceOptions } from '@n8n/typeorm';
import config from '@/config';
import { log } from './log';
import { PostgresConnectionError } from './errors/postgres-connection.error';

const BENCHMARK_DB_PREFIX = 'n8n_benchmark';

const pgOptions: DataSourceOptions = {
	type: 'postgres',
	database: config.getEnv('database.postgresdb.database'),
	host: config.getEnv('database.postgresdb.host'),
	port: config.getEnv('database.postgresdb.port'),
	username: config.getEnv('database.postgresdb.user'),
	password: config.getEnv('database.postgresdb.password'),
	schema: config.getEnv('database.postgresdb.schema'),
};

function tenRandomChars() {
	const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

	let result = '';

	for (let i = 0; i < 10; i++) {
		result += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
	}

	return result;
}

export async function postgresSetup() {
	const dbName = [BENCHMARK_DB_PREFIX, tenRandomChars(), Date.now()].join('_');

	let bootstrap: DataSource;

	try {
		bootstrap = await new DataSource(pgOptions).initialize();
	} catch (error) {
		throw new PostgresConnectionError(error, pgOptions);
	}

	await bootstrap.query(`CREATE DATABASE ${dbName};`);
	await bootstrap.destroy();

	log('Created temp Postgres DB', dbName);

	config.set('database.postgresdb.database', dbName);
}

export async function postgresTeardown() {
	const bootstrap = new DataSource(pgOptions);
	await bootstrap.initialize();

	const results: Array<{ dbName: string }> = await bootstrap.query(
		'SELECT datname AS "dbName" FROM pg_database',
	);

	const dbNames = results
		.filter(({ dbName }) => dbName.startsWith(BENCHMARK_DB_PREFIX))
		.map(({ dbName }) => dbName);

	const promises: Array<Promise<void>> = dbNames.map(
		async (dbName) => await bootstrap.query(`DROP DATABASE ${dbName};`),
	);

	await Promise.all(promises);

	log('Dropped temp Postgres DB', dbNames.at(0));

	await bootstrap.destroy();
}
