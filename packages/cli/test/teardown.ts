import { createConnection } from 'typeorm';
import config = require('../config');
import { exec } from 'child_process';
import { DatabaseType } from '../src';
import { getBootstrapMySqlOptions, getBootstrapPostgresOptions } from './integration/shared/testDb';
import { BOOTSTRAP_MYSQL_CONNECTION_NAME } from './integration/shared/constants';

export default async () => {
	const dbType = config.get('database.type') as DatabaseType;

	if (dbType === 'postgresdb') {
		const bootstrapPostgres = await createConnection(getBootstrapPostgresOptions());

		const results: { db_name: string }[] = await bootstrapPostgres.query(
			'SELECT datname as db_name FROM pg_database;',
		);

		const promises = results
			.filter(({ db_name: dbName }) => dbName.startsWith('pg_') && dbName.endsWith('_n8n_test'))
			.map(({ db_name: dbName }) => bootstrapPostgres.query(`DROP DATABASE ${dbName};`));

		await Promise.all(promises);

		bootstrapPostgres.close();
	}

	if (dbType === 'mysqldb') {
		const user = config.get('database.mysqldb.user');
		const password = config.get('database.mysqldb.password');
		const host = config.get('database.mysqldb.host');

		const bootstrapMySql = await createConnection(getBootstrapMySqlOptions());

		const results: { Database: string }[] = await bootstrapMySql.query('SHOW DATABASES;');

		const promises = results
			.filter(({ Database: dbName }) => dbName.startsWith('mysql_') && dbName.endsWith('_n8n_test'))
			.map(({ Database: dbName }) => bootstrapMySql.query(`DROP DATABASE ${dbName};`));

		await Promise.all(promises);

		await bootstrapMySql.close();

		exec(
			`echo "DROP DATABASE ${BOOTSTRAP_MYSQL_CONNECTION_NAME}" | mysql -h ${host} -u ${user} -p${password}`,
		);
	}
};
