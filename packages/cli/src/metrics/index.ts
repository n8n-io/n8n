/* eslint-disable @typescript-eslint/no-use-before-define */
import config from '@/config';
import { N8N_VERSION } from '@/constants';
import * as ResponseHelper from '@/ResponseHelper';
import type express from 'express';
import promBundle from 'express-prom-bundle';
import type { Counter } from 'prom-client';
import semverParse from 'semver/functions/parse';
import { Service } from 'typedi';
import EventEmitter from 'events';
import { CacheService } from '@/services/cache.service';
import { MetricsCounterEvents } from './constants';
import type { EventMessageTypes } from '@/eventbus/EventMessageClasses';
import { LoggerProxy } from 'n8n-workflow';
import { getLabelsForEvent } from '@/eventbus/MessageEventBusDestination/Helpers.ee';
import { eventBus } from '../eventbus';

@Service()
export class MetricsService extends EventEmitter {
	constructor(private readonly cacheService: CacheService) {
		super();
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	promClient: typeof import('prom-client') | undefined;

	counters: Record<string, Counter<string> | null> = {};

	async configureMetrics(app: express.Application) {
		if (!config.getEnv('endpoints.metrics.enable')) {
			return;
		}

		this.promClient = await import('prom-client');

		this.setupDefaultMetrics();
		this.setupN8nVersionMetric();
		this.setupCacheMetrics();
		this.setupMessageEventBusMetrics();
		this.setupApiMetrics(app);
		this.mountMetricsEndpoint(app);
	}

	private setupN8nVersionMetric() {
		if (!this.promClient) return;

		const n8nVersion = semverParse(N8N_VERSION || '0.0.0');

		if (n8nVersion) {
			const versionGauge = new this.promClient.Gauge({
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
		if (!this.promClient) return;
		if (config.getEnv('endpoints.metrics.includeDefaultMetrics')) {
			this.promClient.collectDefaultMetrics();
		}
	}

	private setupApiMetrics(app: express.Application) {
		if (!this.promClient) return;
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

	private mountMetricsEndpoint(app: express.Application) {
		app
			.get('/metrics', async (req: express.Request, res: express.Response) => {
				if (!this.promClient) return;
				const response = await this.promClient.register.metrics();
				res.setHeader('Content-Type', this.promClient.register.contentType);
				ResponseHelper.sendSuccessResponse(res, response, true, 200);
			})
			.bind(this);
	}

	private setupCacheMetrics() {
		if (!this.promClient) return;
		if (!config.getEnv('endpoints.metrics.includeCacheMetrics')) {
			return;
		}
		this.counters.cacheHitsTotal = new this.promClient.Counter({
			name: config.getEnv('endpoints.metrics.prefix') + 'cache_hits_total',
			help: 'Total number of cache hits.',
			labelNames: ['cache'],
		});
		this.counters.cacheHitsTotal.inc(0);
		this.cacheService.on(MetricsCounterEvents.cacheHit, (amount: number = 1) => {
			this.counters.cacheHitsTotal?.inc(amount);
		});

		this.counters.cacheMissesTotal = new this.promClient.Counter({
			name: config.getEnv('endpoints.metrics.prefix') + 'cache_misses_total',
			help: 'Total number of cache misses.',
			labelNames: ['cache'],
		});
		this.counters.cacheMissesTotal.inc(0);
		this.cacheService.on(MetricsCounterEvents.cacheMiss, (amount: number = 1) => {
			this.counters.cacheMissesTotal?.inc(amount);
		});

		this.counters.cacheUpdatesTotal = new this.promClient.Counter({
			name: config.getEnv('endpoints.metrics.prefix') + 'cache_updates_total',
			help: 'Total number of cache updates.',
			labelNames: ['cache'],
		});
		this.counters.cacheUpdatesTotal.inc(0);
		this.cacheService.on(MetricsCounterEvents.cacheUpdate, (amount: number = 1) => {
			this.counters.cacheUpdatesTotal?.inc(amount);
		});
	}

	private getCounterForEvent(event: EventMessageTypes): Counter<string> | null {
		if (!this.promClient) return null;
		if (!this.counters[event.eventName]) {
			const prefix = config.getEnv('endpoints.metrics.prefix');
			const metricName =
				prefix + event.eventName.replace('n8n.', '').replace(/\./g, '_') + '_total';

			if (!this.promClient.validateMetricName(metricName)) {
				LoggerProxy.debug(`Invalid metric name: ${metricName}. Ignoring it!`);
				this.counters[event.eventName] = null;
				return null;
			}

			const counter = new this.promClient.Counter({
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
		if (!this.promClient) return;
		if (!config.getEnv('endpoints.metrics.includeMessageEventBusMetrics')) {
			return;
		}
		eventBus.on(MetricsCounterEvents.messageEventBusEvent, (event: EventMessageTypes) => {
			const counter = this.getCounterForEvent(event);
			if (!counter) return;
			counter.inc(1);
		});
	}
}
