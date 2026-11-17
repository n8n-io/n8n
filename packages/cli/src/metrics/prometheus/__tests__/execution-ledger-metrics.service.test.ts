import type { CacheService, EventService, ExecutionLedger } from '@n8n/backend-services';
import { mockInstance } from '@n8n/backend-test-utils';
import { PrometheusMetricsConfig } from '@n8n/config';
import type { DbConnection } from '@n8n/db';
import type { InstanceSettings } from 'n8n-core';
import promClient from 'prom-client';
import { mock } from 'vitest-mock-extended';

import { CachedMetricQueryFactory } from '../cached-metric-query';
import { DatabaseMetricQueryService } from '../database-metric-query.service';
import { PrometheusExecutionLedgerMetricsService } from '../execution-ledger-metrics.service';

vi.mock('prom-client');

describe('PrometheusExecutionLedgerMetricsService', () => {
	const NOW = new Date('2026-01-01T00:00:00.000Z');

	const config = mockInstance(PrometheusMetricsConfig, {
		prefix: 'n8n_',
		includeExecutionLedgerMetrics: true,
	});
	const instanceSettings = mock<InstanceSettings>({ instanceType: 'main' });
	const eventService = mock<EventService>();
	const cacheService = mock<CacheService>();
	const dbConnection = mock<DbConnection>({
		connectionState: { connected: true, migrated: true },
	});
	const ledger = mock<ExecutionLedger>();

	let service: PrometheusExecutionLedgerMetricsService;
	const instancesByName = new Map<string, FakeMetric>();

	/** One value per label set, like `prom-client`. */
	class FakeMetric {
		private readonly values = new Map<string, number>();

		inc = vi.fn((labelsOrValue: object | number) => {
			const [key, delta] =
				typeof labelsOrValue === 'number'
					? ['', labelsOrValue]
					: [JSON.stringify(labelsOrValue), 1];
			this.values.set(key, (this.values.get(key) ?? 0) + delta);
		});
		set = vi.fn((value: number) => this.values.set('', value));

		collect?: () => Promise<void>;

		value(labels?: object) {
			return this.values.get(labels ? JSON.stringify(labels) : '');
		}
	}

	function fake() {
		return class extends FakeMetric {
			constructor(opts: { name: string; collect?: () => Promise<void> }) {
				super();
				this.collect = opts.collect;
				instancesByName.set(opts.name, this);
			}
		};
	}

	const metric = (name: string) => instancesByName.get(`n8n_${name}`)!;

	function emit(event: string, payload: object) {
		const calls = eventService.on.mock.calls as unknown as Array<
			[string, (payload: unknown) => void]
		>;
		calls.find(([name]) => name === event)![1](payload);
	}

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
		Object.assign(config, { prefix: 'n8n_', includeExecutionLedgerMetrics: true });
		Object.assign(instanceSettings, { instanceType: 'main' });
		instancesByName.clear();
		Object.assign(promClient, { Counter: fake(), Gauge: fake() });

		cacheService.get.mockResolvedValue(undefined);
		dbConnection.connectionState.connected = true;
		ledger.getBacklogStats.mockResolvedValue({ rows: 0, oldestOccurredAt: null });
		Object.assign(ledger, { isEnabled: true });

		service = new PrometheusExecutionLedgerMetricsService(
			config,
			instanceSettings,
			ledger,
			eventService,
			new DatabaseMetricQueryService(
				new CachedMetricQueryFactory(cacheService, dbConnection),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				ledger,
			),
		);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	describe('enabled', () => {
		it('is true when opted in, on main, and the ledger module is on', () => {
			expect(service.enabled).toBe(true);
		});

		it('is false when not opted in', () => {
			config.includeExecutionLedgerMetrics = false;
			expect(service.enabled).toBe(false);
		});

		it('is false when the instance is not main', () => {
			Object.assign(instanceSettings, { instanceType: 'worker' });
			expect(service.enabled).toBe(false);
		});

		it('is false when the ledger module is off', () => {
			Object.assign(ledger, { isEnabled: false });
			expect(service.enabled).toBe(false);
		});
	});

	describe('fold events', () => {
		beforeEach(() => {
			service.init();
		});

		it('step-failed counts the failure for that step', () => {
			emit('execution-ledger-fold-step-failed', { step: 'alpha' });
			emit('execution-ledger-fold-step-failed', { step: 'alpha' });

			expect(metric('execution_ledger_fold_step_failures_total').value({ step: 'alpha' })).toBe(2);
			expect(
				metric('execution_ledger_fold_step_failures_total').value({ step: 'beta' }),
			).toBeUndefined();
		});

		it('succeeded stamps the time of the last successful fold and counts the rows', () => {
			emit('execution-ledger-fold-succeeded', { rows: 5 });
			emit('execution-ledger-fold-succeeded', { rows: 0 });

			expect(metric('execution_ledger_fold_last_success_timestamp_seconds').value()).toBe(
				NOW.getTime() / 1000,
			);
			expect(metric('execution_ledger_fold_rows_total').value()).toBe(5);
		});
	});

	describe('backlog gauges', () => {
		const collect = async (name: string) => {
			await metric(name).collect!();
			return metric(name).value();
		};
		const collectRows = async () => await collect('execution_ledger_backlog_rows');
		const collectAge = async () => await collect('execution_ledger_backlog_oldest_row_age_seconds');

		beforeEach(() => {
			service.init();
		});

		it('reports the row count', async () => {
			ledger.getBacklogStats.mockResolvedValue({ rows: 7, oldestOccurredAt: NOW });

			expect(await collectRows()).toBe(7);
		});

		it('reports the age of the oldest row in seconds', async () => {
			ledger.getBacklogStats.mockResolvedValue({
				rows: 1,
				oldestOccurredAt: new Date(NOW.getTime() - 90_000),
			});

			expect(await collectAge()).toBe(90);
		});

		it('reports an age of 0 when there is no oldest row', async () => {
			ledger.getBacklogStats.mockResolvedValue({ rows: 0, oldestOccurredAt: null });

			expect(await collectAge()).toBe(0);
		});

		it('reports NaN when the database is disconnected and the cache is empty', async () => {
			dbConnection.connectionState.connected = false;

			expect(await collectRows()).toBeNaN();
			expect(await collectAge()).toBeNaN();
			expect(ledger.getBacklogStats).not.toHaveBeenCalled();
		});
	});
});
