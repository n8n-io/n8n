import { Logger } from '@n8n/backend-common';
import { MESSAGE_SYNC, MESSAGE_AWARENESS, encodeMessage, decodeMessage } from '@n8n/crdt';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Application } from 'express';
import type { IncomingMessage, Server } from 'http';
import { ServerResponse } from 'http';
import { parse as parseUrl } from 'url';
import type { WebSocket } from 'ws';
import { Server as WSServer } from 'ws';

import { AuthService } from '@/auth/auth.service';

import { CRDTState } from './crdt-state';

interface CRDTConnection {
	ws: WebSocket;
	userId: User['id'];
	docId: string;
}

interface CRDTWebSocketRequest extends AuthenticatedRequest<{}, {}, {}, { docId?: string }> {
	ws?: WebSocket;
}

/**
 * WebSocket service for CRDT document synchronization.
 *
 * Provides a dedicated /crdt endpoint that handles binary sync messages
 * directly, without going through the push connection.
 */
@Service()
export class CRDTWebSocketService {
	private wsServer: WSServer | null = null;

	/** Active connections by docId */
	private connections = new Map<string, Set<CRDTConnection>>();

	constructor(
		private readonly logger: Logger,
		private readonly authService: AuthService,
		private readonly state: CRDTState,
		private readonly workflowRepository: WorkflowRepository,
	) {}

	/**
	 * Set up WebSocket server upgrade handler
	 */
	setupWebSocketServer(restEndpoint: string, server: Server, app: Application) {
		this.wsServer = new WSServer({ noServer: true });

		server.on('upgrade', (request: IncomingMessage, socket, upgradeHead) => {
			const pathname = parseUrl(request.url ?? '').pathname;

			if (pathname === `/${restEndpoint}/crdt`) {
				this.wsServer!.handleUpgrade(request, socket, upgradeHead, (ws) => {
					// Attach ws to request for use in handler
					(request as unknown as CRDTWebSocketRequest).ws = ws;

					const response = new ServerResponse(request);
					response.writeHead = (statusCode) => {
						if (statusCode > 200) ws.close();
						return response;
					};

					// @ts-expect-error `handle` isn't documented
					// eslint-disable-next-line @typescript-eslint/no-unsafe-call
					app.handle(request, response);
				});
			}
		});
	}

	/**
	 * Set up the /crdt endpoint handler
	 */
	setupCRDTHandler(restEndpoint: string, app: Application) {
		app.use(
			`/${restEndpoint}/crdt`,
			this.authService.createAuthMiddleware({ allowSkipMFA: false }),
			async (req: CRDTWebSocketRequest, res: ServerResponse) =>
				await this.handleConnection(req, res),
		);
	}

	private async handleConnection(req: CRDTWebSocketRequest, res: ServerResponse) {
		const { ws, user } = req;
		const docId = req.query.docId;

		if (!ws) {
			res.statusCode = 400;
			res.end('WebSocket connection required');
			return;
		}

		if (!user) {
			ws.close(1008, 'Authentication required');
			return;
		}

		if (!docId) {
			ws.close(1008, 'Missing docId parameter');
			return;
		}

		this.logger.debug('CRDT WebSocket connected', { docId, userId: user.id });

		// Seed workflow data on first connection
		if (this.state.needsSeeding(docId)) {
			try {
				await this.seedWorkflowDoc(docId);
			} catch (error) {
				this.logger.error('Failed to seed workflow', { docId, error });
				ws.close(1011, 'Failed to load workflow');
				return;
			}
		}

		const connection: CRDTConnection = { ws, userId: user.id, docId };
		this.addConnection(connection);

		// Set binary type for efficient transfer
		ws.binaryType = 'arraybuffer';

		// Send initial state (with sync message prefix)
		const initialState = this.state.getStateBytes(docId);
		this.sendMessage(ws, MESSAGE_SYNC, initialState);

		// Send initial awareness state if available
		const awarenessState = this.state.getAwarenessBytes(docId);
		if (awarenessState.length > 0) {
			this.sendMessage(ws, MESSAGE_AWARENESS, awarenessState);
		}

		// Handle incoming messages
		ws.on('message', (data: ArrayBuffer | Buffer) => {
			this.handleMessage(connection, data);
		});

		ws.on('close', () => {
			this.removeConnection(connection);
			this.logger.debug('CRDT WebSocket disconnected', { docId, userId: user.id });
		});

		ws.on('error', (error) => {
			this.logger.error('CRDT WebSocket error', { docId, userId: user.id, error });
			this.removeConnection(connection);
		});
	}

	/**
	 * Load workflow from database and seed into CRDT document
	 */
	private async seedWorkflowDoc(docId: string): Promise<void> {
		// docId is the workflow ID
		const workflow = await this.workflowRepository.findById(docId);

		if (!workflow) {
			throw new Error(`Workflow not found: ${docId}`);
		}

		this.state.seedWorkflow(docId, {
			id: workflow.id,
			name: workflow.name,
			nodes: workflow.nodes,
			connections: workflow.connections as Record<string, unknown>,
			settings: workflow.settings as Record<string, unknown> | undefined,
		});

		this.logger.debug('Seeded workflow into CRDT document', {
			docId,
			workflowId: workflow.id,
			nodeCount: workflow.nodes.length,
		});
	}

	private handleMessage(connection: CRDTConnection, data: ArrayBuffer | Buffer) {
		const { docId } = connection;

		const rawData = new Uint8Array(data instanceof ArrayBuffer ? data : data.buffer);
		const { messageType, payload } = decodeMessage(rawData);

		if (messageType === MESSAGE_SYNC) {
			// Apply sync update and broadcast to other clients
			this.state.applyUpdateBytes(docId, payload);
			this.broadcastMessage(docId, MESSAGE_SYNC, payload, connection);
		} else if (messageType === MESSAGE_AWARENESS) {
			// Apply awareness update and broadcast to other clients
			this.state.applyAwarenessBytes(docId, payload);
			this.broadcastMessage(docId, MESSAGE_AWARENESS, payload, connection);
		} else {
			this.logger.warn('Unknown CRDT message type', { docId, messageType });
		}
	}

	/**
	 * Send an encoded message to a client.
	 */
	private sendMessage(ws: WebSocket, messageType: number, payload: Uint8Array) {
		if (ws.readyState === ws.OPEN) {
			ws.send(encodeMessage(messageType, payload));
		}
	}

	/**
	 * Broadcast an encoded message to all clients except sender.
	 */
	private broadcastMessage(
		docId: string,
		messageType: number,
		payload: Uint8Array,
		sender: CRDTConnection,
	) {
		const docConnections = this.connections.get(docId);
		if (!docConnections) return;

		for (const conn of docConnections) {
			if (conn !== sender && conn.ws.readyState === conn.ws.OPEN) {
				this.sendMessage(conn.ws, messageType, payload);
			}
		}
	}

	private addConnection(connection: CRDTConnection) {
		const { docId } = connection;
		let docConnections = this.connections.get(docId);
		if (!docConnections) {
			docConnections = new Set();
			this.connections.set(docId, docConnections);
		}
		docConnections.add(connection);
	}

	private removeConnection(connection: CRDTConnection) {
		const { docId } = connection;
		const docConnections = this.connections.get(docId);
		if (docConnections) {
			docConnections.delete(connection);
			if (docConnections.size === 0) {
				this.connections.delete(docId);
				// Clean up the document when no more connections exist
				this.state.cleanupDoc(docId);
				this.logger.debug('Room closed, document cleaned up', { docId });
			}
		}
	}
}
