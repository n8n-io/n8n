import { ExecutionsConfig, PrometheusMetricsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import promClient from 'prom-client';

import { EventService } from '@/events/event.service';

import type { PrometheusMetricsCollector } from './base';

/**
 * Tracks scaling-mode queue job gauges and counters (waiting, active, completed, failed).
 * Only enabled on main instances in queue execution mode.
 */
@Service()
export class PrometheusQueueMetricsService implements PrometheusMetricsCollector {
	constructor(
		private readonly config: PrometheusMetricsConfig,
		private readonly executionsConfig: ExecutionsConfig,
		private readonly instanceSettings: InstanceSettings,
		private readonly eventService: EventService,
	) {}

	get enabled(): boolean {
		return (
			this.config.includeQueueMetrics &&
			this.executionsConfig.mode === 'queue' &&
			this.instanceSettings.instanceType === 'main'
		);
	}

	init() {
		const prefix = this.config.prefix;
		const waitingGauge = new promClient.Gauge({
			name: `${prefix}scaling_mode_queue_jobs_waiting`,
			help: 'Current number of enqueued jobs waiting for pickup in scaling mode.',
		});
		waitingGauge.set(0);

		const activeGauge = new promClient.Gauge({
			name: `${prefix}scaling_mode_queue_jobs_active`,
			help: 'Current number of jobs being processed across all workers in scaling mode.',
		});
		activeGauge.set(0);

		const completedCounter = new promClient.Counter({
			name: `${prefix}scaling_mode_queue_jobs_completed`,
			help: 'Total number of jobs completed across all workers in scaling mode since instance start.',
		});
		completedCounter.inc(0);

		const failedCounter = new promClient.Counter({
			name: `${prefix}scaling_mode_queue_jobs_failed`,
			help: 'Total number of jobs failed across all workers in scaling mode since instance start.',
		});
		failedCounter.inc(0);

		this.eventService.on('job-counts-updated', (jobCounts) => {
			waitingGauge.set(jobCounts.waiting);
			activeGauge.set(jobCounts.active);
			completedCounter.inc(jobCounts.completed);
			failedCounter.inc(jobCounts.failed);
		});
	}
}
