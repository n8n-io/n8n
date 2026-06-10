import type { InstanceAiEvent, InstanceAiRichMessagesResponse } from '@n8n/api-types';
import { logger } from '@n8n/computer-use/logger';
import { EventSource } from 'eventsource';

import type { InstanceApi } from './instance-api';
import type { OAuthFlow } from './oauth/oauth-flow';

const INITIAL_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30_000;

interface ThreadConnection {
	source: EventSource | null;
	/** Cursor of the last event seen on this connection; reconnects resume from here. */
	lastSeenId: string | undefined;
	reconnectDelay: number;
	reconnectTimer: NodeJS.Timeout | undefined;
}

export interface ThreadServiceDeps {
	oauthFlow: OAuthFlow;
	instanceApi: InstanceApi;
	/** Delivers a thread event to the renderer (wired to `notifyMainWindow` in index.ts). */
	emit: (threadId: string, event: InstanceAiEvent) => void;
}

/** Events are forwarded unvalidated so newer server event types keep flowing; the shape check is structural only. */
function isThreadEvent(value: unknown): value is InstanceAiEvent {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as { type?: unknown }).type === 'string'
	);
}

/**
 * The thread (chat) domain service of the desktop app. Lives in the main process so the
 * OAuth access token never reaches the renderer and so SSE connections and the message
 * cache survive renderer reloads (this is a tray app — the window comes and goes).
 *
 * - `getMessages` returns a cached thread snapshot, fetching it once on demand.
 * - `listen`/`unlisten` open/close one SSE connection per thread to the instance's
 *   `/rest/instance-ai/events/:threadId` endpoint and forward each event via `deps.emit`.
 * - `postMessage` (composer) will be added here later.
 */
export class ThreadService {
	private readonly connections = new Map<string, ThreadConnection>();

	private readonly cache = new Map<string, InstanceAiRichMessagesResponse>();

	private readonly inFlight = new Map<string, Promise<InstanceAiRichMessagesResponse>>();

	constructor(private readonly deps: ThreadServiceDeps) {}

	/**
	 * The thread's message snapshot, cached after the first fetch so re-opening the chat
	 * view renders instantly. `refresh` bypasses the cache; concurrent calls for the same
	 * thread share one request.
	 */
	async getMessages(
		threadId: string,
		options: { refresh?: boolean } = {},
	): Promise<InstanceAiRichMessagesResponse> {
		const inFlight = this.inFlight.get(threadId);
		if (inFlight) return await inFlight;

		if (!options.refresh) {
			const cached = this.cache.get(threadId);
			if (cached) return cached;
		}

		const request = this.deps.instanceApi
			.getThreadMessages(threadId)
			.then((response) => {
				this.cache.set(threadId, response);
				return response;
			})
			.finally(() => this.inFlight.delete(threadId));
		this.inFlight.set(threadId, request);
		return await request;
	}

	/**
	 * Open the SSE event stream for a thread. Idempotent — a second call while the
	 * connection is open does nothing (in particular, a different `lastEventId` is
	 * ignored). Without a cursor the server replays the thread's whole event buffer.
	 */
	listen(threadId: string, lastEventId?: number): void {
		if (this.connections.has(threadId)) return;
		const connection: ThreadConnection = {
			source: null,
			lastSeenId: lastEventId !== undefined ? String(lastEventId) : undefined,
			reconnectDelay: INITIAL_RECONNECT_DELAY_MS,
			reconnectTimer: undefined,
		};
		this.connections.set(threadId, connection);
		this.connect(threadId, connection);
	}

	/** Close the thread's SSE connection (or cancel its pending reconnect). */
	unlisten(threadId: string): void {
		const connection = this.connections.get(threadId);
		if (!connection) return;
		this.connections.delete(threadId);
		if (connection.reconnectTimer) clearTimeout(connection.reconnectTimer);
		connection.source?.close();
	}

	/** Close all SSE connections and drop the cache (sign-out, window closed/reloaded). */
	reset(): void {
		for (const threadId of [...this.connections.keys()]) this.unlisten(threadId);
		this.cache.clear();
	}

	private connect(threadId: string, connection: ThreadConnection): void {
		const { instanceUrl } = this.deps.oauthFlow.getStatus();
		if (!instanceUrl) {
			// Signed-out race: the auth listener resets the service anyway.
			logger.warn('Thread events: not signed in, dropping connection', { threadId });
			this.connections.delete(threadId);
			return;
		}

		const base = `${instanceUrl}/rest/instance-ai/events/${encodeURIComponent(threadId)}`;
		const url =
			connection.lastSeenId !== undefined
				? `${base}?lastEventId=${encodeURIComponent(connection.lastSeenId)}`
				: base;

		// A fresh (refreshed) token is fetched per connection attempt, so reconnects
		// survive token expiry. Never route this through InstanceApi.authedFetch — its
		// 15s timeout would kill the stream.
		const source = new EventSource(url, {
			fetch: async (input, init) => {
				const token = await this.deps.oauthFlow.getValidAccessToken();
				if (!token) throw new Error('Not signed in');
				return await fetch(input, {
					...init,
					headers: { ...init?.headers, authorization: `Bearer ${token}` },
				});
			},
		});
		connection.source = source;

		source.onopen = () => {
			connection.reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
		};

		// Note: named `run-sync` control frames and `: ping` keep-alives never reach
		// `onmessage` — only the regular `id:`/`data:` event frames do.
		source.onmessage = (event) => {
			if (event.lastEventId) connection.lastSeenId = event.lastEventId;
			let parsed: unknown;
			try {
				parsed = JSON.parse(String(event.data));
			} catch {
				logger.warn('Thread events: dropping malformed event', { threadId });
				return;
			}
			if (!isThreadEvent(parsed)) {
				logger.warn('Thread events: dropping event without a type', { threadId });
				return;
			}
			this.deps.emit(threadId, parsed);
		};

		source.onerror = (event) => {
			// Stale handler after unlisten/reset, or already superseded — ignore.
			if (this.connections.get(threadId) !== connection || connection.source !== source) return;
			logger.warn('Thread events: connection error, reconnecting', {
				threadId,
				code: event.code,
				delayMs: connection.reconnectDelay,
			});
			source.close();
			connection.source = null;
			connection.reconnectTimer = setTimeout(() => {
				connection.reconnectTimer = undefined;
				this.connect(threadId, connection);
			}, connection.reconnectDelay);
			connection.reconnectDelay = Math.min(connection.reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
		};
	}
}
