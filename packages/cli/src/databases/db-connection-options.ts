import { DatabaseConfig, InstanceSettingsConfig } from '@n8n/config';
import {
	entities,
	subscribers,
	mysqlMigrations,
	postgresMigrations,
	sqliteMigrations,
} from '@n8n/db';
import { Service } from '@n8n/di';
import type { DataSourceOptions, LoggerOptions } from '@n8n/typeorm';
import type { MysqlConnectionOptions } from '@n8n/typeorm/driver/mysql/MysqlConnectionOptions';
import type { PostgresConnectionOptions } from '@n8n/typeorm/driver/postgres/PostgresConnectionOptions';
import type { SqliteConnectionOptions } from '@n8n/typeorm/driver/sqlite/SqliteConnectionOptions';
import type { SqlitePooledConnectionOptions } from '@n8n/typeorm/driver/sqlite-pooled/SqlitePooledConnectionOptions';
import { UserError } from 'n8n-workflow';
import path from 'path';
import type { TlsOptions } from 'tls';

import { InsightsByPeriod } from '@/modules/insights/database/entities/insights-by-period';
import { InsightsMetadata } from '@/modules/insights/database/entities/insights-metadata';
import { InsightsRaw } from '@/modules/insights/database/entities/insights-raw';

@Service()
export class DbConnectionOptions {
	constructor(
		private readonly config: DatabaseConfig,
		private readonly instanceSettingsConfig: InstanceSettingsConfig,
	) {}

	getOverrides(dbType: 'postgresdb' | 'mysqldb') {
		const dbConfig = this.config[dbType];
		return {
			database: dbConfig.database,
			host: dbConfig.host,
			port: dbConfig.port,
			username: dbConfig.user,
			password: dbConfig.password,
		};
	}

	getOptions(): DataSourceOptions {
		const { type: dbType } = this.config;
		switch (dbType) {
			case 'sqlite':
				return this.getSqliteConnectionOptions();
			case 'postgresdb':
				return this.getPostgresConnectionOptions();
			case 'mariadb':
			case 'mysqldb':
				return this.getMysqlConnectionOptions(dbType);
			default:
				throw new UserError('Database type currently not supported', { extra: { dbType } });
		}
	}

	private getCommonOptions() {
		const { tablePrefix: entityPrefix, logging: loggingConfig } = this.config;

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
			entities: [...Object.values(entities), InsightsRaw, InsightsByPeriod, InsightsMetadata],
			subscribers: Object.values(subscribers),
			migrationsTableName: `${entityPrefix}migrations`,
			migrationsRun: false,
			synchronize: false,
			maxQueryExecutionTime: loggingConfig.maxQueryExecutionTime,
			logging: loggingOption,
		};
	}

	private getSqliteConnectionOptions(): SqliteConnectionOptions | SqlitePooledConnectionOptions {
		const { sqlite: sqliteConfig } = this.config;
		const { n8nFolder } = this.instanceSettingsConfig;

		const commonOptions = {
			...this.getCommonOptions(),
			database: path.resolve(n8nFolder, sqliteConfig.database),
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
	}

	private getPostgresConnectionOptions(): PostgresConnectionOptions {
		const { postgresdb: postgresConfig } = this.config;
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
			...this.getCommonOptions(),
			...this.getOverrides('postgresdb'),
			schema: postgresConfig.schema,
			poolSize: postgresConfig.poolSize,
			migrations: postgresMigrations,
			connectTimeoutMS: postgresConfig.connectionTimeoutMs,
			ssl,
		};
	}

	private getMysqlConnectionOptions(dbType: 'mariadb' | 'mysqldb'): MysqlConnectionOptions {
		return {
			type: dbType === 'mysqldb' ? 'mysql' : 'mariadb',
			...this.getCommonOptions(),
			...this.getOverrides('mysqldb'),
			migrations: mysqlMigrations,
			timezone: 'Z', // set UTC as default
		};
	}
}
