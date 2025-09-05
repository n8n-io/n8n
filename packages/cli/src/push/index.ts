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
import { TRIMMED_TASK_DATA_CONNECTIONS } from '@/constants';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { TypedEmitter } from '@/typed-emitter';

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

	/**
	 * Normalizes a host by removing default ports for the given protocol.
	 * Uses native URL class for robust parsing of hosts and ports.
	 *
	 * @param host The host string (e.g., "example.com:80", "example.com", "[::1]:8080")
	 * @param protocol The protocol ('http' or 'https')
	 * @returns The normalized host string with default ports removed
	 */
	private normalizeHost(host: string, protocol: 'http' | 'https'): string {
		if (!host) return host;

		try {
			// Use URL constructor to parse the host properly
			// We need to prepend a protocol to make it a valid URL
			const url = new URL(`${protocol}://${host}`);

			// URL.host includes port, URL.hostname excludes port
			// If the port is default for the protocol, URL.host will exclude it
			// Otherwise, it will include it
			const defaultPort = protocol === 'https' ? '443' : '80';
			const actualPort = url.port || defaultPort;

			// If the port matches the default, return hostname only (strip IPv6 brackets)
			if (actualPort === defaultPort) {
				return this.stripIPv6Brackets(url.hostname);
			}

			// Return hostname:port for non-default ports (strip IPv6 brackets)
			return this.stripIPv6Brackets(url.host);
		} catch {
			// If URL parsing fails, fall back to original host
			return host;
		}
	}

	/**
	 * Strips brackets from IPv6 addresses for consistency.
	 * IPv6 brackets are URL syntax and should be removed when comparing hosts.
	 *
	 * @param hostname The hostname that may contain IPv6 brackets (e.g., "[::1]" or "[::1]:8080")
	 * @returns Hostname with IPv6 brackets removed if present (e.g., "::1" or "::1:8080")
	 */
	private stripIPv6Brackets(hostname: string): string {
		// Handle IPv6 with port: [::1]:8080 -> ::1:8080
		if (hostname.startsWith('[') && hostname.includes(']:')) {
			const closingBracket = hostname.indexOf(']:');
			const ipv6 = hostname.slice(1, closingBracket); // Extract ::1
			const port = hostname.slice(closingBracket + 2); // Extract 8080
			return `${ipv6}:${port}`;
		}
		// Handle IPv6 without port: [::1] -> ::1
		if (hostname.startsWith('[') && hostname.endsWith(']')) {
			return hostname.slice(1, -1);
		}
		return hostname;
	}

	/**
	 * Safely extracts the first value from a header that could be string or string[].
	 *
	 * @param header The header value (string or string[])
	 * @returns First header value or undefined
	 */
	private getFirstHeaderValue(header: string | string[] | undefined): string | undefined {
		if (!header) return undefined;
		if (typeof header === 'string') return header;
		return header[0]; // Take first value from array
	}

	/**
	 * Validates and normalizes a protocol value to ensure it's http or https.
	 *
	 * @param proto Protocol value from headers
	 * @returns 'http' or 'https' if valid, undefined if invalid
	 */
	private validateProtocol(proto: string | undefined): 'http' | 'https' | undefined {
		if (!proto) return undefined;
		const normalized = proto.toLowerCase().trim();
		return normalized === 'http' || normalized === 'https' ? normalized : undefined;
	}

	/**
	 * Parses the RFC 7239 Forwarded header to extract host and proto values.
	 *
	 * @param forwardedHeader The Forwarded header value (e.g., "for=192.0.2.60;proto=http;host=example.com")
	 * @returns Object with host and proto, or null if parsing fails
	 */
	private parseForwardedHeader(forwardedHeader: string): { host?: string; proto?: string } | null {
		if (!forwardedHeader || typeof forwardedHeader !== 'string') {
			return null;
		}

		try {
			// Parse the first forwarded entry (comma-separated list)
			const firstEntry = forwardedHeader.split(',')[0]?.trim();
			if (!firstEntry) return null;

			const result: { host?: string; proto?: string } = {};

			// Parse semicolon-separated key=value pairs
			const pairs = firstEntry.split(';');
			for (const pair of pairs) {
				const [key, value] = pair.split('=', 2);
				if (!key || !value) continue;

				const cleanKey = key.trim().toLowerCase();
				const cleanValue = value.trim().replace(/^["']|["']$/g, ''); // Remove quotes

				if (cleanKey === 'host') {
					result.host = cleanValue;
				} else if (cleanKey === 'proto') {
					result.proto = cleanValue;
				}
			}

			return result;
		} catch {
			return null;
		}
	}

	/**
	 * Extracts protocol and normalized host from an origin URL using native URL class.
	 *
	 * @param origin The origin URL (e.g., "https://example.com", "http://localhost:3000")
	 * @returns Object with protocol and normalized host, or null if invalid
	 */
	private parseOrigin(origin: string): { protocol: 'http' | 'https'; host: string } | null {
		if (!origin || typeof origin !== 'string') {
			return null;
		}

		try {
			const url = new URL(origin);
			const protocol = url.protocol.toLowerCase();

			if (protocol !== 'http:' && protocol !== 'https:') {
				return null;
			}

			const protocolName = protocol === 'https:' ? 'https' : 'http';

			// Use the same normalization logic - remove default ports and IPv6 brackets
			const defaultPort = protocolName === 'https' ? '443' : '80';
			const actualPort = url.port || defaultPort;

			const rawHost = actualPort === defaultPort ? url.hostname : url.host;
			const normalizedHost = this.stripIPv6Brackets(rawHost);

			return {
				protocol: protocolName,
				host: normalizedHost,
			};
		} catch {
			// Invalid URL format
			return null;
		}
	}

	handleRequest(req: SSEPushRequest | WebSocketPushRequest, res: PushResponse) {
		const {
			ws,
			query: { pushRef },
			user,
			headers,
		} = req;

		let connectionError = '';

		// Parse and normalize the origin using native URL class
		const originInfo = this.parseOrigin(headers.origin ?? '');

		if (!pushRef) {
			connectionError = 'The query parameter "pushRef" is missing!';
		} else if (!originInfo) {
			this.logger.warn('Origin header is missing or malformed', {
				origin: headers.origin,
				forwarded: headers.forwarded,
				'x-forwarded-host': headers['x-forwarded-host'],
				'x-forwarded-proto': headers['x-forwarded-proto'],
			});

			connectionError = 'Invalid origin!';
		} else if (inProduction) {
			// Extract expected host from proxy headers using same precedence logic
			let rawExpectedHost: string | undefined;
			let expectedProtocol = originInfo.protocol;

			// 1. Try RFC 7239 Forwarded header first
			const forwarded = this.parseForwardedHeader(headers.forwarded ?? '');
			if (forwarded?.host) {
				rawExpectedHost = forwarded.host;
				if (forwarded.proto) {
					const validatedProto = this.validateProtocol(forwarded.proto);
					if (validatedProto) {
						expectedProtocol = validatedProto;
					}
				}
			}
			// 2. Try X-Forwarded-Host
			else {
				const xForwardedHost = this.getFirstHeaderValue(headers['x-forwarded-host']);
				if (xForwardedHost) {
					rawExpectedHost = xForwardedHost;
					const xForwardedProto = this.getFirstHeaderValue(headers['x-forwarded-proto']);
					if (xForwardedProto) {
						const validatedProto = this.validateProtocol(xForwardedProto.split(',')[0]?.trim());
						if (validatedProto) {
							expectedProtocol = validatedProto;
						}
					}
				}
				// 3. Fallback to Host header
				else {
					rawExpectedHost = headers.host;
				}
			}

			// Normalize expected host using the determined protocol
			const normalizedExpectedHost = this.normalizeHost(rawExpectedHost ?? '', expectedProtocol);

			if (normalizedExpectedHost !== originInfo.host) {
				this.logger.warn(
					'Origin header does NOT match the expected origin. ' +
						`(Origin: "${headers.origin}" -> "${originInfo.host}", ` +
						`Expected: "${rawExpectedHost}" -> "${normalizedExpectedHost}", ` +
						`Protocol: "${expectedProtocol}")`,
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

	@OnPubSubEvent('relay-execution-lifecycle-event', { instanceType: 'main' })
	handleRelayExecutionLifecycleEvent({ pushRef, ...pushMsg }: PushMessage & { pushRef: string }) {
		if (!this.hasPushRef(pushRef)) return;
		this.send(pushMsg, pushRef);
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
