import { mockInstance } from '@n8n/backend-test-utils';
import { PrometheusMetricsConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import promClient from 'prom-client';

import type { EventService } from '@/events/event.service';

import { DURATION_BUCKETS_SECONDS } from '../constant';
import { PrometheusWorkflowExecutionDurationMetricsService } from '../workflow-execution-duration-metrics.service';

jest.mock('prom-client');

describe('PrometheusWorkflowExecutionDurationMetricsService', () => {
	const config = mockInstance(PrometheusMetricsConfig, {
		prefix: 'n8n_',
		includeWorkflowExecutionDuration: true,
		includeWorkflowIdLabel: false,
	});
	const eventService = mock<EventService>();
	let service: PrometheusWorkflowExecutionDurationMetricsService;
	let mockHistogramObserve: jest.Mock;

	function getEventHandler() {
		return eventService.on.mock.calls.find((c) => c[0] === 'workflow-post-execute')?.[1];
	}

	beforeEach(() => {
		Object.assign(config, {
			prefix: 'n8n_',
			includeWorkflowExecutionDuration: true,
			includeWorkflowIdLabel: false,
		});
		service = new PrometheusWorkflowExecutionDurationMetricsService(config, eventService);
		mockHistogramObserve = jest.fn();
		promClient.Histogram.prototype.observe = mockHistogramObserve;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('enabled', () => {
		it('should be true when includeWorkflowExecutionDuration is true', () => {
			config.includeWorkflowExecutionDuration = true;
			expect(service.enabled).toBe(true);
		});

		it('should be false when includeWorkflowExecutionDuration is false', () => {
			config.includeWorkflowExecutionDuration = false;
			expect(service.enabled).toBe(false);
		});
	});

	describe('init', () => {
		it('should create workflow_execution_duration_seconds histogram with correct config', () => {
			service.init();

			expect(promClient.Histogram).toHaveBeenCalledWith({
				name: 'n8n_workflow_execution_duration_seconds',
				help: 'Workflow execution duration in seconds.',
				labelNames: ['status', 'mode'],
				buckets: DURATION_BUCKETS_SECONDS,
			});
		});

		it('should include workflow_id in labelNames when includeWorkflowIdLabel is true', () => {
			config.includeWorkflowIdLabel = true;
			service.init();

			expect(promClient.Histogram).toHaveBeenCalledWith(
				expect.objectContaining({ labelNames: ['status', 'mode', 'workflow_id'] }),
			);
		});

		it('should register a workflow-post-execute event listener', () => {
			service.init();

			expect(eventService.on.mock.calls).toContainEqual([
				'workflow-post-execute',
				expect.any(Function),
			]);
		});

		it('should apply custom prefix to metric name', () => {
			config.prefix = 'custom_';
			service.init();

			expect(promClient.Histogram).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'custom_workflow_execution_duration_seconds' }),
			);
		});
	});

	describe('workflow-post-execute event handler', () => {
		it('should observe duration on success status', () => {
			service.init();
			const handler = getEventHandler();

			expect(handler).toBeDefined();
			handler!({
				runData: {
					startedAt: new Date('2026-01-01T00:00:00Z'),
					stoppedAt: new Date('2026-01-01T00:00:05Z'),
					status: 'success',
					mode: 'trigger',
				},
				workflow: { id: 'wf_123', name: 'Test' },
			});

			expect(mockHistogramObserve).toHaveBeenCalledWith({ status: 'success', mode: 'trigger' }, 5);
		});

		it('should map error status to failed', () => {
			service.init();
			const handler = getEventHandler();

			expect(handler).toBeDefined();
			handler!({
				runData: {
					startedAt: new Date('2026-01-01T00:00:00Z'),
					stoppedAt: new Date('2026-01-01T00:00:02.5Z'),
					status: 'error',
					mode: 'webhook',
				},
				workflow: { id: 'wf_456', name: 'Failed Workflow' },
			});

			expect(mockHistogramObserve).toHaveBeenCalledWith({ status: 'failed', mode: 'webhook' }, 2.5);
		});

		it('should map crashed status to failed', () => {
			service.init();
			const handler = getEventHandler();

			expect(handler).toBeDefined();
			handler!({
				runData: {
					startedAt: new Date('2026-01-01T00:00:00Z'),
					stoppedAt: new Date('2026-01-01T00:00:03Z'),
					status: 'crashed',
					mode: 'trigger',
				},
				workflow: { id: 'wf_789', name: 'Crashed Workflow' },
			});

			expect(mockHistogramObserve).toHaveBeenCalledWith({ status: 'failed', mode: 'trigger' }, 3);
		});

		it('should not observe when stoppedAt is undefined', () => {
			service.init();
			const handler = getEventHandler();

			expect(handler).toBeDefined();
			handler!({
				runData: {
					startedAt: new Date('2026-01-01T00:00:00Z'),
					stoppedAt: undefined,
					status: 'success',
					mode: 'manual',
				},
				workflow: { id: 'wf_123', name: 'Test' },
			});

			expect(mockHistogramObserve).not.toHaveBeenCalled();
		});

		it('should not observe when runData is undefined', () => {
			service.init();
			const handler = getEventHandler();

			expect(handler).toBeDefined();
			handler!({
				runData: undefined,
				workflow: { id: 'wf_123', name: 'Test' },
			});

			expect(mockHistogramObserve).not.toHaveBeenCalled();
		});

		it('should include workflow_id in labels when includeWorkflowIdLabel is true', () => {
			config.includeWorkflowIdLabel = true;
			service.init();
			const handler = getEventHandler();

			expect(handler).toBeDefined();
			handler!({
				runData: {
					startedAt: new Date('2026-01-01T00:00:00Z'),
					stoppedAt: new Date('2026-01-01T00:00:01Z'),
					status: 'success',
					mode: 'manual',
				},
				workflow: { id: 'wf_789', name: 'My Workflow' },
			});

			expect(mockHistogramObserve).toHaveBeenCalledWith(
				{ status: 'success', mode: 'manual', workflow_id: 'wf_789' },
				1,
			);
		});

		it('should compute duration correctly: (stoppedAt - startedAt) / 1000', () => {
			service.init();
			const handler = getEventHandler();

			expect(handler).toBeDefined();
			handler!({
				runData: {
					startedAt: new Date('2026-01-01T00:00:00.000Z'),
					stoppedAt: new Date('2026-01-01T00:01:00.000Z'),
					status: 'success',
					mode: 'trigger',
				},
				workflow: { id: 'wf_123', name: 'Test' },
			});

			expect(mockHistogramObserve).toHaveBeenCalledWith(expect.any(Object), 60);
		});
	});
});
