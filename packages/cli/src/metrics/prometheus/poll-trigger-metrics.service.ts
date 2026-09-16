import { PrometheusMetricsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { InstanceSettings, TriggersAndPollers } from 'n8n-core';
import promClient from 'prom-client';

import { EventService } from '@/events/event.service';

import type { PrometheusMetricsCollector } from './base';
import { DURATION_BUCKETS_SECONDS } from './constant';

/**
 * Collects Prometheus metrics for poll triggers, the baseline instrumentation
 * for the poll reliability work. Opt-in via `includePollTriggerMetrics` and only
 * active on a main instance. Tick duration, errors, and same-process overlap come
 * from the core poll engine's event stream ({@link TriggersAndPollers.events});
 * cursor-commit outcomes and scheduler-side poll timeouts come from `EventService`.
 * Cross-instance overlap is not observable from inside a poll, so it is covered by
 * the scheduler collector's `scheduler_tasks_lease_lost_total` instead.
 *
 * Labels are bounded (node type, status, kind, operation, result): no
 * workflow or instance label, per the metrics cardinality rule.
 */
@Service()
export class PrometheusPollTriggerMetricsService implements PrometheusMetricsCollector {
	constructor(
		private readonly config: PrometheusMetricsConfig,
		private readonly instanceSettings: InstanceSettings,
		private readonly eventService: EventService,
		private readonly triggersAndPollers: TriggersAndPollers,
	) {}

	get enabled(): boolean {
		return this.config.includePollTriggerMetrics && this.instanceSettings.instanceType === 'main';
	}

	init() {
		const prefix = this.config.prefix;

		const tickDuration = new promClient.Histogram({
			name: `${prefix}poll_trigger_duration_seconds`,
			help: "Duration in seconds of a poll trigger's poll() call, by node type and status.",
			labelNames: ['node_type', 'status'],
			buckets: DURATION_BUCKETS_SECONDS,
		});

		const tickErrors = new promClient.Counter({
			name: `${prefix}poll_trigger_errors_total`,
			help: 'Total number of poll trigger ticks that threw, by node type and error kind (auth, rate_limited, thrown).',
			labelNames: ['node_type', 'kind'],
		});

		const overlappingTicks = new promClient.Counter({
			name: `${prefix}poll_trigger_overlapping_ticks_total`,
			help: 'Total number of poll ticks that started while another tick for the same node was still in flight in this process.',
			labelNames: ['node_type'],
		});

		const timeouts = new promClient.Counter({
			name: `${prefix}poll_trigger_timeouts_total`,
			help: 'Total number of polls the durable scheduler abandoned after they exceeded N8N_SCHEDULER_POLL_TIMEOUT, by node type.',
			labelNames: ['node_type'],
		});

		const cursorCommits = new promClient.Counter({
			name: `${prefix}poll_trigger_cursor_commits_total`,
			help: 'Total number of poll cursor commits by operation and result (success, fence_rejected, failure).',
			labelNames: ['operation', 'result'],
		});

		const cursorCommitDuration = new promClient.Histogram({
			name: `${prefix}poll_trigger_cursor_commit_duration_seconds`,
			help: 'Duration in seconds of poll cursor commits, by operation and result.',
			labelNames: ['operation', 'result'],
			buckets: DURATION_BUCKETS_SECONDS,
		});

		this.triggersAndPollers.events.on('poll-tick-completed', (tick) => {
			tickDuration.observe(
				{ node_type: tick.nodeType, status: tick.status },
				tick.durationMs / 1000,
			);
			if (tick.status === 'error') {
				tickErrors.inc({ node_type: tick.nodeType, kind: tick.errorKind });
			}
			if (tick.overlapped) {
				overlappingTicks.inc({ node_type: tick.nodeType });
			}
		});

		this.eventService.on('poll-cursor-commit-settled', ({ operation, result, durationMs }) => {
			cursorCommits.inc({ operation, result });
			cursorCommitDuration.observe({ operation, result }, durationMs / 1000);
		});

		this.eventService.on('poll-tick-timed-out', ({ nodeType }) => {
			timeouts.inc({ node_type: nodeType });
		});
	}
}
