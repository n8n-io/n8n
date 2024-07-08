import { EventEmitter } from 'events';
import { ServerResponse } from 'http';
import type { Server } from 'http';
import type { Socket } from 'net';
import type { Application } from 'express';
import { Server as WSServer } from 'ws';
import { parse as parseUrl } from 'url';
import { Container, Service } from 'typedi';

import config from '@/config';
import { OnShutdown } from '@/decorators/OnShutdown';
import { AuthService } from '@/auth/auth.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import type { IPushDataType } from '@/Interfaces';
import { OrchestrationService } from '@/services/orchestration.service';

import { SSEPush } from './sse.push';
import { WebSocketPush } from './websocket.push';
import type { PushResponse, SSEPushRequest, WebSocketPushRequest } from './types';

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
	private backend = useWebSockets ? Container.get(WebSocketPush) : Container.get(SSEPush);

	constructor(private readonly orchestrationService: OrchestrationService) {
		super();
	}

	handleRequest(req: SSEPushRequest | WebSocketPushRequest, res: PushResponse) {
		const {
			user,
			ws,
			query: { pushRef },
		} = req;

		if (!pushRef) {
			if (ws) {
				ws.send('The query parameter "pushRef" is missing!');
				ws.close(1008);
				return;
			}
			throw new BadRequestError('The query parameter "pushRef" is missing!');
		}

		if (req.ws) {
			(this.backend as WebSocketPush).add(pushRef, req.ws);
		} else if (!useWebSockets) {
			(this.backend as SSEPush).add(pushRef, { req, res });
		} else {
			res.status(401).send('Unauthorized');
			return;
		}

		this.emit('editorUiConnected', pushRef);
	}

	broadcast(type: IPushDataType, data?: unknown) {
		this.backend.sendToAll(type, data);
	}

	send(type: IPushDataType, data: unknown, pushRef: string) {
		/**
		 * Multi-main setup: In a manual webhook execution, the main process that
		 * handles a webhook might not be the same as the main process that created
		 * the webhook. If so, the handler process commands the creator process to
		 * relay the former's execution lifecycle events to the creator's frontend.
		 */
		if (this.orchestrationService.isMultiMainSetupEnabled && !this.backend.hasPushRef(pushRef)) {
			const payload = { type, args: data, pushRef };
			void this.orchestrationService.publish('relay-execution-lifecycle-event', payload);
			return;
		}

		this.backend.sendToOne(type, data, pushRef);
	}

	getBackend() {
		return this.backend;
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
