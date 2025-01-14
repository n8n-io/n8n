import type { PushMessage } from '@n8n/api-types';
import { Container, Service } from '@n8n/di';
import type { Application } from 'express';
import { ServerResponse } from 'http';
import type { Server } from 'http';
import { InstanceSettings, Logger } from 'n8n-core';
import { deepCopy } from 'n8n-workflow';
import type { Socket } from 'net';
import { parse as parseUrl } from 'url';
import { Server as WSServer } from 'ws';

import { AuthService } from '@/auth/auth.service';
import config from '@/config';
import { TRIMMED_TASK_DATA_CONNECTIONS } from '@/constants';
import type { User } from '@/databases/entities/user';
import { OnShutdown } from '@/decorators/on-shutdown';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { TypedEmitter } from '@/typed-emitter';

import { SSEPush } from './sse.push';
import type { OnPushMessage, PushResponse, SSEPushRequest, WebSocketPushRequest } from './types';
import { WebSocketPush } from './websocket.push';

type PushEvents = {
	editorUiConnected: string;
	message: OnPushMessage;
};

const useWebSockets = config.getEnv('push.backend') === 'websocket';

/**
 * Max allowed size of a push message in bytes. Events going through the pubsub
 * channel are trimmed if exceeding this size.
 */
const MAX_PAYLOAD_SIZE_BYTES = 5 * 1024 * 1024; // 5 MiB

/**
 * Push service for uni- or bi-directional communication with frontend clients.
 * Uses either server-sent events (SSE, unidirectional from backend --> frontend)
 * or WebSocket (bidirectional backend <--> frontend) depending on the configuration.
 *
 * @emits message when a message is received from a client
 */
@Service()
export class Push extends TypedEmitter<PushEvents> {
	isBidirectional = useWebSockets;

	private backend = useWebSockets ? Container.get(WebSocketPush) : Container.get(SSEPush);

	constructor(
		private readonly instanceSettings: InstanceSettings,
		private readonly publisher: Publisher,
		private readonly logger: Logger,
	) {
		super();
		this.logger = this.logger.scoped('push');

		if (useWebSockets) this.backend.on('message', (msg) => this.emit('message', msg));
	}

	getBackend() {
		return this.backend;
	}

	handleRequest(req: SSEPushRequest | WebSocketPushRequest, res: PushResponse) {
		const {
			ws,
			query: { pushRef },
			user,
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
			(this.backend as WebSocketPush).add(pushRef, user.id, req.ws);
		} else if (!useWebSockets) {
			(this.backend as SSEPush).add(pushRef, user.id, { req, res });
		} else {
			res.status(401).send('Unauthorized');
			return;
		}

		this.emit('editorUiConnected', pushRef);
	}

	broadcast(pushMsg: PushMessage) {
		this.backend.sendToAll(pushMsg);
	}

	/** Returns whether a given push ref is registered. */
	hasPushRef(pushRef: string) {
		return this.backend.hasPushRef(pushRef);
	}

	send(pushMsg: PushMessage, pushRef: string) {
		if (this.shouldRelayViaPubSub(pushRef)) {
			this.relayViaPubSub(pushMsg, pushRef);
			return;
		}

		this.backend.sendToOne(pushMsg, pushRef);
	}

	sendToUsers(pushMsg: PushMessage, userIds: Array<User['id']>) {
		this.backend.sendToUsers(pushMsg, userIds);
	}

	@OnShutdown()
	onShutdown() {
		this.backend.closeAllConnections();
	}

	/**
	 * Whether to relay a push message via pubsub channel to other instances,
	 * instead of pushing the message directly to the frontend.
	 *
	 * This is needed in two scenarios:
	 *
	 * In scaling mode, in single- or multi-main setup, in a manual execution, a
	 * worker has no connection to a frontend and so relays to all mains lifecycle
	 * events for manual executions. Only the main who holds the session for the
	 * execution will push to the frontend who commissioned the execution.
	 *
	 * In scaling mode, in multi-main setup, in a manual webhook execution, if
	 * the main who handles a webhook is not the main who created the webhook,
	 * the handler main relays execution lifecycle events to all mains. Only
	 * the main who holds the session for the execution will push events to
	 * the frontend who commissioned the execution.
	 */
	private shouldRelayViaPubSub(pushRef: string) {
		const { isWorker, isMultiMain } = this.instanceSettings;

		return isWorker || (isMultiMain && !this.hasPushRef(pushRef));
	}

	/**
	 * Relay a push message via the `n8n.commands` pubsub channel,
	 * reducing the payload size if too large.
	 *
	 * See {@link shouldRelayViaPubSub} for more details.
	 */
	private relayViaPubSub(pushMsg: PushMessage, pushRef: string) {
		const eventSizeBytes = new TextEncoder().encode(JSON.stringify(pushMsg.data)).length;

		if (eventSizeBytes <= MAX_PAYLOAD_SIZE_BYTES) {
			void this.publisher.publishCommand({
				command: 'relay-execution-lifecycle-event',
				payload: { ...pushMsg, pushRef },
			});
			return;
		}

		// too large for pubsub channel, trim it

		const pushMsgCopy = deepCopy(pushMsg);

		const toMb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(0);
		const eventMb = toMb(eventSizeBytes);
		const maxMb = toMb(MAX_PAYLOAD_SIZE_BYTES);
		const { type } = pushMsgCopy;

		this.logger.warn(`Size of "${type}" (${eventMb} MB) exceeds max size ${maxMb} MB. Trimming...`);

		if (type === 'nodeExecuteAfter') {
			pushMsgCopy.data.itemCount = pushMsgCopy.data.data.data?.main[0]?.length ?? 1;
			pushMsgCopy.data.data.data = TRIMMED_TASK_DATA_CONNECTIONS;
		} else if (type === 'executionFinished') {
			pushMsgCopy.data.rawData = ''; // prompt client to fetch from DB
		}

		void this.publisher.publishCommand({
			command: 'relay-execution-lifecycle-event',
			payload: { ...pushMsgCopy, pushRef },
		});
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
