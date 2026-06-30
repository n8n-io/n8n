import { PrometheusMetricsConfig, WorkflowsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { WorkflowPublicationOutboxRepository, WorkflowPublicationOutboxStatus } from '@n8n/db';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import promClient from 'prom-client';

import { EventService } from '@/events/event.service';
import { CacheService } from '@/services/cache/cache.service';

import type { PrometheusMetricsCollector } from './base';
import { DURATION_BUCKETS_SECONDS } from './constant';

const ALL_STATUSES = Object.values(WorkflowPublicationOutboxStatus);
const ACTIVE_STATUSES = [
	WorkflowPublicationOutboxStatus.Pending,
	WorkflowPublicationOutboxStatus.InProgress,
];

const RECORD_COUNTS_CACHE_KEY = 'metrics:workflow-publication:outbox-record-counts';
const OLDEST_ACTIVE_CACHE_KEY = 'metrics:workflow-publication:oldest-active-record';

/** Serializable cache shape for a `Map<status, value>` (Maps don't round-trip JSON). */
type StatusEntries = Array<[WorkflowPublicationOutboxStatus, number]>;

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
		this.initCleanupMetrics();
	}

	private initOutboxGauges() {
		const repository = this.outboxRepository;
		const cacheService = this.cacheService;
		const prefix = this.config.prefix;
		// Both gauges hit the DB on every scrape; cache the results so a tight scrape
		// interval doesn't hammer the outbox table.
		const cacheTtl = this.config.workflowPublicationMetricInterval * Time.seconds.toMilliseconds;

		new promClient.Gauge({
			name: `${prefix}workflow_publication_outbox_records`,
			help: 'Number of workflow publication outbox records by status.',
			labelNames: ['status'],
			async collect() {
				let entries = await cacheService.get<StatusEntries>(RECORD_COUNTS_CACHE_KEY);
				if (entries === undefined) {
					entries = [...(await repository.getRecordCountsByStatus())];
					await cacheService.set(RECORD_COUNTS_CACHE_KEY, entries, cacheTtl);
				}

				const byStatus = new Map(entries);
				for (const status of ALL_STATUSES) {
					this.set({ status }, byStatus.get(status) ?? 0);
				}
			},
		});

		new promClient.Gauge({
			name: `${prefix}workflow_publication_outbox_oldest_active_record_age_seconds`,
			help: 'Age in seconds of the oldest active (pending/in_progress) workflow publication outbox record by status.',
			labelNames: ['status'],
			async collect() {
				let entries = await cacheService.get<StatusEntries>(OLDEST_ACTIVE_CACHE_KEY);
				if (entries === undefined) {
					const oldest = await repository.getOldestActiveRecordCreatedAtByStatus();
					entries = [...oldest].map(
						([status, createdAt]): [WorkflowPublicationOutboxStatus, number] => [
							status,
							createdAt.getTime(),
						],
					);
					await cacheService.set(OLDEST_ACTIVE_CACHE_KEY, entries, cacheTtl);
				}

				const byStatus = new Map(entries);
				const now = Date.now();
				for (const status of ACTIVE_STATUSES) {
					const oldestMs = byStatus.get(status);
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
}
