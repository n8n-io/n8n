import { Container } from 'typedi';
import { readFile } from 'fs/promises';
import type { Server } from 'http';
import express from 'express';
import compression from 'compression';
import config from '@/config';
import { N8N_VERSION, inDevelopment, inTest } from '@/constants';
import { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
import * as Db from '@/Db';
import { N8nInstanceType } from '@/Interfaces';
import type { IExternalHooksClass } from '@/Interfaces';
import { ExternalHooks } from '@/ExternalHooks';
import { send, sendErrorResponse, ServiceUnavailableError } from '@/ResponseHelper';
import { rawBodyReader, bodyParser, corsMiddleware } from '@/middlewares';
import { TestWebhooks } from '@/TestWebhooks';
import { WaitingWebhooks } from '@/WaitingWebhooks';
import { webhookRequestHandler } from '@/WebhookHelpers';
import { RedisService } from '@/services/redis.service';
import { jsonParse } from 'n8n-workflow';
import { eventBus } from './eventbus';
import type { AbstractEventMessageOptions } from './eventbus/EventMessageClasses/AbstractEventMessageOptions';
import { getEventMessageObjectByType } from './eventbus/EventMessageClasses/Helpers';
import type { RedisServiceWorkerResponseObject } from './services/redis/RedisServiceCommands';
import {
	EVENT_BUS_REDIS_CHANNEL,
	WORKER_RESPONSE_REDIS_CHANNEL,
} from './services/redis/RedisServiceHelper';
import { generateHostInstanceId } from './databases/utils/generators';

export abstract class AbstractServer {
	protected server: Server;

	readonly app: express.Application;

	protected externalHooks: IExternalHooksClass;

	protected activeWorkflowRunner: ActiveWorkflowRunner;

	protected protocol: string;

	protected sslKey: string;

	protected sslCert: string;

	protected timezone: string;

	protected restEndpoint: string;

	protected endpointWebhook: string;

	protected endpointWebhookTest: string;

	protected endpointWebhookWaiting: string;

	protected instanceId = '';

	protected webhooksEnabled = true;

	protected testWebhooksEnabled = false;

	readonly uniqueInstanceId: string;

	constructor(instanceType: N8nInstanceType = 'main') {
		this.app = express();
		this.app.disable('x-powered-by');

		this.protocol = config.getEnv('protocol');
		this.sslKey = config.getEnv('ssl_key');
		this.sslCert = config.getEnv('ssl_cert');

		this.timezone = config.getEnv('generic.timezone');

		this.restEndpoint = config.getEnv('endpoints.rest');
		this.endpointWebhook = config.getEnv('endpoints.webhook');
		this.endpointWebhookTest = config.getEnv('endpoints.webhookTest');
		this.endpointWebhookWaiting = config.getEnv('endpoints.webhookWaiting');

		this.uniqueInstanceId = generateHostInstanceId(instanceType);
	}

	async configure(): Promise<void> {
		// Additional configuration in derived classes
	}

	private async setupErrorHandlers() {
		const { app } = this;

		// Augment errors sent to Sentry
		const {
			Handlers: { requestHandler, errorHandler },
		} = await import('@sentry/node');
		app.use(requestHandler());
		app.use(errorHandler());
	}

	private setupCommonMiddlewares() {
		// Compress the response data
		this.app.use(compression());

		// Read incoming data into `rawBody`
		this.app.use(rawBodyReader);
	}

	private setupDevMiddlewares() {
		this.app.use(corsMiddleware);
	}

	protected setupPushServer() {}

	private async setupHealthCheck() {
		// health check should not care about DB connections
		this.app.get('/healthz', async (req, res) => {
			res.send({ status: 'ok' });
		});

		const { connectionState } = Db;
		this.app.use((req, res, next) => {
			if (connectionState.connected) {
				if (connectionState.migrated) next();
				else res.send('n8n is starting up. Please wait');
			} else sendErrorResponse(res, new ServiceUnavailableError('Database is not ready!'));
		});

		if (config.getEnv('executions.mode') === 'queue') {
			await this.setupRedis();
		}
	}

	// This connection is going to be our heartbeat
	// IORedis automatically pings redis and tries to reconnect
	// We will be using a retryStrategy to control how and when to exit.
	// We are also subscribing to the event log channel to receive events from workers
	private async setupRedis() {
		const redisService = Container.get(RedisService);
		const redisSubscriber = await redisService.getPubSubSubscriber();

		// TODO: these are all proof of concept implementations for the moment
		// until worker communication is implemented
		// #region proof of concept
		await redisSubscriber.subscribeToEventLog();
		await redisSubscriber.subscribeToWorkerResponseChannel();
		redisSubscriber.addMessageHandler(
			'AbstractServerReceiver',
			async (channel: string, message: string) => {
				// TODO: this is a proof of concept implementation to forward events to the main instance's event bus
				// Events are arriving through a pub/sub channel and are forwarded to the eventBus
				// In the future, a stream should probably replace this implementation entirely
				if (channel === EVENT_BUS_REDIS_CHANNEL) {
					const eventData = jsonParse<AbstractEventMessageOptions>(message);
					if (eventData) {
						const eventMessage = getEventMessageObjectByType(eventData);
						if (eventMessage) {
							await eventBus.send(eventMessage);
						}
					}
				} else if (channel === WORKER_RESPONSE_REDIS_CHANNEL) {
					// The back channel from the workers as a pub/sub channel
					const workerResponse = jsonParse<RedisServiceWorkerResponseObject>(message);
					if (workerResponse) {
						// TODO: Handle worker response
						console.log('Received worker response', workerResponse);
					}
				}
			},
		);
		// TODO: Leave comments for now as implementation example
		// const redisStreamListener = await redisService.getStreamConsumer();
		// void redisStreamListener.listenToStream('teststream');
		// redisStreamListener.addMessageHandler(
		// 	'MessageLogger',
		// 	async (stream: string, id: string, message: string[]) => {
		// 		// TODO: this is a proof of concept implementation of a stream consumer
		// 		switch (stream) {
		// 			case EVENT_BUS_REDIS_STREAM:
		// 			case COMMAND_REDIS_STREAM:
		// 			case WORKER_RESPONSE_REDIS_STREAM:
		// 			default:
		// 				LoggerProxy.debug(
		// 					`Received message from stream ${stream} with id ${id} and message ${message.join(
		// 						',',
		// 					)}`,
		// 				);
		// 				break;
		// 		}
		// 	},
		// );

		// const redisListReceiver = await redisService.getListReceiver();
		// await redisListReceiver.init();

		// setInterval(async () => {
		// 	await redisListReceiver.popLatestWorkerResponse();
		// }, 1000);
		// #endregion
	}

	async init(): Promise<void> {
		const { app, protocol, sslKey, sslCert } = this;

		if (protocol === 'https' && sslKey && sslCert) {
			const https = await import('https');
			this.server = https.createServer(
				{
					key: await readFile(this.sslKey, 'utf8'),
					cert: await readFile(this.sslCert, 'utf8'),
				},
				app,
			);
		} else {
			const http = await import('http');
			this.server = http.createServer(app);
		}

		const PORT = config.getEnv('port');
		const ADDRESS = config.getEnv('listen_address');

		this.server.on('error', (error: Error & { code: string }) => {
			if (error.code === 'EADDRINUSE') {
				console.log(
					`n8n's port ${PORT} is already in use. Do you have another instance of n8n running already?`,
				);
				process.exit(1);
			}
		});

		await new Promise<void>((resolve) => this.server.listen(PORT, ADDRESS, () => resolve()));

		this.externalHooks = Container.get(ExternalHooks);
		this.activeWorkflowRunner = Container.get(ActiveWorkflowRunner);

		await this.setupHealthCheck();

		console.log(`n8n ready on ${ADDRESS}, port ${PORT}`);
	}

	async start(): Promise<void> {
		if (!inTest) {
			await this.setupErrorHandlers();
			this.setupPushServer();
		}

		this.setupCommonMiddlewares();

		// Setup webhook handlers before bodyParser, to let the Webhook node handle binary data in requests
		if (this.webhooksEnabled) {
			// Register a handler for active webhooks
			this.app.all(
				`/${this.endpointWebhook}/:path(*)`,
				webhookRequestHandler(Container.get(ActiveWorkflowRunner)),
			);

			// Register a handler for waiting webhooks
			this.app.all(
				`/${this.endpointWebhookWaiting}/:path/:suffix?`,
				webhookRequestHandler(Container.get(WaitingWebhooks)),
			);
		}

		if (this.testWebhooksEnabled) {
			const testWebhooks = Container.get(TestWebhooks);

			// Register a handler for test webhooks
			this.app.all(`/${this.endpointWebhookTest}/:path(*)`, webhookRequestHandler(testWebhooks));

			// Removes a test webhook
			// TODO UM: check if this needs validation with user management.
			this.app.delete(
				`/${this.restEndpoint}/test-webhook/:id`,
				send(async (req) => testWebhooks.cancelTestWebhook(req.params.id)),
			);
		}

		if (inDevelopment) {
			this.setupDevMiddlewares();
		}

		// Setup body parsing middleware after the webhook handlers are setup
		this.app.use(bodyParser);

		await this.configure();

		if (!inTest) {
			console.log(`Version: ${N8N_VERSION}`);

			const defaultLocale = config.getEnv('defaultLocale');
			if (defaultLocale !== 'en') {
				console.log(`Locale: ${defaultLocale}`);
			}

			await this.externalHooks.run('n8n.ready', [this, config]);
		}
	}
}
