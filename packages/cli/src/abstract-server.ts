import { GlobalConfig } from '@n8n/config';
import compression from 'compression';
import express from 'express';
import { engine as expressHandlebars } from 'express-handlebars';
import { readFile } from 'fs/promises';
import type { Server } from 'http';
import isbot from 'isbot';
import { Container, Service } from 'typedi';

import config from '@/config';
import { N8N_VERSION, TEMPLATES_DIR, inDevelopment, inTest } from '@/constants';
import * as Db from '@/db';
import { OnShutdown } from '@/decorators/on-shutdown';
import { ExternalHooks } from '@/external-hooks';
import { Logger } from '@/logging/logger.service';
import { rawBodyReader, bodyParser, corsMiddleware } from '@/middlewares';
import { send, sendErrorResponse } from '@/response-helper';
import { WaitingForms } from '@/waiting-forms';
import { LiveWebhooks } from '@/webhooks/live-webhooks';
import { TestWebhooks } from '@/webhooks/test-webhooks';
import { WaitingWebhooks } from '@/webhooks/waiting-webhooks';
import { createWebhookHandlerFor } from '@/webhooks/webhook-request-handler';

import { ServiceUnavailableError } from './errors/response-errors/service-unavailable.error';

@Service()
export abstract class AbstractServer {
	protected logger: Logger;

	protected server: Server;

	readonly app: express.Application;

	protected externalHooks: ExternalHooks;

	protected globalConfig = Container.get(GlobalConfig);

	protected sslKey: string;

	protected sslCert: string;

	protected restEndpoint: string;

	protected endpointForm: string;

	protected endpointFormTest: string;

	protected endpointFormWaiting: string;

	protected endpointWebhook: string;

	protected endpointWebhookTest: string;

	protected endpointWebhookWaiting: string;

	protected webhooksEnabled = true;

	protected testWebhooksEnabled = false;

	readonly uniqueInstanceId: string;

	constructor() {
		this.app = express();
		this.app.disable('x-powered-by');

		this.app.engine('handlebars', expressHandlebars({ defaultLayout: false }));
		this.app.set('view engine', 'handlebars');
		this.app.set('views', TEMPLATES_DIR);

		const proxyHops = config.getEnv('proxy_hops');
		if (proxyHops > 0) this.app.set('trust proxy', proxyHops);

		this.sslKey = config.getEnv('ssl_key');
		this.sslCert = config.getEnv('ssl_cert');

		this.restEndpoint = this.globalConfig.endpoints.rest;

		this.endpointForm = this.globalConfig.endpoints.form;
		this.endpointFormTest = this.globalConfig.endpoints.formTest;
		this.endpointFormWaiting = this.globalConfig.endpoints.formWaiting;

		this.endpointWebhook = this.globalConfig.endpoints.webhook;
		this.endpointWebhookTest = this.globalConfig.endpoints.webhookTest;
		this.endpointWebhookWaiting = this.globalConfig.endpoints.webhookWaiting;

		this.logger = Container.get(Logger);
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
		// main health check should not care about DB connections
		this.app.get('/healthz', async (_req, res) => {
			res.send({ status: 'ok' });
		});

		this.app.get('/healthz/readiness', async (_req, res) => {
			return Db.connectionState.connected && Db.connectionState.migrated
				? res.status(200).send({ status: 'ok' })
				: res.status(503).send({ status: 'error' });
		});

		const { connectionState } = Db;
		this.app.use((_req, res, next) => {
			if (connectionState.connected) {
				if (connectionState.migrated) next();
				else res.send('n8n is starting up. Please wait');
			} else sendErrorResponse(res, new ServiceUnavailableError('Database is not ready!'));
		});
	}

	async init(): Promise<void> {
		const { app, sslKey, sslCert } = this;
		const { protocol } = this.globalConfig;

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

		const { port, listen_address: address } = Container.get(GlobalConfig);

		this.server.on('error', (error: Error & { code: string }) => {
			if (error.code === 'EADDRINUSE') {
				this.logger.info(
					`n8n's port ${port} is already in use. Do you have another instance of n8n running already?`,
				);
				process.exit(1);
			}
		});

		await new Promise<void>((resolve) => this.server.listen(port, address, () => resolve()));

		this.externalHooks = Container.get(ExternalHooks);

		await this.setupHealthCheck();

		this.logger.info(`n8n ready on ${address}, port ${port}`);
	}

	async start(): Promise<void> {
		if (!inTest) {
			await this.setupErrorHandlers();
			this.setupPushServer();
		}

		this.setupCommonMiddlewares();

		// Setup webhook handlers before bodyParser, to let the Webhook node handle binary data in requests
		if (this.webhooksEnabled) {
			const liveWebhooksRequestHandler = createWebhookHandlerFor(Container.get(LiveWebhooks));
			// Register a handler for live forms
			this.app.all(`/${this.endpointForm}/:path(*)`, liveWebhooksRequestHandler);

			// Register a handler for live webhooks
			this.app.all(`/${this.endpointWebhook}/:path(*)`, liveWebhooksRequestHandler);

			// Register a handler for waiting forms
			this.app.all(
				`/${this.endpointFormWaiting}/:path/:suffix?`,
				createWebhookHandlerFor(Container.get(WaitingForms)),
			);

			// Register a handler for waiting webhooks
			this.app.all(
				`/${this.endpointWebhookWaiting}/:path/:suffix?`,
				createWebhookHandlerFor(Container.get(WaitingWebhooks)),
			);
		}

		if (this.testWebhooksEnabled) {
			const testWebhooksRequestHandler = createWebhookHandlerFor(Container.get(TestWebhooks));

			// Register a handler
			this.app.all(`/${this.endpointFormTest}/:path(*)`, testWebhooksRequestHandler);
			this.app.all(`/${this.endpointWebhookTest}/:path(*)`, testWebhooksRequestHandler);
		}

		// Block bots from scanning the application
		const checkIfBot = isbot.spawn(['bot']);
		this.app.use((req, res, next) => {
			const userAgent = req.headers['user-agent'];
			if (userAgent && checkIfBot(userAgent)) {
				this.logger.info(`Blocked ${req.method} ${req.url} for "${userAgent}"`);
				res.status(204).end();
			} else next();
		});

		if (inDevelopment) {
			this.setupDevMiddlewares();
		}

		if (this.testWebhooksEnabled) {
			const testWebhooks = Container.get(TestWebhooks);
			// Removes a test webhook
			// TODO UM: check if this needs validation with user management.
			this.app.delete(
				`/${this.restEndpoint}/test-webhook/:id`,
				send(async (req) => await testWebhooks.cancelWebhook(req.params.id)),
			);
		}

		// Setup body parsing middleware after the webhook handlers are setup
		this.app.use(bodyParser);

		await this.configure();

		if (!inTest) {
			this.logger.info(`Version: ${N8N_VERSION}`);

			const defaultLocale = config.getEnv('defaultLocale');
			if (defaultLocale !== 'en') {
				this.logger.info(`Locale: ${defaultLocale}`);
			}

			await this.externalHooks.run('n8n.ready', [this, config]);
		}
	}

	/**
	 * Stops the HTTP(S) server from accepting new connections. Gives all
	 * connections configured amount of time to finish their work and
	 * then closes them forcefully.
	 */
	@OnShutdown()
	async onShutdown(): Promise<void> {
		if (!this.server) {
			return;
		}

		const { protocol } = this.globalConfig;

		this.logger.debug(`Shutting down ${protocol} server`);

		this.server.close((error) => {
			if (error) {
				this.logger.error(`Error while shutting down ${protocol} server`, { error });
			}

			this.logger.debug(`${protocol} server shut down`);
		});
	}
}
