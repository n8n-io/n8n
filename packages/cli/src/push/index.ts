import { EventEmitter } from 'events';
import { ServerResponse } from 'http';
import type { Server } from 'http';
import type { Socket } from 'net';
import type { Application } from 'express';
import { Server as WSServer } from 'ws';
import { parse as parseUrl } from 'url';
import { Container, Service } from 'typedi';
import config from '@/config';
import { SSEPush } from './sse.push';
import { WebSocketPush } from './websocket.push';
import type { PushResponse, SSEPushRequest, WebSocketPushRequest } from './types';
import type { IPushDataType } from '@/Interfaces';
import type { User } from '@db/entities/User';
import { OnShutdown } from '@/decorators/OnShutdown';
import { AuthService } from '@/auth/auth.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

const useWebSockets = config.getEnv('push.backend') === 'websocket';

/**
 * Push service for uni- or bi-directional communication with frontend clients.
 * Uses either server-sent events (SSE, unidirectional from backend --> frontend)
 * or WebSocket (bidirectional backend <--> frontend) depending on the configuration.
 *
 * @emits message when a message is received from a client
 */
@Service()
export class Push extends EventEmitter {
	public isBidirectional = useWebSockets;

	private backend = useWebSockets ? Container.get(WebSocketPush) : Container.get(SSEPush);

	constructor() {
		super();

		if (useWebSockets) this.backend.on('message', (msg) => this.emit('message', msg));
	}

	handleRequest(req: SSEPushRequest | WebSocketPushRequest, res: PushResponse) {
		const {
			user,
			ws,
			query: { sessionId },
		} = req;

		if (!sessionId) {
			if (ws) {
				ws.send('The query parameter "sessionId" is missing!');
				ws.close(1008);
				return;
			}
			throw new BadRequestError('The query parameter "sessionId" is missing!');
		}

		if (req.ws) {
			(this.backend as WebSocketPush).add(sessionId, user.id, req.ws);
		} else if (!useWebSockets) {
			(this.backend as SSEPush).add(sessionId, user.id, { req, res });
		} else {
			res.status(401).send('Unauthorized');
			return;
		}

		this.emit('editorUiConnected', sessionId);
	}

	broadcast(type: IPushDataType, data?: unknown) {
		this.backend.sendToAllSessions(type, data);
	}

	send(type: IPushDataType, data: unknown, sessionId: string) {
		this.backend.sendToOneSession(type, data, sessionId);
	}

	getBackend() {
		return this.backend;
	}

	sendToUsers(type: IPushDataType, data: unknown, userIds: Array<User['id']>) {
		this.backend.sendToUsers(type, data, userIds);
	}

	@OnShutdown()
	onShutdown() {
		this.backend.closeAllConnections();
	}
}

export const setupPushServer = (restEndpoint: string, server: Server, app: Application) => {
	if (useWebSockets) {
		const wsServer = new WSServer({ noServer: true });
		server.on('upgrade', (request: WebSocketPushRequest, socket: Socket, head) => {
			if (parseUrl(request.url).pathname === `/${restEndpoint}/push`) {
				wsServer.handleUpgrade(request, socket, head, (ws) => {
					request.ws = ws;

					const response = new ServerResponse(request);
					response.writeHead = (statusCode) => {
						if (statusCode > 200) ws.close();
						return response;
					};

					// @ts-ignore
					// eslint-disable-next-line @typescript-eslint/no-unsafe-call
					app.handle(request, response);
				});
			}
		});
	}
};

export const setupPushHandler = (restEndpoint: string, app: Application) => {
	const endpoint = `/${restEndpoint}/push`;
	const push = Container.get(Push);
	const authService = Container.get(AuthService);
	app.use(
		endpoint,
		// eslint-disable-next-line @typescript-eslint/unbound-method
		authService.authMiddleware,
		(req: SSEPushRequest | WebSocketPushRequest, res: PushResponse) => push.handleRequest(req, res),
	);
};
