import { Logger } from '@n8n/backend-common';
import { Container, Service } from '@n8n/di';
import type { Cache, Store } from 'cache-manager';

import type {
	HypervisorMessageHandler,
	HypervisorWorker,
} from '@/scaling/hypervisor-message-router';

const IPC_CACHE_TIMEOUT_MS = 5_000;

type CacheOp =
	| 'get'
	| 'set'
	| 'del'
	| 'reset'
	| 'mset'
	| 'mget'
	| 'mdel'
	| 'keys'
	| 'ttl'
	| 'expire';

export type CacheRequest = {
	type: 'cache:request';
	requestId: number;
	op: CacheOp;
	args: unknown[];
};
export type CacheResponse = { type: 'cache:response'; requestId: number; result: unknown };

/** cache-manager store + the `expire` extension CacheService calls on non-memory backends. */
export type IpcStore = Store & { expire(key: string, ttlSeconds: number): Promise<void> };
export type IpcCache = Cache<IpcStore>;

const isCacheRequest = (m: { type: string }): m is CacheRequest =>
	m.type === 'cache:request' &&
	typeof (m as CacheRequest).requestId === 'number' &&
	Array.isArray((m as CacheRequest).args);

const isCacheResponse = (m: unknown): m is CacheResponse =>
	typeof m === 'object' &&
	m !== null &&
	(m as { type?: unknown }).type === 'cache:response' &&
	typeof (m as CacheResponse).requestId === 'number';

/**
 * cache-manager store whose KV lives in the hypervisor primary, reached over the
 * cluster IPC channel. Every op is request/response, so a resolved write means the
 * primary already holds it — that is what makes a value written by one worker
 * immediately visible to every other (the staleness gap this closes).
 */
export class IpcCacheStore implements IpcStore {
	private readonly pending = new Map<
		number,
		{ resolve: (value: unknown) => void; timer: NodeJS.Timeout }
	>();

	private nextRequestId = 0;

	constructor(private readonly defaultTtlMs: number) {
		process.on('message', this.onMessage);
	}

	dispose(): void {
		process.off('message', this.onMessage);
		for (const { timer, resolve } of this.pending.values()) {
			clearTimeout(timer);
			resolve(undefined);
		}
		this.pending.clear();
	}

	async get<T>(key: string): Promise<T | undefined> {
		return (await this.request('get', [key])) as T | undefined;
	}

	async set<T>(key: string, value: T, ttl?: number): Promise<void> {
		await this.request('set', [key, value, ttl ?? this.defaultTtlMs]);
	}

	async del(key: string): Promise<void> {
		await this.request('del', [key]);
	}

	async reset(): Promise<void> {
		await this.request('reset', []);
	}

	async mset(args: Array<[string, unknown]>, ttl?: number): Promise<void> {
		await this.request('mset', [args, ttl ?? this.defaultTtlMs]);
	}

	async mget(...args: string[]): Promise<unknown[]> {
		return ((await this.request('mget', args)) as unknown[]) ?? [];
	}

	async mdel(...args: string[]): Promise<void> {
		await this.request('mdel', args);
	}

	async keys(pattern?: string): Promise<string[]> {
		return ((await this.request('keys', [pattern])) as string[]) ?? [];
	}

	async ttl(key: string): Promise<number> {
		return ((await this.request('ttl', [key])) as number) ?? 0;
	}

	async expire(key: string, ttlSeconds: number): Promise<void> {
		await this.request('expire', [key, ttlSeconds]);
	}

	private async request(op: CacheOp, args: unknown[]): Promise<unknown> {
		const requestId = this.nextRequestId++;
		return await new Promise((resolve) => {
			const timer = setTimeout(() => {
				this.pending.delete(requestId);
				Container.get(Logger).warn(`Cache IPC "${op}" timed out; treating as a miss`);
				resolve(undefined);
			}, IPC_CACHE_TIMEOUT_MS);
			this.pending.set(requestId, { resolve, timer });
			process.send?.({ type: 'cache:request', requestId, op, args } satisfies CacheRequest);
		});
	}

	private onMessage = (message: unknown) => {
		if (!isCacheResponse(message)) return;
		const entry = this.pending.get(message.requestId);
		if (!entry) return;
		clearTimeout(entry.timer);
		this.pending.delete(message.requestId);
		entry.resolve(message.result);
	};
}

type Entry = { value: unknown; expiresAt: number | null; timer?: NodeJS.Timeout };

/**
 * Primary-side shared cache. A plain KV map with per-key TTL timers — no liveness
 * semantics; unlike the registry it has no `onExit` (cache survives a worker dying).
 * Op args are trusted IPC-boundary data (the router already matched the `cache:`
 * prefix and {@link isCacheRequest} validated the envelope).
 */
@Service()
export class CacheHost implements HypervisorMessageHandler {
	readonly prefix = 'cache:';

	private readonly store = new Map<string, Entry>();

	onMessage(worker: HypervisorWorker, message: { type: string }): void {
		if (!isCacheRequest(message)) return;
		const result = this.apply(message.op, message.args);
		worker.send({
			type: 'cache:response',
			requestId: message.requestId,
			result,
		} satisfies CacheResponse);
	}

	private apply(op: CacheOp, args: unknown[]): unknown {
		switch (op) {
			case 'get':
				return this.read(args[0] as string);
			case 'set':
				this.write(args[0] as string, args[1], args[2] as number | undefined);
				return undefined;
			case 'del':
				this.remove(args[0] as string);
				return undefined;
			case 'reset':
				this.reset();
				return undefined;
			case 'mset':
				for (const [key, value] of args[0] as Array<[string, unknown]>) {
					this.write(key, value, args[1] as number | undefined);
				}
				return undefined;
			case 'mget':
				return (args as string[]).map((key) => this.read(key));
			case 'mdel':
				for (const key of args as string[]) this.remove(key);
				return undefined;
			case 'keys':
				return [...this.store.keys()];
			case 'ttl':
				return this.remainingTtl(args[0] as string);
			case 'expire':
				this.expire(args[0] as string, args[1] as number);
				return undefined;
		}
	}

	private read(key: string): unknown {
		return this.store.get(key)?.value;
	}

	private write(key: string, value: unknown, ttlMs: number | undefined): void {
		this.arm(key, { value, expiresAt: null }, ttlMs);
	}

	private remove(key: string): void {
		const entry = this.store.get(key);
		if (entry?.timer) clearTimeout(entry.timer);
		this.store.delete(key);
	}

	private reset(): void {
		for (const entry of this.store.values()) if (entry.timer) clearTimeout(entry.timer);
		this.store.clear();
	}

	private remainingTtl(key: string): number {
		const entry = this.store.get(key);
		if (!entry) return 0;
		if (entry.expiresAt === null) return -1; // present, no expiry
		return Math.max(0, entry.expiresAt - Date.now());
	}

	private expire(key: string, ttlSeconds: number): void {
		const entry = this.store.get(key);
		if (!entry) return;
		if (ttlSeconds <= 0) {
			this.remove(key);
			return;
		}
		this.arm(key, entry, ttlSeconds * 1_000);
	}

	private arm(key: string, entry: Entry, ttlMs: number | undefined): void {
		if (entry.timer) clearTimeout(entry.timer);
		if (ttlMs !== undefined && ttlMs !== 0) {
			entry.expiresAt = Date.now() + ttlMs;
			entry.timer = setTimeout(() => this.store.delete(key), ttlMs);
			entry.timer.unref();
		} else {
			entry.expiresAt = null;
			entry.timer = undefined;
		}
		this.store.set(key, entry);
	}
}
