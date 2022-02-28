import { createConnection } from 'typeorm';
import config = require('../config');
import { getBootstrapPostgresOptions } from './integration/shared/connectionOptions';
const { exec } = require('child_process');

module.exports = async function () {
	const dbType = config.get('database.type') as 'sqlite' | 'postgresdb' | 'mysqldb';

	// clean up any remaining test Postgres DBs prefixed with `n8n_test_pg_`
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
		const password = config.get('database.mysqldb.password'); // change via env to 'password'
		const host = config.get('database.mysqldb.host');

		exec(`echo "DROP DATABASE n8n_bs_mysql" | mysql -h ${host} -u ${user} -p${password}`);
	}
};
