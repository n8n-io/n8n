import { PrometheusMetricsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type express from 'express';
import promBundle from 'express-prom-bundle';
import { DateTime } from 'luxon';
import { assert } from 'n8n-workflow';
import promClient, { Gauge } from 'prom-client';

import { PathResolvingService } from '@/services/path-resolving.service';

import type { PrometheusMetricsCollector } from './base';

/**
 * Instruments Express routes with `express-prom-bundle` for HTTP request duration metrics,
 * and tracks last backend activity time via `n8n_last_activity` gauge.
 */
@Service()
export class PrometheusRouteMetricsService implements PrometheusMetricsCollector {
	constructor(
		private readonly config: PrometheusMetricsConfig,
		private readonly pathResolvingService: PathResolvingService,
	) {}

	get enabled(): boolean {
		return this.config.includeApiEndpoints;
	}

	init(app?: express.Application) {
		assert(
			app,
			"PrometheusRouteMetricsService is initialized through the app middleware. 'app' must be defined.",
		);

		const gauge = new promClient.Gauge({
			name: `${this.config.prefix}last_activity`,
			help: 'last instance activity (backend request) in Unix time (seconds).',
		});

		gauge.set(DateTime.now().toUnixInteger());
		this.registerMiddleware(app, gauge);
	}

	private registerMiddleware(app: express.Application, gauge: Gauge) {
		const metricsMiddleware = promBundle({
			autoregister: false,
			includeUp: false,
			includePath: this.config.includeApiPathLabel,
			includeMethod: this.config.includeApiMethodLabel,
			includeStatusCode: this.config.includeApiStatusCodeLabel,
			httpDurationMetricName: `${this.config.prefix}http_request_duration_seconds`,
		});

		// Resolve paths through PathResolvingService so metrics also cover
		// deployments hosted under a custom base path
		const basePath = this.pathResolvingService.getBasePath();
		const apiPath = basePath === '/' ? '/api/' : `${basePath}/api/`;

		app.use(
			[
				apiPath,
				`${this.pathResolvingService.resolveRestEndpoint()}/`,
				`${this.pathResolvingService.resolveWebhookEndpoint()}/`,
				`${this.pathResolvingService.resolveWebhookWaitingEndpoint()}/`,
				`${this.pathResolvingService.resolveWebhookTestEndpoint()}/`,
				`${this.pathResolvingService.resolveFormEndpoint()}/`,
				`${this.pathResolvingService.resolveFormWaitingEndpoint()}/`,
				`${this.pathResolvingService.resolveFormTestEndpoint()}/`,
			],
			async (req, res, next) => {
				gauge.set(DateTime.now().toUnixInteger());
				await metricsMiddleware(req, res, next);
			},
		);
	}
}
