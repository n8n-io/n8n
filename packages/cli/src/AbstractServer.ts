import { Container, Service } from 'typedi';
import { readFile } from 'fs/promises';
import type { Server } from 'http';
import express from 'express';
import { engine as expressHandlebars } from 'express-handlebars';
import compression from 'compression';
import isbot from 'isbot';

import config from '@/config';
import { N8N_VERSION, TEMPLATES_DIR, inDevelopment, inTest } from '@/constants';
import * as Db from '@/Db';
import { N8nInstanceType } from '@/Interfaces';
import { ExternalHooks } from '@/ExternalHooks';
import { send, sendErrorResponse } from '@/ResponseHelper';
import { rawBodyReader, bodyParser, corsMiddleware } from '@/middlewares';
import { TestWebhooks } from '@/TestWebhooks';
import { WaitingForms } from '@/WaitingForms';
import { WaitingWebhooks } from '@/WaitingWebhooks';
import { webhookRequestHandler } from '@/WebhookHelpers';
import { generateHostInstanceId } from './databases/utils/generators';
import { Logger } from '@/Logger';
import { ServiceUnavailableError } from './errors/response-errors/service-unavailable.error';
import { OnShutdown } from '@/decorators/OnShutdown';
import { ActiveWebhooks } from '@/ActiveWebhooks';

@Service()
export abstract class AbstractServer {
	protected logger: Logger;

	protected server: Server;

	readonly app: express.Application;

	protected externalHooks: ExternalHooks;

	protected protocol = config.getEnv('protocol');

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

	constructor(instanceType: N8nInstanceType = 'main') {
		this.app = express();
		this.app.disable('x-powered-by');

		this.app.engine('handlebars', expressHandlebars({ defaultLayout: false }));
		this.app.set('view engine', 'handlebars');
		this.app.set('views', TEMPLATES_DIR);

		const proxyHops = config.getEnv('proxy_hops');
		if (proxyHops > 0) this.app.set('trust proxy', proxyHops);

		this.sslKey = config.getEnv('ssl_key');
		this.sslCert = config.getEnv('ssl_cert');

		this.restEndpoint = config.getEnv('endpoints.rest');

		this.endpointForm = config.getEnv('endpoints.form');
		this.endpointFormTest = config.getEnv('endpoints.formTest');
		this.endpointFormWaiting = config.getEnv('endpoints.formWaiting');

		this.endpointWebhook = config.getEnv('endpoints.webhook');
		this.endpointWebhookTest = config.getEnv('endpoints.webhookTest');
		this.endpointWebhookWaiting = config.getEnv('endpoints.webhookWaiting');

		this.uniqueInstanceId = generateHostInstanceId(instanceType);

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
		// health check should not care about DB connections
		this.app.get('/healthz', async (_req, res) => {
			res.send({ status: 'ok' });
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
			const activeWebhooks = Container.get(ActiveWebhooks);

			// Register a handler for active forms
			this.app.all(`/${this.endpointForm}/:path(*)`, webhookRequestHandler(activeWebhooks));

			// Register a handler for active webhooks
			this.app.all(`/${this.endpointWebhook}/:path(*)`, webhookRequestHandler(activeWebhooks));

			// Register a handler for waiting forms
			this.app.all(
				`/${this.endpointFormWaiting}/:path/:suffix?`,
				webhookRequestHandler(Container.get(WaitingForms)),
			);

			// Register a handler for waiting webhooks
			this.app.all(
				`/${this.endpointWebhookWaiting}/:path/:suffix?`,
				webhookRequestHandler(Container.get(WaitingWebhooks)),
			);
		}

		if (this.testWebhooksEnabled) {
			const testWebhooks = Container.get(TestWebhooks);

			// Register a handler
			this.app.all(`/${this.endpointFormTest}/:path(*)`, webhookRequestHandler(testWebhooks));
			this.app.all(`/${this.endpointWebhookTest}/:path(*)`, webhookRequestHandler(testWebhooks));

			// Removes a test webhook
			// TODO UM: check if this needs validation with user management.
			this.app.delete(
				`/${this.restEndpoint}/test-webhook/:id`,
				send(async (req) => await testWebhooks.cancelWebhook(req.params.id)),
			);
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

		this.logger.debug(`Shutting down ${this.protocol} server`);

		this.server.close((error) => {
			if (error) {
				this.logger.error(`Error while shutting down ${this.protocol} server`, { error });
			}

			this.logger.debug(`${this.protocol} server shut down`);
		});
	}
}
