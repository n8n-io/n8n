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

	it('should count stops by trigger and result, and deactivations', async () => {
		service.init();

		eventService.emit('memory-guard-execution-stopped', {
			...stopEvent,
			trigger: 'hold-limit',
			freedMemory: true,
			workflowDeactivated: true,
		});
		eventService.emit('memory-guard-execution-stopped', {
			...stopEvent,
			trigger: 'critical',
			freedMemory: false,
			workflowDeactivated: false,
		});

		expect(
			await value('n8n_memory_guard_stops_total', { trigger: 'hold_limit', freed: 'true' }),
		).toBe(1);
		expect(
			await value('n8n_memory_guard_stops_total', { trigger: 'critical', freed: 'false' }),
		).toBe(1);
		expect(await value('n8n_memory_guard_deactivations_total')).toBe(1);
	});
});
