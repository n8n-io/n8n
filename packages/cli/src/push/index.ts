import { EventEmitter } from 'events';
import { ServerResponse } from 'http';
import type { Server } from 'http';
import type { Socket } from 'net';
import type { Application, RequestHandler } from 'express';
import { Server as WSServer } from 'ws';
import { parse as parseUrl } from 'url';
import { Container, Service } from 'typedi';
import config from '@/config';
import { resolveJwt } from '@/auth/jwt';
import { AUTH_COOKIE_NAME } from '@/constants';
import { SSEPush } from './sse.push';
import { WebSocketPush } from './websocket.push';
import type { PushResponse, SSEPushRequest, WebSocketPushRequest } from './types';
import type { IPushDataType } from '@/Interfaces';
import type { User } from '@db/entities/User';

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

	handleRequest(req: SSEPushRequest | WebSocketPushRequest, res: PushResponse) {
		const {
			userId,
			query: { sessionId },
		} = req;
		if (req.ws) {
			(this.backend as WebSocketPush).add(sessionId, userId, req.ws);
			this.backend.on('message', (msg) => this.emit('message', msg));
		} else if (!useWebSockets) {
			(this.backend as SSEPush).add(sessionId, userId, { req, res });
		} else {
			res.status(401).send('Unauthorized');
			return;
		}

		this.emit('editorUiConnected', sessionId);
	}

	broadcast<D>(type: IPushDataType, data?: D) {
		this.backend.broadcast(type, data);
	}

	send<D>(type: IPushDataType, data: D, sessionId: string) {
		this.backend.send(type, data, sessionId);
	}

	sendToUsers<D>(type: IPushDataType, data: D, userIds: Array<User['id']>) {
		this.backend.sendToUsers(type, data, userIds);
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

	const pushValidationMiddleware: RequestHandler = async (
		req: SSEPushRequest | WebSocketPushRequest,
		res,
		next,
	) => {
		const ws = req.ws;

		const { sessionId } = req.query;
		if (sessionId === undefined) {
			if (ws) {
				ws.send('The query parameter "sessionId" is missing!');
				ws.close(1008);
			} else {
				next(new Error('The query parameter "sessionId" is missing!'));
			}
			return;
		}
		try {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			const authCookie: string = req.cookies?.[AUTH_COOKIE_NAME] ?? '';
			const user = await resolveJwt(authCookie);
			req.userId = user.id;
		} catch (error) {
			if (ws) {
				ws.send(`Unauthorized: ${(error as Error).message}`);
				ws.close(1008);
			} else {
				res.status(401).send('Unauthorized');
			}
			return;
		}

		next();
	};

	const push = Container.get(Push);
	app.use(
		endpoint,
		pushValidationMiddleware,
		(req: SSEPushRequest | WebSocketPushRequest, res: PushResponse) => push.handleRequest(req, res),
	);
};
