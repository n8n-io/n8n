import { createConnection } from 'typeorm';
import config = require('../config');
import { exec } from 'child_process';
import { DatabaseType } from '../src';
import { getBootstrapPostgresOptions } from './integration/shared/testDb';

export default async () => {
	const dbType = config.get('database.type') as DatabaseType;

	if (dbType === 'postgresdb') {
		const bootstrap = await createConnection(getBootstrapPostgresOptions());

		const results: { db_name: string }[] = await bootstrap.query(
			'SELECT datname as db_name FROM pg_database;',
		);

		const promises = results
			.filter(({ db_name }) => db_name.startsWith('n8n_test_pg_'))
			.map(({ db_name }) => bootstrap.query(`DROP DATABASE ${db_name};`));

		await Promise.all(promises);

		bootstrap.close();
	}

	if (dbType === 'mysqldb') {
		const user = config.get('database.mysqldb.user');
		const password = config.get('database.mysqldb.password');
		const host = config.get('database.mysqldb.host');

		exec(`echo "DROP DATABASE n8n_bs_mysql" | mysql -h ${host} -u ${user} -p${password}`);
	}
};
