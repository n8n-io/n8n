import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { DataSourceOptions, LoggerOptions } from '@n8n/typeorm';
import type { MysqlConnectionOptions } from '@n8n/typeorm/driver/mysql/MysqlConnectionOptions';
import type { PostgresConnectionOptions } from '@n8n/typeorm/driver/postgres/PostgresConnectionOptions';
import type { SqliteConnectionOptions } from '@n8n/typeorm/driver/sqlite/SqliteConnectionOptions';
import type { SqlitePooledConnectionOptions } from '@n8n/typeorm/driver/sqlite-pooled/SqlitePooledConnectionOptions';
import { InstanceSettings } from 'n8n-core';
import { UserError } from 'n8n-workflow';
import path from 'path';
import type { TlsOptions } from 'tls';

import { entities } from './entities';
import { mysqlMigrations } from './migrations/mysqldb';
import { postgresMigrations } from './migrations/postgresdb';
import { sqliteMigrations } from './migrations/sqlite';
import { subscribers } from './subscribers';

const getCommonOptions = () => {
	const { tablePrefix: entityPrefix, logging: loggingConfig } =
		Container.get(GlobalConfig).database;

	let loggingOption: LoggerOptions = loggingConfig.enabled;
	if (loggingOption) {
		const optionsString = loggingConfig.options.replace(/\s+/g, '');
		if (optionsString === 'all') {
			loggingOption = optionsString;
		} else {
			loggingOption = optionsString.split(',') as LoggerOptions;
		}
	}

	return {
		entityPrefix,
		entities: Object.values(entities),
		subscribers: Object.values(subscribers),
		migrationsTableName: `${entityPrefix}migrations`,
		migrationsRun: false,
		synchronize: false,
		maxQueryExecutionTime: loggingConfig.maxQueryExecutionTime,
		logging: loggingOption,
	};
};

export const getOptionOverrides = (dbType: 'postgresdb' | 'mysqldb') => {
	const globalConfig = Container.get(GlobalConfig);
	const dbConfig = globalConfig.database[dbType];
	return {
		database: dbConfig.database,
		host: dbConfig.host,
		port: dbConfig.port,
		username: dbConfig.user,
		password: dbConfig.password,
	};
};

const getSqliteConnectionOptions = (): SqliteConnectionOptions | SqlitePooledConnectionOptions => {
	const globalConfig = Container.get(GlobalConfig);
	const sqliteConfig = globalConfig.database.sqlite;
	const commonOptions = {
		...getCommonOptions(),
		database: path.resolve(Container.get(InstanceSettings).n8nFolder, sqliteConfig.database),
		migrations: sqliteMigrations,
	};

	if (sqliteConfig.poolSize > 0) {
		return {
			type: 'sqlite-pooled',
			poolSize: sqliteConfig.poolSize,
			enableWAL: true,
			acquireTimeout: 60_000,
			destroyTimeout: 5_000,
			...commonOptions,
		};
	} else {
		return {
			type: 'sqlite',
			enableWAL: sqliteConfig.enableWAL,
			...commonOptions,
		};
	}
};

const getPostgresConnectionOptions = (): PostgresConnectionOptions => {
	const postgresConfig = Container.get(GlobalConfig).database.postgresdb;
	const {
		ssl: { ca: sslCa, cert: sslCert, key: sslKey, rejectUnauthorized: sslRejectUnauthorized },
	} = postgresConfig;

	let ssl: TlsOptions | boolean = postgresConfig.ssl.enabled;
	if (sslCa !== '' || sslCert !== '' || sslKey !== '' || !sslRejectUnauthorized) {
		ssl = {
			ca: sslCa || undefined,
			cert: sslCert || undefined,
			key: sslKey || undefined,
			rejectUnauthorized: sslRejectUnauthorized,
		};
	}

	return {
		type: 'postgres',
		...getCommonOptions(),
		...getOptionOverrides('postgresdb'),
		schema: postgresConfig.schema,
		poolSize: postgresConfig.poolSize,
		migrations: postgresMigrations,
		connectTimeoutMS: postgresConfig.connectionTimeoutMs,
		ssl,
	};
};

const getMysqlConnectionOptions = (dbType: 'mariadb' | 'mysqldb'): MysqlConnectionOptions => ({
	type: dbType === 'mysqldb' ? 'mysql' : 'mariadb',
	...getCommonOptions(),
	...getOptionOverrides('mysqldb'),
	migrations: mysqlMigrations,
	timezone: 'Z', // set UTC as default
});

export function getConnectionOptions(): DataSourceOptions {
	const globalConfig = Container.get(GlobalConfig);
	const { type: dbType } = globalConfig.database;
	switch (dbType) {
		case 'sqlite':
			return getSqliteConnectionOptions();
		case 'postgresdb':
			return getPostgresConnectionOptions();
		case 'mariadb':
		case 'mysqldb':
			return getMysqlConnectionOptions(dbType);
		default:
			throw new UserError('Database type currently not supported', { extra: { dbType } });
	}
}

export function arePostgresOptions(
	options: DataSourceOptions,
): options is PostgresConnectionOptions {
	return options.type === 'postgres';
}
