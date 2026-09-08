import { createHash, randomBytes } from 'node:crypto';

import { LockNamespace, type LockService } from '@n8n/backend-common';

import type { CacheService } from '@/services/cache/cache.service';

export interface CallbackPayload {
	actionId: string;
	value: string;
	kind?: 'approval';
	groupId?: string;
	label?: string;
}

export type CallbackMetadata = Pick<CallbackPayload, 'kind' | 'groupId'>;
type CallbackStoreMetadata = CallbackMetadata & Pick<CallbackPayload, 'label'>;

const DEFAULT_TTL_MS = 60 * 60 * 1000;
const KEY_PREFIX = 'agents:chat-callback';

/**
 * Maps short callback keys to full action payloads.
 *
 * Telegram/Discord limit callback button IDs, so buttons use an 8-char hex key
 * and this store resolves it back to the full `{actionId, value}` on click.
 * Entries are deleted on resolve (one-time use) and expire via cache TTL
 * (default 1 hour). Storage is shared across mains through {@link CacheService}.
 */
export class CallbackStore {
	constructor(
		private readonly cache: CacheService,
		private readonly lockService: LockService,
		private readonly scope: string,
		private readonly ttlMs = DEFAULT_TTL_MS,
	) {}

	/** Store a callback payload and return a short key (8 hex chars). */
	async store(
		actionId: string,
		value: string,
		metadata: CallbackStoreMetadata = {},
	): Promise<string> {
		let key: string;
		do {
			key = randomBytes(4).toString('hex');
		} while ((await this.cache.get(this.entryCacheKey(key))) !== undefined);

		const payload: CallbackPayload = { actionId, value, ...metadata };
		await this.cache.set(this.entryCacheKey(key), payload, this.ttlMs);

		if (payload.groupId) {
			const groupCacheKey = this.groupCacheKey(payload.groupId);
			const members = (await this.cache.get<string[]>(groupCacheKey)) ?? [];
			members.push(key);
			await this.cache.set(groupCacheKey, members, this.ttlMs);
		}

		return key;
	}

	/** Resolve a short key and delete it. Returns undefined if missing/expired. */
	async resolve(key: string): Promise<CallbackPayload | undefined> {
		const peek = await this.cache.get<CallbackPayload>(this.entryCacheKey(key));
		if (!peek) return undefined;

		const lockId = peek.groupId
			? `${this.scope}:group:${peek.groupId}`
			: `${this.scope}:entry:${key}`;

		return await this.lockService.withLease(LockNamespace.KNOWN_LOCKS, lockId, async () => {
			const entry = await this.cache.get<CallbackPayload>(this.entryCacheKey(key));
			if (!entry) return undefined;

			if (entry.groupId) {
				const groupCacheKey = this.groupCacheKey(entry.groupId);
				const members = (await this.cache.get<string[]>(groupCacheKey)) ?? [key];
				await this.cache.deleteMany([
					...members.map((member) => this.entryCacheKey(member)),
					groupCacheKey,
				]);
			} else {
				await this.cache.delete(this.entryCacheKey(key));
			}

			return entry;
		});
	}

	private entryCacheKey(key: string): string {
		return `${KEY_PREFIX}:${this.scope}:entry:${key}`;
	}

	private groupCacheKey(groupId: string): string {
		const hash = createHash('sha256').update(groupId).digest('hex');
		return `${KEY_PREFIX}:${this.scope}:group:${hash}`;
	}
}
