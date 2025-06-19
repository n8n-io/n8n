import 'tsconfig-paths/register';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { DataSource as Connection } from '@n8n/typeorm';

import { getBootstrapDBOptions, testDbPrefix } from './integration/shared/test-db';

export default async () => {
	const { type: dbType } = Container.get(GlobalConfig).database;
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
