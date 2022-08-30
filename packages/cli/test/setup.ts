import { exec as callbackExec } from 'child_process';
import { promisify } from 'util';

import config from '../config';
import {
	BOOTSTRAP_MYSQL_CONNECTION_NAME,
	DB_INITIALIZATION_TIMEOUT,
} from './integration/shared/constants';

const exec = promisify(callbackExec);

const dbType = config.getEnv('database.type');

if (dbType === 'mysqldb') {
	const username = config.getEnv('database.mysqldb.user');
	const password = config.getEnv('database.mysqldb.password');
	const host = config.getEnv('database.mysqldb.host');

	const passwordSegment = password ? `-p${password}` : '';

	(async () => {
		try {
			jest.setTimeout(DB_INITIALIZATION_TIMEOUT);
			await exec(
				`echo "CREATE DATABASE IF NOT EXISTS ${BOOTSTRAP_MYSQL_CONNECTION_NAME}" | mysql -h ${host} -u ${username} ${passwordSegment}; USE ${BOOTSTRAP_MYSQL_CONNECTION_NAME};`,
			);
		} catch (error) {
			if (error.stderr.includes('Access denied')) {
				console.error(
					`ERROR: Failed to log into MySQL to create bootstrap DB.\nPlease review your MySQL connection options:\n\thost: "${host}"\n\tusername: "${username}"\n\tpassword: "${password}"\nFix by setting correct values via environment variables.\n\texport DB_MYSQLDB_HOST=value\n\texport DB_MYSQLDB_USERNAME=value\n\texport DB_MYSQLDB_PASSWORD=value`,
				);
				process.exit(1);
			}
		}
	})();
}
