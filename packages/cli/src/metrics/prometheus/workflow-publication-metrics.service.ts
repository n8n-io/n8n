import { PrometheusMetricsConfig, WorkflowsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { WorkflowPublicationOutboxRepository, WorkflowPublicationOutboxStatus } from '@n8n/db';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import promClient from 'prom-client';

import { EventService } from '@/events/event.service';
import { CacheService } from '@/services/cache/cache.service';

import type { PrometheusMetricsCollector } from './base';
import { CachedMetricQuery } from './cached-metric-query';
import { DURATION_BUCKETS_SECONDS } from './constant';

const ALL_STATUSES = Object.values(WorkflowPublicationOutboxStatus);
const ACTIVE_STATUSES = [
	WorkflowPublicationOutboxStatus.Pending,
	WorkflowPublicationOutboxStatus.InProgress,
];

const RECORD_STATS_CACHE_KEY = 'metrics:workflow-publication:outbox-record-stats:v2';

/** Per-status count and oldest-record epoch ms (`oldestMs`) for a single status. */
type StatusStats = { count: number; oldestMs: number };
type StatusStatsByStatus = Partial<Record<WorkflowPublicationOutboxStatus, StatusStats>>;

/**
 * Collects Prometheus metrics for the workflow publication service. Opt-in via
 * `includeWorkflowPublicationMetrics` and only active on a main instance while the
 * publication service is enabled. Gauges are queried lazily from the outbox
 * repository on each scrape; counters and histograms are driven by metrics events
 * emitted from the publication and trigger services, so this is the only place that
 * touches `prom-client`.
 */
@Service()
export class PrometheusWorkflowPublicationMetricsService implements PrometheusMetricsCollector {
	constructor(
		private readonly config: PrometheusMetricsConfig,
		private readonly workflowsConfig: WorkflowsConfig,
		private readonly instanceSettings: InstanceSettings,
		private readonly eventService: EventService,
		private readonly outboxRepository: WorkflowPublicationOutboxRepository,
		private readonly cacheService: CacheService,
	) {}

	get enabled(): boolean {
		return (
			this.config.includeWorkflowPublicationMetrics &&
			this.workflowsConfig.useWorkflowPublicationService &&
			this.instanceSettings.instanceType === 'main'
		);
	}

	init() {
		this.initOutboxGauges();
		this.initRecordOutcomeMetrics();
		this.initTriggerMetrics();
		this.initCleanupMetrics();
		this.initReconciliationMetrics();
	}

	private initOutboxGauges() {
		const repository = this.outboxRepository;
		const prefix = this.config.prefix;
		// One grouped query (COUNT + MIN createdAt per status) feeds both gauges;
		// cache it so a tight scrape interval doesn't hammer the outbox table. Within
		// a scrape, coalescing collapses both gauges' collects to a single query.
		const cacheTtl = this.config.workflowPublicationMetricInterval * Time.seconds.toMilliseconds;

		const query = new CachedMetricQuery<StatusStatsByStatus>({
			cacheService: this.cacheService,
			cacheKey: RECORD_STATS_CACHE_KEY,
			ttlMs: cacheTtl,
			query: async () => {
				const stats = await repository.getRecordStatsByStatus();
				const byStatus: StatusStatsByStatus = {};
				for (const [status, { count, oldestCreatedAt }] of stats) {
					byStatus[status] = { count, oldestMs: oldestCreatedAt.getTime() };
				}
				return byStatus;
			},
		});

		new promClient.Gauge({
			name: `${prefix}workflow_publication_outbox_records`,
			help: 'Number of workflow publication outbox records by status.',
			labelNames: ['status'],
			async collect() {
				const byStatus = await query.get();
				for (const status of ALL_STATUSES) {
					this.set({ status }, byStatus[status]?.count ?? 0);
				}
			},
		});

		new promClient.Gauge({
			name: `${prefix}workflow_publication_outbox_oldest_active_record_age_seconds`,
			help: 'Age in seconds of the oldest active (pending/in_progress) workflow publication outbox record by status.',
			labelNames: ['status'],
			async collect() {
				const byStatus = await query.get();
				const now = Date.now();
				for (const status of ACTIVE_STATUSES) {
					const oldestMs = byStatus[status]?.oldestMs;
					this.set(
						{ status },
						oldestMs !== undefined ? (now - oldestMs) * Time.milliseconds.toSeconds : 0,
					);
				}
			},
		});
	}

	private initRecordOutcomeMetrics() {
		const prefix = this.config.prefix;

		const outcomes = new promClient.Counter({
			name: `${prefix}workflow_publication_outbox_record_outcomes_total`,
			help: 'Total number of workflow publication outbox records processed by result and reason.',
			labelNames: ['result', 'reason'],
		});

		const duration = new promClient.Histogram({
			name: `${prefix}workflow_publication_outbox_record_duration_seconds`,
			help: 'Duration in seconds of processing a workflow publication outbox record by result and reason.',
			labelNames: ['result', 'reason'],
			buckets: DURATION_BUCKETS_SECONDS,
		});

		this.eventService.on(
			'workflow-publication-outbox-record-processed',
			({ result, reason, durationMs }) => {
				outcomes.inc({ result, reason }, 1);
				duration.observe({ result, reason }, durationMs * Time.milliseconds.toSeconds);
			},
		);
	}

	private initTriggerMetrics() {
		const prefix = this.config.prefix;

		const operationDuration = new promClient.Histogram({
			name: `${prefix}workflow_publication_trigger_operation_duration_seconds`,
			help: 'Duration in seconds of a workflow publication trigger operation by operation and result.',
			labelNames: ['operation', 'result'],
			buckets: DURATION_BUCKETS_SECONDS,
		});

		const nodeOperations = new promClient.Counter({
			name: `${prefix}workflow_publication_trigger_node_operations_total`,
			help: 'Total number of trigger nodes (de)activated during workflow publication by operation and result.',
			labelNames: ['operation', 'result'],
		});

		this.eventService.on(
			'workflow-publication-trigger-operation',
			({ operation, result, durationMs }) => {
				operationDuration.observe({ operation, result }, durationMs * Time.milliseconds.toSeconds);
			},
		);

		this.eventService.on(
			'workflow-publication-trigger-node-operations',
			({ operation, result, count }) => {
				nodeOperations.inc({ operation, result }, count);
			},
		);
	}

	private initCleanupMetrics() {
		const prefix = this.config.prefix;

		const deleted = new promClient.Counter({
			name: `${prefix}workflow_publication_outbox_cleanup_deleted_records_total`,
			help: 'Total number of terminal workflow publication outbox records deleted by cleanup.',
		});

		const duration = new promClient.Histogram({
			name: `${prefix}workflow_publication_outbox_cleanup_duration_seconds`,
			help: 'Duration in seconds of a workflow publication outbox cleanup run by result.',
			labelNames: ['result'],
			buckets: DURATION_BUCKETS_SECONDS,
		});

		this.eventService.on(
			'workflow-publication-outbox-cleanup',
			({ result, deletedCount, durationMs }) => {
				deleted.inc(deletedCount);
				duration.observe({ result }, durationMs * Time.milliseconds.toSeconds);
			},
		);
	}

	private initReconciliationMetrics() {
		const prefix = this.config.prefix;

		const deficient = new promClient.Counter({
			name: `${prefix}workflow_publication_reconciliation_deficient_workflows_total`,
			help: 'Total number of workflows re-enqueued by trigger reconciliation because their in-memory triggers were missing.',
		});

		const surplus = new promClient.Counter({
			name: `${prefix}workflow_publication_reconciliation_surplus_workflows_total`,
			help: 'Total number of registered workflows torn down by trigger reconciliation because they were no longer published.',
		});

		const versionSkew = new promClient.Counter({
			name: `${prefix}workflow_publication_reconciliation_version_skew_workflows_total`,
			help: 'Total number of workflows re-enqueued by reconciliation because their published version diverged from the active version.',
		});

		const duration = new promClient.Histogram({
			name: `${prefix}workflow_publication_reconciliation_duration_seconds`,
			help: 'Duration in seconds of a trigger reconciliation pass by result.',
			labelNames: ['result'],
			buckets: DURATION_BUCKETS_SECONDS,
		});

		this.eventService.on(
			'workflow-publication-reconciliation',
			({ result, deficientCount, surplusCount, versionSkewCount, durationMs }) => {
				deficient.inc(deficientCount);
				surplus.inc(surplusCount);
				versionSkew.inc(versionSkewCount);
				duration.observe({ result }, durationMs * Time.milliseconds.toSeconds);
			},
		);
	}
}
