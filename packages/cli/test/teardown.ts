import 'tsconfig-paths/register';
import { DataSource as Connection } from 'typeorm';
import config from '@/config';
import { getBootstrapDBOptions, testDbPrefix } from './integration/shared/testDb';

export default async () => {
	const dbType = config.getEnv('database.type').replace(/db$/, '');
	if (dbType !== 'postgres' && dbType !== 'mysql') return;

	const connection = new Connection(getBootstrapDBOptions(dbType));
	await connection.initialize();

	const query =
		dbType === 'postgres' ? 'SELECT datname as "Database" FROM pg_database' : 'SHOW DATABASES';
	const results: Array<{ Database: string }> = await connection.query(query);
	const databases = results
		.filter(({ Database: dbName }) => dbName.startsWith(testDbPrefix))
		.map(({ Database: dbName }) => dbName);

	if (dbType === 'postgres') {
		const runningQueries = await connection.query(
			`SELECT query FROM pg_stat_activity WHERE datname in (${databases
				.map((d) => `'${d}'`)
				.join(',')}) AND pid <> pg_backend_pid();`,
		);
		if (runningQueries.length) {
			console.log('Long running queries detected', runningQueries);
		}
	}

	const promises = databases.map(async (dbName) => connection.query(`DROP DATABASE ${dbName};`));
	await Promise.all(promises);
	await connection.destroy();
};
