import { PrometheusMetricsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import promClient from 'prom-client';

import { EventService } from '@/events/event.service';
import { InstanceAiRunProbe } from '@/modules/instance-ai/instance-ai-run-probe';

import type { PrometheusMetricsCollector } from './base';
import { DURATION_BUCKETS_SECONDS } from './constant';

/**
 * Tracks Instance AI run counts, durations, and tool-call outcomes, driven off the
 * `instance-ai-run-finished` event emitted when a run is finalized.
 */
@Service()
export class PrometheusInstanceAiMetricsService implements PrometheusMetricsCollector {
	constructor(
		private readonly config: PrometheusMetricsConfig,
		private readonly eventService: EventService,
		private readonly runProbe: InstanceAiRunProbe,
	) {}

	get enabled(): boolean {
		// Always on when Prometheus metrics are enabled (N8N_METRICS); no separate flag.
		return true;
	}

	init() {
		const runsTotal = new promClient.Counter({
			name: `${this.config.prefix}instance_ai_runs_total`,
			help: 'Total number of Instance AI runs.',
			labelNames: ['status', 'model'],
		});

		const runDurationHistogram = new promClient.Histogram({
			name: `${this.config.prefix}instance_ai_run_duration_seconds`,
			help: 'Instance AI run duration in seconds.',
			labelNames: ['status'],
			buckets: DURATION_BUCKETS_SECONDS,
		});

		const toolCallsTotal = new promClient.Counter({
			name: `${this.config.prefix}instance_ai_tool_calls_total`,
			help: 'Total number of tool calls made during Instance AI runs.',
		});
		toolCallsTotal.inc(0);

		const toolErrorsTotal = new promClient.Counter({
			name: `${this.config.prefix}instance_ai_tool_errors_total`,
			help: 'Total number of failed tool calls during Instance AI runs.',
		});
		toolErrorsTotal.inc(0);

		const tokensTotal = new promClient.Counter({
			name: `${this.config.prefix}instance_ai_tokens_total`,
			help: 'Total number of tokens used by Instance AI runs.',
			labelNames: ['type'],
		});
		tokensTotal.inc({ type: 'input' }, 0);
		tokensTotal.inc({ type: 'output' }, 0);

		const costTotal = new promClient.Counter({
			name: `${this.config.prefix}instance_ai_cost_usd_total`,
			help: 'Total estimated cost in USD of Instance AI runs (models.dev pricing).',
		});
		costTotal.inc(0);

		const runProbe = this.runProbe;
		new promClient.Gauge({
			name: `${this.config.prefix}instance_ai_active_runs`,
			help: 'Number of Instance AI runs currently executing.',
			collect() {
				this.set(runProbe.activeRunCount());
			},
		});

		this.eventService.on(
			'instance-ai-run-finished',
			({ status, durationMs, model, toolCalls, toolErrors, usage }) => {
				runsTotal.inc({ status, model }, 1);
				if (durationMs !== undefined) {
					runDurationHistogram.observe({ status }, durationMs / 1000);
				}
				if (toolCalls > 0) toolCallsTotal.inc(toolCalls);
				if (toolErrors > 0) toolErrorsTotal.inc(toolErrors);
				if (usage) {
					if (usage.promptTokens > 0) tokensTotal.inc({ type: 'input' }, usage.promptTokens);
					if (usage.completionTokens > 0) {
						tokensTotal.inc({ type: 'output' }, usage.completionTokens);
					}
					if (usage.costUsd > 0) costTotal.inc(usage.costUsd);
				}
			},
		);
	}
}
