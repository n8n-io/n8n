import { randomBytes } from 'node:crypto';

import { TtlMap } from '@/utils/ttl-map';

export interface CallbackPayload {
	actionId: string;
	value: string;
	kind?: 'approval';
	groupId?: string;
}

export type CallbackMetadata = Pick<CallbackPayload, 'kind' | 'groupId'>;

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
	async store(actionId: string, value: string, metadata: CallbackMetadata = {}): Promise<string> {
		let key: string;
		do {
			key = randomBytes(4).toString('hex');
		} while (this.entries.has(key));
		this.entries.set(key, { actionId, value, ...metadata });
		return key;
	}

	/** Resolve a short key and delete it. Returns undefined if missing/expired. */
	async resolve(key: string): Promise<CallbackPayload | undefined> {
		const entry = this.entries.get(key);
		if (!entry) return undefined;
		if (entry.groupId) {
			for (const [candidateKey, candidate] of this.entries) {
				if (candidate.groupId === entry.groupId) this.entries.delete(candidateKey);
			}
		} else {
			this.entries.delete(key);
		}
		return entry;
	}

	/** Stop the background sweep timer. Call in service shutdown / test teardown. */
	dispose(): void {
		this.entries.dispose();
	}
}
