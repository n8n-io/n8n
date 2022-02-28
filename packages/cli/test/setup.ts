import config = require('../config');
const { exec } = require('child_process');

const dbType = config.get('database.type') as 'sqlite' | 'postgresdb' | 'mysqldb';

// create bootstrap mysql database
if (dbType === 'mysqldb') {
	const user = config.get('database.mysqldb.user');
	const password = config.get('database.mysqldb.password');
	// const password = 'password';
	const host = config.get('database.mysqldb.host');

	exec(
		`echo "CREATE DATABASE IF NOT EXISTS n8n_bs_mysql" | mysql -h ${host} -u ${user} -p${password}`,
	);
}
