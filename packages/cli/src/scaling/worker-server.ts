import { GlobalConfig } from '@n8n/config';
import express from 'express';
import { ApplicationError } from 'n8n-workflow';
import http from 'node:http';
import type { Server } from 'node:http';
import { Service } from 'typedi';

import { CredentialsOverwrites } from '@/credentials-overwrites';
import * as Db from '@/db';
import { CredentialsOverwritesAlreadySetError } from '@/errors/credentials-overwrites-already-set.error';
import { NonJsonBodyError } from '@/errors/non-json-body.error';
import { ServiceUnavailableError } from '@/errors/response-errors/service-unavailable.error';
import { ExternalHooks } from '@/external-hooks';
import type { ICredentialsOverwrite } from '@/interfaces';
import { Logger } from '@/logger';
import { rawBodyReader, bodyParser } from '@/middlewares';
import * as ResponseHelper from '@/response-helper';
import { ScalingService } from '@/scaling/scaling.service';

@Service()
export class WorkerServer {
	private port: number;

	private app: express.Application;

	private server: Server;

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly logger: Logger,
		private readonly scalingService: ScalingService,
		private readonly credentialsOverwrites: CredentialsOverwrites,
		private readonly externalHooks: ExternalHooks,
	) {
		this.app = express();
		this.app.disable('x-powered-by');
		this.server = http.createServer(this.app);

		this.setupListeners();

		this.port = this.globalConfig.queue.health.port;

		this.setupHealthEndpoints();
		this.setupCredentialsOverwritesEndpoint();
	}

	async init() {
		await new Promise<void>((resolve) => this.server.listen(this.port, () => resolve()));
		await this.externalHooks?.run('worker.ready');

		this.logger.info(`\nn8n worker health check via port ${this.port}`);
	}

	private setupListeners() {
		this.server.on('error', (error: Error & { code: string }) => {
			if (error.code === 'EADDRINUSE') {
				this.logger.error(
					`n8n's port ${this.port} is already in use. Do you have the n8n main process running on that port?`,
				);
				process.exit(1);
			}
		});
	}

	private setupHealthEndpoints() {
		this.app.get('/healthz/readiness', async (_req, res) => {
			return Db.connectionState.connected && Db.connectionState.migrated
				? res.status(200).send({ status: 'ok' })
				: res.status(503).send({ status: 'error' });
		});

		this.app.get('/healthz', async (_req: express.Request, res: express.Response) => {
			this.logger.debug('Health check started!');

			const connection = Db.getConnection();

			try {
				if (!connection.isInitialized) throw new ApplicationError('No active database connection');
				await connection.query('SELECT 1');
			} catch (rawError) {
				this.logger.error('No Database connection!', rawError as Error);
				const error = new ServiceUnavailableError('No database connection');
				return ResponseHelper.sendErrorResponse(res, error);
			}

			try {
				await this.scalingService.pingQueue();
			} catch (rawError) {
				this.logger.error('No Redis connection!', rawError as Error);
				const error = new ServiceUnavailableError('No Redis connection');
				return ResponseHelper.sendErrorResponse(res, error);
			}

			this.logger.debug('[WorkerServer] Health check completed successfully');

			ResponseHelper.sendSuccessResponse(res, { status: 'ok' }, true, 200);
		});
	}

	private setupCredentialsOverwritesEndpoint() {
		let credentialsOverwritesLoaded = false;

		const { endpoint } = this.globalConfig.credentials.overwrite;

		if (endpoint === '') return;

		this.app.post(
			`/${endpoint}`,
			rawBodyReader,
			bodyParser,
			async (req: express.Request<{}, {}, ICredentialsOverwrite>, res: express.Response) => {
				if (credentialsOverwritesLoaded) {
					ResponseHelper.sendErrorResponse(res, new CredentialsOverwritesAlreadySetError());
					return;
				}

				if (req.contentType !== 'application/json') {
					ResponseHelper.sendErrorResponse(res, new NonJsonBodyError());
					return;
				}

				this.credentialsOverwrites.setData(req.body);

				credentialsOverwritesLoaded = true;

				ResponseHelper.sendSuccessResponse(res, { success: true }, true, 200);
			},
		);
	}
}
