import 'reflect-metadata';

import { DataSource, type DataSourceOptions } from '@n8n/typeorm';
import type { Driver } from '@n8n/typeorm/driver/Driver';
import type { PostgresDriver } from '@n8n/typeorm/driver/postgres/PostgresDriver';
import type { Pool } from 'pg';

import { UnexpectedError } from '../common';

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
		synchronize: false,
		logging: false,
	};

	return new DataSource(options);
}

/** The `pg` pool of an initialized `DataSource`, which the stores query directly. */
export function poolOf(dataSource: DataSource): Pool {
	const { driver } = dataSource;
	if (!isPostgresDriver(driver) || !driver.master) {
		throw new UnexpectedError('The engine stores need an initialized Postgres data source');
	}
	return driver.master;
}

function isPostgresDriver(driver: Driver): driver is PostgresDriver {
	return driver.options.type === 'postgres';
}
