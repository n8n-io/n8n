import { createConnection, getConnection } from 'typeorm';
import config = require('../config');
import { getOptions } from './integration/shared/connectionOptions';

module.exports = async function () {
	const dbType = config.get('database.type');

	// clean up any remaining test Postgres DBs prefixed with `n8n_test_pg_`
	if (dbType === 'postgresdb') {
		const bootstrapName = `n8n_bs_${Date.now()}`;
		const bootstrap = await createConnection(getOptions({ name: bootstrapName }));

		const results: { db_name: string }[] = await bootstrap.query(
			'SELECT datname as db_name FROM pg_database;',
		);

		const promises = results
			.filter(({ db_name }) => db_name.startsWith('n8n_test_pg_'))
			.map(({ db_name }) => bootstrap.query(`DROP DATABASE ${db_name};`));

		await Promise.all(promises);

		await getConnection(bootstrapName).close();
	}
};
