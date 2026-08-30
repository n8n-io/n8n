import { createHash } from 'node:crypto';

/**
 * WebSocket transport for the Codex Responses endpoint.
 *
 * Codex serves the same `response.*` event sequence over a WebSocket as it does
 * over SSE, so this opens (or reuses) a socket and re-emits the frames as an SSE
 * byte stream. That lets the AI SDK's existing Responses parser consume it
 * unchanged, while we skip a TLS+HTTP handshake on every turn of a conversation.
 *
 * Connections are pooled per endpoint+identity, never per conversation: no
 * request state is carried across turns, so a reused socket is indistinguishable
 * from a fresh one apart from the saved handshake.
 */

/** Beta opt-in for the WebSocket variant; differs from the SSE one. */
const OPENAI_BETA_WEBSOCKETS = 'responses_websockets=2026-02-06';

/** How long an idle socket is kept before being closed. */
const IDLE_TTL_MS = 60_000;

/** Frame types that end a response. */
const TERMINAL_EVENTS = new Set(['response.completed', 'response.done', 'response.incomplete']);

/** `readyState` value meaning the socket is usable. */
const OPEN = 1;

/**
 * The slice of the WebSocket API this transport drives.
 *
 * Structural rather than imported: `@n8n/agents` is a standalone SDK and must
 * not open connections itself, so the socket is always supplied by the host.
 */
export interface CodexSocket {
	readyState: number;
	send(data: string): void;
	close(code?: number, reason?: string): void;
	addEventListener(type: string, listener: (event: never) => void): void;
	removeEventListener(type: string, listener: (event: never) => void): void;
}

interface PooledSocket {
	socket: CodexSocket;
	busy: boolean;
	idleTimer?: ReturnType<typeof setTimeout>;
}

const pool = new Map<string, PooledSocket>();

/**
 * Pool key: the endpoint plus the caller identity. Hashed so bearer tokens are
 * not retained as map keys.
 */
function poolKey(url: string, headers: Headers): string {
	const identity = [
		url,
		headers.get('authorization') ?? '',
		headers.get('chatgpt-account-id') ?? '',
		headers.get('x-openai-internal-codex-residency') ?? '',
	].join('\n');
	return createHash('sha256').update(identity).digest('hex');
}

function httpToWsUrl(url: string): string {
	const parsed = new URL(url);
	parsed.protocol = parsed.protocol === 'http:' ? 'ws:' : 'wss:';
	return parsed.toString();
}

/** Headers for the handshake: the SSE-only negotiation is replaced, not kept. */
export function websocketHeaders(headers: Headers): Record<string, string> {
	const result: Record<string, string> = {};
	headers.forEach((value, key) => {
		const lower = key.toLowerCase();
		if (lower === 'accept' || lower === 'content-type' || lower === 'openai-beta') return;
		result[key] = value;
	});
	result['OpenAI-Beta'] = OPENAI_BETA_WEBSOCKETS;
	return result;
}

function closeQuietly(socket: CodexSocket, reason: string): void {
	try {
		socket.close(1000, reason);
	} catch {
		// Already closing or closed.
	}
}

export type SocketFactory = (url: string, headers: Record<string, string>) => CodexSocket;

/**
 * Unset by default, which disables the WebSocket transport and leaves every
 * request on SSE. The n8n backend registers a factory built on its guarded
 * outbound transport, so the upgrade still honours SSRF and proxy policy.
 */
let socketFactory: SocketFactory | undefined;

/** Registers the host's socket factory; returns a function restoring the previous one. */
export function setCodexSocketFactory(factory: SocketFactory | undefined): () => void {
	const previous = socketFactory;
	socketFactory = factory;
	return () => {
		socketFactory = previous;
	};
}

async function connect(
	url: string,
	headers: Headers,
	signal?: AbortSignal | null,
): Promise<CodexSocket> {
	if (!socketFactory) throw new Error('No Codex WebSocket factory is registered');
	const socket = socketFactory(httpToWsUrl(url), websocketHeaders(headers));

	return await new Promise<CodexSocket>((resolve, reject) => {
		const cleanup = () => {
			socket.removeEventListener('open', onOpen);
			socket.removeEventListener('error', onError);
			signal?.removeEventListener('abort', onAbort);
		};
		const onOpen = () => {
			cleanup();
			resolve(socket);
		};
		const onError = () => {
			cleanup();
			closeQuietly(socket, 'handshake_failed');
			reject(new Error('Codex WebSocket handshake failed'));
		};
		const onAbort = () => {
			cleanup();
			closeQuietly(socket, 'aborted');
			reject(new Error('Request was aborted'));
		};

		socket.addEventListener('open', onOpen);
		socket.addEventListener('error', onError);
		signal?.addEventListener('abort', onAbort);
	});
}

function scheduleExpiry(key: string, entry: PooledSocket): void {
	if (entry.idleTimer) clearTimeout(entry.idleTimer);
	entry.idleTimer = setTimeout(() => {
		if (entry.busy) return;
		closeQuietly(entry.socket, 'idle_timeout');
		pool.delete(key);
	}, IDLE_TTL_MS);
	// A pooled socket must never hold the process open on shutdown.
	entry.idleTimer.unref?.();
}

async function acquire(
	url: string,
	headers: Headers,
	signal?: AbortSignal | null,
): Promise<{ socket: CodexSocket; release: (keep: boolean) => void }> {
	const key = poolKey(url, headers);
	const cached = pool.get(key);

	if (cached && !cached.busy && cached.socket.readyState === OPEN) {
		if (cached.idleTimer) clearTimeout(cached.idleTimer);
		cached.busy = true;
		return { socket: cached.socket, release: (keep) => releaseEntry(key, cached, keep) };
	}

	const socket = await connect(url, headers, signal);

	// Only pool when the slot is free; a concurrent request keeps its own socket
	// and closes it on release rather than evicting the pooled one.
	if (!cached) {
		const entry: PooledSocket = { socket, busy: true };
		pool.set(key, entry);
		return { socket, release: (keep) => releaseEntry(key, entry, keep) };
	}

	return {
		socket,
		release: () => closeQuietly(socket, 'done'),
	};
}

function releaseEntry(key: string, entry: PooledSocket, keep: boolean): void {
	entry.busy = false;
	if (!keep || entry.socket.readyState !== OPEN) {
		closeQuietly(entry.socket, 'done');
		pool.delete(key);
		return;
	}
	scheduleExpiry(key, entry);
}

/** Closes every pooled socket. Exposed for shutdown and for tests. */
export function closeCodexWebSockets(): void {
	for (const [key, entry] of pool) {
		if (entry.idleTimer) clearTimeout(entry.idleTimer);
		closeQuietly(entry.socket, 'shutdown');
		pool.delete(key);
	}
}

async function frameToText(data: unknown): Promise<string | null> {
	if (typeof data === 'string') return data;
	if (data instanceof Blob) return await data.text();
	if (data instanceof ArrayBuffer) return new TextDecoder().decode(data);
	if (ArrayBuffer.isView(data)) {
		return new TextDecoder().decode(
			data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
		);
	}
	return null;
}

function isTerminalFrame(text: string): boolean {
	try {
		const parsed: unknown = JSON.parse(text);
		if (typeof parsed !== 'object' || parsed === null) return false;
		const type = (parsed as { type?: unknown }).type;
		return typeof type === 'string' && TERMINAL_EVENTS.has(type);
	} catch {
		// Unparsable frames are forwarded verbatim; the SDK's parser decides.
		return false;
	}
}

/**
 * Runs one request over a WebSocket and returns it as an SSE `Response`.
 *
 * Resolves only once the first frame has arrived, so that a socket which opens
 * but is then rejected (a refused beta opt-in, a stale token) still throws here
 * and lets the caller fall back to SSE. After that point the response is
 * committed and later failures surface on the stream itself.
 */
export async function codexWebSocketResponse(
	url: string,
	headers: Headers,
	body: string,
	signal: AbortSignal | null | undefined,
): Promise<Response> {
	const { socket, release } = await acquire(url, headers, signal);

	const queue: string[] = [];
	let failure: Error | undefined;
	let complete = false;
	let notify: (() => void) | undefined;

	const wake = () => {
		const resolve = notify;
		notify = undefined;
		resolve?.();
	};

	const detach = () => {
		socket.removeEventListener('message', onMessage);
		socket.removeEventListener('error', onError);
		socket.removeEventListener('close', onClose);
		signal?.removeEventListener('abort', onAbort);
	};

	function onMessage(event: MessageEvent): void {
		void (async () => {
			const text = await frameToText(event.data);
			if (!text) return;
			queue.push(text);
			if (isTerminalFrame(text)) complete = true;
			wake();
		})();
	}
	function fail(error: Error): void {
		if (!failure && !complete) failure = error;
		complete = true;
		wake();
	}
	function onError(): void {
		fail(new Error('Codex WebSocket stream failed'));
	}
	// Codex closes only after a terminal event; an earlier close is a failure.
	function onClose(): void {
		fail(new Error('Codex WebSocket closed before the response completed'));
	}
	function onAbort(): void {
		fail(new Error('Request was aborted'));
	}

	socket.addEventListener('message', onMessage);
	socket.addEventListener('error', onError);
	socket.addEventListener('close', onClose);
	signal?.addEventListener('abort', onAbort);

	try {
		socket.send(JSON.stringify({ type: 'response.create', ...JSON.parse(body) }));
	} catch (error) {
		detach();
		release(false);
		throw error instanceof Error ? error : new Error('Could not send the Codex request');
	}

	// Wait for the first frame so an early rejection is still recoverable.
	while (queue.length === 0 && !complete) {
		await new Promise<void>((resolve) => {
			notify = resolve;
		});
	}
	if (queue.length === 0 && failure) {
		detach();
		release(false);
		throw failure;
	}

	const encoder = new TextEncoder();
	const stream = new ReadableStream<Uint8Array>({
		async pull(controller) {
			while (queue.length === 0 && !complete) {
				await new Promise<void>((resolve) => {
					notify = resolve;
				});
			}

			const text = queue.shift();
			if (text !== undefined) {
				controller.enqueue(encoder.encode(`data: ${text}\n\n`));
				return;
			}

			detach();
			if (failure) {
				// A socket torn down mid-response cannot be reused.
				release(false);
				controller.error(failure);
				return;
			}
			controller.enqueue(encoder.encode('data: [DONE]\n\n'));
			release(true);
			controller.close();
		},
		cancel() {
			detach();
			release(false);
		},
	});

	return new Response(stream, {
		status: 200,
		headers: { 'content-type': 'text/event-stream' },
	});
}
