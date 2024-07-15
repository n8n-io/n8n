import config from '@/config';
import { N8N_VERSION } from '@/constants';
import type express from 'express';
import promBundle from 'express-prom-bundle';
import promClient, { type Counter } from 'prom-client';
import semverParse from 'semver/functions/parse';
import { Service } from 'typedi';

import { CacheService } from '@/services/cache/cache.service';
import { type EventMessageTypes } from '@/eventbus';
import { MessageEventBus } from '@/eventbus/MessageEventBus/MessageEventBus';
import { EventMessageTypeNames } from 'n8n-workflow';

@Service()
export class PrometheusMetricsService {
	constructor(
		private readonly cacheService: CacheService,
		private readonly eventBus: MessageEventBus,
	) {}

	private readonly counters: Record<string, Counter<string> | null> = {};

	private readonly prefix = config.getEnv('endpoints.metrics.prefix');

	private readonly isIncluded = {
		default: config.getEnv('endpoints.metrics.includeDefaultMetrics'),
		api: config.getEnv('endpoints.metrics.includeApiEndpoints'),
		cache: config.getEnv('endpoints.metrics.includeCacheMetrics'),
		logs: config.getEnv('endpoints.metrics.includeMessageEventBusMetrics'),
		credentialsTypeLabel: config.getEnv('endpoints.metrics.includeCredentialTypeLabel'),
		nodeTypeLabel: config.getEnv('endpoints.metrics.includeNodeTypeLabel'),
		workflowIdLabel: config.getEnv('endpoints.metrics.includeWorkflowIdLabel'),
	};

	async configureMetrics(app: express.Application) {
		promClient.register.clear(); // clear all metrics in case we call this a second time
		this.setupDefaultMetrics();
		this.setupN8nVersionMetric();
		this.setupCacheMetrics();
		this.setupMessageEventBusMetrics();
		this.setupApiMetrics(app);
		this.mountMetricsEndpoint(app);
	}

	/**
	 * Set up metric for n8n version: `n8n_version_info`
	 */
	private setupN8nVersionMetric() {
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

	/**
	 * Set up default metrics collection with `prom-client`
	 */
	private setupDefaultMetrics() {
		if (!this.isIncluded.default) return;

		promClient.collectDefaultMetrics();
	}

	/**
	 * Set up metrics for API endpoints with `express-prom-bundle`
	 */
	private setupApiMetrics(app: express.Application) {
		if (!this.isIncluded.api) return;

		const metricsMiddleware = promBundle({
			autoregister: false,
			includeUp: false,
			includePath: config.getEnv('endpoints.metrics.includeApiPathLabel'),
			includeMethod: config.getEnv('endpoints.metrics.includeApiMethodLabel'),
			includeStatusCode: config.getEnv('endpoints.metrics.includeApiStatusCodeLabel'),
		});

		app.use(['/rest/', '/webhook/', 'webhook-test/', '/api/'], metricsMiddleware);
	}

	private mountMetricsEndpoint(app: express.Application) {
		app.get('/metrics', async (_req: express.Request, res: express.Response) => {
			const metrics = await promClient.register.metrics();
			res.setHeader('Content-Type', promClient.register.contentType);
			res.send(metrics).end();
		});
	}

	/**
	 * Set up cache metrics:
	 *
	 * - `n8n_cache_hits_total`
	 * - `n8n_cache_misses_total`
	 * - `n8n_cache_updates_total`
	 */
	private setupCacheMetrics() {
		if (!this.isIncluded.cache) return;

		this.counters.cacheHitsTotal = new promClient.Counter({
			name: this.prefix + 'cache_hits_total',
			help: 'Total number of cache hits.',
			labelNames: ['cache'],
		});
		this.counters.cacheHitsTotal.inc(0);
		this.cacheService.on('metrics.cache.hit', (amount: number = 1) => {
			this.counters.cacheHitsTotal?.inc(amount);
		});

		this.counters.cacheMissesTotal = new promClient.Counter({
			name: this.prefix + 'cache_misses_total',
			help: 'Total number of cache misses.',
			labelNames: ['cache'],
		});
		this.counters.cacheMissesTotal.inc(0);
		this.cacheService.on('metrics.cache.miss', (amount: number = 1) => {
			this.counters.cacheMissesTotal?.inc(amount);
		});

		this.counters.cacheUpdatesTotal = new promClient.Counter({
			name: this.prefix + 'cache_updates_total',
			help: 'Total number of cache updates.',
			labelNames: ['cache'],
		});
		this.counters.cacheUpdatesTotal.inc(0);
		this.cacheService.on('metrics.cache.update', (amount: number = 1) => {
			this.counters.cacheUpdatesTotal?.inc(amount);
		});
	}

	private getCounterForEvent(event: EventMessageTypes): Counter<string> | null {
		if (!this.counters[event.eventName]) {
			const metricName =
				this.prefix + event.eventName.replace('n8n.', '').replace(/\./g, '_') + '_total';

			if (!promClient.validateMetricName(metricName)) {
				this.counters[event.eventName] = null;
				return null;
			}

			const counter = new promClient.Counter({
				name: metricName,
				help: `Total number of ${event.eventName} events.`,
				labelNames: Object.keys(this.getLabelsForEvent(event)),
			});
			counter.inc(0);
			this.counters[event.eventName] = counter;
		}

		return this.counters[event.eventName];
	}

	private setupMessageEventBusMetrics() {
		if (!this.isIncluded.logs) return;

		this.eventBus.on('metrics.messageEventBus.Event', (event: EventMessageTypes) => {
			const counter = this.getCounterForEvent(event);
			if (!counter) return;
			counter.inc(1);
		});
	}

	private getLabelsForEvent(event: EventMessageTypes): Record<string, string> {
		switch (event.__type) {
			case EventMessageTypeNames.audit:
				if (event.eventName.startsWith('n8n.audit.user.credentials')) {
					return this.isIncluded.credentialsTypeLabel
						? { credential_type: (event.payload.credentialType ?? 'unknown').replace(/\./g, '_') }
						: {};
				}

				if (event.eventName.startsWith('n8n.audit.workflow')) {
					return this.isIncluded.workflowIdLabel
						? { workflow_id: event.payload.workflowId?.toString() ?? 'unknown' }
						: {};
				}
				break;

			case EventMessageTypeNames.node:
				return this.isIncluded.nodeTypeLabel
					? {
							node_type: (event.payload.nodeType ?? 'unknown')
								.replace('n8n-nodes-', '')
								.replace(/\./g, '_'),
						}
					: {};

			case EventMessageTypeNames.workflow:
				return this.isIncluded.workflowIdLabel
					? { workflow_id: event.payload.workflowId?.toString() ?? 'unknown' }
					: {};
		}

		return {};
	}
}
