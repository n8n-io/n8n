import { EventService } from '@n8n/backend-services';
import { mockInstance } from '@n8n/backend-test-utils';
import { ExecutionsConfig, MemoryGuardConfig, PrometheusMetricsConfig } from '@n8n/config';
import promClient from 'prom-client';

import { PrometheusMemoryGuardMetricsService } from '../memory-guard-metrics.service';

describe('PrometheusMemoryGuardMetricsService', () => {
	const config = mockInstance(PrometheusMetricsConfig, { prefix: 'n8n_' });
	const memoryGuardConfig = mockInstance(MemoryGuardConfig, { enabled: true });
	const executionsConfig = mockInstance(ExecutionsConfig, { mode: 'regular' });

	let eventService: EventService;
	let service: PrometheusMemoryGuardMetricsService;

	const value = async (name: string, labels: Record<string, string> = {}) => {
		const metric = await promClient.register.getSingleMetric(name)?.get();
		return metric?.values.find((v) =>
			Object.entries(labels).every(([key, label]) => v.labels[key] === label),
		)?.value;
	};

	const stopEvent = {
		executionId: '1',
		workflowId: 'workflow-1',
		mode: 'webhook' as const,
		runningNodeType: undefined,
		largestDataNodeType: undefined,
		estimatedBytes: 1,
		memoryUsedBytes: 1,
		memoryLimitBytes: 1,
	};

	beforeEach(() => {
		promClient.register.clear();
		Object.assign(memoryGuardConfig, { enabled: true });
		Object.assign(executionsConfig, { mode: 'regular' });
		eventService = new EventService();
		service = new PrometheusMemoryGuardMetricsService(
			config,
			memoryGuardConfig,
			executionsConfig,
			eventService,
		);
	});

	describe('enabled', () => {
		it('should be true when the memory guard is enabled in regular mode', () => {
			expect(service.enabled).toBe(true);
		});

		it('should be false when the memory guard is disabled', () => {
			memoryGuardConfig.enabled = false;
			expect(service.enabled).toBe(false);
		});

		it('should be false in queue mode', () => {
			executionsConfig.mode = 'queue';
			expect(service.enabled).toBe(false);
		});
	});

	it('should count holds and track whether a hold is active', async () => {
		service.init();
		expect(await value('n8n_memory_guard_holding')).toBe(0);

		eventService.emit('memory-guard-hold-started', { memoryUsedBytes: 1, memoryLimitBytes: 2 });
		expect(await value('n8n_memory_guard_holds_total')).toBe(1);
		expect(await value('n8n_memory_guard_holding')).toBe(1);

		eventService.emit('memory-guard-hold-ended', { heldMs: 1_500 });
		expect(await value('n8n_memory_guard_holding')).toBe(0);
		expect(await value('n8n_memory_guard_hold_seconds_total')).toBe(1.5);
	});

	it('should start every stop series at 0', async () => {
		service.init();

		for (const reason of ['threshold', 'critical', 'hold_limit']) {
			for (const freed of ['true', 'false']) {
				expect(await value('n8n_memory_guard_stops_total', { reason, freed })).toBe(0);
			}
		}
	});

	it('should count stops by reason and result, and deactivations', async () => {
		service.init();

		eventService.emit('memory-guard-execution-stopped', {
			...stopEvent,
			reason: 'hold-limit',
			freedMemory: true,
			workflowDeactivationStarted: true,
		});
		eventService.emit('memory-guard-execution-stopped', {
			...stopEvent,
			reason: 'critical',
			freedMemory: false,
			workflowDeactivationStarted: false,
		});
		expect(await value('n8n_memory_guard_deactivations_total')).toBe(0);

		eventService.emit('memory-guard-workflow-deactivated', { workflowId: 'workflow-1' });

		expect(
			await value('n8n_memory_guard_stops_total', { reason: 'hold_limit', freed: 'true' }),
		).toBe(1);
		expect(
			await value('n8n_memory_guard_stops_total', { reason: 'critical', freed: 'false' }),
		).toBe(1);
		expect(await value('n8n_memory_guard_deactivations_total')).toBe(1);
	});

	it('should register its metrics only once when started twice', async () => {
		service.init();
		service.init();

		eventService.emit('memory-guard-hold-started', { memoryUsedBytes: 1, memoryLimitBytes: 2 });

		expect(await value('n8n_memory_guard_holds_total')).toBe(1);
	});

	it('should count crashes by the last guard action', async () => {
		service.init();

		eventService.emit('memory-guard-crashes-counted', { crashes: { none: 3, hold: 1, stop: 2 } });

		expect(await value('n8n_memory_guard_crashes_total', { last_action: 'none' })).toBe(3);
		expect(await value('n8n_memory_guard_crashes_total', { last_action: 'hold' })).toBe(1);
		expect(await value('n8n_memory_guard_crashes_total', { last_action: 'stop' })).toBe(2);
	});
});
