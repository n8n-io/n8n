import { EventService, ExecutionLedger } from '@n8n/backend-services';
import { PrometheusMetricsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import promClient from 'prom-client';

import type { PrometheusMetricsCollector } from './base';
import { toGaugeValue } from './cached-metric-query';
import { DatabaseMetricQueryService } from './database-metric-query.service';

/** Matches the publication outbox gauges. */
const BACKLOG_CACHE_TTL_MS = 60 * Time.seconds.toMilliseconds;

/** Metrics for the execution ledger fold. Main only, because only mains fold. */
@Service()
export class PrometheusExecutionLedgerMetricsService implements PrometheusMetricsCollector {
	constructor(
		private readonly config: PrometheusMetricsConfig,
		private readonly instanceSettings: InstanceSettings,
		private readonly executionLedger: ExecutionLedger,
		private readonly eventService: EventService,
		private readonly databaseQueries: DatabaseMetricQueryService,
	) {}

	get enabled(): boolean {
		return (
			this.config.includeExecutionLedgerMetrics &&
			this.instanceSettings.instanceType === 'main' &&
			this.executionLedger.isEnabled
		);
	}

	init() {
		this.initBacklogGauges();
		this.initFoldMetrics();
	}

	private initBacklogGauges() {
		const prefix = this.config.prefix;
		const query = this.databaseQueries.executionLedgerBacklog(BACKLOG_CACHE_TTL_MS);

		new promClient.Gauge({
			name: `${prefix}execution_ledger_backlog_rows`,
			help: 'Upper-bound estimate, at the last refresh, of execution ledger rows that no fold has claimed yet.',
			async collect() {
				this.set(toGaugeValue(await query.get(), (backlog) => backlog.rows));
			},
		});

		new promClient.Gauge({
			name: `${prefix}execution_ledger_backlog_oldest_row_age_seconds`,
			help: 'Age in seconds of the oldest execution ledger row that no fold has claimed yet. 0 when the ledger is empty.',
			async collect() {
				const backlog = await query.get();
				const now = Date.now();
				this.set(
					toGaugeValue(backlog, ({ oldestMs }) =>
						oldestMs === null ? 0 : Math.max(0, now - oldestMs) * Time.milliseconds.toSeconds,
					),
				);
			},
		});
	}

	private initFoldMetrics() {
		const prefix = this.config.prefix;

		const lastSuccess = new promClient.Gauge({
			name: `${prefix}execution_ledger_fold_last_success_timestamp_seconds`,
			help: 'Unix time in seconds of the last fold that held the lock and committed, including folds that found the ledger empty.',
		});

		const foldedRows = new promClient.Counter({
			name: `${prefix}execution_ledger_fold_rows_total`,
			help: 'Total number of execution ledger rows claimed by the fold.',
		});

		const stepFailures = new promClient.Counter({
			name: `${prefix}execution_ledger_fold_step_failures_total`,
			help: 'Total number of failed fold attempts by fold step.',
			labelNames: ['step'],
		});

		this.eventService.on('execution-ledger-fold-succeeded', ({ rows }) => {
			lastSuccess.set(Date.now() * Time.milliseconds.toSeconds);
			foldedRows.inc(rows);
		});

		this.eventService.on('execution-ledger-fold-step-failed', ({ step }) => {
			stepFailures.inc({ step });
		});
	}
}
