import { EventEmitter } from 'events';
import type { IDataObject } from 'n8n-workflow';
import { WebSocket, type RawData } from 'ws';

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

// Close codes Discord uses to signal an unrecoverable problem (bad token,
// invalid or disallowed intents, ...). Reconnecting on these just loops, so we
// surface them as a fatal error instead.
const FATAL_CLOSE_CODES = new Set([4004, 4010, 4011, 4012, 4013, 4014]);

const MAX_RECONNECT_DELAY_MS = 30_000;
const BASE_RECONNECT_DELAY_MS = 1_000;

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
	 * Optional sink for lifecycle messages. `debug` is routine breadcrumbs
	 * (connecting, identifying, heartbeats); `warn` is recovery-relevant trouble
	 * (socket errors, unacknowledged heartbeats, invalid/fatal sessions).
	 */
	log?: (message: string, level: GatewayLogLevel) => void;
}

/**
 * Minimal Discord Gateway WebSocket client. Handles the connection lifecycle a
 * listener needs - HELLO/heartbeat (with ACK tracking), IDENTIFY, RESUME, and
 * reconnect with backoff - and emits every dispatched event for the node to
 * filter. Deliberately dependency-light: just `ws` and Node's EventEmitter.
 *
 * Socket errors are handled internally (logged, then recovered via the ensuing
 * close), so a network blip can never throw an unhandled 'error' at the host.
 *
 * Events:
 *  - 'dispatch' (type: string, data: IDataObject) - a Gateway DISPATCH event
 *  - 'fatal'    (error: Error)                     - unrecoverable, won't retry
 */
export class GatewayClient extends EventEmitter {
	private ws?: WebSocket;
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

		// Defensive: never leak a previous socket if connect() is ever called
		// with one still attached.
		if (this.ws) {
			this.ws.removeAllListeners();
			try {
				this.ws.close();
			} catch {
				// already closing/closed
			}
			this.ws = undefined;
		}

		const canResume = Boolean(
			this.sessionId && this.resumeGatewayUrl && this.lastSequence !== null,
		);
		const baseUrl =
			canResume && this.resumeGatewayUrl ? this.resumeGatewayUrl : DEFAULT_GATEWAY_URL;
		const url = `${baseUrl}/?v=${GATEWAY_VERSION}&encoding=json`;

		this.log(canResume ? 'connecting (will resume session)' : 'connecting');

		const socket = new WebSocket(url);
		this.ws = socket;

		socket.on('message', (raw: RawData) => this.onMessage(raw, canResume));
		socket.on('close', (code: number) => this.onClose(code));
		socket.on('error', (error: Error) => {
			// Handle internally: EventEmitter throws if 'error' is emitted with no
			// listener, so never rely on one. Log it and let the ensuing 'close'
			// drive reconnection. Only re-emit when something is actually listening.
			this.warn(`socket error: ${error.message}`);
			if (this.listenerCount('error') > 0) this.emit('error', error);
		});
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
		this.ws = undefined;
		if (!socket) return;

		await new Promise<void>((resolve) => {
			// Resolve when the socket reports closed, with a grace cap so
			// deactivation never hangs if the close frame is slow.
			const timer = setTimeout(resolve, 1000);
			if (typeof timer.unref === 'function') timer.unref();
			socket.once('close', () => {
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

		socket.removeAllListeners();
	}

	private onMessage(raw: RawData, resuming: boolean): void {
		let payload: GatewayPayload;
		try {
			payload = JSON.parse(rawToString(raw)) as GatewayPayload;
		} catch {
			return;
		}

		// A malformed frame must never throw out of the ws 'message' listener
		// (that would surface as an uncaught exception on the host).
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
				// d === true means the session can still be resumed.
				const resumable = payload.d === true;
				this.warn(`invalid session (resumable=${resumable})`);
				if (resumable) {
					this.reconnect(true);
				} else {
					// Fresh start: reconnect() drops the dead session. Re-identify after
					// the 1-5s Discord recommends, not the inherited outage backoff.
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

		if (this.ws) {
			this.ws.removeAllListeners();
			try {
				this.ws.close();
			} catch {
				// socket may already be closing/closed; nothing to do
			}
			this.ws = undefined;
		}

		// An explicit delay (e.g. the 1-5s after INVALID_SESSION) bypasses the
		// exponential backoff and doesn't count against the attempt counter.
		let delay = delayMs;
		if (delay === undefined) {
			const backoff = Math.min(
				BASE_RECONNECT_DELAY_MS * 2 ** this.reconnectAttempts,
				MAX_RECONNECT_DELAY_MS,
			);
			delay = backoff + Math.floor(jitter() * 500);
			this.reconnectAttempts += 1;
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
			this.warn('heartbeat not acknowledged - connection looks dead, reconnecting');
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

// Discord sends JSON text frames; `ws` surfaces them as a Buffer (or Buffer[] /
// ArrayBuffer). Normalize to a string without relying on default stringification.
function rawToString(raw: RawData): string {
	if (Array.isArray(raw)) return Buffer.concat(raw).toString('utf8');
	if (Buffer.isBuffer(raw)) return raw.toString('utf8');
	return Buffer.from(raw).toString('utf8'); // ArrayBuffer
}
