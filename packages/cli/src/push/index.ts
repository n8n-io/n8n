import type { PushMessage } from '@n8n/api-types';
import { inProduction, Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { OnPubSubEvent, OnShutdown } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import type { Application } from 'express';
import { ServerResponse } from 'http';
import type { Server } from 'http';
import pick from 'lodash/pick';
import { InstanceSettings } from 'n8n-core';
import { deepCopy } from 'n8n-workflow';
import { parse as parseUrl } from 'url';
import { Server as WSServer } from 'ws';

import { AuthService } from '@/auth/auth.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { TypedEmitter } from '@/typed-emitter';

import { validateOriginHeaders } from './origin-validator';
import { PushConfig } from './push.config';
import { SSEPush } from './sse.push';
import type { OnPushMessage, PushResponse, SSEPushRequest, WebSocketPushRequest } from './types';
import { WebSocketPush } from './websocket.push';

type PushEvents = {
	editorUiConnected: string;
	message: OnPushMessage;
};

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
	private useWebSockets = this.config.backend === 'websocket';

	isBidirectional = this.useWebSockets;

	private backend = this.useWebSockets ? Container.get(WebSocketPush) : Container.get(SSEPush);

	constructor(
		private readonly config: PushConfig,
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
		private readonly authService: AuthService,
		private readonly publisher: Publisher,
	) {
		super();
		this.logger = this.logger.scoped('push');

		if (this.useWebSockets) this.backend.on('message', (msg) => this.emit('message', msg));
	}

	getBackend() {
		return this.backend;
	}

	/** Sets up the main express app to upgrade websocket connections */
	setupPushServer(restEndpoint: string, server: Server, app: Application) {
		if (this.useWebSockets) {
			const wsServer = new WSServer({ noServer: true });
			server.on('upgrade', (request: WebSocketPushRequest, socket, upgradeHead) => {
				if (parseUrl(request.url).pathname === `/${restEndpoint}/push`) {
					wsServer.handleUpgrade(request, socket, upgradeHead, (ws) => {
						request.ws = ws;

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
	}

	/** Sets up the push endpoint that the frontend connects to. */
	setupPushHandler(restEndpoint: string, app: Application) {
		app.use(
			`/${restEndpoint}/push`,

			this.authService.createAuthMiddleware(false),
			(req: SSEPushRequest | WebSocketPushRequest, res: PushResponse) =>
				this.handleRequest(req, res),
		);
	}

	handleRequest(req: SSEPushRequest | WebSocketPushRequest, res: PushResponse) {
		const {
			ws,
			query: { pushRef },
			user,
			headers,
		} = req;

		let connectionError = '';

		if (!pushRef) {
			connectionError = 'The query parameter "pushRef" is missing!';
		} else if (inProduction) {
			const validation = validateOriginHeaders(headers);
			if (!validation.isValid) {
				this.logger.warn(
					'Origin header does NOT match the expected origin. ' +
						`(Origin: "${headers.origin}" -> "${validation.originInfo?.host || 'N/A'}", ` +
						`Expected: "${validation.rawExpectedHost}" -> "${validation.expectedHost}", ` +
						`Protocol: "${validation.expectedProtocol}")`,
					{
						headers: pick(headers, [
							'host',
							'origin',
							'x-forwarded-proto',
							'x-forwarded-host',
							'forwarded',
						]),
					},
				);
				connectionError = 'Invalid origin!';
			}
		}

		if (connectionError) {
			if (ws) {
				ws.send(connectionError);
				ws.close(1008);
				return;
			}
			throw new BadRequestError(connectionError);
		}

		if (req.ws) {
			(this.backend as WebSocketPush).add(pushRef, user.id, req.ws);
		} else if (!this.useWebSockets) {
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

	/**
	 * Send a push message to a specific push ref.
	 *
	 * @param asBinary - Whether to send the message as a binary frames or text frames
	 */
	send(pushMsg: PushMessage, pushRef: string, asBinary: boolean = false) {
		if (this.shouldRelayViaPubSub(pushRef)) {
			this.relayViaPubSub(pushMsg, pushRef, asBinary);
			return;
		}

		this.backend.sendToOne(pushMsg, pushRef, asBinary);
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

	@OnPubSubEvent('relay-execution-lifecycle-event', { instanceType: 'main' })
	handleRelayExecutionLifecycleEvent({
		pushRef,
		asBinary,
		...pushMsg
	}: PushMessage & { asBinary: boolean; pushRef: string }) {
		if (!this.hasPushRef(pushRef)) return;
		this.send(pushMsg, pushRef, asBinary);
	}

	/**
	 * Relay a push message via the `n8n.commands` pubsub channel,
	 * reducing the payload size if too large.
	 *
	 * See {@link shouldRelayViaPubSub} for more details.
	 */
	private relayViaPubSub(pushMsg: PushMessage, pushRef: string, asBinary: boolean = false) {
		const eventSizeBytes = new TextEncoder().encode(JSON.stringify(pushMsg.data)).length;

		if (eventSizeBytes <= MAX_PAYLOAD_SIZE_BYTES) {
			void this.publisher.publishCommand({
				command: 'relay-execution-lifecycle-event',
				payload: { ...pushMsg, pushRef, asBinary },
			});
			return;
		}

		// too large for pubsub channel, trim it

		const { type } = pushMsg;
		const toMb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(0);
		const eventMb = toMb(eventSizeBytes);
		const maxMb = toMb(MAX_PAYLOAD_SIZE_BYTES);

		if (type === 'nodeExecuteAfterData') {
			this.logger.warn(
				`Size of "${type}" (${eventMb} MB) exceeds max size ${maxMb} MB. Skipping...`,
			);
			// In case of nodeExecuteAfterData, we omit the message entirely. We
			// already include the amount of items in the nodeExecuteAfter message,
			// based on which the FE will construct placeholder data. The actual
			// data is then fetched at the end of the execution.
			return;
		}

		this.logger.warn(`Size of "${type}" (${eventMb} MB) exceeds max size ${maxMb} MB. Trimming...`);

		const pushMsgCopy = deepCopy(pushMsg);

		if (pushMsgCopy.type === 'executionFinished') {
			pushMsgCopy.data.rawData = ''; // prompt client to fetch from DB
		}

		void this.publisher.publishCommand({
			command: 'relay-execution-lifecycle-event',
			payload: { ...pushMsgCopy, pushRef, asBinary },
		});
	}
}
