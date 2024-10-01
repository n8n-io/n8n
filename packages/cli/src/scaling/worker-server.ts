import { GlobalConfig } from '@n8n/config';
import type { Application } from 'express';
import express from 'express';
import { InstanceSettings } from 'n8n-core';
import { ensureError } from 'n8n-workflow';
import { strict as assert } from 'node:assert';
import http from 'node:http';
import type { Server } from 'node:http';
import { Service } from 'typedi';

import { CredentialsOverwrites } from '@/credentials-overwrites';
import * as Db from '@/db';
import { CredentialsOverwritesAlreadySetError } from '@/errors/credentials-overwrites-already-set.error';
import { NonJsonBodyError } from '@/errors/non-json-body.error';
import { PortTakenError } from '@/errors/port-taken.error';
import { ServiceUnavailableError } from '@/errors/response-errors/service-unavailable.error';
import { ExternalHooks } from '@/external-hooks';
import type { ICredentialsOverwrite } from '@/interfaces';
import { Logger } from '@/logging/logger.service';
import { PrometheusMetricsService } from '@/metrics/prometheus-metrics.service';
import { rawBodyReader, bodyParser } from '@/middlewares';
import * as ResponseHelper from '@/response-helper';
import { ScalingService } from '@/scaling/scaling.service';

export type WorkerServerEndpointsConfig = {
	/** Whether the `/healthz` endpoint is enabled. */
	health: boolean;

	/** Whether the [credentials overwrites endpoint](https://docs.n8n.io/embed/configuration/#credential-overwrites) is enabled. */
	overwrites: boolean;

	/** Whether the `/metrics` endpoint is enabled. */
	metrics: boolean;
};

/**
 * Responsible for handling HTTP requests sent to a worker.
 */
@Service()
export class WorkerServer {
	private readonly port: number;

	private readonly server: Server;

	private readonly app: Application;

	private endpointsConfig: WorkerServerEndpointsConfig;

	private overwritesLoaded = false;

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly logger: Logger,
		private readonly scalingService: ScalingService,
		private readonly credentialsOverwrites: CredentialsOverwrites,
		private readonly externalHooks: ExternalHooks,
		private readonly instanceSettings: InstanceSettings,
		private readonly prometheusMetricsService: PrometheusMetricsService,
	) {
		assert(this.instanceSettings.instanceType === 'worker');

		this.app = express();

		this.app.disable('x-powered-by');

		this.server = http.createServer(this.app);

		this.port = this.globalConfig.queue.health.port;

		this.server.on('error', (error: NodeJS.ErrnoException) => {
			if (error.code === 'EADDRINUSE') throw new PortTakenError(this.port);
		});
	}

	async init(endpointsConfig: WorkerServerEndpointsConfig) {
		assert(Object.values(endpointsConfig).some((e) => e));

		this.endpointsConfig = endpointsConfig;

		await this.mountEndpoints();

		await new Promise<void>((resolve) => this.server.listen(this.port, resolve));

		await this.externalHooks.run('worker.ready');

		this.logger.info(`\nn8n worker server listening on port ${this.port}`);
	}

	private async mountEndpoints() {
		if (this.endpointsConfig.health) {
			this.app.get('/healthz', async (req, res) => await this.healthcheck(req, res));
		}

		if (this.endpointsConfig.overwrites) {
			const { endpoint } = this.globalConfig.credentials.overwrite;

			this.app.post(`/${endpoint}`, rawBodyReader, bodyParser, (req, res) =>
				this.handleOverwrites(req, res),
			);
		}

		if (this.endpointsConfig.metrics) {
			await this.prometheusMetricsService.init(this.app);
		}
	}

	private async healthcheck(_req: express.Request, res: express.Response) {
		this.logger.debug('[WorkerServer] Health check started');

		try {
			await Db.getConnection().query('SELECT 1');
		} catch (value) {
			this.logger.error('[WorkerServer] No database connection', ensureError(value));

			return ResponseHelper.sendErrorResponse(
				res,
				new ServiceUnavailableError('No database connection'),
			);
		}

		try {
			await this.scalingService.pingQueue();
		} catch (value) {
			this.logger.error('[WorkerServer] No Redis connection', ensureError(value));

			return ResponseHelper.sendErrorResponse(
				res,
				new ServiceUnavailableError('No Redis connection'),
			);
		}

		this.logger.debug('[WorkerServer] Health check succeeded');

		ResponseHelper.sendSuccessResponse(res, { status: 'ok' }, true, 200);
	}

	private handleOverwrites(
		req: express.Request<{}, {}, ICredentialsOverwrite>,
		res: express.Response,
	) {
		if (this.overwritesLoaded) {
			ResponseHelper.sendErrorResponse(res, new CredentialsOverwritesAlreadySetError());
			return;
		}

		if (req.contentType !== 'application/json') {
			ResponseHelper.sendErrorResponse(res, new NonJsonBodyError());
			return;
		}

		this.credentialsOverwrites.setData(req.body);

		this.overwritesLoaded = true;

		ResponseHelper.sendSuccessResponse(res, { success: true }, true, 200);
	}
}
