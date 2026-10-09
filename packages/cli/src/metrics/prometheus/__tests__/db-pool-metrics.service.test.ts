import type { Mock } from 'vitest';
import type { DatabaseConfig, PrometheusMetricsConfig } from '@n8n/config';
import { DbConnectionMetrics, type DbConnection, type DbPoolStats } from '@n8n/db';
import promClient from 'prom-client';

import { PrometheusDbPoolMetricsService } from '../db-pool-metrics.service';

vi.mock('prom-client');

type GaugeConfig = {
	name: string;
	help: string;
	collect?: (this: { set: Mock }) => void;
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
	({
		getPoolStats: () => stats,
		connectionState: { connected: true, migrated: true },
	}) as unknown as DbConnection;

describe('PrometheusDbPoolMetricsService', () => {
	let mockGaugeSet: Mock;
	let mockHistogramObserve: Mock;
	let mockCounterInc: Mock;

	beforeEach(() => {
		mockGaugeSet = vi.fn();
		mockHistogramObserve = vi.fn();
		promClient.Gauge.prototype.set = mockGaugeSet;
		promClient.Histogram.prototype.observe = mockHistogramObserve;
		mockCounterInc = vi.fn();
		promClient.Counter.prototype.inc = mockCounterInc;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const gaugeConfigs = () =>
		(promClient.Gauge as unknown as Mock).mock.calls.map((c) => c[0] as GaugeConfig);

	const findGauge = (name: string) => gaugeConfigs().find((g) => g.name === name);

	const runCollect = (name: string) => {
		const setSpy = vi.fn();
		findGauge(name)?.collect?.call({ set: setSpy });
		return setSpy;
	};

	const counterIncs = (name: string) => {
		const counterMock = promClient.Counter as unknown as Mock;
		const index = counterMock.mock.calls.findIndex((c) => (c[0] as { name: string }).name === name);
		const counter: unknown = counterMock.mock.instances[index];
		return mockCounterInc.mock.calls.filter((_, i) => mockCounterInc.mock.contexts[i] === counter);
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
					'n8n_db_pool_connected',
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

	describe('connection state', () => {
		it('reads the current state even when pool stats are unavailable', () => {
			const dbConnection = buildDbConnection(undefined);
			new PrometheusDbPoolMetricsService(
				buildConfig(),
				buildDatabaseConfig(),
				dbConnection,
				new DbConnectionMetrics(),
			).init();

			expect(runCollect('n8n_db_pool_connected')).toHaveBeenCalledWith(1);
			dbConnection.connectionState.connected = false;
			expect(runCollect('n8n_db_pool_connected')).toHaveBeenCalledWith(0);
			dbConnection.connectionState.connected = true;
			expect(runCollect('n8n_db_pool_connected')).toHaveBeenCalledWith(1);
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

	describe('recovery counters', () => {
		it('registers observers that feed the disconnection and recovery counters', () => {
			const dbConnectionMetrics = new DbConnectionMetrics();

			new PrometheusDbPoolMetricsService(
				buildConfig(),
				buildDatabaseConfig(),
				buildDbConnection(undefined),
				dbConnectionMetrics,
			).init();

			expect(counterIncs('n8n_db_pool_recovery_attempts_total')).toEqual([
				[{ result: 'success' }, 0],
				[{ result: 'failure' }, 0],
			]);

			dbConnectionMetrics.disconnectionObserver?.();
			dbConnectionMetrics.recoveryAttemptObserver?.('failure');
			dbConnectionMetrics.recoveryAttemptObserver?.('success');

			expect(counterIncs('n8n_db_pool_disconnections_total')).toEqual([[]]);
			expect(counterIncs('n8n_db_pool_recovery_attempts_total')).toEqual([
				[{ result: 'success' }, 0],
				[{ result: 'failure' }, 0],
				[{ result: 'failure' }],
				[{ result: 'success' }],
			]);
		});
	});
});
