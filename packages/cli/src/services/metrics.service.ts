import config from '@/config';
import { N8N_VERSION } from '@/constants';
import type express from 'express';
import promBundle from 'express-prom-bundle';
import promClient, { type Counter } from 'prom-client';
import semverParse from 'semver/functions/parse';
import { Service } from 'typedi';
import EventEmitter from 'events';

import { CacheService } from '@/services/cache/cache.service';
import { METRICS_EVENT_NAME, getLabelsForEvent, type EventMessageTypes } from '@/eventbus';
import { MessageEventBus } from '@/eventbus/MessageEventBus/MessageEventBus';
import { Logger } from '@/Logger';

@Service()
export class MetricsService extends EventEmitter {
	constructor(
		private readonly logger: Logger,
		private readonly cacheService: CacheService,
		private readonly eventBus: MessageEventBus,
	) {
		super();
	}

	counters: Record<string, Counter<string> | null> = {};

	async configureMetrics(app: express.Application) {
		promClient.register.clear(); // clear all metrics in case we call this a second time
		this.setupDefaultMetrics();
		this.setupN8nVersionMetric();
		this.setupCacheMetrics();
		this.setupMessageEventBusMetrics();
		this.setupApiMetrics(app);
		this.mountMetricsEndpoint(app);
	}

	private setupN8nVersionMetric() {
		const n8nVersion = semverParse(N8N_VERSION || '0.0.0');

		if (n8nVersion) {
			const versionGauge = new promClient.Gauge({
				name: config.getEnv('endpoints.metrics.prefix') + 'version_info',
				help: 'n8n version info.',
				labelNames: ['version', 'major', 'minor', 'patch'],
			});

			versionGauge.set(
				{
					version: 'v' + n8nVersion.version,
					major: n8nVersion.major,
					minor: n8nVersion.minor,
					patch: n8nVersion.patch,
				},
				1,
			);
		}
	}

	private setupDefaultMetrics() {
		if (config.getEnv('endpoints.metrics.includeDefaultMetrics')) {
			promClient.collectDefaultMetrics();
		}
	}

	private setupApiMetrics(app: express.Application) {
		if (config.getEnv('endpoints.metrics.includeApiEndpoints')) {
			const metricsMiddleware = promBundle({
				autoregister: false,
				includeUp: false,
				includePath: config.getEnv('endpoints.metrics.includeApiPathLabel'),
				includeMethod: config.getEnv('endpoints.metrics.includeApiMethodLabel'),
				includeStatusCode: config.getEnv('endpoints.metrics.includeApiStatusCodeLabel'),
			});

			app.use(['/rest/', '/webhook/', 'webhook-test/', '/api/'], metricsMiddleware);
		}
	}

	mountMetricsEndpoint(app: express.Application) {
		app.get('/metrics', async (_req: express.Request, res: express.Response) => {
			const metrics = await promClient.register.metrics();
			res.setHeader('Content-Type', promClient.register.contentType);
			res.send(metrics).end();
		});
	}

	private setupCacheMetrics() {
		if (!config.getEnv('endpoints.metrics.includeCacheMetrics')) {
			return;
		}
		this.counters.cacheHitsTotal = new promClient.Counter({
			name: config.getEnv('endpoints.metrics.prefix') + 'cache_hits_total',
			help: 'Total number of cache hits.',
			labelNames: ['cache'],
		});
		this.counters.cacheHitsTotal.inc(0);
		this.cacheService.on('metrics.cache.hit', (amount: number = 1) => {
			this.counters.cacheHitsTotal?.inc(amount);
		});

		this.counters.cacheMissesTotal = new promClient.Counter({
			name: config.getEnv('endpoints.metrics.prefix') + 'cache_misses_total',
			help: 'Total number of cache misses.',
			labelNames: ['cache'],
		});
		this.counters.cacheMissesTotal.inc(0);
		this.cacheService.on('metrics.cache.miss', (amount: number = 1) => {
			this.counters.cacheMissesTotal?.inc(amount);
		});

		this.counters.cacheUpdatesTotal = new promClient.Counter({
			name: config.getEnv('endpoints.metrics.prefix') + 'cache_updates_total',
			help: 'Total number of cache updates.',
			labelNames: ['cache'],
		});
		this.counters.cacheUpdatesTotal.inc(0);
		this.cacheService.on('metrics.cache.update', (amount: number = 1) => {
			this.counters.cacheUpdatesTotal?.inc(amount);
		});
	}

	private getCounterForEvent(event: EventMessageTypes): Counter<string> | null {
		if (!promClient) return null;
		if (!this.counters[event.eventName]) {
			const prefix = config.getEnv('endpoints.metrics.prefix');
			const metricName =
				prefix + event.eventName.replace('n8n.', '').replace(/\./g, '_') + '_total';

			if (!promClient.validateMetricName(metricName)) {
				this.logger.debug(`Invalid metric name: ${metricName}. Ignoring it!`);
				this.counters[event.eventName] = null;
				return null;
			}

			const counter = new promClient.Counter({
				name: metricName,
				help: `Total number of ${event.eventName} events.`,
				labelNames: Object.keys(getLabelsForEvent(event)),
			});
			counter.inc(0);
			this.counters[event.eventName] = counter;
		}

		return this.counters[event.eventName];
	}

	private setupMessageEventBusMetrics() {
		if (!config.getEnv('endpoints.metrics.includeMessageEventBusMetrics')) {
			return;
		}
		this.eventBus.on(METRICS_EVENT_NAME, (event: EventMessageTypes) => {
			const counter = this.getCounterForEvent(event);
			if (!counter) return;
			counter.inc(1);
		});
	}
}
