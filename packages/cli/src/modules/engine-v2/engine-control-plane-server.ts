import { inTest, Logger } from '@n8n/backend-common';
import { EngineConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import express, { type Application } from 'express';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { bodyParser, rawBodyReader } from '@/middlewares';
import { send } from '@/response-helper';

import { createEngineControlPlaneAuthMiddleware } from './engine-control-plane-auth.middleware';
import { EngineLifecycleEventController } from './engine-lifecycle-event.controller';

/**
 * The control plane's server: where the engine 2.0 data plane reports back.
 *
 * Its own HTTP server rather than a route on n8n's main one, so the surface the
 * data plane reaches can be isolated at the network layer. The main server is
 * the editor and public API and is often internet-facing; this one only ever
 * answers a data plane, so it binds its own port and, by default, loopback only.
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
			if (error.code !== 'EADDRINUSE') return;
			this.logger.error(`Engine 2.0 control plane port ${port} is already in use`);
			// Skipped in tests, where exiting would kill the vitest worker.
			if (!inTest) process.exit(1);
		});

		await new Promise<void>((resolve, reject) => {
			// Detached once listening, so a later runtime error is not mistaken for a
			// failure to bind.
			const onBindError = (error: Error) => reject(error);
			this.server!.once('error', onBindError);
			this.server!.listen(port, host, () => {
				this.server!.off('error', onBindError);
				resolve();
			});
		});

		// An IPv6 literal needs brackets to read as a URL.
		const shownHost = host.includes(':') ? `[${host}]` : host;
		this.logger.info(`Engine 2.0 control plane listening on http://${shownHost}:${port}`);
	}

	async stop(): Promise<void> {
		if (!this.server) return;

		await new Promise<void>((resolve, reject) => {
			this.server!.close((error) => (error ? reject(error) : resolve()));
		});

		// The handle is dropped only after the close succeeds, so a server that
		// failed to close is tried again on the next `stop()`.
		this.server = undefined;
	}

	private configureRoutes(app: Application): void {
		// Stays open: a liveness probe, and it reveals nothing.
		app.get('/healthz', (_req, res) => {
			res.status(200).json({ status: 'ok' });
		});

		// Both mounted on the prefix, not on the route, so a route added here later
		// authenticates by default and cannot outgrow the body limit.
		app.use('/internal', createEngineControlPlaneAuthMiddleware(this.engineConfig, this.logger));
		// n8n's own parser rather than `express.json()`, so a status batch is
		// bounded by `N8N_PAYLOAD_SIZE_MAX` like every other body n8n accepts.
		app.use('/internal', rawBodyReader, bodyParser);

		app.post(
			'/internal/status-callback',
			send(
				async (req, res) => await this.lifecycleEventController.receiveLifecycleEvents(req, res),
			),
		);
	}
}
