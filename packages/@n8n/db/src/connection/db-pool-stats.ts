import type { DataSource } from '@n8n/typeorm';
import type { PostgresDriver } from '@n8n/typeorm/driver/postgres/PostgresDriver';
import type { SqliteReadWriteDriver } from '@n8n/typeorm/driver/sqlite-pooled/SqliteReadWriteDriver';

/** Point-in-time view of a connection pool, normalized across drivers. */
export interface DbPoolStats {
	/** Connections currently checked out and running a query. */
	active: number;
	/** Connections sitting idle in the pool, ready for use. */
	idle: number;
	/** Callers queued waiting for a connection because the pool is saturated. */
	waiting: number;
}

/**
 * Reads point-in-time pool stats from the active driver, or `undefined` when
 * unavailable. Kept in `@n8n/db` so driver/TypeORM internals don't leak into
 * consumers (e.g. the metrics layer).
 *
 * For SQLite, `getPoolStats` combines the read-only pool and the single write
 * connection (which serializes writes and is the usual bottleneck), so the
 * numbers reflect total pool pressure.
 */
export function readPoolStats(dataSource: DataSource): DbPoolStats | undefined {
	switch (dataSource.options.type) {
		case 'postgres': {
			const pool = (dataSource.driver as PostgresDriver).master;
			if (!pool) return undefined; // briefly absent mid-recovery
			return {
				active: pool.totalCount - pool.idleCount,
				idle: pool.idleCount,
				waiting: pool.waitingCount,
			};
		}
		case 'sqlite-pooled':
			return (dataSource.driver as SqliteReadWriteDriver).getPoolStats();
		default:
			return undefined;
	}
}
