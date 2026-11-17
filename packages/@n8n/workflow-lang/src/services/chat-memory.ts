/**
 * The `chatMemory` service of `ctx.service` (spec 9.9): the session store of
 * the window buffer memory, with the rules of the v1 node `memoryBufferWindow`
 * (`docs/compiler-plan.md`, "Memory"). The store is in the memory of the
 * process that answers the services. A restart of that process forgets all
 * sessions, as a restart of n8n does for v1. Nothing goes to a database.
 *
 * The workflow of a call is the workflow of the execution, never one that
 * the args name: a call cannot read or change a session of another workflow.
 */
import type { ServiceAnswer, ServiceCallEvent } from './data-table.ts';

/** v1 drops a session that no memory node used for more than one hour. */
export const CHAT_MEMORY_IDLE_MS = 60 * 60 * 1000;

/**
 * The fallback host sets the time of a session after the store answered `open`.
 * The store waits this much longer before it takes new sessions again, so the
 * host has dropped each of its sessions by then.
 */
export const CHAT_MEMORY_HOST_MARGIN_MS = 10 * 60 * 1000;

/** The bytes that the store counts for a session and for a message, on top of their text. */
const SESSION_BYTES = 64;
const MESSAGE_BYTES = 16;

interface ChatMessage {
	ai: boolean;
	text: string;
}

interface Session {
	/** v1 fixes the window when it makes the session. */
	window: number;
	lastOpen: number;
	messages: ChatMessage[];
	bytes: number;
}

export interface ChatMemoryOptions {
	/**
	 * The byte limit of the store. At the limit the store takes no new session:
	 * `open` answers `{ host: true }`. A session that is in the store has no limit, as in v1.
	 */
	maxBytes: number;
	/** The clock, in milliseconds. The default is `Date.now`. */
	now?: () => number;
}

function utf8Length(text: string): number {
	return Buffer.byteLength(text, 'utf8');
}

export class ChatMemoryStore {
	private readonly sessions = new Map<string, Session>();

	private readonly maxBytes: number;

	private readonly now: () => number;

	private used = 0;

	/** The time of the last `open` that the store sent to the fallback host. */
	private lastHostOpen: number | undefined;

	constructor(options: ChatMemoryOptions) {
		this.maxBytes = options.maxBytes;
		this.now = options.now ?? Date.now;
	}

	/** The bytes that the store counts now. */
	get bytes(): number {
		return this.used;
	}

	get sessionCount(): number {
		return this.sessions.size;
	}

	/**
	 * Runs one call for the workflow `workflowId`.
	 *
	 * - `open { sessionKey, window }`: drops each session whose last `open` is more than one
	 *   hour ago, then touches the session or makes it. It answers `{}`, or `{ host: true }`
	 *   when the store does not take the new session: the caller runs the cluster in the
	 *   fallback host.
	 * - `load { sessionKey }`: answers `{ messages }`, the last `2 * window` messages.
	 * - `save { sessionKey, input, output }`: adds the two messages.
	 *
	 * A `load` or `save` of a session that is not in the store reads nothing and keeps
	 * nothing: the process started again after the `open`, and v1 has lost the session then.
	 */
	run(call: ServiceCallEvent, workflowId: string): ServiceAnswer {
		const args = call.args ?? {};
		if (!workflowId) return { ok: false, error: { message: 'The call has no workflow' } };
		const sessionKey = args.sessionKey;
		if (typeof sessionKey !== 'string' || sessionKey === '') {
			return { ok: false, error: { message: `Invalid chat memory call "${call.op}"` } };
		}
		// The key of v1's `MemoryChatBufferSingleton`.
		const key = `${workflowId}__${sessionKey}`;
		if (call.op === 'open') return { ok: true, result: this.open(key, args.window) };
		if (call.op === 'load') {
			const session = this.sessions.get(key);
			const messages =
				session && session.window > 0 ? session.messages.slice(-2 * session.window) : [];
			return { ok: true, result: { messages: messages.map((m) => ({ ...m })) } };
		}
		if (call.op === 'save') {
			const session = this.sessions.get(key);
			if (session) {
				this.add(session, false, String(args.input ?? ''));
				this.add(session, true, String(args.output ?? ''));
			}
			return { ok: true, result: {} };
		}
		return { ok: false, error: { message: `Invalid chat memory call "${call.op}"` } };
	}

	private open(key: string, window: unknown): { host?: true } {
		const now = this.now();
		for (const [k, session] of this.sessions) {
			// The comparison of v1: `last_accessed < oneHourAgo`.
			if (session.lastOpen < now - CHAT_MEMORY_IDLE_MS) {
				this.used -= session.bytes;
				this.sessions.delete(k);
			}
		}
		const known = this.sessions.get(key);
		if (known) {
			known.lastOpen = now;
			return {};
		}
		// A session that the host got can have messages there until the host drops it.
		const hostHasSessions =
			this.lastHostOpen !== undefined &&
			this.lastHostOpen >= now - CHAT_MEMORY_IDLE_MS - CHAT_MEMORY_HOST_MARGIN_MS;
		const bytes = SESSION_BYTES + utf8Length(key);
		if (hostHasSessions || this.used + bytes > this.maxBytes) {
			this.lastHostOpen = now;
			return { host: true };
		}
		const count = typeof window === 'number' && Number.isFinite(window) ? Math.floor(window) : 5;
		this.sessions.set(key, { window: Math.max(count, 0), lastOpen: now, messages: [], bytes });
		this.used += bytes;
		return {};
	}

	private add(session: Session, ai: boolean, text: string): void {
		session.messages.push({ ai, text });
		const bytes = MESSAGE_BYTES + utf8Length(text);
		session.bytes += bytes;
		this.used += bytes;
	}
}
