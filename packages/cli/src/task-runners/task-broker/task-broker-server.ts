import { inTest, Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import compression from 'compression';
import express from 'express';
import { rateLimit as expressRateLimit } from 'express-rate-limit';
import { ErrorReporter } from 'n8n-core';
import * as a from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import {
	type IncomingMessage,
	STATUS_CODES,
	type Server,
	createServer as createHttpServer,
} from 'node:http';
import type { AddressInfo, Socket } from 'node:net';
import { parse as parseUrl } from 'node:url';
import { type WebSocket, Server as WSServer } from 'ws';

import { bodyParser, rawBodyReader } from '@/middlewares';
import { send } from '@/response-helper';
import { TaskBrokerAuthController } from '@/task-runners/task-broker/auth/task-broker-auth.controller';
import { TaskBrokerWsServer } from '@/task-runners/task-broker/task-broker-ws-server';

type IncomingUpgradeRequest = IncomingMessage & { url: string; ws?: WebSocket };

/**
 * Simple sliding-window rate limiter for WebSocket upgrade requests.
 * Unlike HTTP endpoints, upgrade requests bypass Express so we cannot
 * reuse `express-rate-limit`. Kept inline because this is the only
 * non-Express rate limiter in the codebase.
 */
class SlidingWindowRateLimiter {
	private timestamps: number[] = [];

	constructor(
		private readonly windowMs: number,
		private readonly limit: number,
	) {}

	isRateLimited(): boolean {
		const now = Date.now();
		this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);
		if (this.timestamps.length >= this.limit) return true;
		this.timestamps.push(now);
		return false;
	}
}

/**
 * Task Broker HTTP & WS server
 */
@Service()
export class TaskBrokerServer {
	private server: Server | undefined;

	private wsServer: WSServer | undefined;

	readonly app: express.Application;

	private readonly upgradeRateLimiter = new SlidingWindowRateLimiter(
		1 * Time.seconds.toMilliseconds,
		5,
	);

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
		private readonly errorReporter: ErrorReporter,
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
		const authEndpoint = `${this.getEndpointBasePath()}/auth`;
		this.app.post(
			authEndpoint,
			expressRateLimit({
				windowMs: 1000,
				limit: 5,
				message: { message: 'Too many requests' },
			}),
			send(async (req) => await this.authController.createGrantToken(req)),
		);

		// The task broker is an internal server (not publicly accessible) used
		// exclusively by the task-runner-launcher. Its health endpoint must always
		// be /healthz, independent of N8N_ENDPOINT_HEALTH, which is intended for
		// external-facing servers. Platforms such as Cloud Run reserve /healthz at
		// the ingress level, so users set N8N_ENDPOINT_HEALTH=health to avoid
		// conflicts on the public URL — but that restriction does not apply to
		// internal container-to-container traffic on the broker port.
		this.app.get('/healthz', (_, res) => {
			res.send({ status: 'ok' });
		});
	}

	private handleUpgradeRequest = async (
		request: IncomingUpgradeRequest,
		socket: Socket,
		head: Buffer,
	) => {
		try {
			const parsedUrl = parseUrl(request.url, true);

			if (parsedUrl.pathname !== this.upgradeEndpoint) {
				this.failUpgradeRequest(socket, 404);
				return;
			}

			if (this.upgradeRateLimiter.isRateLimited()) {
				this.failUpgradeRequest(socket, 429);
				return;
			}

			if (!this.wsServer) {
				this.failUpgradeRequest(socket, 503);
				return;
			}

			const runnerId = typeof parsedUrl.query.id === 'string' ? parsedUrl.query.id : undefined;
			if (!runnerId) {
				this.logger.warn(
					'Task runner connection attempt failed: missing runner ID in query parameters',
				);
				this.failUpgradeRequest(socket, 400);
				return;
			}

			// Validate auth BEFORE upgrading the connection so the client
			// receives a proper HTTP error instead of an opaque close frame
			const result = await this.authController.validateUpgradeRequest(
				request.headers.authorization,
			);

			if (!result.isValid) {
				this.logger.warn(`Task runner connection attempt failed: ${result.reason}`, { runnerId });
				this.failUpgradeRequest(socket, result.statusCode);
				return;
			}

			// Re-check after await in case server is shutting down
			if (!this.wsServer) {
				this.failUpgradeRequest(socket, 503);
				return;
			}

			const wsServer = this.wsServer;
			wsServer.handleUpgrade(request, socket, head, (ws) => {
				request.ws = ws;
				this.taskBrokerWsServer.add(runnerId, ws);
			});
		} catch (error) {
			this.errorReporter.error(error, {
				extra: { requestUrl: request.url },
			});
			this.failUpgradeRequest(socket, 500);
		}
	};

	private failUpgradeRequest(socket: Socket, statusCode: number) {
		const statusMessage = STATUS_CODES[statusCode] ?? 'Error';
		socket.write(`HTTP/1.1 ${statusCode} ${statusMessage}\r\n\r\n`);
		socket.destroy();
	}

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
