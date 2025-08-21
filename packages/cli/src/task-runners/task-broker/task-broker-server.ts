import { inTest, Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import compression from 'compression';
import express from 'express';
import { rateLimit as expressRateLimit } from 'express-rate-limit';
import * as a from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { ServerResponse, type Server, createServer as createHttpServer } from 'node:http';
import type { AddressInfo, Socket } from 'node:net';
import { parse as parseUrl } from 'node:url';
import { Server as WSServer } from 'ws';

import { bodyParser, rawBodyReader } from '@/middlewares';
import { send } from '@/response-helper';
import { TaskBrokerAuthController } from '@/task-runners/task-broker/auth/task-broker-auth.controller';
import type {
	TaskBrokerServerInitRequest,
	TaskBrokerServerInitResponse,
} from '@/task-runners/task-broker/task-broker-types';
import { TaskBrokerWsServer } from '@/task-runners/task-broker/task-broker-ws-server';

/**
 * Task Broker HTTP & WS server
 */
@Service()
export class TaskBrokerServer {
	private server: Server | undefined;

	private wsServer: WSServer | undefined;

	readonly app: express.Application;

	get port() {
		return (this.server?.address() as AddressInfo)?.port;
	}

	private get upgradeEndpoint() {
		return `${this.getEndpointBasePath()}/_ws`;
	}

	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
		private readonly authController: TaskBrokerAuthController,
		private readonly taskBrokerWsServer: TaskBrokerWsServer,
	) {
		this.app = express();
		this.app.disable('x-powered-by');

		if (!this.globalConfig.taskRunners.authToken) {
			// Generate an auth token if one is not set
			this.globalConfig.taskRunners.authToken = randomBytes(32).toString('hex');
		}
	}

	async start(): Promise<void> {
		await this.setupHttpServer();

		this.setupWsServer();

		if (!inTest) {
			await this.setupErrorHandlers();
		}

		this.setupCommonMiddlewares();

		this.configureRoutes();
	}

	async stop(): Promise<void> {
		if (this.wsServer) {
			this.wsServer.close();
			this.wsServer = undefined;
		}

		const stopHttpServerTask = (async () => {
			if (this.server) {
				await new Promise<void>((resolve) => this.server?.close(() => resolve()));
				this.server = undefined;
			}
		})();

		const stopWsServerTask = this.taskBrokerWsServer.stop();

		await Promise.all([stopHttpServerTask, stopWsServerTask]);
	}

	/** Creates an HTTP server and listens to the configured port */
	private async setupHttpServer() {
		const { app } = this;

		this.server = createHttpServer(app);

		const {
			taskRunners: { port, listenAddress: address },
		} = this.globalConfig;

		this.server.on('error', (error: Error & { code: string }) => {
			if (error.code === 'EADDRINUSE') {
				this.logger.info(
					`n8n Task Broker's port ${port} is already in use. Do you have another instance of n8n running already?`,
				);
				process.exit(1);
			}
		});

		await new Promise<void>((resolve) => {
			a.ok(this.server);
			this.server.listen(port, address, () => resolve());
		});

		this.logger.info(`n8n Task Broker ready on ${address}, port ${port}`);
	}

	/** Creates WebSocket server for handling upgrade requests */
	private setupWsServer() {
		const { authToken } = this.globalConfig.taskRunners;
		a.ok(authToken);
		a.ok(this.server);

		this.wsServer = new WSServer({
			noServer: true,
			maxPayload: this.globalConfig.taskRunners.maxPayload,
		});
		this.server.on('upgrade', this.handleUpgradeRequest);

		this.taskBrokerWsServer.start();
	}

	private async setupErrorHandlers() {
		const { app } = this;

		// Augment errors sent to Sentry
		if (this.globalConfig.sentry.backendDsn) {
			const { setupExpressErrorHandler } = await import('@sentry/node');
			setupExpressErrorHandler(app);
		}
	}

	private setupCommonMiddlewares() {
		// Compress the response data
		this.app.use(compression());

		this.app.use(rawBodyReader);
		this.app.use(bodyParser);
	}

	private configureRoutes() {
		const createRateLimiter = () =>
			expressRateLimit({
				windowMs: 1000,
				limit: 5,
				message: { message: 'Too many requests' },
			});

		this.app.use(
			this.upgradeEndpoint,
			createRateLimiter(),
			// eslint-disable-next-line @typescript-eslint/unbound-method
			this.authController.authMiddleware,
			(req: TaskBrokerServerInitRequest, res: TaskBrokerServerInitResponse) =>
				this.taskBrokerWsServer.handleRequest(req, res),
		);

		const authEndpoint = `${this.getEndpointBasePath()}/auth`;
		this.app.post(
			authEndpoint,
			createRateLimiter(),
			send(async (req) => await this.authController.createGrantToken(req)),
		);

		this.app.get('/healthz', (_, res) => {
			res.send({ status: 'ok' });
		});
	}

	private handleUpgradeRequest = (
		request: TaskBrokerServerInitRequest,
		socket: Socket,
		head: Buffer,
	) => {
		if (parseUrl(request.url).pathname !== this.upgradeEndpoint) {
			socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
			socket.destroy();
			return;
		}

		if (!this.wsServer) {
			// This might happen if the server is shutting down and we receive an upgrade request
			socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
			socket.destroy();
			return;
		}

		this.wsServer.handleUpgrade(request, socket, head, (ws) => {
			request.ws = ws;

			const response = new ServerResponse(request);
			response.writeHead = (statusCode) => {
				if (statusCode > 200) {
					this.logger.error(`Task runner connection attempt failed with status code ${statusCode}`);
					ws.close();
				}
				return response;
			};

			// @ts-expect-error Delegate the request to the express app. This function is not exposed
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			this.app.handle(request, response);
		});
	};

	/** Returns the normalized base path for the task runner endpoints */
	private getEndpointBasePath() {
		let path = this.globalConfig.taskRunners.path;
		if (!path.startsWith('/')) {
			path = `/${path}`;
		}
		if (path.endsWith('/')) {
			path = path.slice(-1);
		}

		return path;
	}
}
