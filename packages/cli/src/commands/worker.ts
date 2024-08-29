import { Container } from 'typedi';
import { Flags, type Config } from '@oclif/core';
import express from 'express';
import http from 'http';
import { ApplicationError } from 'n8n-workflow';

import * as Db from '@/db';
import * as ResponseHelper from '@/response-helper';
import config from '@/config';
import type { ScalingService } from '@/scaling/scaling.service';
import { N8N_VERSION, inTest } from '@/constants';
import type { ICredentialsOverwrite } from '@/interfaces';
import { CredentialsOverwrites } from '@/credentials-overwrites';
import { rawBodyReader, bodyParser } from '@/middlewares';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import type { RedisServicePubSubSubscriber } from '@/services/redis/redis-service-pub-sub-subscriber';
import { EventMessageGeneric } from '@/eventbus/event-message-classes/event-message-generic';
import { OrchestrationHandlerWorkerService } from '@/services/orchestration/worker/orchestration.handler.worker.service';
import { OrchestrationWorkerService } from '@/services/orchestration/worker/orchestration.worker.service';
import { ServiceUnavailableError } from '@/errors/response-errors/service-unavailable.error';
import { BaseCommand } from './base-command';
import { JobProcessor } from '@/scaling/job-processor';
import { LogStreamingEventRelay } from '@/events/log-streaming-event-relay';

export class Worker extends BaseCommand {
	static description = '\nStarts a n8n worker';

	static examples = ['$ n8n worker --concurrency=5'];

	static flags = {
		help: Flags.help({ char: 'h' }),
		concurrency: Flags.integer({
			default: 10,
			description: 'How many jobs can run in parallel.',
		}),
	};

	/**
	 * How many jobs this worker may run concurrently.
	 *
	 * Taken from env var `N8N_CONCURRENCY_PRODUCTION_LIMIT` if set to a value
	 * other than -1, else taken from `--concurrency` flag.
	 */
	concurrency: number;

	scalingService: ScalingService;

	jobProcessor: JobProcessor;

	redisSubscriber: RedisServicePubSubSubscriber;

	override needsCommunityPackages = true;

	/**
	 * Stop n8n in a graceful way.
	 * Make for example sure that all the webhooks from third party services
	 * get removed.
	 */
	async stopProcess() {
		this.logger.info('Stopping n8n...');

		try {
			await this.externalHooks?.run('n8n.stop', []);
		} catch (error) {
			await this.exitWithCrash('There was an error shutting down n8n.', error);
		}

		await this.exitSuccessFully();
	}

	constructor(argv: string[], cmdConfig: Config) {
		super(argv, cmdConfig);

		if (!process.env.N8N_ENCRYPTION_KEY) {
			throw new ApplicationError(
				'Missing encryption key. Worker started without the required N8N_ENCRYPTION_KEY env var. More information: https://docs.n8n.io/hosting/configuration/configuration-examples/encryption-key/',
			);
		}

		this.setInstanceType('worker');
		this.setInstanceQueueModeId();
	}

	async init() {
		const { QUEUE_WORKER_TIMEOUT } = process.env;
		if (QUEUE_WORKER_TIMEOUT) {
			this.gracefulShutdownTimeoutInS =
				parseInt(QUEUE_WORKER_TIMEOUT, 10) || this.globalConfig.queue.bull.gracefulShutdownTimeout;
			this.logger.warn(
				'QUEUE_WORKER_TIMEOUT has been deprecated. Rename it to N8N_GRACEFUL_SHUTDOWN_TIMEOUT.',
			);
		}
		await this.initCrashJournal();

		this.logger.debug('Starting n8n worker...');
		this.logger.debug(`Queue mode id: ${this.queueModeId}`);

		await this.setConcurrency();
		await super.init();

		await this.initLicense();
		this.logger.debug('License init complete');
		await this.initBinaryDataService();
		this.logger.debug('Binary data service init complete');
		await this.initExternalHooks();
		this.logger.debug('External hooks init complete');
		await this.initExternalSecrets();
		this.logger.debug('External secrets init complete');
		await this.initEventBus();
		this.logger.debug('Event bus init complete');
		await this.initScalingService();
		await this.initOrchestration();
		this.logger.debug('Orchestration init complete');

		await Container.get(MessageEventBus).send(
			new EventMessageGeneric({
				eventName: 'n8n.worker.started',
				payload: {
					workerId: this.queueModeId,
				},
			}),
		);
	}

	async initEventBus() {
		await Container.get(MessageEventBus).initialize({
			workerId: this.queueModeId,
		});
		Container.get(LogStreamingEventRelay).init();
	}

	/**
	 * Initializes the redis connection
	 * A publishing connection to redis is created to publish events to the event log
	 * A subscription connection to redis is created to subscribe to commands from the main process
	 * The subscription connection adds a handler to handle the command messages
	 */
	async initOrchestration() {
		await Container.get(OrchestrationWorkerService).init();
		await Container.get(OrchestrationHandlerWorkerService).initWithOptions({
			queueModeId: this.queueModeId,
			redisPublisher: Container.get(OrchestrationWorkerService).redisPublisher,
			getRunningJobIds: () => this.jobProcessor.getRunningJobIds(),
			getRunningJobsSummary: () => this.jobProcessor.getRunningJobsSummary(),
		});
	}

	async setConcurrency() {
		const { flags } = await this.parse(Worker);

		const envConcurrency = config.getEnv('executions.concurrency.productionLimit');

		this.concurrency = envConcurrency !== -1 ? envConcurrency : flags.concurrency;
	}

	async initScalingService() {
		const { ScalingService } = await import('@/scaling/scaling.service');
		this.scalingService = Container.get(ScalingService);

		await this.scalingService.setupQueue();

		this.scalingService.setupWorker(this.concurrency);

		this.jobProcessor = Container.get(JobProcessor);
	}

	async setupHealthMonitor() {
		const { port } = this.globalConfig.queue.health;

		const app = express();
		app.disable('x-powered-by');

		const server = http.createServer(app);

		app.get(
			'/healthz',

			async (_req: express.Request, res: express.Response) => {
				this.logger.debug('Health check started!');

				const connection = Db.getConnection();

				try {
					if (!connection.isInitialized) {
						// Connection is not active
						throw new ApplicationError('No active database connection');
					}
					// DB ping
					await connection.query('SELECT 1');
				} catch (e) {
					this.logger.error('No Database connection!', e as Error);
					const error = new ServiceUnavailableError('No Database connection!');
					return ResponseHelper.sendErrorResponse(res, error);
				}

				// Just to be complete, generally will the worker stop automatically
				// if it loses the connection to redis
				try {
					// Redis ping
					await this.scalingService.pingQueue();
				} catch (e) {
					this.logger.error('No Redis connection!', e as Error);
					const error = new ServiceUnavailableError('No Redis connection!');
					return ResponseHelper.sendErrorResponse(res, error);
				}

				// Everything fine
				const responseData = {
					status: 'ok',
				};

				this.logger.debug('Health check completed successfully!');

				ResponseHelper.sendSuccessResponse(res, responseData, true, 200);
			},
		);

		let presetCredentialsLoaded = false;

		const endpointPresetCredentials = this.globalConfig.credentials.overwrite.endpoint;
		if (endpointPresetCredentials !== '') {
			// POST endpoint to set preset credentials
			app.post(
				`/${endpointPresetCredentials}`,
				rawBodyReader,
				bodyParser,
				async (req: express.Request, res: express.Response) => {
					if (!presetCredentialsLoaded) {
						const body = req.body as ICredentialsOverwrite;

						if (req.contentType !== 'application/json') {
							ResponseHelper.sendErrorResponse(
								res,
								new Error(
									'Body must be a valid JSON, make sure the content-type is application/json',
								),
							);
							return;
						}

						Container.get(CredentialsOverwrites).setData(body);
						presetCredentialsLoaded = true;
						ResponseHelper.sendSuccessResponse(res, { success: true }, true, 200);
					} else {
						ResponseHelper.sendErrorResponse(res, new Error('Preset credentials can be set once'));
					}
				},
			);
		}

		server.on('error', (error: Error & { code: string }) => {
			if (error.code === 'EADDRINUSE') {
				this.logger.error(
					`n8n's port ${port} is already in use. Do you have the n8n main process running on that port?`,
				);
				process.exit(1);
			}
		});

		await new Promise<void>((resolve) => server.listen(port, () => resolve()));
		await this.externalHooks?.run('worker.ready');
		this.logger.info(`\nn8n worker health check via, port ${port}`);
	}

	async run() {
		this.logger.info('\nn8n worker is now ready');
		this.logger.info(` * Version: ${N8N_VERSION}`);
		this.logger.info(` * Concurrency: ${this.concurrency}`);
		this.logger.info('');

		if (this.globalConfig.queue.health.active) {
			await this.setupHealthMonitor();
		}

		if (!inTest && process.stdout.isTTY) {
			process.stdin.setRawMode(true);
			process.stdin.resume();
			process.stdin.setEncoding('utf8');

			process.stdin.on('data', (key: string) => {
				if (key.charCodeAt(0) === 3) process.kill(process.pid, 'SIGINT'); // ctrl+c
			});
		}

		// Make sure that the process does not close
		if (!inTest) await new Promise(() => {});
	}

	async catch(error: Error) {
		await this.exitWithCrash('Worker exiting due to an error.', error);
	}
}
