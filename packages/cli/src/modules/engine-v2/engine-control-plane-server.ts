import { inTest, Logger } from '@n8n/backend-common';
import { EngineConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import express, { type Application } from 'express';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { bodyParser, rawBodyReader } from '@/middlewares';
import { send } from '@/response-helper';

import { createEngineControlPlaneAuthMiddleware } from './engine-control-plane-auth.middleware';
import { CONTROL_PLANE_PREFIX, STATUS_CALLBACK_PATH } from './engine-v2.constants';
import { EngineLifecycleEventController } from './engine-lifecycle-event.controller';

/**
 * Receives lifecycle events from the data plane. Its own server, not a route on
 * n8n's main one, so this surface can be isolated from the editor API.
 */
@Service()
export class EngineControlPlaneServer {
	private server: Server | undefined;

	/** The bound port, which differs from the configured one when that is `0`. */
	get port(): number | undefined {
		return (this.server?.address() as AddressInfo | null)?.port;
	}

	constructor(
		private readonly engineConfig: EngineConfig,
		private readonly lifecycleEventController: EngineLifecycleEventController,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('engine-v2');
	}

	async start(): Promise<void> {
		const app = express();
		app.disable('x-powered-by');
		this.configureRoutes(app);

		const { controlPlaneHost: host, controlPlanePort: port } = this.engineConfig;

		this.server = createServer(app);
		this.server.on('error', (error: NodeJS.ErrnoException) => {
			if (error.code !== 'EADDRINUSE') {
				// Nothing else handles these, so an unlogged one is a silent failure.
				this.logger.error('Engine 2.0 control plane server error', { error });
				return;
			}

			this.logger.error(`Engine 2.0 control plane port ${port} is already in use`);
			// Skipped in tests, where exiting would kill the vitest worker.
			if (!inTest) process.exit(1);
		});

		await new Promise<void>((resolve, reject) => {
			// Detached once listening: a later error is not a failed bind.
			const onBindError = (error: Error) => reject(error);
			this.server!.once('error', onBindError);
			this.server!.listen(port, host, () => {
				this.server!.off('error', onBindError);
				resolve();
			});
		});

		// An IPv6 literal needs brackets to read as a URL.
		const shownHost = host.includes(':') ? `[${host}]` : host;
		// The bound port, not the configured one, which is `0` when the OS picks it.
		this.logger.info(`Engine 2.0 control plane listening on http://${shownHost}:${this.port}`);
	}

	async stop(): Promise<void> {
		if (!this.server) return;

		await new Promise<void>((resolve, reject) => {
			this.server!.close((error) => (error ? reject(error) : resolve()));
		});

		// Dropped only on success, so a failed close is retried next time.
		this.server = undefined;
	}

	private configureRoutes(app: Application): void {
		// Open: a liveness probe reveals nothing.
		app.get('/healthz', (_req, res) => {
			res.status(200).json({ status: 'ok' });
		});

		// On the prefix, not the route, so a later route cannot forget either.
		app.use(
			CONTROL_PLANE_PREFIX,
			createEngineControlPlaneAuthMiddleware(this.engineConfig, this.logger),
		);
		// n8n's parser bounds the body by `N8N_PAYLOAD_SIZE_MAX`.
		app.use(CONTROL_PLANE_PREFIX, rawBodyReader, bodyParser);

		app.post(
			STATUS_CALLBACK_PATH,
			send(
				async (req, res) => await this.lifecycleEventController.receiveLifecycleEvents(req, res),
			),
		);
	}
}
