import {
	getMariaDBConnectionOptions,
	getMysqlConnectionOptions,
	getPostgresConnectionOptions,
	getSqliteConnectionOptions,
} from './config';

export default [
	getSqliteConnectionOptions(),
	getPostgresConnectionOptions(),
	getMysqlConnectionOptions(),
	getMariaDBConnectionOptions(),
];
