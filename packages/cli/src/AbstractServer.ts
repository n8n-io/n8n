import { readFile } from 'fs/promises';
import type { Server } from 'http';
import type { Url } from 'url';
import express from 'express';
import bodyParser from 'body-parser';
import bodyParserXml from 'body-parser-xml';
import compression from 'compression';
import parseUrl from 'parseurl';
import { getConnectionManager } from 'typeorm';
import type { RedisOptions } from 'ioredis';

import {
	ErrorReporterProxy as ErrorReporter,
	LoggerProxy as Logger,
	WebhookHttpMethod,
} from 'n8n-workflow';
import config from '@/config';
import { N8N_VERSION, inDevelopment } from '@/constants';
import * as ActiveWorkflowRunner from '@/ActiveWorkflowRunner';
import * as Db from '@/Db';
import type { IExternalHooksClass } from '@/Interfaces';
import { ExternalHooks } from '@/ExternalHooks';
import {
	send,
	sendErrorResponse,
	sendSuccessResponse,
	ServiceUnavailableError,
} from '@/ResponseHelper';
import { corsMiddleware } from '@/middlewares/cors';
import * as TestWebhooks from '@/TestWebhooks';
import { WaitingWebhooks } from '@/WaitingWebhooks';
import { WEBHOOK_METHODS } from '@/WebhookHelpers';

const emptyBuffer = Buffer.alloc(0);

export abstract class AbstractServer {
	protected app: express.Application;

	protected externalHooks: IExternalHooksClass;

	protected activeWorkflowRunner: ActiveWorkflowRunner.ActiveWorkflowRunner;

	protected protocol: string;

	protected sslKey: string;

	protected sslCert: string;

	protected timezone: string;

	protected restEndpoint: string;

	protected endpointWebhook: string;

	protected endpointWebhookTest: string;

	protected endpointWebhookWaiting: string;

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

		this.externalHooks = ExternalHooks();
		this.activeWorkflowRunner = ActiveWorkflowRunner.getInstance();
	}

	private async setupCommonMiddlewares() {
		const { app } = this;

		// Augment errors sent to Sentry
		const {
			Handlers: { requestHandler, errorHandler },
		} = await import('@sentry/node');
		app.use(requestHandler());
		app.use(errorHandler());

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

	private async setupHealthCheck() {
		this.app.use((req, res, next) => {
			if (!Db.isInitialized) {
				sendErrorResponse(res, new ServiceUnavailableError('Database is not ready!'));
			} else next();
		});

		// Does very basic health check
		this.app.get('/healthz', async (req, res) => {
			Logger.debug('Health check started!');

			const connection = getConnectionManager().get();

			try {
				if (!connection.isConnected) {
					// Connection is not active
					throw new ServiceUnavailableError('No active database connection!');
				}
				// DB ping
				await connection.query('SELECT 1');
			} catch (error) {
				ErrorReporter.error(error);
				Logger.error('No Database connection!');
				return sendErrorResponse(res, new ServiceUnavailableError('No Database connection!'));
			}

			Logger.debug('Health check completed successfully!');
			sendSuccessResponse(res, { status: 'ok' }, true, 200);
		});

		if (config.getEnv('executions.mode') === 'queue') {
			await this.setupRedisChecks();
		}
	}

	// This connection is going to be our heartbeat
	// IORedis automatically pings redis and tries to reconnect
	// We will be using a retryStrategy to control how and when to exit.
	private async setupRedisChecks() {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		const { default: Redis } = await import('ioredis');

		let lastTimer = 0;
		let cumulativeTimeout = 0;
		const { host, port, username, password, db }: RedisOptions = config.getEnv('queue.bull.redis');
		const redisConnectionTimeoutLimit = config.getEnv('queue.bull.redis.timeoutThreshold');

		const redis = new Redis({
			host,
			port,
			db,
			username,
			password,
			retryStrategy: (): number | null => {
				const now = Date.now();
				if (now - lastTimer > 30000) {
					// Means we had no timeout at all or last timeout was temporary and we recovered
					lastTimer = now;
					cumulativeTimeout = 0;
				} else {
					cumulativeTimeout += now - lastTimer;
					lastTimer = now;
					if (cumulativeTimeout > redisConnectionTimeoutLimit) {
						Logger.error(
							`Unable to connect to Redis after ${redisConnectionTimeoutLimit}. Exiting process.`,
						);
						process.exit(1);
					}
				}
				return 500;
			},
		});

		redis.on('close', () => {
			Logger.warn('Redis unavailable - trying to reconnect...');
		});

		redis.on('error', (error) => {
			if (!String(error).includes('ECONNREFUSED')) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				Logger.warn('Error with Redis: ', error);
			}
		});
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
			const requestUrl = req.parsedUrl.pathname!.slice(endpoint.length + 2);

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
		const waitingWebhooks = new WaitingWebhooks();

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
		const testWebhooks = TestWebhooks.getInstance();

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

	async start(): Promise<void> {
		const { app, externalHooks, protocol, sslKey, sslCert } = this;

		let server: Server;
		if (protocol === 'https' && sslKey && sslCert) {
			const https = await import('https');
			server = https.createServer(
				{
					key: await readFile(this.sslKey, 'utf8'),
					cert: await readFile(this.sslCert, 'utf8'),
				},
				app,
			);
		} else {
			const http = await import('http');
			server = http.createServer(app);
		}

		const PORT = config.getEnv('port');
		const ADDRESS = config.getEnv('listen_address');

		server.on('error', (error: Error & { code: string }) => {
			if (error.code === 'EADDRINUSE') {
				console.log(
					`n8n's port ${PORT} is already in use. Do you have another instance of n8n running already?`,
				);
				process.exit(1);
			}
		});

		await new Promise<void>((resolve) => server.listen(PORT, ADDRESS, () => resolve()));

		await this.setupCommonMiddlewares();
		if (inDevelopment) {
			this.setupDevMiddlewares();
		}

		await this.setupHealthCheck();

		await this.configure();

		console.log(`n8n ready on ${ADDRESS}, port ${PORT}`);
		console.log(`Version: ${N8N_VERSION}`);

		const defaultLocale = config.getEnv('defaultLocale');
		if (defaultLocale !== 'en') {
			console.log(`Locale: ${defaultLocale}`);
		}

		await externalHooks.run('n8n.ready', [app, config]);
	}
}

declare module 'http' {
	export interface IncomingMessage {
		parsedUrl: Url;
	}
}
