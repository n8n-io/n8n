import { createConnection } from 'typeorm';
import config from '../config';
import { getBootstrapDBOptions } from './integration/shared/testDb';

export default async () => {
	const dbType = config.getEnv('database.type').replace(/db$/, '');
	if (dbType !== 'postgres' && dbType !== 'mysql') return;

	const connection = await createConnection(getBootstrapDBOptions(dbType));

	const query =
		dbType === 'postgres' ? 'SELECT datname as "Database" FROM pg_database' : 'SHOW DATABASES';
	const results: { Database: string }[] = await connection.query(query);
	const databases = results
		.filter(
			({ Database: dbName }) => dbName.startsWith(`${dbType}_`) && dbName.endsWith('_n8n_test'),
		)
		.map(({ Database: dbName }) => dbName);

	const promises = databases.map((dbName) => connection.query(`DROP DATABASE ${dbName};`));
	await Promise.all(promises);
	await connection.close();
};
