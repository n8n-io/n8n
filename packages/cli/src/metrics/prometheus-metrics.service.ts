import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { WorkflowRepository } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover } from '@n8n/decorators';
import { Service } from '@n8n/di';
import type express from 'express';
import promBundle from 'express-prom-bundle';
import { DateTime } from 'luxon';
import { InstanceSettings } from 'n8n-core';
import { EventMessageTypeNames } from 'n8n-workflow';
import promClient, { type Counter, type Gauge } from 'prom-client';
import semverParse from 'semver/functions/parse';

import config from '@/config';
import { N8N_VERSION } from '@/constants';
import type { EventMessageTypes } from '@/eventbus';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { EventService } from '@/events/event.service';
import { CacheService } from '@/services/cache/cache.service';

import type { Includes, MetricCategory, MetricLabel } from './types';

@Service()
export class PrometheusMetricsService {
	constructor(
		private readonly cacheService: CacheService,
		private readonly eventBus: MessageEventBus,
		private readonly globalConfig: GlobalConfig,
		private readonly eventService: EventService,
		private readonly instanceSettings: InstanceSettings,
		private readonly workflowRepository: WorkflowRepository,
	) {}

	private readonly counters: { [key: string]: Counter<string> | null } = {};

	private readonly gauges: Record<string, Gauge<string>> = {};

	private readonly prefix = this.globalConfig.endpoints.metrics.prefix;

	private readonly includes: Includes = {
		metrics: {
			default: this.globalConfig.endpoints.metrics.includeDefaultMetrics,
			routes: this.globalConfig.endpoints.metrics.includeApiEndpoints,
			cache: this.globalConfig.endpoints.metrics.includeCacheMetrics,
			logs: this.globalConfig.endpoints.metrics.includeMessageEventBusMetrics,
			queue: this.globalConfig.endpoints.metrics.includeQueueMetrics,
		},
		labels: {
			credentialsType: this.globalConfig.endpoints.metrics.includeCredentialTypeLabel,
			nodeType: this.globalConfig.endpoints.metrics.includeNodeTypeLabel,
			workflowId: this.globalConfig.endpoints.metrics.includeWorkflowIdLabel,
			apiPath: this.globalConfig.endpoints.metrics.includeApiPathLabel,
			apiMethod: this.globalConfig.endpoints.metrics.includeApiMethodLabel,
			apiStatusCode: this.globalConfig.endpoints.metrics.includeApiStatusCodeLabel,
			workflowName: this.globalConfig.endpoints.metrics.includeWorkflowNameLabel,
		},
	};

	async init(app: express.Application) {
		promClient.register.clear(); // clear all metrics in case we call this a second time
		this.initDefaultMetrics();
		this.initN8nVersionMetric();
		if (this.instanceSettings.instanceType === 'main') this.initInstanceRoleMetric();
		this.initCacheMetrics();
		this.initEventBusMetrics();
		this.initRouteMetrics(app);
		this.initQueueMetrics();
		this.initActiveWorkflowCountMetric();
		this.mountMetricsEndpoint(app);
	}

	enableMetric(metric: MetricCategory) {
		this.includes.metrics[metric] = true;
	}

	disableMetric(metric: MetricCategory) {
		this.includes.metrics[metric] = false;
	}

	disableAllMetrics() {
		for (const metric in this.includes.metrics) {
			this.includes.metrics[metric as MetricCategory] = false;
		}
	}

	enableLabels(labels: MetricLabel[]) {
		for (const label of labels) {
			this.includes.labels[label] = true;
		}
	}

	disableAllLabels() {
		for (const label in this.includes.labels) {
			this.includes.labels[label as MetricLabel] = false;
		}
	}

	/**
	 * Set up metric for n8n version: `n8n_version_info`
	 */
	private initN8nVersionMetric() {
		const n8nVersion = semverParse(N8N_VERSION ?? '0.0.0');

		if (!n8nVersion) return;

		const versionGauge = new promClient.Gauge({
			name: this.prefix + 'version_info',
			help: 'n8n version info.',
			labelNames: ['version', 'major', 'minor', 'patch'],
		});

		const { version, major, minor, patch } = n8nVersion;

		versionGauge.set({ version: 'v' + version, major, minor, patch }, 1);
	}

	private initInstanceRoleMetric() {
		this.gauges.instanceRoleLeader = new promClient.Gauge({
			name: this.prefix + 'instance_role_leader',
			help: 'Whether this main instance is the leader (1) or not (0).',
		});

		this.gauges.instanceRoleLeader.set(this.instanceSettings.isLeader ? 1 : 0);
	}

	@OnLeaderTakeover()
	updateOnLeaderTakeover() {
		this.gauges.instanceRoleLeader?.set(1);
	}

	@OnLeaderStepdown()
	updateOnLeaderStepdown() {
		this.gauges.instanceRoleLeader?.set(0);
	}

	/**
	 * Set up default metrics collection with `prom-client`, e.g.
	 * `process_cpu_seconds_total`, `process_resident_memory_bytes`, etc.
	 */
	private initDefaultMetrics() {
		if (!this.includes.metrics.default) return;

		promClient.collectDefaultMetrics({ prefix: this.globalConfig.endpoints.metrics.prefix });
	}

	/**
	 * Set up metrics for server routes with `express-prom-bundle`. The same
	 * middleware is also utilized for an instance activity metric
	 */
	private initRouteMetrics(app: express.Application) {
		if (!this.includes.metrics.routes) return;

		const metricsMiddleware = promBundle({
			autoregister: false,
			includeUp: false,
			includePath: this.includes.labels.apiPath,
			includeMethod: this.includes.labels.apiMethod,
			includeStatusCode: this.includes.labels.apiStatusCode,
			httpDurationMetricName: this.prefix + 'http_request_duration_seconds',
		});

		const activityGauge = new promClient.Gauge({
			name: this.prefix + 'last_activity',
			help: 'last instance activity (backend request) in Unix time (seconds).',
		});

		activityGauge.set(DateTime.now().toUnixInteger());

		app.use(
			[
				'/api/',
				`/${this.globalConfig.endpoints.rest}/`,
				`/${this.globalConfig.endpoints.webhook}/`,
				`/${this.globalConfig.endpoints.webhookWaiting}/`,
				`/${this.globalConfig.endpoints.webhookTest}/`,
				`/${this.globalConfig.endpoints.form}/`,
				`/${this.globalConfig.endpoints.formWaiting}/`,
				`/${this.globalConfig.endpoints.formTest}/`,
			],
			async (req, res, next) => {
				activityGauge.set(DateTime.now().toUnixInteger());

				await metricsMiddleware(req, res, next);
			},
		);
	}

	private mountMetricsEndpoint(app: express.Application) {
		app.get('/metrics', async (_req: express.Request, res: express.Response) => {
			const metrics = await promClient.register.metrics();
			res.setHeader('Content-Type', promClient.register.contentType);
			res.send(metrics).end();
		});
	}

	/**
	 * Set up cache metrics: `n8n_cache_hits_total`, `n8n_cache_misses_total`, and
	 * `n8n_cache_updates_total`
	 */
	private initCacheMetrics() {
		if (!this.includes.metrics.cache) return;

		const [hitsConfig, missesConfig, updatesConfig] = ['hits', 'misses', 'updates'].map((kind) => ({
			name: this.prefix + 'cache_' + kind + '_total',
			help: `Total number of cache ${kind}.`,
			labelNames: ['cache'],
		}));

		this.counters.cacheHitsTotal = new promClient.Counter(hitsConfig);
		this.counters.cacheHitsTotal.inc(0);
		this.cacheService.on('metrics.cache.hit', () => this.counters.cacheHitsTotal?.inc(1));

		this.counters.cacheMissesTotal = new promClient.Counter(missesConfig);
		this.counters.cacheMissesTotal.inc(0);
		this.cacheService.on('metrics.cache.miss', () => this.counters.cacheMissesTotal?.inc(1));

		this.counters.cacheUpdatesTotal = new promClient.Counter(updatesConfig);
		this.counters.cacheUpdatesTotal.inc(0);
		this.cacheService.on('metrics.cache.update', () => this.counters.cacheUpdatesTotal?.inc(1));
	}

	private toCounter(event: EventMessageTypes) {
		const { eventName } = event;

		if (!this.counters[eventName]) {
			const metricName = this.prefix + eventName.replace('n8n.', '').replace(/\./g, '_') + '_total';

			if (!promClient.validateMetricName(metricName)) {
				this.counters[eventName] = null;
				return null;
			}

			const labels = this.toLabels(event);

			const counter = new promClient.Counter({
				name: metricName,
				help: `Total number of ${eventName} events.`,
				labelNames: Object.keys(labels),
			});
			this.counters[eventName] = counter;
		}

		return this.counters[eventName];
	}

	private initEventBusMetrics() {
		if (!this.includes.metrics.logs) return;

		this.eventBus.on('metrics.eventBus.event', (event: EventMessageTypes) => {
			const counter = this.toCounter(event);
			if (!counter) return;

			const labels = this.toLabels(event);
			counter.inc(labels, 1);
		});
	}

	private initQueueMetrics() {
		if (
			!this.includes.metrics.queue ||
			config.getEnv('executions.mode') !== 'queue' ||
			this.instanceSettings.instanceType !== 'main'
		) {
			return;
		}

		this.gauges.waiting = new promClient.Gauge({
			name: this.prefix + 'scaling_mode_queue_jobs_waiting',
			help: 'Current number of enqueued jobs waiting for pickup in scaling mode.',
		});

		this.gauges.active = new promClient.Gauge({
			name: this.prefix + 'scaling_mode_queue_jobs_active',
			help: 'Current number of jobs being processed across all workers in scaling mode.',
		});

		this.counters.completed = new promClient.Counter({
			name: this.prefix + 'scaling_mode_queue_jobs_completed',
			help: 'Total number of jobs completed across all workers in scaling mode since instance start.',
		});

		this.counters.failed = new promClient.Counter({
			name: this.prefix + 'scaling_mode_queue_jobs_failed',
			help: 'Total number of jobs failed across all workers in scaling mode since instance start.',
		});

		this.gauges.waiting.set(0);
		this.gauges.active.set(0);
		this.counters.completed.inc(0);
		this.counters.failed.inc(0);

		this.eventService.on('job-counts-updated', (jobCounts) => {
			this.gauges.waiting.set(jobCounts.waiting);
			this.gauges.active.set(jobCounts.active);
			this.counters.completed?.inc(jobCounts.completed);
			this.counters.failed?.inc(jobCounts.failed);
		});
	}

	/**
	 * Setup active workflow count metric
	 *
	 * This metric is updated every time metrics are collected.
	 * We also cache the value of active workflow counts so we
	 * don't hit the database on every metrics query. Both the
	 * metric being enabled and the TTL of the cached value is
	 * configurable.
	 */
	private initActiveWorkflowCountMetric() {
		const workflowRepository = this.workflowRepository;
		const cacheService = this.cacheService;
		const cacheKey = 'metrics:active-workflow-count';
		const cacheTtl =
			this.globalConfig.endpoints.metrics.activeWorkflowCountInterval * Time.seconds.toMilliseconds;

		new promClient.Gauge({
			name: this.prefix + 'active_workflow_count',
			help: 'Total number of active workflows.',
			async collect() {
				const value = await cacheService.get<string>(cacheKey);
				const numericValue = value !== undefined ? parseInt(value, 10) : undefined;

				if (numericValue !== undefined && Number.isFinite(numericValue)) {
					this.set(numericValue);
				} else {
					const activeWorkflowCount = await workflowRepository.getActiveCount();
					await cacheService.set(cacheKey, activeWorkflowCount.toString(), cacheTtl);

					this.set(activeWorkflowCount);
				}
			},
		});
	}

	private toLabels(event: EventMessageTypes): Record<string, string> {
		const { __type, eventName, payload } = event;

		switch (__type) {
			case EventMessageTypeNames.audit:
				if (eventName.startsWith('n8n.audit.user.credentials')) {
					return this.includes.labels.credentialsType
						? {
								credential_type: String(
									(event.payload.credentialType ?? 'unknown').replace(/\./g, '_'),
								),
							}
						: {};
				}

				if (eventName.startsWith('n8n.audit.workflow')) {
					return this.buildWorkflowLabels(payload);
				}
				break;

			case EventMessageTypeNames.node:
				const nodeLabels: Record<string, string> = this.buildWorkflowLabels(payload);

				if (this.includes.labels.nodeType) {
					nodeLabels.node_type = String(
						(payload.nodeType ?? 'unknown').replace('n8n-nodes-', '').replace(/\./g, '_'),
					);
				}

				return nodeLabels;

			case EventMessageTypeNames.workflow:
				return this.buildWorkflowLabels(payload);
		}

		return {};
	}

	private buildWorkflowLabels(payload: any): Record<string, string> {
		const labels: Record<string, string> = {};
		if (this.includes.labels.workflowId) {
			labels.workflow_id = String(payload.workflowId ?? 'unknown');
		}
		if (this.includes.labels.workflowName) {
			labels.workflow_name = String(payload.workflowName ?? 'unknown');
		}
		return labels;
	}
}
