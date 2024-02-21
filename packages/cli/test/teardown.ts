import 'tsconfig-paths/register';
import { DataSource as Connection } from '@n8n/typeorm';
import config from '@/config';
import { getBootstrapDBOptions, testDbPrefix } from './integration/shared/testDb';

export default async () => {
	const dbType = config.getEnv('database.type');
	if (dbType !== 'postgresdb' && dbType !== 'mysqldb') return;

	const connection = new Connection(getBootstrapDBOptions(dbType));
	await connection.initialize();

	const query =
		dbType === 'postgresdb' ? 'SELECT datname as "Database" FROM pg_database' : 'SHOW DATABASES';
	const results: Array<{ Database: string }> = await connection.query(query);
	const databases = results
		.filter(({ Database: dbName }) => dbName.startsWith(testDbPrefix))
		.map(({ Database: dbName }) => dbName);

	const promises = databases.map(
		async (dbName) => await connection.query(`DROP DATABASE ${dbName};`),
	);
	await Promise.all(promises);
	await connection.destroy();
};
