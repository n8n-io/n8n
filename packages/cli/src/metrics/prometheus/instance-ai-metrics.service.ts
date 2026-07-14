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

		// Durable event log (RFC: instance-ai durable event log). All series are
		// flat when N8N_INSTANCE_AI_DURABLE_LOG is off.
		const durableLogRowsTotal = new promClient.Counter({
			name: `${this.config.prefix}instance_ai_durable_log_rows_total`,
			help: 'Durable Instance AI event rows appended (structural facts + coalesced blocks).',
		});
		durableLogRowsTotal.inc(0);

		const durableLogBytesTotal = new promClient.Counter({
			name: `${this.config.prefix}instance_ai_durable_log_bytes_total`,
			help: 'Serialized payload bytes appended to the durable Instance AI event log.',
		});
		durableLogBytesTotal.inc(0);

		const durableLogQueueLatency = new promClient.Histogram({
			name: `${this.config.prefix}instance_ai_durable_log_queue_latency_seconds`,
			help: 'Time from event publish to durable batch persistence, per event.',
			buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
		});

		const durableLogAppendConflictsTotal = new promClient.Counter({
			name: `${this.config.prefix}instance_ai_durable_log_append_conflicts_total`,
			help: 'Retried (threadId, seq) append collisions between concurrent writers.',
		});
		durableLogAppendConflictsTotal.inc(0);

		const durableLogAppendFailuresTotal = new promClient.Counter({
			name: `${this.config.prefix}instance_ai_durable_log_append_failures_total`,
			help: 'Durable-log batches dropped after exhausting append retries.',
		});
		durableLogAppendFailuresTotal.inc(0);

		const durableLogReplaysTotal = new promClient.Counter({
			name: `${this.config.prefix}instance_ai_durable_log_replays_total`,
			help: 'SSE reconnects that served a replay from the durable event log.',
		});
		durableLogReplaysTotal.inc(0);

		const durableLogReplayCursorAge = new promClient.Histogram({
			name: `${this.config.prefix}instance_ai_durable_log_replay_cursor_age_events`,
			help: 'How many events behind the log head a reconnecting cursor was.',
			buckets: [1, 5, 25, 100, 500],
		});

		const parserFallbacksTotal = new promClient.Counter({
			name: `${this.config.prefix}instance_ai_parser_fallbacks_total`,
			help: 'History messages rendered from the message-derived fallback ladder instead of a renderable snapshot tree.',
		});
		parserFallbacksTotal.inc(0);

		this.eventService.on('instance-ai-durable-log-drained', ({ rows, bytes }) => {
			durableLogRowsTotal.inc(rows);
			durableLogBytesTotal.inc(bytes);
		});
		this.eventService.on('instance-ai-durable-log-queue-latency', ({ ms }) => {
			durableLogQueueLatency.observe(ms / 1000);
		});
		this.eventService.on('instance-ai-durable-log-append-conflict', () => {
			durableLogAppendConflictsTotal.inc(1);
		});
		this.eventService.on('instance-ai-durable-log-append-failure', () => {
			durableLogAppendFailuresTotal.inc(1);
		});
		this.eventService.on('instance-ai-durable-log-replayed', ({ cursorAgeEvents }) => {
			durableLogReplaysTotal.inc(1);
			durableLogReplayCursorAge.observe(cursorAgeEvents);
		});
		this.eventService.on('instance-ai-parser-fallback', ({ count }) => {
			parserFallbacksTotal.inc(count);
		});

		this.eventService.on(
			'instance-ai-run-finished',
			({ status, durationMs, model, toolCalls, toolErrors, usage }) => {
				// Suspended segments count usage only; the terminal event counts the run.
				if (status !== 'suspended') {
					runsTotal.inc({ status, model }, 1);
					if (durationMs !== undefined) {
						runDurationHistogram.observe({ status }, durationMs / 1000);
					}
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
