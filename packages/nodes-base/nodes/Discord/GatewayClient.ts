import { EventEmitter } from 'events';
import type { IDataObject } from 'n8n-workflow';

const GATEWAY_VERSION = 10;
const DEFAULT_GATEWAY_URL = 'wss://gateway.discord.gg';

// Only the Gateway opcodes a read-only listener needs.
const Op = {
	DISPATCH: 0,
	HEARTBEAT: 1,
	IDENTIFY: 2,
	RESUME: 6,
	RECONNECT: 7,
	INVALID_SESSION: 9,
	HELLO: 10,
	HEARTBEAT_ACK: 11,
} as const;

// Close codes signalling an unrecoverable problem (bad token, bad intents).
// Reconnecting on these just loops, so we surface them as fatal instead.
const FATAL_CLOSE_CODES = new Set([4004, 4010, 4011, 4012, 4013, 4014]);

const MAX_RECONNECT_DELAY_MS = 30_000;
const BASE_RECONNECT_DELAY_MS = 1_000;
// Consecutive failed reconnects before the instability is surfaced at warn.
const PERSISTENT_FAILURE_ATTEMPTS = 5;

interface GatewayPayload {
	op: number;
	d?: unknown;
	s?: number | null;
	t?: string | null;
}

export type GatewayLogLevel = 'debug' | 'warn';

export interface GatewayClientOptions {
	token: string;
	/** OR-ed Gateway intent bits selecting which events Discord should send. */
	intents: number;
	/**
	 * Optional sink for lifecycle messages. Routine/self-healing lifecycle uses
	 * `debug`; `warn` is reserved for unrecoverable or persistently-failing states.
	 */
	log?: (message: string, level: GatewayLogLevel) => void;
}

/**
 * Minimal Discord Gateway WebSocket client. Handles the connection lifecycle a
 * listener needs - HELLO/heartbeat (with ACK tracking), IDENTIFY, RESUME, and
 * reconnect with backoff - and emits every dispatched event for the node to
 * filter. Dependency-light: just Node's built-in WebSocket and EventEmitter.
 *
 * Events:
 *  - 'dispatch' (type: string, data: IDataObject) - a Gateway DISPATCH event
 *  - 'fatal'    (error: Error)                     - unrecoverable, won't retry
 */
export class GatewayClient extends EventEmitter {
	private ws?: WebSocket;
	private wsAbort?: AbortController;
	private heartbeatTimer?: NodeJS.Timeout;
	private reconnectTimer?: NodeJS.Timeout;
	private lastSequence: number | null = null;
	private sessionId?: string;
	private resumeGatewayUrl?: string;
	private heartbeatAcked = true;
	private reconnectAttempts = 0;
	private closing = false;
	private botUserId?: string;

	constructor(private readonly options: GatewayClientOptions) {
		super();
	}

	/** This bot's own user id, available after the first READY. */
	getBotUserId(): string | undefined {
		return this.botUserId;
	}

	connect(): void {
		this.closing = false;
		// Defensive: never leak a previous socket if one is still attached.
		this.teardownSocket();

		const canResume = Boolean(
			this.sessionId && this.resumeGatewayUrl && this.lastSequence !== null,
		);
		const baseUrl =
			canResume && this.resumeGatewayUrl ? this.resumeGatewayUrl : DEFAULT_GATEWAY_URL;
		const url = `${baseUrl}/?v=${GATEWAY_VERSION}&encoding=json`;

		this.log(canResume ? 'connecting (will resume session)' : 'connecting');

		const controller = new AbortController();
		const socket = new WebSocket(url);
		this.ws = socket;
		this.wsAbort = controller;
		const opts = { signal: controller.signal };

		socket.addEventListener('message', (event) => this.onMessage(event.data, canResume), opts);
		socket.addEventListener('close', (event) => this.onClose(event.code), opts);
		socket.addEventListener(
			'error',
			(event) => {
				// Handle internally: an 'error' with no listener would throw, so log it
				// and let the ensuing 'close' reconnect (re-emit only if something listens).
				const message = (event as ErrorEvent).message ?? 'connection error';
				this.log(`socket error: ${message}`);
				if (this.listenerCount('error') > 0) this.emit('error', new Error(message));
			},
			opts,
		);
	}

	private log(message: string): void {
		this.options.log?.(message, 'debug');
	}

	/** Recovery-relevant trouble an operator would want to see above debug. */
	private warn(message: string): void {
		this.options.log?.(message, 'warn');
	}

	/** Permanently close the connection and stop reconnecting. */
	async close(): Promise<void> {
		this.closing = true;
		this.clearTimers();
		const socket = this.ws;
		const controller = this.wsAbort;
		this.ws = undefined;
		this.wsAbort = undefined;
		if (!socket) return;

		await new Promise<void>((resolve) => {
			// Resolve when the socket closes, with a grace cap so deactivation never hangs.
			const timer = setTimeout(resolve, 1000);
			if (typeof timer.unref === 'function') timer.unref();
			socket.addEventListener('close', () => {
				clearTimeout(timer);
				resolve();
			});
			try {
				socket.close(1000);
			} catch {
				clearTimeout(timer);
				resolve();
			}
		});

		controller?.abort();
	}

	/** Drop the current socket: remove its listeners (via abort) and close it. */
	private teardownSocket(): void {
		this.wsAbort?.abort();
		this.wsAbort = undefined;
		const socket = this.ws;
		this.ws = undefined;
		if (!socket) return;
		try {
			socket.close();
		} catch {
			// socket may already be closing/closed; nothing to do
		}
	}

	private onMessage(data: unknown, resuming: boolean): void {
		// Discord (encoding=json) sends text frames; ignore anything non-string.
		if (typeof data !== 'string') return;

		let payload: GatewayPayload;
		try {
			payload = JSON.parse(data) as GatewayPayload;
		} catch {
			return;
		}

		// A malformed frame must never throw out of 'message' (uncaught on the host).
		try {
			this.handlePayload(payload, resuming);
		} catch (error) {
			this.warn(`failed to process frame (op ${payload.op}): ${(error as Error).message}`);
		}
	}

	private handlePayload(payload: GatewayPayload, resuming: boolean): void {
		if (typeof payload.s === 'number') {
			this.lastSequence = payload.s;
		}

		switch (payload.op) {
			case Op.HELLO: {
				const interval = (payload.d as { heartbeat_interval?: number } | undefined)
					?.heartbeat_interval;
				if (!interval) {
					this.warn('received HELLO without a heartbeat interval; ignoring');
					break;
				}
				this.startHeartbeat(interval);
				if (resuming) {
					this.log('resuming session');
					this.sendResume();
				} else {
					this.log(`identifying (intents ${this.options.intents})`);
					this.sendIdentify();
				}
				break;
			}
			case Op.HEARTBEAT:
				// Discord asked for an immediate heartbeat.
				this.sendHeartbeat();
				break;
			case Op.HEARTBEAT_ACK:
				this.heartbeatAcked = true;
				break;
			case Op.DISPATCH: {
				this.reconnectAttempts = 0;
				const type = payload.t ?? '';
				if (type === 'READY') {
					const data = payload.d as {
						session_id: string;
						resume_gateway_url: string;
						user?: { id?: string };
					};
					this.sessionId = data.session_id;
					this.resumeGatewayUrl = data.resume_gateway_url;
					this.botUserId = data.user?.id;
					this.log('ready (new session established)');
				} else if (type === 'RESUMED') {
					this.log('resumed (missed events replayed)');
				}
				this.emit('dispatch', type, (payload.d ?? {}) as IDataObject);
				break;
			}
			case Op.RECONNECT:
				// Server asked us to reconnect; resume if we can.
				this.log('server requested reconnect');
				this.reconnect(true);
				break;
			case Op.INVALID_SESSION: {
				// d === true means resumable. Routine + self-healing (concurrent identifies).
				const resumable = payload.d === true;
				this.log(`session reset by Discord (resumable=${resumable}); re-establishing`);
				if (resumable) {
					this.reconnect(true);
				} else {
					// Fresh start: drop the session and re-identify after Discord's 1-5s.
					this.reconnectAttempts = 0;
					this.reconnect(false, 1000 + Math.floor(jitter() * 4000));
				}
				break;
			}
			default:
				break;
		}
	}

	private onClose(code: number): void {
		this.clearTimers();
		if (this.closing) return;

		if (FATAL_CLOSE_CODES.has(code)) {
			this.warn(`fatal close (code ${code}) - not reconnecting`);
			this.emit(
				'fatal',
				new Error(
					`Discord gateway closed with code ${code}. This usually means the bot token is invalid or a required (privileged) intent is not enabled in the Discord developer portal.`,
				),
			);
			return;
		}

		// Codes 4007 (invalid seq) and 4009 (session timed out) are not resumable.
		const resumable = code !== 4007 && code !== 4009;
		this.log(`socket closed (code ${code})`);
		this.reconnect(resumable);
	}

	private reconnect(resumable: boolean, delayMs?: number): void {
		this.clearTimers();
		if (this.closing) return;

		if (!resumable) {
			this.sessionId = undefined;
			this.resumeGatewayUrl = undefined;
			this.lastSequence = null;
		}

		this.teardownSocket();

		// An explicit delay (e.g. after INVALID_SESSION) skips backoff and the attempt counter.
		let delay = delayMs;
		if (delay === undefined) {
			const backoff = Math.min(
				BASE_RECONNECT_DELAY_MS * 2 ** this.reconnectAttempts,
				MAX_RECONNECT_DELAY_MS,
			);
			delay = backoff + Math.floor(jitter() * 500);
			this.reconnectAttempts += 1;
			if (this.reconnectAttempts === PERSISTENT_FAILURE_ATTEMPTS) {
				this.warn(`gateway connection unstable after ${this.reconnectAttempts} reconnect attempts`);
			}
		}
		this.log(
			`reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}, resumable=${resumable})`,
		);
		this.reconnectTimer = setTimeout(() => this.connect(), delay);
	}

	private startHeartbeat(interval: number): void {
		this.clearHeartbeat();
		this.heartbeatAcked = true;
		// Stagger the first beat per Discord's guidance.
		const firstDelay = Math.floor(interval * jitter());
		this.heartbeatTimer = setTimeout(() => {
			this.sendHeartbeat();
			this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), interval);
		}, firstDelay);
	}

	private sendHeartbeat(): void {
		// A missing ACK since the last beat means the connection is a zombie.
		if (!this.heartbeatAcked) {
			this.log('heartbeat not acknowledged; reconnecting');
			this.reconnect(true);
			return;
		}
		this.heartbeatAcked = false;
		this.send({ op: Op.HEARTBEAT, d: this.lastSequence });
	}

	private sendIdentify(): void {
		this.send({
			op: Op.IDENTIFY,
			d: {
				token: this.options.token,
				intents: this.options.intents,
				properties: { os: process.platform, browser: 'n8n', device: 'n8n' },
			},
		});
	}

	private sendResume(): void {
		this.send({
			op: Op.RESUME,
			d: {
				token: this.options.token,
				session_id: this.sessionId,
				seq: this.lastSequence,
			},
		});
	}

	private send(payload: GatewayPayload): void {
		if (this.ws?.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(payload));
		}
	}

	private clearHeartbeat(): void {
		if (this.heartbeatTimer) {
			clearTimeout(this.heartbeatTimer);
			clearInterval(this.heartbeatTimer);
			this.heartbeatTimer = undefined;
		}
	}

	private clearTimers(): void {
		this.clearHeartbeat();
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = undefined;
		}
	}
}

// Deterministic-enough jitter; Math.random is fine here (not security sensitive).
function jitter(): number {
	return Math.random();
}
