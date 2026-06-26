import type { DatabaseConfig, PrometheusMetricsConfig } from '@n8n/config';
import { DbConnectionMetrics, type DbConnection, type DbPoolStats } from '@n8n/db';
import promClient from 'prom-client';

import { PrometheusDbPoolMetricsService } from '../db-pool-metrics.service';

jest.mock('prom-client');

type GaugeConfig = {
	name: string;
	help: string;
	collect?: (this: { set: jest.Mock }) => void;
};

const buildConfig = (overrides: Partial<PrometheusMetricsConfig> = {}) =>
	({ prefix: 'n8n_', includeDbPoolMetrics: true, ...overrides }) as PrometheusMetricsConfig;

const buildDatabaseConfig = (overrides: Partial<DatabaseConfig> = {}) =>
	({
		type: 'postgresdb',
		postgresdb: { poolSize: 2 },
		sqlite: { poolSize: 3 },
		...overrides,
	}) as unknown as DatabaseConfig;

const buildDbConnection = (stats: DbPoolStats | undefined) =>
	({ getPoolStats: () => stats }) as unknown as DbConnection;

describe('PrometheusDbPoolMetricsService', () => {
	let mockGaugeSet: jest.Mock;
	let mockHistogramObserve: jest.Mock;

	beforeEach(() => {
		mockGaugeSet = jest.fn();
		mockHistogramObserve = jest.fn();
		promClient.Gauge.prototype.set = mockGaugeSet;
		promClient.Histogram.prototype.observe = mockHistogramObserve;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	const gaugeConfigs = () =>
		(promClient.Gauge as unknown as jest.Mock).mock.calls.map((c) => c[0] as GaugeConfig);

	const findGauge = (name: string) => gaugeConfigs().find((g) => g.name === name);

	const runCollect = (name: string) => {
		const setSpy = jest.fn();
		findGauge(name)?.collect?.call({ set: setSpy });
		return setSpy;
	};

	describe('enabled', () => {
		it('is true when includeDbPoolMetrics is set', () => {
			const service = new PrometheusDbPoolMetricsService(
				buildConfig({ includeDbPoolMetrics: true }),
				buildDatabaseConfig(),
				buildDbConnection(undefined),
				new DbConnectionMetrics(),
			);
			expect(service.enabled).toBe(true);
		});

		it('is false when includeDbPoolMetrics is unset', () => {
			const service = new PrometheusDbPoolMetricsService(
				buildConfig({ includeDbPoolMetrics: false }),
				buildDatabaseConfig(),
				buildDbConnection(undefined),
				new DbConnectionMetrics(),
			);
			expect(service.enabled).toBe(false);
		});
	});

	describe('init', () => {
		it('creates the pool gauges and the acquire histogram with prefixed names', () => {
			new PrometheusDbPoolMetricsService(
				buildConfig(),
				buildDatabaseConfig(),
				buildDbConnection(undefined),
				new DbConnectionMetrics(),
			).init();

			const names = gaugeConfigs().map((g) => g.name);
			expect(names).toEqual(
				expect.arrayContaining([
					'n8n_db_pool_connections_active',
					'n8n_db_pool_connections_idle',
					'n8n_db_pool_requests_pending',
					'n8n_db_pool_connections_max',
				]),
			);
			expect(promClient.Histogram).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'n8n_db_pool_acquire_seconds' }),
			);
		});

		it('applies a custom prefix', () => {
			new PrometheusDbPoolMetricsService(
				buildConfig({ prefix: 'custom_' }),
				buildDatabaseConfig(),
				buildDbConnection(undefined),
				new DbConnectionMetrics(),
			).init();

			expect(gaugeConfigs().map((g) => g.name)).toContain('custom_db_pool_connections_active');
		});

		it('sets the max gauge from the configured Postgres pool size', () => {
			new PrometheusDbPoolMetricsService(
				buildConfig(),
				buildDatabaseConfig({ type: 'postgresdb' }),
				buildDbConnection(undefined),
				new DbConnectionMetrics(),
			).init();

			expect(mockGaugeSet).toHaveBeenCalledWith(2);
		});

		it('sets the max gauge from the configured SQLite pool size plus the write connection', () => {
			new PrometheusDbPoolMetricsService(
				buildConfig(),
				buildDatabaseConfig({ type: 'sqlite' }),
				buildDbConnection(undefined),
				new DbConnectionMetrics(),
			).init();

			expect(mockGaugeSet).toHaveBeenCalledWith(4);
		});
	});

	describe('pool gauges', () => {
		beforeEach(() => {
			new PrometheusDbPoolMetricsService(
				buildConfig(),
				buildDatabaseConfig(),
				buildDbConnection({ active: 3, idle: 2, waiting: 1 }),
				new DbConnectionMetrics(),
			).init();
		});

		it('reports active connections', () => {
			expect(runCollect('n8n_db_pool_connections_active')).toHaveBeenCalledWith(3);
		});

		it('reports idle connections', () => {
			expect(runCollect('n8n_db_pool_connections_idle')).toHaveBeenCalledWith(2);
		});

		it('reports pending requests', () => {
			expect(runCollect('n8n_db_pool_requests_pending')).toHaveBeenCalledWith(1);
		});
	});

	it('skips reporting when pool stats are unavailable', () => {
		new PrometheusDbPoolMetricsService(
			buildConfig(),
			buildDatabaseConfig(),
			buildDbConnection(undefined),
			new DbConnectionMetrics(),
		).init();

		expect(runCollect('n8n_db_pool_connections_active')).not.toHaveBeenCalled();
	});

	describe('acquire-latency histogram', () => {
		it('registers an observer that feeds the histogram', () => {
			const dbConnectionMetrics = new DbConnectionMetrics();

			new PrometheusDbPoolMetricsService(
				buildConfig(),
				buildDatabaseConfig(),
				buildDbConnection(undefined),
				dbConnectionMetrics,
			).init();

			expect(dbConnectionMetrics.acquireDurationObserver).toBeDefined();
			dbConnectionMetrics.acquireDurationObserver?.(0.42);
			expect(mockHistogramObserve).toHaveBeenCalledWith(0.42);
		});
	});
});
