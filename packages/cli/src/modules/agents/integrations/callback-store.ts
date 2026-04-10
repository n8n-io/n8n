import { randomBytes } from 'node:crypto';

export interface CallbackPayload {
	actionId: string;
	value: string;
}

/**
 * Maps short callback keys to full action payloads.
 *
 * Some platforms limit callback data size (e.g. Telegram's 64-byte
 * `callback_data`). The Chat SDK encodes `{a: actionId, v: value}`
 * into callback data, so the combined payload must stay small.
 *
 * This store maps 8-character hex keys to the original `{actionId, value}`
 * so that buttons can use short IDs while the bridge can resolve them
 * back to full payloads on action callbacks.
 *
 * Entries are deleted on resolve (one-time use). Unresolved entries
 * auto-expire after the configured TTL (default: 1 hour).
 *
 */
export class CallbackStore {
	private readonly entries = new Map<
		string,
		{ actionId: string; value: string; expiresAt: number }
	>();

	private readonly ttlMs: number;

	private cleanupCounter = 0;

	/** Run full cleanup every N stores */
	private static readonly CLEANUP_INTERVAL = 100;

	constructor(ttlMs = 60 * 60 * 1000) {
		this.ttlMs = ttlMs;
	}

	/**
	 * Store a callback payload and return a short key.
	 */
	async store(actionId: string, value: string): Promise<string> {
		if (++this.cleanupCounter >= CallbackStore.CLEANUP_INTERVAL) {
			this.cleanup();
			this.cleanupCounter = 0;
		}

		let key: string;
		do {
			key = randomBytes(4).toString('hex'); // 8 chars
		} while (this.entries.has(key));

		this.entries.set(key, {
			actionId,
			value,
			expiresAt: Date.now() + this.ttlMs,
		});
		return key;
	}

	/**
	 * Resolve a short key back to the full payload and delete it.
	 * Returns undefined if the key is not found or expired.
	 */
	async resolve(key: string): Promise<CallbackPayload | undefined> {
		const entry = this.entries.get(key);
		if (!entry) return undefined;

		this.entries.delete(key);

		if (Date.now() > entry.expiresAt) {
			return undefined;
		}

		return { actionId: entry.actionId, value: entry.value };
	}

	private cleanup(): void {
		const now = Date.now();
		for (const [key, entry] of this.entries) {
			if (now > entry.expiresAt) {
				this.entries.delete(key);
			}
		}
	}
}
