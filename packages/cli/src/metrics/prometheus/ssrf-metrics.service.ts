import { PrometheusMetricsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { SsrfProtectionService } from 'n8n-core';
import promClient from 'prom-client';

import type { PrometheusMetricsCollector } from './base';
import { DURATION_BUCKETS_SECONDS } from './constant';

/**
 * Tracks SSRF check outcomes as counters and duration as a histogram.
 * Registers: `n8n_ssrf_requests_total`, `n8n_ssrf_request_duration_seconds`.
 */
@Service()
export class PrometheusSsrfMetricsService implements PrometheusMetricsCollector {
	constructor(
		private readonly ssrfProtectionService: SsrfProtectionService,
		private readonly config: PrometheusMetricsConfig,
	) {}

	get enabled(): boolean {
		return this.config.includeSsrfMetrics;
	}

	init() {
		const requestsCounter = new promClient.Counter({
			name: `${this.config.prefix}ssrf_requests_total`,
			help: 'Total number of SSRF checks by outcome and phase.',
			labelNames: ['outcome', 'phase'],
		});

		const blockedByReasonCounter = new promClient.Counter({
			name: `${this.config.prefix}ssrf_blocked_by_reason_total`,
			help: 'Total number of blocked SSRF checks by phase and reason.',
			labelNames: ['phase', 'reason'],
		});

		const histogram = new promClient.Histogram({
			name: `${this.config.prefix}ssrf_request_duration_seconds`,
			help: 'Duration of SSRF checks in seconds.',
			labelNames: ['outcome', 'phase'],
			buckets: DURATION_BUCKETS_SECONDS,
		});

		this.ssrfProtectionService.events.on('ssrf.blocked', ({ phase, reason, durationMs }) => {
			requestsCounter.inc({ outcome: 'blocked', phase });
			blockedByReasonCounter.inc({ phase, reason });
			histogram.observe({ outcome: 'blocked', phase }, durationMs / 1000);
		});

		this.ssrfProtectionService.events.on('ssrf.allowed', ({ phase, durationMs }) => {
			requestsCounter.inc({ outcome: 'allowed', phase });
			histogram.observe({ outcome: 'allowed', phase }, durationMs / 1000);
		});
	}
}
