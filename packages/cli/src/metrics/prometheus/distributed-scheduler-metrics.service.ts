import { PrometheusMetricsConfig } from '@n8n/config';
import { ScheduledTaskRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import promClient from 'prom-client';

import type { PrometheusMetricsCollector } from './base';

@Service()
export class PrometheusDistributedSchedulerMetricsService implements PrometheusMetricsCollector {
	private materializedCounter: promClient.Counter<string> | undefined;
	private claimedCounter: promClient.Counter<string> | undefined;
	private completedCounter: promClient.Counter<string> | undefined;
	private duplicateCounter: promClient.Counter<string> | undefined;
	private schedulingLagHistogram: promClient.Histogram<string> | undefined;
	private handoffLagHistogram: promClient.Histogram<string> | undefined;

	constructor(
		private readonly config: PrometheusMetricsConfig,
		private readonly scheduledTaskRepository: ScheduledTaskRepository,
	) {}

	get enabled() {
		return true;
	}

	init() {
		this.materializedCounter = new promClient.Counter({
			name: `${this.config.prefix}distributed_scheduler_tasks_materialized_total`,
			help: 'Total number of distributed scheduler task occurrences materialized.',
		});

		this.claimedCounter = new promClient.Counter({
			name: `${this.config.prefix}distributed_scheduler_tasks_claimed_total`,
			help: 'Total number of distributed scheduler tasks claimed by executors.',
		});

		this.completedCounter = new promClient.Counter({
			name: `${this.config.prefix}distributed_scheduler_tasks_completed_total`,
			help: 'Total number of distributed scheduler tasks completed by status.',
			labelNames: ['status'],
		});

		this.duplicateCounter = new promClient.Counter({
			name: `${this.config.prefix}distributed_scheduler_duplicate_tasks_total`,
			help: 'Total number of distributed scheduler task handoffs skipped as duplicate executions.',
		});

		this.schedulingLagHistogram = new promClient.Histogram({
			name: `${this.config.prefix}distributed_scheduler_scheduling_lag_seconds`,
			help: 'Lag between scheduled occurrence time and executor claim time.',
			buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30, 60],
		});

		this.handoffLagHistogram = new promClient.Histogram({
			name: `${this.config.prefix}distributed_scheduler_handoff_lag_seconds`,
			help: 'Lag between scheduled occurrence time and workflow execution handoff.',
			buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30, 60],
		});

		const scheduledTaskRepository = this.scheduledTaskRepository;
		new promClient.Gauge({
			name: `${this.config.prefix}distributed_scheduler_task_queue_depth`,
			help: 'Distributed scheduler task queue depth by status.',
			labelNames: ['status'],
			async collect() {
				const rows = await scheduledTaskRepository.countByStatus();
				for (const { status, count } of rows) {
					this.set({ status }, Number(count));
				}
			},
		});
	}

	observeMaterialized(count: number) {
		this.materializedCounter?.inc(count);
	}

	observeClaimed(count: number) {
		this.claimedCounter?.inc(count);
	}

	observeCompleted(status: 'succeeded' | 'failed') {
		this.completedCounter?.inc({ status });
	}

	observeDuplicate() {
		this.duplicateCounter?.inc();
	}

	observeSchedulingLag(scheduledFor: Date, claimedAt: Date) {
		this.schedulingLagHistogram?.observe((claimedAt.getTime() - scheduledFor.getTime()) / 1000);
	}

	observeHandoffLag(scheduledFor: Date, handedOffAt: Date) {
		this.handoffLagHistogram?.observe((handedOffAt.getTime() - scheduledFor.getTime()) / 1000);
	}
}
