import { mockInstance } from '@n8n/backend-test-utils';
import { PrometheusMetricsConfig } from '@n8n/config';
import promClient from 'prom-client';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { EventService } from '@/events/event.service';

import { PrometheusMcpPostSaveMetricsService } from '../mcp-post-save-metrics.service';

vi.mock('prom-client');

describe('PrometheusMcpPostSaveMetricsService', () => {
	const config = mockInstance(PrometheusMetricsConfig, {
		prefix: 'n8n_',
		includeMcpPostSaveMetrics: true,
	});
	const eventService = mock<EventService>();

	let service: PrometheusMcpPostSaveMetricsService;
	let counterCtor: Mock;
	let counterInc: Mock;

	beforeEach(() => {
		Object.assign(config, { prefix: 'n8n_', includeMcpPostSaveMetrics: true });

		service = new PrometheusMcpPostSaveMetricsService(config, eventService);

		counterCtor = vi.fn();
		counterInc = vi.fn();
		class FakeCounter {
			inc = counterInc;

			constructor(opts: { name: string }) {
				counterCtor(opts);
			}
		}
		(promClient as unknown as { Counter: unknown }).Counter = FakeCounter;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	function getPostSaveFailureHandler() {
		const calls = eventService.on.mock.calls as unknown as Array<
			[string, (payload: unknown) => void]
		>;
		return calls.find((c) => c[0] === 'mcp-post-save-failure')![1];
	}

	describe('enabled', () => {
		it('is true when opted in', () => {
			expect(service.enabled).toBe(true);
		});

		it('is false when not opted in', () => {
			config.includeMcpPostSaveMetrics = false;
			expect(service.enabled).toBe(false);
		});
	});

	describe('init', () => {
		it('registers the counter', () => {
			service.init();

			expect(counterCtor).toHaveBeenCalledWith({
				name: 'n8n_mcp_post_save_failures_total',
				help: 'MCP workflow-builder tool failures that occurred after a successful database write (hooks, telemetry, auto-assign). The client still receives success — these are observability-only.',
				labelNames: ['tool', 'error_type'],
			});
		});

		it('applies a custom prefix to the metric name', () => {
			config.prefix = 'custom_';

			service.init();

			expect(counterCtor).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'custom_mcp_post_save_failures_total',
				}),
			);
		});

		it('subscribes to the post-save failure event', () => {
			service.init();

			expect(eventService.on).toHaveBeenCalledWith('mcp-post-save-failure', expect.any(Function));
		});
	});

	it('counts post-save failures by tool and error type', () => {
		service.init();

		getPostSaveFailureHandler()({ tool: 'update', errorType: 'UnexpectedError' });

		expect(counterInc).toHaveBeenCalledWith({ tool: 'update', error_type: 'UnexpectedError' }, 1);
	});
});
