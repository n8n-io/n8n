import 'tsconfig-paths/register';
import { testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { DataSource as Connection } from '@n8n/typeorm';

export default async () => {
	const { type: dbType } = Container.get(GlobalConfig).database;
	if (dbType !== 'postgresdb' && dbType !== 'mysqldb') return;

	const connection = new Connection(testDb.getBootstrapDBOptions(dbType));
	await connection.initialize();

	const query =
		dbType === 'postgresdb' ? 'SELECT datname as "Database" FROM pg_database' : 'SHOW DATABASES';
	const results: Array<{ Database: string }> = await connection.query(query);
	const databases = results
		.filter(({ Database: dbName }) => dbName.startsWith(testDb.testDbPrefix))
		.map(({ Database: dbName }) => dbName);

	const promises = databases.map(
		async (dbName) => await connection.query(`DROP DATABASE ${dbName};`),
	);
	await Promise.all(promises);
	await connection.destroy();
};
