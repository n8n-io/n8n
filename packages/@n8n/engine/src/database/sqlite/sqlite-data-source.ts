import 'reflect-metadata';

import { DataSource, type DataSourceOptions } from '@n8n/typeorm';

import { GenerateStepIdSubscriber } from './generate-id.subscriber';
import { CreateEngineTables1800000000000 } from './migrations/1800000000000-create-engine-tables';
import { sqliteEntitySchemas } from './sqlite-entities';

/** The URL forms that select SQLite: `sqlite:///abs/path.sqlite` or `sqlite:relative.sqlite`. */
export function isSqliteUrl(url: string): boolean {
	return url.startsWith('sqlite:');
}

/**
 * Build a TypeORM `DataSource` on the pooled SQLite driver the host uses for
 * its own database: WAL, one write connection behind a mutex, and `BEGIN
 * IMMEDIATE` for every write transaction. That last point is what the SQLite
 * stores rely on in place of row locks.
 */
export function createSqliteDataSource(url: string, { poolSize }: { poolSize?: number } = {}) {
	const options: DataSourceOptions = {
		type: 'sqlite-pooled',
		database: sqliteFilePath(url),
		enableWAL: true,
		poolSize,
		acquireTimeout: 60_000,
		destroyTimeout: 5_000,
		entities: sqliteEntitySchemas(),
		migrations: [CreateEngineTables1800000000000],
		subscribers: [GenerateStepIdSubscriber],
		synchronize: false,
		logging: false,
	};
	return new DataSource(options);
}

function sqliteFilePath(url: string): string {
	const path = url.slice('sqlite:'.length);
	return path.startsWith('//') ? path.slice(2) : path;
}
