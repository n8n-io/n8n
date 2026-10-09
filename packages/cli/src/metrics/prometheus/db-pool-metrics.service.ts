import { DatabaseConfig, PrometheusMetricsConfig } from '@n8n/config';
import { DbConnection, DbConnectionMetrics, type DbPoolStats } from '@n8n/db';
import { Service } from '@n8n/di';
import promClient from 'prom-client';

import type { PrometheusMetricsCollector } from './base';

@Service()
export class PrometheusDbPoolMetricsService implements PrometheusMetricsCollector {
	constructor(
		private readonly promConfig: PrometheusMetricsConfig,
		private readonly dbConfig: DatabaseConfig,
		private readonly dbConnection: DbConnection,
		private readonly dbConnectionMetrics: DbConnectionMetrics,
	) {}

	get enabled(): boolean {
		return this.promConfig.includeDbPoolMetrics;
	}

	init() {
		const { prefix } = this.promConfig;
		const readStats = () => this.dbConnection.getPoolStats();

		const makeGauge = (name: string, help: string, value: (stats: DbPoolStats) => number) =>
			new promClient.Gauge({
				name: `${prefix}db_pool_${name}`,
				help,
				collect() {
					const stats = readStats();
					if (stats) this.set(value(stats));
				},
			});

		makeGauge(
			'connections_active',
			'Number of in-use connections in the database connection pool.',
			(s) => s.active,
		);
		makeGauge(
			'connections_idle',
			'Number of not-in-use connections in the database connection pool.',
			(s) => s.idle,
		);
		makeGauge(
			'requests_pending',
			'Number of requests waiting for an available database connection.',
			(s) => s.waiting,
		);

		const maxGauge = new promClient.Gauge({
			name: `${prefix}db_pool_connections_max`,
			help: 'Max size of the database connection pool.',
		});
		maxGauge.set(this.maxPoolSize());

		const { connectionState } = this.dbConnection;
		new promClient.Gauge({
			name: `${prefix}db_pool_connected`,
			help: 'Whether n8n considers the database connected (1) or disconnected (0).',
			collect() {
				this.set(Number(connectionState.connected));
			},
		});

		const disconnections = new promClient.Counter({
			name: `${prefix}db_pool_disconnections_total`,
			help: 'Number of transitions from a connected to a disconnected database.',
		});
		this.dbConnectionMetrics.disconnectionObserver = () => disconnections.inc();

		const recoveryAttempts = new promClient.Counter({
			name: `${prefix}db_pool_recovery_attempts_total`,
			help: 'Number of completed database recovery attempts by result (Postgres only).',
			labelNames: ['result'],
		});
		recoveryAttempts.inc({ result: 'success' }, 0);
		recoveryAttempts.inc({ result: 'failure' }, 0);
		this.dbConnectionMetrics.recoveryAttemptObserver = (result) => recoveryAttempts.inc({ result });

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
		if (this.dbConfig.type === 'postgresdb') return this.dbConfig.postgresdb.poolSize;
		// sqlite-pooled adds one write connection on top of the read pool.
		return this.dbConfig.sqlite.poolSize + 1;
	}
}
