import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { AuthenticatedRequest } from '@n8n/db';
import { OnShutdown } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import type { Application, Response } from 'express';
import { ServerResponse } from 'http';
import type { Server } from 'http';
import { parse as parseUrl } from 'url';
import { WebSocket, WebSocketServer, type RawData } from 'ws';

import { AuthService } from '@/auth/auth.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { CrdtConnection } from './crdt-room';
// `CrdtRoomManager` (and, transitively, `CrdtRoom` → `yjs`/`y-protocols`/`@n8n/crdt`)
// is imported as a type only. The runtime module is loaded lazily on the first
// connection (see `getRoomManager`) so a server with collaboration off — the
// default — never pays the Yjs module cost at boot. See AGENTS.md "lazy-load
// heavy modules".
import type { CrdtRoomManager } from './crdt-room-manager';

type CrdtRequest = AuthenticatedRequest<{}, {}, {}, { workflowId?: string; version?: string }> & {
	ws?: WebSocket;
};

/** Normalize a `ws` binary frame into a plain `Uint8Array` view. */
function toUint8Array(data: RawData): Uint8Array {
	if (Array.isArray(data)) {
		const buffer = Buffer.concat(data);
		return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
	}
	if (data instanceof ArrayBuffer) {
		return new Uint8Array(data);
	}
	return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}

/**
 * Hosts the server-side CRDT WebSocket endpoint (`/{rest}/crdt`) for real-time
 * collaborative workflow editing. Mirrors the {@link Push} upgrade/auth pattern:
 * the auth middleware runs (via `app.handle`) before a connection is accepted,
 * giving us the authenticated user, after which the connection is authorized
 * against the workflow and joined to its {@link CrdtRoom}.
 *
 * Inert unless `N8N_COLLABORATION_CRDT=server`.
 */
/**
 * Per-frame size ceiling for CRDT messages. A workflow document's full-state
 * update is bounded by the REST save payload limit plus Yjs encoding overhead;
 * this generous cap (well under the `ws` 100 MB default) is a backstop against
 * a single oversized frame.
 */
const MAX_CRDT_MESSAGE_BYTES = 64 * 1024 * 1024;

@Service()
export class CrdtServer {
	private readonly wsServer = new WebSocketServer({
		noServer: true,
		maxPayload: MAX_CRDT_MESSAGE_BYTES,
	});

	/** Lazily loaded on the first connection — never at boot. */
	private roomManager: CrdtRoomManager | null = null;

	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
		private readonly authService: AuthService,
		private readonly workflowFinderService: WorkflowFinderService,
	) {
		this.logger = this.logger.scoped('crdt');
	}

	private get enabled(): boolean {
		return this.globalConfig.collaboration.crdt === 'server';
	}

	/**
	 * Load the Yjs-backed room manager on demand. Importing it pulls in
	 * `yjs`/`y-protocols`/`@n8n/crdt`, so we defer that to the first authorized
	 * connection rather than at module load — keeping the cost off servers that
	 * never use collaboration.
	 */
	private async getRoomManager(): Promise<CrdtRoomManager> {
		if (!this.roomManager) {
			const { CrdtRoomManager } = await import('./crdt-room-manager');
			this.roomManager = Container.get(CrdtRoomManager);
		}
		return this.roomManager;
	}

	/** Registers the authenticated CRDT route. Counterpart to the upgrade handler. */
	setupHandlers(restEndpoint: string, app: Application): void {
		if (!this.enabled) return;

		app.use(
			`/${restEndpoint}/crdt`,
			this.authService.createAuthMiddleware({ allowSkipMFA: false }),
			(req: CrdtRequest, res: Response) => {
				void this.handleConnection(req, res);
			},
		);
	}

	/** Attaches the WebSocket upgrade handler for the CRDT endpoint. */
	setupServer(restEndpoint: string, server: Server, app: Application): void {
		if (!this.enabled) return;

		const path = `/${restEndpoint}/crdt`;
		server.on('upgrade', (request: CrdtRequest, socket, upgradeHead) => {
			if (parseUrl(request.url ?? '').pathname !== path) return;

			this.wsServer.handleUpgrade(request, socket, upgradeHead, (ws) => {
				request.ws = ws;

				// Authorization is async (it hits the DB), so the socket is OPEN
				// before the room's message handler is attached. Pause it so the
				// client's connect-time handshake frames are buffered (not dropped)
				// and delivered once `attach()` resumes the socket.
				ws.pause();

				const response = new ServerResponse(request);
				response.writeHead = (statusCode) => {
					if (statusCode > 200) ws.close();
					return response;
				};

				// @ts-expect-error `handle` isn't documented
				// eslint-disable-next-line @typescript-eslint/no-unsafe-call
				app.handle(request, response);
			});
		});

		this.logger.debug('Server-side CRDT collaboration enabled');
	}

	private async handleConnection(req: CrdtRequest, res: Response): Promise<void> {
		const ws = req.ws;
		if (!ws) {
			res.status(400).end('CRDT endpoint requires a WebSocket connection');
			return;
		}

		try {
			const { workflowId, version } = req.query;
			if (!workflowId) {
				ws.close(1008, 'Missing workflowId');
				return;
			}

			// Authorize: only users allowed to edit the workflow may join its room.
			const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, req.user, [
				'workflow:update',
			]);
			if (!workflow) {
				ws.close(1008, 'Forbidden');
				return;
			}

			// Derive the room key from the AUTHORIZED workflow id (never a raw
			// client-supplied key), so a client can only reach rooms for workflows
			// it is authorized on. The version segment keeps distinct loaded
			// versions (e.g. execution previews) in separate rooms.
			const roomKey = `${workflowId}@${version ?? 'latest'}`;
			const roomManager = await this.getRoomManager();
			this.attach(roomManager, ws, roomKey, workflowId, req.user.id);
		} catch (error) {
			this.logger.error('Failed to establish CRDT connection', { error });
			ws.close(1011, 'Internal error');
		}
	}

	private attach(
		roomManager: CrdtRoomManager,
		ws: WebSocket,
		roomKey: string,
		workflowId: string,
		userId: string,
	): void {
		const room = roomManager.getOrCreate(roomKey);
		const connection: CrdtConnection = {
			send: (data) => {
				if (ws.readyState === WebSocket.OPEN) ws.send(data, { binary: true });
			},
		};

		room.addConnection(connection);
		this.logger.debug('CRDT client connected', { roomKey, workflowId, userId });

		ws.on('message', (data: RawData) => {
			try {
				room.handleMessage(connection, toUint8Array(data));
			} catch (error) {
				this.logger.error('Failed to handle CRDT message', { roomKey, error });
			}
		});

		ws.on('close', () => {
			roomManager.removeConnection(roomKey, connection);
			this.logger.debug('CRDT client disconnected', { roomKey, userId });
		});

		ws.on('error', (error) => {
			this.logger.error('CRDT socket error', { roomKey, error });
		});

		// Handlers are attached — release the socket so buffered (and subsequent)
		// frames are delivered. Paired with `ws.pause()` in the upgrade handler.
		ws.resume();
	}

	@OnShutdown()
	shutdown(): void {
		// `roomManager` is null if no client ever connected (nothing to tear down).
		this.roomManager?.destroyAll();
		this.wsServer.close();
	}
}
