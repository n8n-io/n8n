import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { DbConnection } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Application } from 'express';
import express from 'express';
import { InstanceSettings } from 'n8n-core';
import { strict as assert } from 'node:assert';
import http from 'node:http';
import type { Server } from 'node:http';

import { CredentialsOverwrites } from '@/credentials-overwrites';
import { CredentialsOverwritesAlreadySetError } from '@/errors/credentials-overwrites-already-set.error';
import { NonJsonBodyError } from '@/errors/non-json-body.error';
import { ExternalHooks } from '@/external-hooks';
import type { ICredentialsOverwrite } from '@/interfaces';
import { PrometheusMetricsService } from '@/metrics/prometheus-metrics.service';
import { rawBodyReader, bodyParser } from '@/middlewares';
import * as ResponseHelper from '@/response-helper';
import { RedisClientService } from '@/services/redis-client.service';

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

	private readonly address: string;

	private readonly server: Server;

	private readonly app: Application;

	private endpointsConfig: WorkerServerEndpointsConfig;

	private overwritesLoaded = false;

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly logger: Logger,
		private readonly dbConnection: DbConnection,
		private readonly credentialsOverwrites: CredentialsOverwrites,
		private readonly externalHooks: ExternalHooks,
		private readonly instanceSettings: InstanceSettings,
		private readonly prometheusMetricsService: PrometheusMetricsService,
		private readonly redisClientService: RedisClientService,
	) {
		assert(this.instanceSettings.instanceType === 'worker');

		this.logger = this.logger.scoped('scaling');

		this.app = express();

		this.app.disable('x-powered-by');

		this.server = http.createServer(this.app);

		this.port = this.globalConfig.queue.health.port;
		this.address = this.globalConfig.queue.health.address;

		this.server.on('error', (error: NodeJS.ErrnoException) => {
			if (error.code === 'EADDRINUSE') {
				this.logger.error(
					`Port ${this.port} is already in use, possibly by the n8n main process server. Please set a different port for the worker server.`,
				);
				process.exit(1);
			}
		});
	}

	async init(endpointsConfig: WorkerServerEndpointsConfig) {
		assert(Object.values(endpointsConfig).some((e) => e));

		this.endpointsConfig = endpointsConfig;

		await this.mountEndpoints();

		this.logger.debug('Worker server initialized', {
			endpoints: Object.keys(this.endpointsConfig),
		});

		await new Promise<void>((resolve) => this.server.listen(this.port, this.address, resolve));

		await this.externalHooks.run('worker.ready');

		this.logger.info(`\nn8n worker server listening on port ${this.port}`);
	}

	private async mountEndpoints() {
		const { health, overwrites, metrics } = this.endpointsConfig;

		if (health) {
			this.app.get('/healthz', async (_, res) => {
				res.send({ status: 'ok' });
			});
			this.app.get('/healthz/readiness', async (_, res) => {
				await this.readiness(_, res);
			});
		}

		if (overwrites) {
			const { endpoint } = this.globalConfig.credentials.overwrite;

			this.app.post(`/${endpoint}`, rawBodyReader, bodyParser, (req, res) =>
				this.handleOverwrites(req, res),
			);
		}

		if (metrics) {
			await this.prometheusMetricsService.init(this.app);
		}
	}

	private async readiness(_req: express.Request, res: express.Response) {
		const { connectionState } = this.dbConnection;
		const isReady =
			connectionState.connected &&
			connectionState.migrated &&
			this.redisClientService.isConnected();

		return isReady
			? res.status(200).send({ status: 'ok' })
			: res.status(503).send({ status: 'error' });
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

		this.logger.debug('Worker loaded credentials overwrites');

		ResponseHelper.sendSuccessResponse(res, { success: true }, true, 200);
	}
}
