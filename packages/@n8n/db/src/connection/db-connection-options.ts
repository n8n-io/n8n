import { ModuleRegistry } from '@n8n/backend-common';
import { DatabaseConfig, InstanceSettingsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { DataSourceOptions, LoggerOptions } from '@n8n/typeorm';
import type { PostgresConnectionOptions } from '@n8n/typeorm/driver/postgres/PostgresConnectionOptions';
import type { SqlitePooledConnectionOptions } from '@n8n/typeorm/driver/sqlite-pooled/SqlitePooledConnectionOptions';
import { UserError } from 'n8n-workflow';
import type { TlsOptions } from 'node:tls';
import path from 'path';

import { entities } from '../entities';
import { postgresMigrations } from '../migrations/postgresdb';
import { sqliteMigrations } from '../migrations/sqlite';
import { subscribers } from '../subscribers';

@Service()
export class DbConnectionOptions {
	constructor(
		private readonly config: DatabaseConfig,
		private readonly instanceSettingsConfig: InstanceSettingsConfig,
		private readonly moduleRegistry: ModuleRegistry,
	) {}

	getPostgresOverrides() {
		return {
			database: this.config.postgresdb.database,
			host: this.config.postgresdb.host,
			port: this.config.postgresdb.port,
			username: this.config.postgresdb.user,
			password: this.config.postgresdb.password,
		};
	}

	getOptions(): DataSourceOptions {
		const { type: dbType } = this.config;
		switch (dbType) {
			case 'sqlite':
				return this.getSqliteConnectionOptions();
			case 'postgresdb':
				return this.getPostgresConnectionOptions();
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
			entities: [...Object.values(entities), ...this.moduleRegistry.entities],
			subscribers: Object.values(subscribers),
			migrationsTableName: `${entityPrefix}migrations`,
			migrationsRun: false,
			synchronize: false,
			maxQueryExecutionTime: loggingConfig.maxQueryExecutionTime,
			logging: loggingOption,
		};
	}

	private getSqliteConnectionOptions(): SqlitePooledConnectionOptions {
		const { sqlite: sqliteConfig } = this.config;
		const { n8nFolder } = this.instanceSettingsConfig;

		return {
			type: 'sqlite-pooled',
			poolSize: sqliteConfig.poolSize,
			enableWAL: true,
			acquireTimeout: 60_000,
			destroyTimeout: 5_000,
			...this.getCommonOptions(),
			database: path.resolve(n8nFolder, sqliteConfig.database),
			migrations: sqliteMigrations,
		};
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
			...this.getPostgresOverrides(),
			schema: postgresConfig.schema,
			poolSize: postgresConfig.poolSize,
			migrations: postgresMigrations,
			connectTimeoutMS: postgresConfig.connectionTimeoutMs,
			statementTimeout: postgresConfig.statementTimeoutMs,
			ssl,
			extra: {
				idleTimeoutMillis: postgresConfig.idleTimeoutMs,
			},
		};
	}
}
