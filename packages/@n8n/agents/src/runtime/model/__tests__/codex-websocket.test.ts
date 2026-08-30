import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	closeCodexWebSockets,
	codexWebSocketResponse,
	setCodexSocketFactory,
	websocketHeaders,
} from '../codex-websocket';

/**
 * Minimal stand-in for the socket the transport drives. Only the surface
 * `codex-websocket` actually touches is implemented.
 */
class FakeSocket {
	static readonly OPEN = 1;

	readyState = 1;

	readonly sent: string[] = [];

	readonly url: string;

	readonly headers: Record<string, string>;

	private readonly listeners = new Map<string, Set<(event: unknown) => void>>();

	constructor(url: string, headers: Record<string, string>) {
		this.url = url;
		this.headers = headers;
		// The transport awaits `open` before resolving.
		queueMicrotask(() => this.emit('open', {}));
	}

	addEventListener(type: string, listener: (event: unknown) => void): void {
		if (!this.listeners.has(type)) this.listeners.set(type, new Set());
		this.listeners.get(type)?.add(listener);
	}

	removeEventListener(type: string, listener: (event: unknown) => void): void {
		this.listeners.get(type)?.delete(listener);
	}

	send(data: string): void {
		this.sent.push(data);
	}

	close(): void {
		this.readyState = 3;
	}

	emit(type: string, event: unknown): void {
		for (const listener of [...(this.listeners.get(type) ?? [])]) listener(event);
	}

	/** Pushes one server event, as a text frame. */
	frame(event: Record<string, unknown>): void {
		this.emit('message', { data: JSON.stringify(event) });
	}
}

const created: FakeSocket[] = [];

function useFakeSockets(): () => void {
	created.length = 0;
	return setCodexSocketFactory((url, headers) => {
		const socket = new FakeSocket(url, headers);
		created.push(socket);
		return socket;
	});
}

const headers = () =>
	new Headers({
		authorization: 'Bearer token-1',
		'chatgpt-account-id': 'acc_1',
		'OpenAI-Beta': 'responses=experimental',
		accept: 'text/event-stream',
		'content-type': 'application/json',
	});

const body = JSON.stringify({ model: 'gpt-5.6-sol', store: false, stream: true });

async function readSse(response: Response): Promise<string> {
	return await new Response(response.body).text();
}

function parseFrame(raw: string): Record<string, unknown> {
	try {
		return JSON.parse(raw) as Record<string, unknown>;
	} catch {
		throw new Error(`sent frame is not JSON: ${raw}`);
	}
}

/** Answers the pending request with a minimal well-formed sequence. */
function respondOk(socket: FakeSocket): void {
	socket.frame({ type: 'response.created' });
	socket.frame({ type: 'response.output_text.delta', delta: 'hi' });
	socket.frame({ type: 'response.completed' });
}

describe('websocketHeaders', () => {
	it('swaps the SSE beta opt-in for the WebSocket one', () => {
		const result = websocketHeaders(headers());

		expect(result['OpenAI-Beta']).toBe('responses_websockets=2026-02-06');
	});

	it('drops the SSE-only negotiation but keeps auth', () => {
		const result = websocketHeaders(headers());

		expect(result.authorization).toBe('Bearer token-1');
		expect(result['chatgpt-account-id']).toBe('acc_1');
		// Sending these on an upgrade is meaningless and Codex rejects the mix.
		expect(result.accept).toBeUndefined();
		expect(result['content-type']).toBeUndefined();
	});
});

describe('codexWebSocketResponse', () => {
	let restore: (() => void) | undefined;

	afterEach(() => {
		closeCodexWebSockets();
		restore?.();
		restore = undefined;
	});

	it('translates frames into an SSE stream the SDK parser can read', async () => {
		restore = useFakeSockets();

		const pending = codexWebSocketResponse('http://codex.test/responses', headers(), body, null);
		await vi.waitFor(() => expect(created[0]?.sent).toHaveLength(1));
		respondOk(created[0]);

		const text = await readSse(await pending);

		expect(text).toContain('data: {"type":"response.created"}');
		expect(text).toContain('"delta":"hi"');
		// The SDK needs the terminator the HTTP transport would have sent.
		expect(text.trimEnd().endsWith('data: [DONE]')).toBe(true);
	});

	it('sends the body as a response.create frame', async () => {
		restore = useFakeSockets();

		const pending = codexWebSocketResponse('http://codex.test/responses', headers(), body, null);
		await vi.waitFor(() => expect(created[0]?.sent).toHaveLength(1));
		respondOk(created[0]);
		await readSse(await pending);

		expect(parseFrame(created[0].sent[0])).toEqual({
			type: 'response.create',
			model: 'gpt-5.6-sol',
			store: false,
			stream: true,
		});
	});

	it('upgrades the URL scheme to ws', async () => {
		restore = useFakeSockets();

		const pending = codexWebSocketResponse('https://codex.test/responses', headers(), body, null);
		await vi.waitFor(() => expect(created[0]?.sent).toHaveLength(1));
		respondOk(created[0]);
		await readSse(await pending);

		expect(created[0].url).toBe('wss://codex.test/responses');
	});

	it('reuses a pooled socket for the same identity', async () => {
		restore = useFakeSockets();

		for (let i = 0; i < 2; i++) {
			const pending = codexWebSocketResponse('http://codex.test/responses', headers(), body, null);
			await vi.waitFor(() => expect(created[0]?.sent).toHaveLength(i + 1));
			respondOk(created[0]);
			await readSse(await pending);
		}

		// One handshake, two requests: that saving is the point of the transport.
		expect(created).toHaveLength(1);
		expect(created[0].sent).toHaveLength(2);
	});

	it('does not reuse a socket across identities', async () => {
		restore = useFakeSockets();

		const first = codexWebSocketResponse('http://codex.test/responses', headers(), body, null);
		await vi.waitFor(() => expect(created[0]?.sent).toHaveLength(1));
		respondOk(created[0]);
		await readSse(await first);

		const other = headers();
		other.set('authorization', 'Bearer token-2');
		const second = codexWebSocketResponse('http://codex.test/responses', other, body, null);
		await vi.waitFor(() => expect(created[1]?.sent).toHaveLength(1));
		respondOk(created[1]);
		await readSse(await second);

		expect(created).toHaveLength(2);
	});

	it('rejects before committing when the socket closes with no frame', async () => {
		restore = useFakeSockets();

		const pending = codexWebSocketResponse('http://codex.test/responses', headers(), body, null);
		await vi.waitFor(() => expect(created[0]?.sent).toHaveLength(1));
		created[0].emit('close', {});

		// Rejecting here is what lets the caller retry over SSE.
		await expect(pending).rejects.toThrow(/closed before the response completed/);
	});

	it('rejects before committing when the socket errors with no frame', async () => {
		restore = useFakeSockets();

		const pending = codexWebSocketResponse('http://codex.test/responses', headers(), body, null);
		await vi.waitFor(() => expect(created[0]?.sent).toHaveLength(1));
		created[0].emit('error', {});

		await expect(pending).rejects.toThrow(/stream failed/);
	});

	it('surfaces a mid-stream failure on the stream, once committed', async () => {
		restore = useFakeSockets();

		const pending = codexWebSocketResponse('http://codex.test/responses', headers(), body, null);
		await vi.waitFor(() => expect(created[0]?.sent).toHaveLength(1));
		created[0].frame({ type: 'response.created' });

		const response = await pending;
		created[0].emit('close', {});

		await expect(readSse(response)).rejects.toThrow(/closed before the response completed/);
	});

	it('discards a socket that failed instead of pooling it', async () => {
		restore = useFakeSockets();

		const first = codexWebSocketResponse('http://codex.test/responses', headers(), body, null);
		await vi.waitFor(() => expect(created[0]?.sent).toHaveLength(1));
		created[0].emit('close', {});
		await expect(first).rejects.toThrow();

		const second = codexWebSocketResponse('http://codex.test/responses', headers(), body, null);
		await vi.waitFor(() => expect(created[1]?.sent).toHaveLength(1));
		respondOk(created[1]);
		await readSse(await second);

		expect(created).toHaveLength(2);
	});
});
