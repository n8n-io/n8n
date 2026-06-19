import { DatabaseConfig, PrometheusMetricsConfig } from '@n8n/config';
import { DbConnectionMetrics } from '@n8n/db';
import { Service } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { DataSource } from '@n8n/typeorm';
import type { PostgresDriver } from '@n8n/typeorm/driver/postgres/PostgresDriver';
import promClient from 'prom-client';

import type { PrometheusMetricsCollector } from './base';

interface PoolStats {
	/** Connections currently checked out and running a query. */
	active: number;
	/** Connections sitting idle in the pool, ready for use. */
	idle: number;
	/** Callers queued waiting for a connection because the pool is saturated. */
	waiting: number;
}

interface DriverWithPoolStats {
	getPoolStats(): PoolStats;
}

function hasPoolStats(driver: object): driver is DriverWithPoolStats {
	return 'getPoolStats' in driver && typeof driver.getPoolStats === 'function';
}

@Service()
export class PrometheusDbPoolMetricsService implements PrometheusMetricsCollector {
	constructor(
		private readonly promConfig: PrometheusMetricsConfig,
		private readonly dbConfig: DatabaseConfig,
		private readonly dataSource: DataSource,
		private readonly dbConnectionMetrics: DbConnectionMetrics,
	) {}

	get enabled(): boolean {
		return this.promConfig.includeDbPoolMetrics;
	}

	init() {
		const { prefix } = this.promConfig;
		const readStats = () => this.readPoolStats();

		const makeGauge = (suffix: string, help: string, value: (stats: PoolStats) => number) =>
			new promClient.Gauge({
				name: `${prefix}db_pool_connections_${suffix}`,
				help,
				collect() {
					const stats = readStats();
					if (stats) this.set(value(stats));
				},
			});

		makeGauge(
			'active',
			'Number of in-use connections in the database connection pool.',
			(s) => s.active,
		);
		makeGauge(
			'idle',
			'Number of not-in-use connections in the database connection pool.',
			(s) => s.idle,
		);
		makeGauge(
			'waiting',
			'Number of callers waiting for an available connection.',
			(s) => s.waiting,
		);

		const maxGauge = new promClient.Gauge({
			name: `${prefix}db_pool_connections_max`,
			help: 'Max size of the database connection pool.',
		});
		maxGauge.set(this.maxPoolSize());

		// Postgres only: the timing is fed by DbConnectionMonitor wrapping
		// `obtainMasterConnection` (a Postgres-only chokepoint). SQLite acquires
		// happen inside the `tarn` pool, which has no equivalent interception point.
		const acquireHistogram = new promClient.Histogram({
			name: `${prefix}db_pool_acquire_seconds`,
			help: 'Time spent acquiring a connection from the database pool (Postgres only).',
			buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
		});
		this.dbConnectionMetrics.acquireDurationObserver = (seconds) =>
			acquireHistogram.observe(seconds);
	}

	private maxPoolSize(): number {
		return this.dbConfig.type === 'postgresdb'
			? this.dbConfig.postgresdb.poolSize
			: this.dbConfig.sqlite.poolSize;
	}

	private readPoolStats(): PoolStats | undefined {
		const { driver } = this.dataSource;

		if (this.dataSource.options.type === 'postgres') {
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
}
