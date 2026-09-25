import { PrometheusMetricsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import promClient from 'prom-client';

import type { PrometheusMetricsCollector } from './base';

/**
 * Observes webhook request duration (`n8n_webhook_request_duration_seconds`)
 * and form submission duration (`n8n_form_submission_duration_seconds`) as histograms.
 * Metrics are recorded via `observeWebhookRequest` / `observeFormSubmission`,
 * called from the webhook request handler after each response is sent.
 */
@Service()
export class PrometheusWebhookAndFormMetricsService implements PrometheusMetricsCollector {
	private webhookHistogram?: promClient.Histogram;
	private formHistogram?: promClient.Histogram;

	constructor(private readonly config: PrometheusMetricsConfig) {}

	get enabled(): boolean {
		return this.config.includeWebhookMetrics || this.config.includeFormMetrics;
	}

	init() {
		const buckets = [0.003, 0.03, 0.1, 0.3, 1.5, 10];

		if (this.config.includeWebhookMetrics) {
			this.webhookHistogram = new promClient.Histogram({
				name: `${this.config.prefix}webhook_request_duration_seconds`,
				help: 'Duration of webhook requests served by n8n, in seconds.',
				labelNames: ['method', 'status_code', 'webhook_path', 'workflow_id'],
				buckets,
			});
		}

		if (this.config.includeFormMetrics) {
			this.formHistogram = new promClient.Histogram({
				name: `${this.config.prefix}form_submission_duration_seconds`,
				help: 'Duration of form submissions (POST) served by n8n, in seconds.',
				labelNames: ['status_code', 'form_path', 'workflow_id'],
				buckets,
			});
		}
	}

	observeWebhookRequest(observation: {
		method: string;
		statusCode: number;
		webhookPath: string;
		workflowId: string;
		durationSeconds: number;
	}) {
		if (!this.config.includeWebhookMetrics) {
			return;
		}
		this.webhookHistogram?.observe(
			{
				method: observation.method,
				status_code: observation.statusCode,
				webhook_path: observation.webhookPath,
				workflow_id: observation.workflowId,
			},
			observation.durationSeconds,
		);
	}

	observeFormSubmission(observation: {
		statusCode: number;
		formPath: string;
		workflowId: string;
		durationSeconds: number;
	}) {
		if (!this.config.includeFormMetrics) {
			return;
		}
		this.formHistogram?.observe(
			{
				status_code: observation.statusCode,
				form_path: observation.formPath,
				workflow_id: observation.workflowId,
			},
			observation.durationSeconds,
		);
	}
}
