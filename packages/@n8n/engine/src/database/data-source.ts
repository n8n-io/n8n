import 'reflect-metadata';

import { DataSource, type DataSourceOptions } from '@n8n/typeorm';

import { entities } from './entities';
import { migrations } from './migrations';

export interface DataPlaneDataSourceConfig {
	/** Connection URL like `postgres://user:pass@host:port/db`. Takes precedence over individual fields. */
	url?: string;
	host?: string;
	port?: number;
	username?: string;
	password?: string;
	database?: string;
	schema?: string;
	ssl?: boolean | { rejectUnauthorized?: boolean };
}

/**
 * Build a TypeORM `DataSource` for the engine's data-plane Postgres.
 *
 * The caller is responsible for `initialize()` and `runMigrations()`. This
 * factory only constructs the DataSource — it does not open connections.
 */
export function createDataPlaneDataSource(config: DataPlaneDataSourceConfig): DataSource {
	const options: DataSourceOptions = {
		type: 'postgres',
		url: config.url,
		host: config.host,
		port: config.port,
		username: config.username,
		password: config.password,
		database: config.database,
		schema: config.schema,
		ssl: config.ssl,
		entities,
		migrations,
		synchronize: false,
		logging: false,
	};

	return new DataSource(options);
}
