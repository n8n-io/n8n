import { GlobalConfig } from '@n8n/config';
import compression from 'compression';
import express from 'express';
import assert from 'node:assert';
import * as a from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { ServerResponse, type Server, createServer as createHttpServer } from 'node:http';
import type { AddressInfo, Socket } from 'node:net';
import { parse as parseUrl } from 'node:url';
import { Service } from 'typedi';
import { Server as WSServer } from 'ws';

import { inTest, LOWEST_SHUTDOWN_PRIORITY, Time } from '@/constants';
import { OnShutdown } from '@/decorators/on-shutdown';
import { Logger } from '@/logging/logger.service';
import { bodyParser, rawBodyReader } from '@/middlewares';
import { send } from '@/response-helper';
import { TaskRunnerAuthController } from '@/runners/auth/task-runner-auth.controller';
import type {
	TaskRunnerServerInitRequest,
	TaskRunnerServerInitResponse,
} from '@/runners/runner-types';
import { TaskRunnerWsServer } from '@/runners/runner-ws-server';

import { RunnerLifecycleEvents } from './runner-lifecycle-events';

/**
 * Task Runner HTTP & WS server
 */
@Service()
export class TaskRunnerServer {
	private server: Server | undefined;

	private wsServer: WSServer | undefined;

	readonly app: express.Application;

	private heartbeatTimer: NodeJS.Timer | undefined;

	public get port() {
		return (this.server?.address() as AddressInfo)?.port;
	}

	private get upgradeEndpoint() {
		return `${this.getEndpointBasePath()}/_ws`;
	}

	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
		private readonly taskRunnerAuthController: TaskRunnerAuthController,
		private readonly taskRunnerWsServer: TaskRunnerWsServer,
		private readonly runnerLifecycleEvents: RunnerLifecycleEvents,
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

		this.heartbeatTimer = setInterval(() => {
			assert(this.wsServer);

			this.wsServer.clients.forEach((ws) => {
				if (!ws.isAlive) {
					void this.taskRunnerWsServer.disconnect(ws);
					this.runnerLifecycleEvents.emit('runner:failed-heartbeat-check'); // unresponsive -> restart
					return;
				}

				ws.isAlive = false;
				ws.ping();
			});
		}, this.globalConfig.taskRunners.heartbeatInterval * Time.seconds.toMilliseconds);
	}

	@OnShutdown(LOWEST_SHUTDOWN_PRIORITY)
	async stop(): Promise<void> {
		if (this.heartbeatTimer) {
			clearInterval(this.heartbeatTimer);
			this.heartbeatTimer = undefined;
		}

		if (this.wsServer) {
			this.wsServer.close();
			this.wsServer = undefined;
		}
		if (this.server) {
			await new Promise<void>((resolve) => this.server?.close(() => resolve()));
			this.server = undefined;
		}
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
					`n8n Task Runner's port ${port} is already in use. Do you have another instance of n8n running already?`,
				);
				process.exit(1);
			}
		});

		await new Promise<void>((resolve) => {
			a.ok(this.server);
			this.server.listen(port, address, () => resolve());
		});

		this.logger.info(`n8n Task Runner server ready on ${address}, port ${port}`);
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
	}

	private async setupErrorHandlers() {
		const { app } = this;

		// Augment errors sent to Sentry
		if (this.globalConfig.sentry.backendDsn) {
			const {
				Handlers: { requestHandler, errorHandler },
			} = await import('@sentry/node');
			app.use(requestHandler());
			app.use(errorHandler());
		}
	}

	private setupCommonMiddlewares() {
		// Compress the response data
		this.app.use(compression());

		this.app.use(rawBodyReader);
		this.app.use(bodyParser);
	}

	private configureRoutes() {
		this.app.use(
			this.upgradeEndpoint,
			// eslint-disable-next-line @typescript-eslint/unbound-method
			this.taskRunnerAuthController.authMiddleware,
			(req: TaskRunnerServerInitRequest, res: TaskRunnerServerInitResponse) =>
				this.taskRunnerWsServer.handleRequest(req, res),
		);

		const authEndpoint = `${this.getEndpointBasePath()}/auth`;
		this.app.post(
			authEndpoint,
			send(async (req) => await this.taskRunnerAuthController.createGrantToken(req)),
		);
	}

	private handleUpgradeRequest = (
		request: TaskRunnerServerInitRequest,
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
			ws.isAlive = true;
			ws.on('pong', () => {
				this.logger.debug('Received heartbeat from task runner');
				ws.isAlive = true;
			});
			request.ws = ws;

			const response = new ServerResponse(request);
			response.writeHead = (statusCode) => {
				if (statusCode > 200) ws.close();
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
