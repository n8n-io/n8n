import { mockInstance } from '@n8n/backend-test-utils';
import { PrometheusMetricsConfig } from '@n8n/config';
import promClient from 'prom-client';

import { PrometheusWebhookAndFormMetricsService } from '../webhook-and-form-metrics.service';

jest.mock('prom-client');

describe('PrometheusWebhookAndFormMetricsService', () => {
	const config = mockInstance(PrometheusMetricsConfig, {
		prefix: 'n8n_',
		includeWebhookMetrics: true,
		includeFormMetrics: true,
	});

	let service: PrometheusWebhookAndFormMetricsService;
	let mockHistogramObserve: jest.Mock;

	beforeEach(() => {
		Object.assign(config, {
			prefix: 'n8n_',
			includeWebhookMetrics: true,
			includeFormMetrics: true,
		});
		service = new PrometheusWebhookAndFormMetricsService(config);
		mockHistogramObserve = jest.fn();
		promClient.Histogram.prototype.observe = mockHistogramObserve;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('enabled', () => {
		it('should be true when includeWebhookMetrics is true', () => {
			config.includeWebhookMetrics = true;
			config.includeFormMetrics = false;
			expect(service.enabled).toBe(true);
		});

		it('should be true when includeFormMetrics is true', () => {
			config.includeWebhookMetrics = false;
			config.includeFormMetrics = true;
			expect(service.enabled).toBe(true);
		});

		it('should be false when both includeWebhookMetrics and includeFormMetrics are false', () => {
			config.includeWebhookMetrics = false;
			config.includeFormMetrics = false;
			expect(service.enabled).toBe(false);
		});
	});

	describe('init', () => {
		it('should create webhook_request_duration_seconds histogram when includeWebhookMetrics is true', () => {
			config.includeFormMetrics = false;
			service.init();

			expect(promClient.Histogram).toHaveBeenCalledWith({
				name: 'n8n_webhook_request_duration_seconds',
				help: 'Duration of webhook requests served by n8n, in seconds.',
				labelNames: ['method', 'status_code', 'webhook_path', 'workflow_id'],
				buckets: [0.003, 0.03, 0.1, 0.3, 1.5, 10],
			});
		});

		it('should create form_submission_duration_seconds histogram when includeFormMetrics is true', () => {
			config.includeWebhookMetrics = false;
			service.init();

			expect(promClient.Histogram).toHaveBeenCalledWith({
				name: 'n8n_form_submission_duration_seconds',
				help: 'Duration of form submissions (POST) served by n8n, in seconds.',
				labelNames: ['status_code', 'form_path', 'workflow_id'],
				buckets: [0.003, 0.03, 0.1, 0.3, 1.5, 10],
			});
		});

		it('should create both histograms when both flags are enabled', () => {
			service.init();

			expect(promClient.Histogram).toHaveBeenCalledTimes(2);
		});

		it('should create neither histogram when both flags are disabled', () => {
			config.includeWebhookMetrics = false;
			config.includeFormMetrics = false;
			service.init();

			expect(promClient.Histogram).not.toHaveBeenCalled();
		});

		it('should apply custom prefix to metric names', () => {
			config.prefix = 'custom_';
			service.init();

			expect(promClient.Histogram).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'custom_webhook_request_duration_seconds' }),
			);
			expect(promClient.Histogram).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'custom_form_submission_duration_seconds' }),
			);
		});
	});

	describe('observeWebhookRequest', () => {
		it('should observe the webhook histogram with correct labels and duration', () => {
			service.init();

			service.observeWebhookRequest({
				method: 'POST',
				statusCode: 200,
				webhookPath: 'my-webhook',
				workflowId: 'wf_123',
				durationSeconds: 0.42,
			});

			expect(mockHistogramObserve).toHaveBeenCalledWith(
				{ method: 'POST', status_code: 200, webhook_path: 'my-webhook', workflow_id: 'wf_123' },
				0.42,
			);
		});

		it('should be a no-op when includeWebhookMetrics is false', () => {
			config.includeWebhookMetrics = false;
			service.init();

			service.observeWebhookRequest({
				method: 'GET',
				statusCode: 200,
				webhookPath: 'my-webhook',
				workflowId: 'wf_123',
				durationSeconds: 0.1,
			});

			expect(mockHistogramObserve).not.toHaveBeenCalled();
		});

		it('should be a no-op when init has not been called', () => {
			service.observeWebhookRequest({
				method: 'POST',
				statusCode: 200,
				webhookPath: 'my-webhook',
				workflowId: 'wf_123',
				durationSeconds: 0.1,
			});

			expect(mockHistogramObserve).not.toHaveBeenCalled();
		});
	});

	describe('observeFormSubmission', () => {
		it('should observe the form histogram with correct labels and duration', () => {
			service.init();

			service.observeFormSubmission({
				statusCode: 200,
				formPath: 'my-form',
				workflowId: 'wf_456',
				durationSeconds: 0.15,
			});

			expect(mockHistogramObserve).toHaveBeenCalledWith(
				{ status_code: 200, form_path: 'my-form', workflow_id: 'wf_456' },
				0.15,
			);
		});

		it('should be a no-op when includeFormMetrics is false', () => {
			config.includeFormMetrics = false;
			service.init();

			service.observeFormSubmission({
				statusCode: 200,
				formPath: 'my-form',
				workflowId: 'wf_456',
				durationSeconds: 0.1,
			});

			expect(mockHistogramObserve).not.toHaveBeenCalled();
		});

		it('should be a no-op when init has not been called', () => {
			service.observeFormSubmission({
				statusCode: 200,
				formPath: 'my-form',
				workflowId: 'wf_456',
				durationSeconds: 0.1,
			});

			expect(mockHistogramObserve).not.toHaveBeenCalled();
		});
	});
});
