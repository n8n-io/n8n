import { randomBytes } from 'node:crypto';

import { TtlMap } from '@/utils/ttl-map';

export interface CallbackPayload {
	actionId: string;
	value: string;
}

/**
 * Maps short callback keys to full action payloads.
 *
 * Telegram limits `callback_data` to 64 bytes, so buttons use an 8-char hex
 * key and this store resolves it back to the full `{actionId, value}` on
 * click. Entries are deleted on resolve (one-time use); unresolved entries
 * auto-expire via the underlying TtlMap (default 1 hour).
 */
export class CallbackStore {
	private readonly entries: TtlMap<string, CallbackPayload>;

	constructor(ttlMs = 60 * 60 * 1000) {
		this.entries = new TtlMap<string, CallbackPayload>(ttlMs);
	}

	/** Store a callback payload and return a short key (8 hex chars). */
	async store(actionId: string, value: string): Promise<string> {
		let key: string;
		do {
			key = randomBytes(4).toString('hex');
		} while (this.entries.has(key));
		this.entries.set(key, { actionId, value });
		return key;
	}

	/** Resolve a short key and delete it. Returns undefined if missing/expired. */
	async resolve(key: string): Promise<CallbackPayload | undefined> {
		const entry = this.entries.get(key);
		if (!entry) return undefined;
		this.entries.delete(key);
		return entry;
	}

	/** Stop the background sweep timer. Call in service shutdown / test teardown. */
	dispose(): void {
		this.entries.dispose();
	}
}
