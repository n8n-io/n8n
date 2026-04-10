import { randomBytes } from 'node:crypto';

/**
 * Maps short callback keys to full action payloads.
 *
 * Some platforms limit callback data size (e.g. Telegram's 64-byte
 * `callback_data`, WhatsApp's 20-char button labels). The Chat SDK
 * encodes `{a: actionId, v: value}` into callback data, so the
 * combined payload must stay small.
 *
 * This store maps 8-character hex keys to the original `{actionId, value}`
 * so that buttons can use short IDs while the bridge can resolve them
 * back to full payloads on action callbacks.
 *
 * Entries auto-expire after the configured TTL (default: 1 hour).
 */
export class CallbackStore {
	private readonly entries = new Map<
		string,
		{ actionId: string; value: string; expiresAt: number }
	>();

	private readonly ttlMs: number;

	constructor(ttlMs = 60 * 60 * 1000) {
		this.ttlMs = ttlMs;
	}

	/**
	 * Store a callback payload and return a short key.
	 */
	store(actionId: string, value: string): string {
		this.cleanup();
		const key = randomBytes(4).toString('hex'); // 8 chars
		this.entries.set(key, {
			actionId,
			value,
			expiresAt: Date.now() + this.ttlMs,
		});
		return key;
	}

	/**
	 * Resolve a short key back to the full payload.
	 * Returns undefined if the key is not found or expired.
	 */
	resolve(key: string): { actionId: string; value: string } | undefined {
		const entry = this.entries.get(key);
		if (!entry) return undefined;
		if (Date.now() > entry.expiresAt) {
			this.entries.delete(key);
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
