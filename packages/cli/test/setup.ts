import { ConnectionOptions, createConnection } from 'typeorm';
import config = require('../config');
import { exec } from 'child_process';
import { BOOTSTRAP_MYSQL_CONNECTION_NAME } from './integration/shared/constants';
import { DatabaseType } from '../src';

const dbType = config.get('database.type') as DatabaseType;

if (dbType === 'mysqldb') {
	const username = config.get('database.mysqldb.user');
	const password = config.get('database.mysqldb.password');
	const host = config.get('database.mysqldb.host');

	exec(
		`echo "CREATE DATABASE IF NOT EXISTS ${BOOTSTRAP_MYSQL_CONNECTION_NAME}" | mysql -h ${host} -u ${username} -p${password}; USE ${BOOTSTRAP_MYSQL_CONNECTION_NAME}`,
	);
}
