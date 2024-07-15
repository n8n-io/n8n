import config from '@/config';
import { N8N_VERSION } from '@/constants';
import type express from 'express';
import promBundle from 'express-prom-bundle';
import promClient, { type Counter } from 'prom-client';
import semverParse from 'semver/functions/parse';
import { Service } from 'typedi';

import { CacheService } from '@/services/cache/cache.service';
import { MessageEventBus } from '@/eventbus/MessageEventBus/MessageEventBus';
import { EventMessageTypeNames } from 'n8n-workflow';
import type { EventMessageTypes } from '@/eventbus';

@Service()
export class PrometheusMetricsService {
	constructor(
		private readonly cacheService: CacheService,
		private readonly eventBus: MessageEventBus,
	) {}

	private readonly counters: { [key: string]: Counter<string> | null } = {};

	private readonly prefix = config.getEnv('endpoints.metrics.prefix');

	private readonly includes = {
		metrics: {
			default: config.getEnv('endpoints.metrics.includeDefaultMetrics'),
			api: config.getEnv('endpoints.metrics.includeApiEndpoints'),
			cache: config.getEnv('endpoints.metrics.includeCacheMetrics'),
			logs: config.getEnv('endpoints.metrics.includeMessageEventBusMetrics'),
		},
		labels: {
			credentialsType: config.getEnv('endpoints.metrics.includeCredentialTypeLabel'),
			nodeType: config.getEnv('endpoints.metrics.includeNodeTypeLabel'),
			workflowId: config.getEnv('endpoints.metrics.includeWorkflowIdLabel'),
			apiPath: config.getEnv('endpoints.metrics.includeApiPathLabel'),
			apiMethod: config.getEnv('endpoints.metrics.includeApiMethodLabel'),
			apiStatusCode: config.getEnv('endpoints.metrics.includeApiStatusCodeLabel'),
		},
	};

	async init(app: express.Application) {
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
		const n8nVersion = semverParse(N8N_VERSION);

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
		if (!this.includes.metrics.default) return;

		promClient.collectDefaultMetrics();
	}

	/**
	 * Set up metrics for API endpoints with `express-prom-bundle`
	 */
	private setupApiMetrics(app: express.Application) {
		if (!this.includes.metrics.api) return;

		const metricsMiddleware = promBundle({
			autoregister: false,
			includeUp: false,
			includePath: this.includes.labels.apiPath,
			includeMethod: this.includes.labels.apiMethod,
			includeStatusCode: this.includes.labels.apiStatusCode,
		});

		app.use(['/rest/', '/webhook/', '/webhook-test/', '/api/'], metricsMiddleware);
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
		if (!this.counters[event.eventName]) {
			const metricName =
				this.prefix + event.eventName.replace('n8n.', '').replace(/\./g, '_') + '_total';

			if (!promClient.validateMetricName(metricName)) {
				this.counters[event.eventName] = null;
				return null;
			}

			const labels = this.toLabels(event);

			const counter = new promClient.Counter({
				name: metricName,
				help: `Total number of ${event.eventName} events.`,
				labelNames: Object.keys(labels),
			});
			counter.labels(labels).inc(0);
			this.counters[event.eventName] = counter;
		}

		return this.counters[event.eventName];
	}

	private setupMessageEventBusMetrics() {
		if (!this.includes.metrics.logs) return;

		this.eventBus.on('metrics.messageEventBus.Event', (event: EventMessageTypes) => {
			const counter = this.toCounter(event);
			if (!counter) return;
			counter.inc(1);
		});
	}

	private toLabels(event: EventMessageTypes): Record<string, string> {
		switch (event.__type) {
			case EventMessageTypeNames.audit:
				if (event.eventName.startsWith('n8n.audit.user.credentials')) {
					return this.includes.labels.credentialsType
						? { credential_type: (event.payload.credentialType ?? 'unknown').replace(/\./g, '_') }
						: {};
				}

				if (event.eventName.startsWith('n8n.audit.workflow')) {
					return this.includes.labels.workflowId
						? { workflow_id: event.payload.workflowId?.toString() ?? 'unknown' }
						: {};
				}
				break;

			case EventMessageTypeNames.node:
				return this.includes.labels.nodeType
					? {
							node_type: (event.payload.nodeType ?? 'unknown')
								.replace('n8n-nodes-', '')
								.replace(/\./g, '_'),
						}
					: {};

			case EventMessageTypeNames.workflow:
				return this.includes.labels.workflowId
					? { workflow_id: event.payload.workflowId?.toString() ?? 'unknown' }
					: {};
		}

		return {};
	}
}
