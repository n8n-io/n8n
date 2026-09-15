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
 */
export function createDataSource(url: string): DataSource {
	const options: DataSourceOptions = {
		type: 'postgres',
		url,
		entities,
		migrations,
		// Own bookkeeping table, so the data plane can share a database with
		// another TypeORM app (the control plane) instead of needing its own.
		migrationsTableName: 'engine_migrations',
		synchronize: false,
		logging: false,
	};

	return new DataSource(options);
}
