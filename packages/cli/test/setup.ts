import { ConnectionOptions, createConnection, getConnection } from 'typeorm';
import config = require('../config');
const { exec } = require('child_process');

const dbType = config.get('database.type') as 'sqlite' | 'postgresdb' | 'mysqldb';

if (dbType === 'mysqldb') {
	const username = config.get('database.mysqldb.user');
	const password = config.get('database.mysqldb.password');
	const host = config.get('database.mysqldb.host');
	const port = config.get('database.mysqldb.port');

	exec(
		`echo "CREATE DATABASE IF NOT EXISTS n8n_bs_mysql" | mysql -h ${host} -u ${username} -p${password}`,
	);

	const bsMySqlConnectionOptions: ConnectionOptions = {
		name: 'n8n_bs_mysql',
		database: 'n8n_bs_mysql',
		type: 'mysql',
		host,
		port,
		username,
		password,
	};

	(async () => {
		await createConnection(bsMySqlConnectionOptions);
	})();
}
