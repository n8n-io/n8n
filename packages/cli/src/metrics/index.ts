/* eslint-disable @typescript-eslint/no-use-before-define */
import config from '@/config';
import { N8N_VERSION } from '@/constants';
import * as ResponseHelper from '@/ResponseHelper';
import type express from 'express';
import promBundle from 'express-prom-bundle';
import promClient from 'prom-client';
import semverParse from 'semver/functions/parse';

export { promClient };

export function configureMetrics(app: express.Application) {
	if (!config.getEnv('endpoints.metrics.enable')) {
		return;
	}

	setupDefaultMetrics();
	setupN8nVersionMetric();
	setupApiMetrics(app);
	mountMetricsEndpoint(app);
}

function setupN8nVersionMetric() {
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

function setupDefaultMetrics() {
	if (config.getEnv('endpoints.metrics.includeDefaultMetrics')) {
		promClient.collectDefaultMetrics();
	}
}

function setupApiMetrics(app: express.Application) {
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

function mountMetricsEndpoint(app: express.Application) {
	app.get('/metrics', async (req: express.Request, res: express.Response) => {
		const response = await promClient.register.metrics();
		res.setHeader('Content-Type', promClient.register.contentType);
		ResponseHelper.sendSuccessResponse(res, response, true, 200);
	});
}
