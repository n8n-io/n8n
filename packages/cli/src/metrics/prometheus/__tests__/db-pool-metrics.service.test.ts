import type { DatabaseConfig, PrometheusMetricsConfig } from '@n8n/config';
import { DbConnectionMetrics } from '@n8n/db';
import type { DataSource } from '@n8n/typeorm';
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

const postgresDataSource = (master: unknown) =>
	({ options: { type: 'postgres' }, driver: { master } }) as unknown as DataSource;

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
				postgresDataSource(undefined),
				new DbConnectionMetrics(),
			);
			expect(service.enabled).toBe(true);
		});

		it('is false when includeDbPoolMetrics is unset', () => {
			const service = new PrometheusDbPoolMetricsService(
				buildConfig({ includeDbPoolMetrics: false }),
				buildDatabaseConfig(),
				postgresDataSource(undefined),
				new DbConnectionMetrics(),
			);
			expect(service.enabled).toBe(false);
		});
	});

	describe('init', () => {
		it('creates the four pool gauges and the acquire histogram with prefixed names', () => {
			new PrometheusDbPoolMetricsService(
				buildConfig(),
				buildDatabaseConfig(),
				postgresDataSource(undefined),
				new DbConnectionMetrics(),
			).init();

			const names = gaugeConfigs().map((g) => g.name);
			expect(names).toEqual(
				expect.arrayContaining([
					'n8n_db_pool_connections_active',
					'n8n_db_pool_connections_idle',
					'n8n_db_pool_connections_waiting',
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
				postgresDataSource(undefined),
				new DbConnectionMetrics(),
			).init();

			expect(gaugeConfigs().map((g) => g.name)).toContain('custom_db_pool_connections_active');
		});

		it('sets the max gauge from the configured Postgres pool size', () => {
			new PrometheusDbPoolMetricsService(
				buildConfig(),
				buildDatabaseConfig({ type: 'postgresdb' }),
				postgresDataSource(undefined),
				new DbConnectionMetrics(),
			).init();

			expect(mockGaugeSet).toHaveBeenCalledWith(2);
		});

		it('sets the max gauge from the configured SQLite pool size', () => {
			const dataSource = {
				options: { type: 'sqlite-pooled' },
				driver: {},
			} as unknown as DataSource;

			new PrometheusDbPoolMetricsService(
				buildConfig(),
				buildDatabaseConfig({ type: 'sqlite' }),
				dataSource,
				new DbConnectionMetrics(),
			).init();

			expect(mockGaugeSet).toHaveBeenCalledWith(3);
		});
	});

	describe('Postgres pool gauges', () => {
		const master = { totalCount: 5, idleCount: 2, waitingCount: 3 };

		beforeEach(() => {
			new PrometheusDbPoolMetricsService(
				buildConfig(),
				buildDatabaseConfig(),
				postgresDataSource(master),
				new DbConnectionMetrics(),
			).init();
		});

		it('reports active as total minus idle', () => {
			expect(runCollect('n8n_db_pool_connections_active')).toHaveBeenCalledWith(3);
		});

		it('reports idle connections', () => {
			expect(runCollect('n8n_db_pool_connections_idle')).toHaveBeenCalledWith(2);
		});

		it('reports the wait queue depth', () => {
			expect(runCollect('n8n_db_pool_connections_waiting')).toHaveBeenCalledWith(3);
		});
	});

	it('skips reporting when the Postgres pool is absent (mid-recovery)', () => {
		new PrometheusDbPoolMetricsService(
			buildConfig(),
			buildDatabaseConfig(),
			postgresDataSource(undefined),
			new DbConnectionMetrics(),
		).init();

		expect(runCollect('n8n_db_pool_connections_active')).not.toHaveBeenCalled();
	});

	describe('SQLite pool gauges via getPoolStats guard', () => {
		const dataSourceWithStats = {
			options: { type: 'sqlite-pooled' },
			driver: { getPoolStats: () => ({ active: 1, idle: 4, waiting: 0 }) },
		} as unknown as DataSource;

		beforeEach(() => {
			new PrometheusDbPoolMetricsService(
				buildConfig(),
				buildDatabaseConfig({ type: 'sqlite' }),
				dataSourceWithStats,
				new DbConnectionMetrics(),
			).init();
		});

		it('reports stats from the driver', () => {
			expect(runCollect('n8n_db_pool_connections_active')).toHaveBeenCalledWith(1);
			expect(runCollect('n8n_db_pool_connections_idle')).toHaveBeenCalledWith(4);
			expect(runCollect('n8n_db_pool_connections_waiting')).toHaveBeenCalledWith(0);
		});
	});

	it('skips reporting when a driver does not expose getPoolStats (older fork)', () => {
		const dataSource = {
			options: { type: 'sqlite-pooled' },
			driver: {},
		} as unknown as DataSource;

		new PrometheusDbPoolMetricsService(
			buildConfig(),
			buildDatabaseConfig({ type: 'sqlite' }),
			dataSource,
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
				postgresDataSource(undefined),
				dbConnectionMetrics,
			).init();

			expect(dbConnectionMetrics.acquireDurationObserver).toBeDefined();
			dbConnectionMetrics.acquireDurationObserver?.(0.42);
			expect(mockHistogramObserve).toHaveBeenCalledWith(0.42);
		});
	});
});
