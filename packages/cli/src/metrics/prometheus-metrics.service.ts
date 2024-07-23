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
import type { Includes, MetricCategory, MetricLabel } from './types';

@Service()
export class PrometheusMetricsService {
	constructor(
		private readonly cacheService: CacheService,
		private readonly eventBus: MessageEventBus,
	) {}

	private readonly counters: { [key: string]: Counter<string> | null } = {};

	private readonly prefix = config.getEnv('endpoints.metrics.prefix');

	private readonly includes: Includes = {
		metrics: {
			default: config.getEnv('endpoints.metrics.includeDefaultMetrics'),
			routes: config.getEnv('endpoints.metrics.includeApiEndpoints'),
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
		this.initDefaultMetrics();
		this.initN8nVersionMetric();
		this.initCacheMetrics();
		this.initEventBusMetrics();
		this.initRouteMetrics(app);
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

	/**
	 * Set up default metrics collection with `prom-client`, e.g.
	 * `process_cpu_seconds_total`, `process_resident_memory_bytes`, etc.
	 */
	private initDefaultMetrics() {
		if (!this.includes.metrics.default) return;

		promClient.collectDefaultMetrics();
	}

	/**
	 * Set up metrics for server routes with `express-prom-bundle`
	 */
	private initRouteMetrics(app: express.Application) {
		if (!this.includes.metrics.routes) return;

		const metricsMiddleware = promBundle({
			autoregister: false,
			includeUp: false,
			includePath: this.includes.labels.apiPath,
			includeMethod: this.includes.labels.apiMethod,
			includeStatusCode: this.includes.labels.apiStatusCode,
		});

		app.use(
			[
				'/rest/',
				'/api/',
				'/webhook/',
				'/webhook-waiting/',
				'/webhook-test/',
				'/form/',
				'/form-waiting/',
				'/form-test/',
			],
			metricsMiddleware,
		);
	}

	private mountMetricsEndpoint(app: express.Application) {
		app.get('/metrics', async (_req: express.Request, res: express.Response) => {
			const metrics = await promClient.register.metrics();
			const prefixedMetrics = this.addPrefixToMetrics(metrics);
			res.setHeader('Content-Type', promClient.register.contentType);
			res.send(prefixedMetrics).end();
		});
	}

	private addPrefixToMetrics(metrics: string) {
		return metrics
			.split('\n')
			.map((rawLine) => {
				const line = rawLine.trim();

				if (!line || line.startsWith('#') || line.startsWith(this.prefix)) return rawLine;

				return this.prefix + line;
			})
			.join('\n');
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
			counter.labels(labels).inc(0);
			this.counters[eventName] = counter;
		}

		return this.counters[eventName];
	}

	private initEventBusMetrics() {
		if (!this.includes.metrics.logs) return;

		this.eventBus.on('metrics.eventBus.event', (event: EventMessageTypes) => {
			const counter = this.toCounter(event);
			if (!counter) return;
			counter.inc(1);
		});
	}

	private toLabels(event: EventMessageTypes): Record<string, string> {
		const { __type, eventName, payload } = event;

		switch (__type) {
			case EventMessageTypeNames.audit:
				if (eventName.startsWith('n8n.audit.user.credentials')) {
					return this.includes.labels.credentialsType
						? { credential_type: (event.payload.credentialType ?? 'unknown').replace(/\./g, '_') }
						: {};
				}

				if (eventName.startsWith('n8n.audit.workflow')) {
					return this.includes.labels.workflowId
						? { workflow_id: payload.workflowId ?? 'unknown' }
						: {};
				}
				break;

			case EventMessageTypeNames.node:
				return this.includes.labels.nodeType
					? {
							node_type: (payload.nodeType ?? 'unknown')
								.replace('n8n-nodes-', '')
								.replace(/\./g, '_'),
						}
					: {};

			case EventMessageTypeNames.workflow:
				return this.includes.labels.workflowId
					? { workflow_id: payload.workflowId ?? 'unknown' }
					: {};
		}

		return {};
	}
}
