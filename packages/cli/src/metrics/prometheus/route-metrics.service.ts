import { EndpointsConfig, PrometheusMetricsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type express from 'express';
import promBundle from 'express-prom-bundle';
import { DateTime } from 'luxon';
import { assert } from 'n8n-workflow';
import promClient, { Gauge } from 'prom-client';

import type { PrometheusMetricsCollector } from './base';

/**
 * Instruments Express routes with `express-prom-bundle` for HTTP request duration metrics,
 * and tracks last backend activity time via `n8n_last_activity` gauge.
 */
@Service()
export class PrometheusRouteMetricsService implements PrometheusMetricsCollector {
	constructor(
		private readonly config: PrometheusMetricsConfig,
		private readonly endpointsConfig: EndpointsConfig,
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

		app.use(
			[
				'/api/',
				`/${this.endpointsConfig.rest}/`,
				`/${this.endpointsConfig.webhook}/`,
				`/${this.endpointsConfig.webhookWaiting}/`,
				`/${this.endpointsConfig.webhookTest}/`,
				`/${this.endpointsConfig.form}/`,
				`/${this.endpointsConfig.formWaiting}/`,
				`/${this.endpointsConfig.formTest}/`,
			],
			async (req, res, next) => {
				gauge.set(DateTime.now().toUnixInteger());
				await metricsMiddleware(req, res, next);
			},
		);
	}
}
