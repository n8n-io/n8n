import type { DataSource } from '@n8n/typeorm';
import type { PostgresDriver } from '@n8n/typeorm/driver/postgres/PostgresDriver';

/** Point-in-time view of a connection pool, normalized across drivers. */
export interface DbPoolStats {
	/** Connections currently checked out and running a query. */
	active: number;
	/** Connections sitting idle in the pool, ready for use. */
	idle: number;
	/** Callers queued waiting for a connection because the pool is saturated. */
	waiting: number;
}

/** The sqlite-pooled driver exposes this once the `@n8n/typeorm` fork provides it. */
interface DriverWithPoolStats {
	getPoolStats(): DbPoolStats;
}

function hasPoolStats(driver: object): driver is DriverWithPoolStats {
	return 'getPoolStats' in driver && typeof driver.getPoolStats === 'function';
}

/**
 * Reads point-in-time pool stats from the active driver, or `undefined` when
 * unavailable. Kept in `@n8n/db` so driver/TypeORM internals don't leak into
 * consumers (e.g. the metrics layer).
 *
 * For SQLite, `getPoolStats` combines the read-only pool and the single write
 * connection (which serializes writes and is the usual bottleneck), so the
 * numbers reflect total pool pressure. Requires an `@n8n/typeorm` version whose
 * sqlite-pooled driver exposes it; otherwise SQLite reports nothing.
 */
export function readPoolStats(dataSource: DataSource): DbPoolStats | undefined {
	const { driver } = dataSource;

	if (dataSource.options.type === 'postgres') {
		const pool = (driver as PostgresDriver).master;
		if (!pool) return undefined; // briefly absent mid-recovery
		return {
			active: pool.totalCount - pool.idleCount,
			idle: pool.idleCount,
			waiting: pool.waitingCount,
		};
	}

	if (hasPoolStats(driver)) return driver.getPoolStats();

	return undefined;
}
