import { mockInstance } from '@n8n/backend-test-utils';
import { PrometheusMetricsConfig } from '@n8n/config';
import type { InstanceSettings, TriggersAndPollers } from 'n8n-core';
import promClient from 'prom-client';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { EventService } from '@/events/event.service';

import { PrometheusPollTriggerMetricsService } from '../poll-trigger-metrics.service';

vi.mock('prom-client');

describe('PrometheusPollTriggerMetricsService', () => {
	const config = mockInstance(PrometheusMetricsConfig, {
		prefix: 'n8n_',
		includePollTriggerMetrics: true,
	});
	const instanceSettings = mock<InstanceSettings>({ instanceType: 'main' });
	const eventService = mock<EventService>();
	const pollTickEvents = { on: vi.fn() };
	const triggersAndPollers = { events: pollTickEvents } as unknown as TriggersAndPollers;

	let service: PrometheusPollTriggerMetricsService;
	let counterCtor: Mock;
	const counterIncByName = new Map<string, Mock>();
	let histogramCtor: Mock;
	const histogramObserveByName = new Map<string, Mock>();

	beforeEach(() => {
		Object.assign(config, { prefix: 'n8n_', includePollTriggerMetrics: true });
		Object.assign(instanceSettings, { instanceType: 'main' });

		service = new PrometheusPollTriggerMetricsService(
			config,
			instanceSettings,
			eventService,
			triggersAndPollers,
		);

		counterCtor = vi.fn();
		counterIncByName.clear();
		histogramCtor = vi.fn();
		histogramObserveByName.clear();
		// Replace the auto-mocked classes (whose instances share one prototype method)
		// with real fake classes, so each construction yields its own `inc`/`observe`
		// and a test can assert the right metric received the right value.
		class FakeCounter {
			inc = vi.fn();

			constructor(opts: { name: string }) {
				counterCtor(opts);
				counterIncByName.set(opts.name, this.inc);
			}
		}
		class FakeHistogram {
			observe = vi.fn();

			constructor(opts: { name: string }) {
				histogramCtor(opts);
				histogramObserveByName.set(opts.name, this.observe);
			}
		}
		(promClient as unknown as { Counter: unknown }).Counter = FakeCounter;
		(promClient as unknown as { Histogram: unknown }).Histogram = FakeHistogram;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const counterIncFor = (name: string) => counterIncByName.get(name)!;
	const histogramObserveFor = (name: string) => histogramObserveByName.get(name)!;

	function getPollTickHandler() {
		const calls = pollTickEvents.on.mock.calls as Array<[string, (payload: unknown) => void]>;
		return calls.find((c) => c[0] === 'poll-tick-completed')![1];
	}

	function getCursorCommitHandler() {
		const calls = eventService.on.mock.calls as unknown as Array<
			[string, (payload: unknown) => void]
		>;
		return calls.find((c) => c[0] === 'poll-cursor-commit-settled')![1];
	}

	describe('enabled', () => {
		it('is true when opted in and the instance is main', () => {
			expect(service.enabled).toBe(true);
		});

		it('is false when not opted in', () => {
			config.includePollTriggerMetrics = false;
			expect(service.enabled).toBe(false);
		});

		it('is false on a non-main instance', () => {
			Object.assign(instanceSettings, { instanceType: 'worker' });
			expect(service.enabled).toBe(false);
		});
	});

	describe('init', () => {
		it('registers the counters and histograms', () => {
			service.init();

			const counterNames = counterCtor.mock.calls.map((c) => c[0].name);
			expect(counterNames).toEqual(
				expect.arrayContaining([
					'n8n_poll_trigger_errors_total',
					'n8n_poll_trigger_overlapping_ticks_total',
					'n8n_poll_trigger_timeouts_total',
					'n8n_poll_trigger_cursor_commits_total',
				]),
			);

			const histogramNames = histogramCtor.mock.calls.map((c) => c[0].name);
			expect(histogramNames).toEqual(
				expect.arrayContaining([
					'n8n_poll_trigger_duration_seconds',
					'n8n_poll_trigger_cursor_commit_duration_seconds',
				]),
			);
		});

		it('applies a custom prefix to metric names', () => {
			config.prefix = 'myapp_';
			service.init();

			const counterNames = counterCtor.mock.calls.map((c) => c[0].name);
			expect(counterNames).toContain('myapp_poll_trigger_errors_total');
		});

		it('subscribes to the poll-tick and cursor-commit event streams', () => {
			service.init();

			expect(pollTickEvents.on).toHaveBeenCalledWith('poll-tick-completed', expect.any(Function));
			expect(eventService.on).toHaveBeenCalledWith(
				'poll-cursor-commit-settled',
				expect.any(Function),
			);
			expect(eventService.on).toHaveBeenCalledWith('poll-tick-timed-out', expect.any(Function));
		});
	});

	describe('poll-tick-completed handler', () => {
		it('observes the tick duration in seconds by node type and status', () => {
			service.init();

			getPollTickHandler()({
				nodeType: 'n8n-nodes-base.testPoll',
				status: 'success',
				durationMs: 250,
				overlapped: false,
			});

			expect(histogramObserveFor('n8n_poll_trigger_duration_seconds')).toHaveBeenCalledWith(
				{ node_type: 'n8n-nodes-base.testPoll', status: 'success' },
				0.25,
			);
			expect(counterIncFor('n8n_poll_trigger_errors_total')).not.toHaveBeenCalled();
			expect(counterIncFor('n8n_poll_trigger_overlapping_ticks_total')).not.toHaveBeenCalled();
		});

		it('counts an error tick by node type and error kind', () => {
			service.init();

			getPollTickHandler()({
				nodeType: 'n8n-nodes-base.testPoll',
				status: 'error',
				errorKind: 'rate_limited',
				durationMs: 100,
				overlapped: false,
			});

			expect(counterIncFor('n8n_poll_trigger_errors_total')).toHaveBeenCalledWith({
				node_type: 'n8n-nodes-base.testPoll',
				kind: 'rate_limited',
			});
			expect(histogramObserveFor('n8n_poll_trigger_duration_seconds')).toHaveBeenCalledWith(
				{ node_type: 'n8n-nodes-base.testPoll', status: 'error' },
				0.1,
			);
		});

		it('counts an overlapped tick', () => {
			service.init();

			getPollTickHandler()({
				nodeType: 'n8n-nodes-base.testPoll',
				status: 'success',
				durationMs: 50,
				overlapped: true,
			});

			expect(counterIncFor('n8n_poll_trigger_overlapping_ticks_total')).toHaveBeenCalledWith({
				node_type: 'n8n-nodes-base.testPoll',
			});
		});
	});

	describe('poll-tick-timed-out handler', () => {
		it('counts the timed-out poll by node type', () => {
			service.init();

			const calls = eventService.on.mock.calls as unknown as Array<
				[string, (payload: unknown) => void]
			>;
			const handler = calls.find((c) => c[0] === 'poll-tick-timed-out')![1];
			handler({ nodeType: 'n8n-nodes-base.testPoll' });

			expect(counterIncFor('n8n_poll_trigger_timeouts_total')).toHaveBeenCalledWith({
				node_type: 'n8n-nodes-base.testPoll',
			});
		});
	});

	describe('poll-cursor-commit-settled handler', () => {
		it('counts the commit by operation and result and observes its duration in seconds', () => {
			service.init();

			getCursorCommitHandler()({
				operation: 'with_execution',
				result: 'fence_rejected',
				durationMs: 40,
			});

			expect(counterIncFor('n8n_poll_trigger_cursor_commits_total')).toHaveBeenCalledWith({
				operation: 'with_execution',
				result: 'fence_rejected',
			});
			expect(
				histogramObserveFor('n8n_poll_trigger_cursor_commit_duration_seconds'),
			).toHaveBeenCalledWith({ operation: 'with_execution', result: 'fence_rejected' }, 0.04);
		});
	});
});
