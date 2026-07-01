import { jsonParse } from 'n8n-workflow';

import { GatewayClient } from '../GatewayClient';

interface Handler {
	cb: (event: unknown) => void;
	once?: boolean;
}

// Minimal stand-in for the built-in WebSocket: records instances, stores
// addEventListener handlers (honouring { once } and an AbortController signal),
// and exposes dispatch() so tests can drive 'message' / 'close' / 'error'.
class FakeWebSocket {
	static OPEN = 1;
	readyState = 1;
	url: string;
	send = vi.fn();
	// close() dispatches 'close' like the real socket so close()'s grace promise resolves.
	close = vi.fn((code: number = 1000) => this.dispatch('close', { code }));
	private handlers: Record<string, Handler[]> = {};

	constructor(url: string) {
		this.url = url;
		wsInstances.push(this);
	}

	addEventListener(
		type: string,
		cb: (event: unknown) => void,
		opts?: { once?: boolean; signal?: AbortSignal },
	) {
		const handler: Handler = { cb, once: opts?.once };
		(this.handlers[type] ||= []).push(handler);
		opts?.signal?.addEventListener('abort', () => {
			this.handlers[type] = (this.handlers[type] ?? []).filter((h) => h !== handler);
		});
	}

	dispatch(type: string, event: unknown) {
		for (const handler of [...(this.handlers[type] ?? [])]) {
			if (handler.once) {
				this.handlers[type] = (this.handlers[type] ?? []).filter((h) => h !== handler);
			}
			handler.cb(event);
		}
	}
}

const { wsInstances } = vi.hoisted(() => ({ wsInstances: [] as FakeWebSocket[] }));

const lastWs = () => wsInstances[wsInstances.length - 1];
const emitPayload = (ws: FakeWebSocket, payload: unknown) =>
	ws.dispatch('message', { data: JSON.stringify(payload) });
const lastSent = (ws: FakeWebSocket) =>
	jsonParse<{ op: number; d: Record<string, unknown> }>(
		ws.send.mock.calls[ws.send.mock.calls.length - 1][0] as string,
	);

const HELLO = { op: 10, d: { heartbeat_interval: 45_000 } };

describe('GatewayClient', () => {
	beforeEach(() => {
		wsInstances.length = 0;
		vi.clearAllMocks();
		vi.stubGlobal('WebSocket', FakeWebSocket);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('sends IDENTIFY with the token and intents after HELLO', () => {
		const client = new GatewayClient({ token: 'bot-token', intents: 1234 });
		client.connect();

		emitPayload(lastWs(), HELLO);

		const sent = lastSent(lastWs());
		expect(sent.op).toBe(2); // Identify
		expect(sent.d.token).toBe('bot-token');
		expect(sent.d.intents).toBe(1234);

		void client.close();
	});

	it('emits dispatch events to listeners', () => {
		const client = new GatewayClient({ token: 't', intents: 1 });
		const onDispatch = vi.fn();
		client.on('dispatch', onDispatch);
		client.connect();

		emitPayload(lastWs(), HELLO);
		emitPayload(lastWs(), {
			op: 0,
			s: 1,
			t: 'READY',
			d: { session_id: 'sess-1', resume_gateway_url: 'wss://resume.example' },
		});
		emitPayload(lastWs(), {
			op: 0,
			s: 2,
			t: 'MESSAGE_CREATE',
			d: { content: 'hi', guild_id: 'g1' },
		});

		expect(onDispatch).toHaveBeenCalledWith('MESSAGE_CREATE', { content: 'hi', guild_id: 'g1' });
		void client.close();
	});

	it('reconnects when a heartbeat goes unacknowledged (zombie connection)', () => {
		vi.useFakeTimers();
		try {
			const client = new GatewayClient({ token: 't', intents: 1 });
			client.connect();
			emitPayload(lastWs(), HELLO); // heartbeat_interval 45s; first beat is staggered
			const before = wsInstances.length;

			vi.advanceTimersByTime(45_000); // first beat sent -> awaiting ACK
			vi.advanceTimersByTime(45_000); // next beat: still no ACK -> treat as dead
			vi.runOnlyPendingTimers(); // fire the reconnect backoff -> new connection

			expect(wsInstances.length).toBe(before + 1);
			void client.close();
		} finally {
			vi.useRealTimers();
		}
	});

	it('stays on the same connection while heartbeats are acknowledged', () => {
		vi.useFakeTimers();
		try {
			const client = new GatewayClient({ token: 't', intents: 1 });
			client.connect();
			emitPayload(lastWs(), HELLO);
			const before = wsInstances.length;

			vi.advanceTimersByTime(45_000); // first beat
			emitPayload(lastWs(), { op: 11 }); // HEARTBEAT_ACK
			vi.advanceTimersByTime(45_000); // next beat, previous one acked -> no reconnect
			emitPayload(lastWs(), { op: 11 });

			expect(wsInstances.length).toBe(before); // no new connection spawned
			void client.close();
		} finally {
			vi.useRealTimers();
		}
	});

	it('responds to a heartbeat request immediately', () => {
		const client = new GatewayClient({ token: 't', intents: 1 });
		client.connect();
		emitPayload(lastWs(), HELLO);
		lastWs().send.mockClear();

		emitPayload(lastWs(), { op: 1 }); // server-requested heartbeat

		expect(lastSent(lastWs()).op).toBe(1);
		void client.close();
	});

	it('RESUMEs on reconnect using the stored session', () => {
		vi.useFakeTimers();
		try {
			const client = new GatewayClient({ token: 'tok', intents: 1 });
			client.connect();
			emitPayload(lastWs(), HELLO);
			emitPayload(lastWs(), {
				op: 0,
				s: 5,
				t: 'READY',
				d: { session_id: 'sess-9', resume_gateway_url: 'wss://resume.example' },
			});

			// Server asks us to reconnect.
			emitPayload(lastWs(), { op: 7 });
			vi.runOnlyPendingTimers(); // fire the backoff timer -> new connection

			const resumed = lastWs();
			expect(resumed.url).toContain('wss://resume.example');

			emitPayload(resumed, HELLO);
			const sent = lastSent(resumed);
			expect(sent.op).toBe(6); // Resume
			expect(sent.d.session_id).toBe('sess-9');
			expect(sent.d.seq).toBe(5);

			void client.close();
		} finally {
			vi.useRealTimers();
		}
	});

	it('re-identifies promptly (within ~5s) after a non-resumable INVALID_SESSION', () => {
		vi.useFakeTimers();
		try {
			const client = new GatewayClient({ token: 'tok', intents: 7 });
			client.connect();
			emitPayload(lastWs(), HELLO);
			emitPayload(lastWs(), {
				op: 0,
				s: 1,
				t: 'READY',
				d: { session_id: 's1', resume_gateway_url: 'wss://resume.example' },
			});

			const before = wsInstances.length;
			emitPayload(lastWs(), { op: 9, d: false }); // invalid session, not resumable
			vi.advanceTimersByTime(5000); // Discord's 1-5s window - would fail at 30s backoff

			expect(wsInstances.length).toBe(before + 1);
			const fresh = lastWs();
			// Fresh start: default gateway, not the resume URL.
			expect(fresh.url).toContain('gateway.discord.gg');
			emitPayload(fresh, HELLO);
			expect(lastSent(fresh).op).toBe(2); // IDENTIFY, not RESUME (6)

			void client.close();
		} finally {
			vi.useRealTimers();
		}
	});

	it('does not throw on a socket error and reconnects via the ensuing close', () => {
		vi.useFakeTimers();
		try {
			const client = new GatewayClient({ token: 't', intents: 1 });
			client.connect();
			emitPayload(lastWs(), HELLO);

			const before = wsInstances.length;
			// No 'error' listener attached: must not throw (regression guard).
			expect(() => lastWs().dispatch('error', { message: 'ECONNRESET' })).not.toThrow();

			// The socket then closes abnormally; the client should reconnect.
			lastWs().dispatch('close', { code: 1006 });
			vi.runOnlyPendingTimers();

			expect(wsInstances.length).toBe(before + 1);
			void client.close();
		} finally {
			vi.useRealTimers();
		}
	});

	it('forwards lifecycle messages to the log callback', () => {
		const logs: string[] = [];
		const client = new GatewayClient({ token: 't', intents: 99, log: (m) => logs.push(m) });
		client.connect();
		emitPayload(lastWs(), HELLO);

		expect(logs.some((m) => m.includes('connecting'))).toBe(true);
		expect(logs.some((m) => m.includes('identifying'))).toBe(true);
		void client.close();
	});

	it('logs routine lifecycle at debug and recovery-relevant events at warn', () => {
		const entries: Array<{ message: string; level: string }> = [];
		const client = new GatewayClient({
			token: 't',
			intents: 1,
			log: (message, level) => entries.push({ message, level }),
		});
		client.on('fatal', () => {}); // consume the fatal so it isn't an unhandled 'error'
		client.connect();
		emitPayload(lastWs(), HELLO);

		// Routine lifecycle -> debug.
		expect(entries.some((e) => e.level === 'debug' && e.message.includes('connecting'))).toBe(true);
		expect(entries.some((e) => e.level === 'warn')).toBe(false);

		// A fatal close is recovery-relevant -> warn.
		lastWs().dispatch('close', { code: 4014 });
		expect(entries.some((e) => e.level === 'warn' && e.message.includes('fatal close'))).toBe(true);

		void client.close();
	});

	it('emits a fatal error on an unrecoverable close code and does not reconnect', () => {
		const client = new GatewayClient({ token: 't', intents: 1 });
		const onFatal = vi.fn();
		client.on('fatal', onFatal);
		client.connect();
		emitPayload(lastWs(), HELLO);

		const before = wsInstances.length;
		lastWs().dispatch('close', { code: 4014 }); // disallowed (privileged) intents

		expect(onFatal).toHaveBeenCalledTimes(1);
		expect(wsInstances.length).toBe(before); // no reconnect attempted
		void client.close();
	});

	it('does not throw on a malformed frame', () => {
		const client = new GatewayClient({ token: 't', intents: 1 });
		client.connect();

		// HELLO without heartbeat_interval, and a structurally odd frame.
		expect(() => emitPayload(lastWs(), { op: 10 })).not.toThrow();
		expect(() => emitPayload(lastWs(), { op: 0, t: 'READY' })).not.toThrow();
		expect(() => lastWs().dispatch('message', { data: 'not json' })).not.toThrow();

		void client.close();
	});

	it('re-identifies (not resume) after a non-resumable close code (4009)', () => {
		vi.useFakeTimers();
		try {
			const client = new GatewayClient({ token: 'tok', intents: 1 });
			client.connect();
			emitPayload(lastWs(), HELLO);
			emitPayload(lastWs(), {
				op: 0,
				s: 3,
				t: 'READY',
				d: { session_id: 's1', resume_gateway_url: 'wss://resume.example' },
			});

			lastWs().dispatch('close', { code: 4009 }); // session timed out - not resumable
			vi.runOnlyPendingTimers();

			const fresh = lastWs();
			expect(fresh.url).toContain('gateway.discord.gg'); // default, not resume URL
			emitPayload(fresh, HELLO);
			expect(lastSent(fresh).op).toBe(2); // IDENTIFY, not RESUME

			void client.close();
		} finally {
			vi.useRealTimers();
		}
	});

	it('close() resolves and stops reconnecting', async () => {
		const client = new GatewayClient({ token: 't', intents: 1 });
		client.connect();
		emitPayload(lastWs(), HELLO);

		await expect(client.close()).resolves.toBeUndefined();

		// A close arriving after teardown must not spawn a new connection.
		const before = wsInstances.length;
		lastWs().dispatch('close', { code: 1006 });
		expect(wsInstances.length).toBe(before);
	});
});
