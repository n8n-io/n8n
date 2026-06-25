import { jsonParse } from 'n8n-workflow';

import { GatewayClient } from '../GatewayClient';

interface TestSocket {
	url: string;
	readyState: number;
	send: ReturnType<typeof vi.fn>;
	close: ReturnType<typeof vi.fn>;
	emit(event: string, ...args: unknown[]): void;
}

const { wsInstances } = vi.hoisted(() => ({ wsInstances: [] as TestSocket[] }));

vi.mock('ws', () => {
	class FakeWebSocket {
		static OPEN = 1;
		readyState = 1;
		url: string;
		send = vi.fn();
		// Emit 'close' like a real socket so close()'s grace promise resolves.
		close = vi.fn((code: number = 1000) => this.emit('close', code));
		private handlers: Record<string, Array<(...args: unknown[]) => void>> = {};

		constructor(url: string) {
			this.url = url;
			wsInstances.push(this);
		}

		on(event: string, callback: (...args: unknown[]) => void) {
			(this.handlers[event] ||= []).push(callback);
			return this;
		}

		once(event: string, callback: (...args: unknown[]) => void) {
			(this.handlers[event] ||= []).push(callback);
			return this;
		}

		removeAllListeners() {
			this.handlers = {};
			return this;
		}

		emit(event: string, ...args: unknown[]) {
			(this.handlers[event] ?? []).forEach((cb) => cb.apply(undefined, args));
		}
	}
	return { default: FakeWebSocket, WebSocket: FakeWebSocket };
});

const lastWs = () => wsInstances[wsInstances.length - 1];
const emitPayload = (ws: TestSocket, payload: unknown) =>
	ws.emit('message', JSON.stringify(payload));
const lastSent = (ws: TestSocket) =>
	jsonParse<{ op: number; d: Record<string, unknown> }>(
		ws.send.mock.calls[ws.send.mock.calls.length - 1][0] as string,
	);

const HELLO = { op: 10, d: { heartbeat_interval: 45_000 } };

describe('GatewayClient', () => {
	beforeEach(() => {
		wsInstances.length = 0;
		vi.clearAllMocks();
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
			expect(() => lastWs().emit('error', new Error('ECONNRESET'))).not.toThrow();

			// The socket then closes abnormally; the client should reconnect.
			lastWs().emit('close', 1006);
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

	it('emits a fatal error on an unrecoverable close code and does not reconnect', () => {
		const client = new GatewayClient({ token: 't', intents: 1 });
		const onFatal = vi.fn();
		client.on('fatal', onFatal);
		client.connect();
		emitPayload(lastWs(), HELLO);

		const before = wsInstances.length;
		lastWs().emit('close', 4014); // disallowed (privileged) intents

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
		expect(() => lastWs().emit('message', 'not json')).not.toThrow();

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

			lastWs().emit('close', 4009); // session timed out - not resumable
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
		lastWs().emit('close', 1006);
		expect(wsInstances.length).toBe(before);
	});
});
