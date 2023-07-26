import { Container } from 'typedi';
import { readFile } from 'fs/promises';
import type { Server } from 'http';
import type { Url } from 'url';
import express from 'express';
import bodyParser from 'body-parser';
import bodyParserXml from 'body-parser-xml';
import compression from 'compression';
import parseUrl from 'parseurl';
import type { WebhookHttpMethod } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';
import config from '@/config';
import { N8N_VERSION, inDevelopment } from '@/constants';
import { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
import * as Db from '@/Db';
import type { IExternalHooksClass } from '@/Interfaces';
import { ExternalHooks } from '@/ExternalHooks';
import {
	send,
	sendErrorResponse,
	sendSuccessResponse,
	ServiceUnavailableError,
} from '@/ResponseHelper';
import { corsMiddleware } from '@/middlewares';
import { TestWebhooks } from '@/TestWebhooks';
import { WaitingWebhooks } from '@/WaitingWebhooks';
import { WEBHOOK_METHODS } from '@/WebhookHelpers';
import { eventBus } from '@/eventbus';
import type { AbstractEventMessageOptions } from '@/eventbus/EventMessageClasses/AbstractEventMessageOptions';
import { getEventMessageObjectByType } from '@/eventbus/EventMessageClasses/Helpers';
import type { RedisServiceWorkerResponseObject } from '@/services/redis/RedisServiceCommands';
import {
	EVENT_BUS_REDIS_CHANNEL,
	WORKER_RESPONSE_REDIS_CHANNEL,
} from '@/services/redis/RedisServiceHelper';
import { RedisService } from './services/redis.service';

const emptyBuffer = Buffer.alloc(0);

export abstract class AbstractServer {
	protected server: Server;

	protected app: express.Application;

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

	abstract configure(): Promise<void>;

	constructor() {
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

	private async setupCommonMiddlewares() {
		const { app } = this;

		// Compress the response data
		app.use(compression());

		// Make sure that each request has the "parsedUrl" parameter
		app.use((req, res, next) => {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			req.parsedUrl = parseUrl(req)!;
			req.rawBody = emptyBuffer;
			next();
		});

		const payloadSizeMax = config.getEnv('endpoints.payloadSizeMax');

		// Support application/json type post data
		app.use(
			bodyParser.json({
				limit: `${payloadSizeMax}mb`,
				verify: (req, res, buf) => {
					req.rawBody = buf;
				},
			}),
		);

		// Support application/xml type post data
		bodyParserXml(bodyParser);
		app.use(
			bodyParser.xml({
				limit: `${payloadSizeMax}mb`,
				xmlParseOptions: {
					normalize: true, // Trim whitespace inside text nodes
					normalizeTags: true, // Transform tags to lowercase
					explicitArray: false, // Only put properties in array if length > 1
				},
				verify: (req, res, buf) => {
					req.rawBody = buf;
				},
			}),
		);

		app.use(
			bodyParser.text({
				limit: `${payloadSizeMax}mb`,
				verify: (req, res, buf) => {
					req.rawBody = buf;
				},
			}),
		);

		// support application/x-www-form-urlencoded post data
		app.use(
			bodyParser.urlencoded({
				limit: `${payloadSizeMax}mb`,
				extended: false,
				verify: (req, res, buf) => {
					req.rawBody = buf;
				},
			}),
		);
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

	// ----------------------------------------
	// Regular Webhooks
	// ----------------------------------------
	protected setupWebhookEndpoint() {
		const endpoint = this.endpointWebhook;
		const activeWorkflowRunner = this.activeWorkflowRunner;

		// Register all webhook requests
		this.app.all(`/${endpoint}/*`, async (req, res) => {
			// Cut away the "/webhook/" to get the registered part of the url
			const requestUrl = req.parsedUrl.pathname?.slice(endpoint.length + 2) ?? '';

			const method = req.method.toUpperCase() as WebhookHttpMethod;
			if (method === 'OPTIONS') {
				let allowedMethods: string[];
				try {
					allowedMethods = await activeWorkflowRunner.getWebhookMethods(requestUrl);
					allowedMethods.push('OPTIONS');

					// Add custom "Allow" header to satisfy OPTIONS response.
					res.append('Allow', allowedMethods);
				} catch (error) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
					sendErrorResponse(res, error);
					return;
				}

				res.header('Access-Control-Allow-Origin', '*');

				sendSuccessResponse(res, {}, true, 204);
				return;
			}

			if (!WEBHOOK_METHODS.includes(method)) {
				sendErrorResponse(res, new Error(`The method ${method} is not supported.`));
				return;
			}

			let response;
			try {
				response = await activeWorkflowRunner.executeWebhook(method, requestUrl, req, res);
			} catch (error) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				sendErrorResponse(res, error);
				return;
			}

			if (response.noWebhookResponse === true) {
				// Nothing else to do as the response got already sent
				return;
			}

			sendSuccessResponse(res, response.data, true, response.responseCode, response.headers);
		});
	}

	// ----------------------------------------
	// Waiting Webhooks
	// ----------------------------------------
	protected setupWaitingWebhookEndpoint() {
		const endpoint = this.endpointWebhookWaiting;
		const waitingWebhooks = Container.get(WaitingWebhooks);

		// Register all webhook-waiting requests
		this.app.all(`/${endpoint}/*`, async (req, res) => {
			// Cut away the "/webhook-waiting/" to get the registered part of the url
			const requestUrl = req.parsedUrl.pathname!.slice(endpoint.length + 2);

			const method = req.method.toUpperCase() as WebhookHttpMethod;

			if (!WEBHOOK_METHODS.includes(method)) {
				sendErrorResponse(res, new Error(`The method ${method} is not supported.`));
				return;
			}

			let response;
			try {
				response = await waitingWebhooks.executeWebhook(method, requestUrl, req, res);
			} catch (error) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				sendErrorResponse(res, error);
				return;
			}

			if (response.noWebhookResponse === true) {
				// Nothing else to do as the response got already sent
				return;
			}

			sendSuccessResponse(res, response.data, true, response.responseCode, response.headers);
		});
	}

	// ----------------------------------------
	// Testing Webhooks
	// ----------------------------------------
	protected setupTestWebhookEndpoint() {
		const endpoint = this.endpointWebhookTest;
		const testWebhooks = Container.get(TestWebhooks);

		// Register all test webhook requests (for testing via the UI)
		this.app.all(`/${endpoint}/*`, async (req, res) => {
			// Cut away the "/webhook-test/" to get the registered part of the url
			const requestUrl = req.parsedUrl.pathname!.slice(endpoint.length + 2);

			const method = req.method.toUpperCase() as WebhookHttpMethod;

			if (method === 'OPTIONS') {
				let allowedMethods: string[];
				try {
					allowedMethods = await testWebhooks.getWebhookMethods(requestUrl);
					allowedMethods.push('OPTIONS');

					// Add custom "Allow" header to satisfy OPTIONS response.
					res.append('Allow', allowedMethods);
				} catch (error) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
					sendErrorResponse(res, error);
					return;
				}

				res.header('Access-Control-Allow-Origin', '*');

				sendSuccessResponse(res, {}, true, 204);
				return;
			}

			if (!WEBHOOK_METHODS.includes(method)) {
				sendErrorResponse(res, new Error(`The method ${method} is not supported.`));
				return;
			}

			let response;
			try {
				response = await testWebhooks.callTestWebhook(method, requestUrl, req, res);
			} catch (error) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				sendErrorResponse(res, error);
				return;
			}

			if (response.noWebhookResponse === true) {
				// Nothing else to do as the response got already sent
				return;
			}

			sendSuccessResponse(res, response.data, true, response.responseCode, response.headers);
		});

		// Removes a test webhook
		// TODO UM: check if this needs validation with user management.
		this.app.delete(
			`/${this.restEndpoint}/test-webhook/:id`,
			send(async (req) => testWebhooks.cancelTestWebhook(req.params.id)),
		);
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
		await this.setupErrorHandlers();
		this.setupPushServer();
		await this.setupCommonMiddlewares();
		if (inDevelopment) {
			this.setupDevMiddlewares();
		}

		await this.configure();
		console.log(`Version: ${N8N_VERSION}`);

		const defaultLocale = config.getEnv('defaultLocale');
		if (defaultLocale !== 'en') {
			console.log(`Locale: ${defaultLocale}`);
		}

		await this.externalHooks.run('n8n.ready', [this, config]);
	}
}

declare module 'http' {
	export interface IncomingMessage {
		parsedUrl: Url;
	}
}
