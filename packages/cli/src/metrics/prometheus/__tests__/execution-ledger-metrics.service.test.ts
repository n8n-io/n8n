import type { ModuleRegistry } from '@n8n/backend-common';
import { ExecutionLedgerBacklog } from '@n8n/backend-module-execution-ledger';
import type { CacheService, EventService } from '@n8n/backend-services';
import { mockInstance } from '@n8n/backend-test-utils';
import { PrometheusMetricsConfig } from '@n8n/config';
import type { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import type { InstanceSettings } from 'n8n-core';
import promClient from 'prom-client';
import { mock } from 'vitest-mock-extended';

import { CachedMetricQueryFactory } from '../cached-metric-query';
import { DatabaseMetricQueryService } from '../database-metric-query.service';
import { PrometheusExecutionLedgerMetricsService } from '../execution-ledger-metrics.service';

vi.mock('prom-client');
vi.mock('@n8n/backend-module-execution-ledger', () => ({
	ExecutionLedgerBacklog: class ExecutionLedgerBacklog {},
}));

describe('PrometheusExecutionLedgerMetricsService', () => {
	const NOW = new Date('2026-01-01T00:00:00.000Z');

	const config = mockInstance(PrometheusMetricsConfig, {
		prefix: 'n8n_',
		includeExecutionLedgerMetrics: true,
	});
	const instanceSettings = mock<InstanceSettings>({ instanceType: 'main' });
	const moduleRegistry = mock<ModuleRegistry>();
	const eventService = mock<EventService>();
	const cacheService = mock<CacheService>();
	const dbConnection = mock<DbConnection>({
		connectionState: { connected: true, migrated: true },
	});
	const backlog = mock<ExecutionLedgerBacklog>();

	let service: PrometheusExecutionLedgerMetricsService;
	const instancesByName = new Map<string, FakeMetric>();

	/** Tracks the value of each label set, and of an unlabelled series, like `prom-client`. */
	class FakeMetric {
		private readonly values = new Map<string, number>();

		inc = vi.fn((labelsOrValue?: object | number, value = 1) => {
			if (typeof labelsOrValue === 'number') return this.add('', labelsOrValue);
			this.add(labelsOrValue === undefined ? '' : JSON.stringify(labelsOrValue), value);
		});
		set = vi.fn((labelsOrValue: object | number, value?: number) => {
			if (typeof labelsOrValue === 'number') this.values.set('', labelsOrValue);
			else this.values.set(JSON.stringify(labelsOrValue), value as number);
		});

		collect?: () => Promise<void>;

		value(labels?: object) {
			return this.values.get(labels ? JSON.stringify(labels) : '');
		}

		private add(key: string, delta: number) {
			this.values.set(key, (this.values.get(key) ?? 0) + delta);
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
		moduleRegistry.isActive.mockReturnValue(true);
		instancesByName.clear();
		Object.assign(promClient, { Counter: fake(), Gauge: fake() });

		cacheService.get.mockResolvedValue(undefined);
		dbConnection.connectionState.connected = true;
		backlog.getStats.mockResolvedValue({ rows: 0, oldestOccurredAt: null });
		Container.set(ExecutionLedgerBacklog, backlog);

		service = new PrometheusExecutionLedgerMetricsService(
			config,
			instanceSettings,
			moduleRegistry,
			eventService,
			new DatabaseMetricQueryService(
				new CachedMetricQueryFactory(cacheService, dbConnection),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
			),
		);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	describe('enabled', () => {
		it('is true when opted in, on main, and the module is active', () => {
			expect(service.enabled).toBe(true);
			expect(moduleRegistry.isActive).toHaveBeenCalledWith('execution-ledger');
		});

		it('is false when not opted in', () => {
			config.includeExecutionLedgerMetrics = false;
			expect(service.enabled).toBe(false);
		});

		it('is false when the instance is not main', () => {
			Object.assign(instanceSettings, { instanceType: 'worker' });
			expect(service.enabled).toBe(false);
		});

		it('is false when the module is not active', () => {
			moduleRegistry.isActive.mockReturnValue(false);
			expect(service.enabled).toBe(false);
		});
	});

	describe('fold events', () => {
		beforeEach(() => {
			service.init();
		});

		it('creates no step series before a step fails', () => {
			expect(metric('execution_ledger_fold_step_failures_total').inc).not.toHaveBeenCalled();
		});

		it('step-failed counts the failure for that step', () => {
			emit('execution-ledger-fold-step-failed', { step: 'alpha', attempt: 1 });
			emit('execution-ledger-fold-step-failed', { step: 'alpha', attempt: 2 });

			expect(metric('execution_ledger_fold_step_failures_total').value({ step: 'alpha' })).toBe(2);
			expect(
				metric('execution_ledger_fold_step_failures_total').value({ step: 'beta' }),
			).toBeUndefined();
		});

		it('succeeded stamps the time of the last successful fold', () => {
			emit('execution-ledger-fold-succeeded', {});

			expect(metric('execution_ledger_fold_last_success_timestamp_seconds').value()).toBe(
				NOW.getTime() / 1000,
			);
		});
	});

	describe('backlog gauges', () => {
		const collectRows = async () => {
			await metric('execution_ledger_backlog_rows').collect!();
			return metric('execution_ledger_backlog_rows').value();
		};
		const collectAge = async () => {
			await metric('execution_ledger_backlog_oldest_row_age_seconds').collect!();
			return metric('execution_ledger_backlog_oldest_row_age_seconds').value();
		};

		beforeEach(() => {
			service.init();
		});

		it('reports the row count', async () => {
			backlog.getStats.mockResolvedValue({ rows: 7, oldestOccurredAt: NOW });

			expect(await collectRows()).toBe(7);
		});

		it('reports the age of the oldest row in seconds', async () => {
			backlog.getStats.mockResolvedValue({
				rows: 1,
				oldestOccurredAt: new Date(NOW.getTime() - 90_000),
			});

			expect(await collectAge()).toBe(90);
		});

		it('reports an age of 0 when there is no oldest row', async () => {
			backlog.getStats.mockResolvedValue({ rows: 0, oldestOccurredAt: null });

			expect(await collectAge()).toBe(0);
		});

		it('reports NaN when the database is disconnected and the cache is empty', async () => {
			dbConnection.connectionState.connected = false;

			expect(await collectRows()).toBeNaN();
			expect(await collectAge()).toBeNaN();
			expect(backlog.getStats).not.toHaveBeenCalled();
		});
	});
});
