import 'reflect-metadata';

import { DataSource, type DataSourceOptions } from '@n8n/typeorm';

import { entities } from './entities';
import { migrations } from './migrations';

/**
 * Build a TypeORM `DataSource` for the engine's Postgres from a connection URL
 * (`postgres://user:pass@host:port/db`).
 *
 * This is the persistence adapter's construction helper; composition roots
 * (`serve.ts`, or the host in integrated mode) call it and own the
 * `initialize()` / `runMigrations()` lifecycle. It only constructs the
 * DataSource — it does not open connections.
 *
 * `poolSize` is the most connections the pool opens, and `connectTimeoutMS` how
 * long a query waits for one, new or free. Unset, the pool keeps the `pg`
 * defaults: 10 connections and no timeout.
 */
export function createDataSource(
	url: string,
	{ poolSize, connectTimeoutMS }: { poolSize?: number; connectTimeoutMS?: number } = {},
): DataSource {
	const options: DataSourceOptions = {
		type: 'postgres',
		url,
		poolSize,
		connectTimeoutMS,
		entities,
		migrations,
		synchronize: false,
		logging: false,
	};

	return new DataSource(options);
}
