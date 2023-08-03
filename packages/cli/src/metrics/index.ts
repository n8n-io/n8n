/* eslint-disable @typescript-eslint/no-use-before-define */
import config from '@/config';
import { N8N_VERSION } from '@/constants';
import * as ResponseHelper from '@/ResponseHelper';
import type express from 'express';
import promBundle from 'express-prom-bundle';
import promClient from 'prom-client';
import semverParse from 'semver/functions/parse';
import { Service } from 'typedi';

export { promClient };

@Service()
export class MetricsService {
	cacheHitsTotal: promClient.Counter<'cache'> | undefined;

	cacheMissesTotal: promClient.Counter<'cache'> | undefined;

	cacheUpdatesTotal: promClient.Counter<'cache'> | undefined;

	configureMetrics(app: express.Application) {
		if (!config.getEnv('endpoints.metrics.enable')) {
			return;
		}

		this.setupDefaultMetrics();
		this.setupN8nVersionMetric();
		this.setupCacheMetrics();
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

	private mountMetricsEndpoint(app: express.Application) {
		app.get('/metrics', async (req: express.Request, res: express.Response) => {
			const response = await promClient.register.metrics();
			res.setHeader('Content-Type', promClient.register.contentType);
			ResponseHelper.sendSuccessResponse(res, response, true, 200);
		});
	}

	private setupCacheMetrics() {
		if (!config.getEnv('endpoints.metrics.includeCacheMetrics')) {
			return;
		}
		this.cacheHitsTotal = new promClient.Counter({
			name: config.getEnv('endpoints.metrics.prefix') + 'cache_hits_total',
			help: 'Total number of cache hits.',
			labelNames: ['cache'],
		});
		this.cacheHitsTotal.inc(0);
		this.cacheMissesTotal = new promClient.Counter({
			name: config.getEnv('endpoints.metrics.prefix') + 'cache_misses_total',
			help: 'Total number of cache misses.',
			labelNames: ['cache'],
		});
		this.cacheMissesTotal.inc(0);
		this.cacheUpdatesTotal = new promClient.Counter({
			name: config.getEnv('endpoints.metrics.prefix') + 'cache_updates_total',
			help: 'Total number of cache updates.',
			labelNames: ['cache'],
		});
		this.cacheUpdatesTotal.inc(0);
	}

	incrementCacheHitsTotal(amount: number = 1) {
		this.cacheHitsTotal?.inc(amount);
	}

	incrementCacheMissesTotal(amount: number = 1) {
		this.cacheMissesTotal?.inc(amount);
	}

	incrementCacheUpdatesTotal(amount: number = 1) {
		this.cacheUpdatesTotal?.inc(amount);
	}
}
