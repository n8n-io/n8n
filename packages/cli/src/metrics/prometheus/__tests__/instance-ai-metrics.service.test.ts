/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/unbound-method -- vi mocks */
import type { Mock } from 'vitest';
import { mockInstance } from '@n8n/backend-test-utils';
import { PrometheusMetricsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';
import promClient from 'prom-client';

import type { EventService } from '@/events/event.service';
import type { InstanceAiRunProbe } from '@/modules/instance-ai/instance-ai-run-probe';

import { DURATION_BUCKETS_SECONDS } from '../constant';
import { PrometheusInstanceAiMetricsService } from '../instance-ai-metrics.service';

vi.mock('prom-client');

describe('PrometheusInstanceAiMetricsService', () => {
	const config = mockInstance(PrometheusMetricsConfig, {
		prefix: 'n8n_',
	});
	const eventService = mock<EventService>();
	const runProbe = mock<InstanceAiRunProbe>();
	let service: PrometheusInstanceAiMetricsService;
	let mockCounterInc: Mock;
	let mockHistogramObserve: Mock;
	let mockGaugeSet: Mock;

	function getEventHandler(eventName: string) {
		return eventService.on.mock.calls.find((c) => c[0] === eventName)?.[1];
	}

	beforeEach(() => {
		Object.assign(config, { prefix: 'n8n_' });
		service = new PrometheusInstanceAiMetricsService(config, eventService, runProbe);
		mockCounterInc = vi.fn();
		promClient.Counter.prototype.inc = mockCounterInc;
		mockHistogramObserve = vi.fn();
		promClient.Histogram.prototype.observe = mockHistogramObserve;
		mockGaugeSet = vi.fn();
		promClient.Gauge.prototype.set = mockGaugeSet;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('enabled', () => {
		it('is always on (gated by N8N_METRICS via init)', () => {
			expect(service.enabled).toBe(true);
		});
	});

	describe('init', () => {
		it('should create instance_ai_runs_total counter with status and model labels', () => {
			service.init();

			expect(promClient.Counter).toHaveBeenCalledWith({
				name: 'n8n_instance_ai_runs_total',
				help: 'Total number of Instance AI runs.',
				labelNames: ['status', 'model'],
			});
		});

		it('should create instance_ai_run_duration_seconds histogram with DURATION_BUCKETS_SECONDS', () => {
			service.init();

			expect(promClient.Histogram).toHaveBeenCalledWith({
				name: 'n8n_instance_ai_run_duration_seconds',
				help: 'Instance AI run duration in seconds.',
				labelNames: ['status'],
				buckets: DURATION_BUCKETS_SECONDS,
			});
		});

		it('should create instance_ai_tokens_total counter with a type label', () => {
			service.init();

			expect(promClient.Counter).toHaveBeenCalledWith({
				name: 'n8n_instance_ai_tokens_total',
				help: 'Total number of tokens used by Instance AI runs.',
				labelNames: ['type'],
			});
		});

		it('should create instance_ai_cost_usd_total counter', () => {
			service.init();

			expect(promClient.Counter).toHaveBeenCalledWith({
				name: 'n8n_instance_ai_cost_usd_total',
				help: 'Total estimated cost in USD of Instance AI runs (models.dev pricing).',
			});
		});

		it('should create instance_ai_active_runs gauge that reads the run probe on collect', () => {
			runProbe.activeRunCount.mockReturnValue(3);
			service.init();

			const gaugeOptions = (promClient.Gauge as unknown as Mock).mock.calls.find(
				(c) => c[0]?.name === 'n8n_instance_ai_active_runs',
			)?.[0];
			expect(gaugeOptions).toBeDefined();
			expect(gaugeOptions.help).toBe('Number of Instance AI runs currently executing.');

			// Invoke the collect() hook with a gauge-like `this` to verify it reads the probe.
			gaugeOptions.collect.call({ set: mockGaugeSet });
			expect(runProbe.activeRunCount).toHaveBeenCalled();
			expect(mockGaugeSet).toHaveBeenCalledWith(3);
		});
	});

	describe('instance-ai-run-finished event handler', () => {
		it('should increment runs counter with status and model labels', () => {
			service.init();
			const handler = getEventHandler('instance-ai-run-finished');
			expect(handler).toBeDefined();

			handler!({
				status: 'completed',
				durationMs: 4200,
				model: 'claude-opus-4',
				toolCalls: 3,
				toolErrors: 1,
			});

			expect(mockCounterInc).toHaveBeenCalledWith(
				{ status: 'completed', model: 'claude-opus-4' },
				1,
			);
		});

		it('should observe duration histogram in seconds when durationMs is present', () => {
			service.init();
			const handler = getEventHandler('instance-ai-run-finished');

			handler!({ status: 'error', durationMs: 4200, model: 'custom', toolCalls: 0, toolErrors: 0 });

			expect(mockHistogramObserve).toHaveBeenCalledWith({ status: 'error' }, 4.2);
		});

		it('should not observe duration histogram when durationMs is undefined', () => {
			service.init();
			const handler = getEventHandler('instance-ai-run-finished');

			handler!({ status: 'cancelled', model: 'custom', toolCalls: 0, toolErrors: 0 });

			expect(mockHistogramObserve).not.toHaveBeenCalled();
		});

		it('should increment tool call and error counters by their counts', () => {
			service.init();
			const handler = getEventHandler('instance-ai-run-finished');

			handler!({
				status: 'completed',
				durationMs: 1000,
				model: 'custom',
				toolCalls: 5,
				toolErrors: 2,
			});

			expect(mockCounterInc).toHaveBeenCalledWith(5);
			expect(mockCounterInc).toHaveBeenCalledWith(2);
		});

		it('should not increment tool counters when counts are zero', () => {
			service.init();
			const handler = getEventHandler('instance-ai-run-finished');
			mockCounterInc.mockClear();

			handler!({
				status: 'completed',
				durationMs: 1000,
				model: 'custom',
				toolCalls: 0,
				toolErrors: 0,
			});

			expect(mockCounterInc).not.toHaveBeenCalledWith(0);
		});

		it('should increment token counters by type and cost when usage is present', () => {
			service.init();
			const handler = getEventHandler('instance-ai-run-finished');

			handler!({
				status: 'completed',
				durationMs: 1000,
				model: 'custom',
				toolCalls: 0,
				toolErrors: 0,
				usage: {
					promptTokens: 1200,
					completionTokens: 300,
					totalTokens: 1500,
					costUsd: 0.0123,
				},
			});

			expect(mockCounterInc).toHaveBeenCalledWith({ type: 'input' }, 1200);
			expect(mockCounterInc).toHaveBeenCalledWith({ type: 'output' }, 300);
			expect(mockCounterInc).toHaveBeenCalledWith(0.0123);
		});

		it('should not increment token or cost counters when usage is absent', () => {
			service.init();
			const handler = getEventHandler('instance-ai-run-finished');
			mockCounterInc.mockClear();

			handler!({
				status: 'completed',
				durationMs: 1000,
				model: 'custom',
				toolCalls: 0,
				toolErrors: 0,
			});

			expect(mockCounterInc).not.toHaveBeenCalledWith({ type: 'input' }, expect.any(Number));
			expect(mockCounterInc).not.toHaveBeenCalledWith({ type: 'output' }, expect.any(Number));
		});
	});
});
