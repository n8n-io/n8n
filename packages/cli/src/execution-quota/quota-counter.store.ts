import { RedisClientService } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { Cluster, Redis } from 'ioredis';

/** Folded total plus admitted runs the fold has not reached yet, for one scope and period. */
export type CounterSeed = { folded: number; incoming: number; version: number };

/** Moves `folded` admitted runs out of `incoming` and sets the absolute folded total. */
export type CounterFoldUpdate = { key: string; total: number; folded: number; version: number };

export type CounterAdmitResult =
	| { status: 'admitted' }
	| { status: 'refused'; index: number }
	| { status: 'missing'; indexes: number[] };

/**
 * Per-scope quota counters. `admit` checks and counts in one atomic step, so concurrent runs
 * get distinct counts and exactly the remaining quota is admitted.
 */
export abstract class QuotaCounterStore {
	abstract admit(keys: string[], limits: number[]): Promise<CounterAdmitResult>;

	/** Undoes an admission whose started row was never written. */
	abstract release(keys: string[]): Promise<void>;

	/** Fills an empty counter. A no-op if another process seeded it first. */
	abstract seed(key: string, seed: CounterSeed, ttlMs: number): Promise<void>;

	abstract applyFold(updates: CounterFoldUpdate[]): Promise<void>;

	abstract keyPrefix(): string;
}

// Fields: f = folded total, c = admitted runs not folded yet, v = last applied fold version.
const ADMIT_SCRIPT = `
local missing = {}
for i = 1, #KEYS do
	if redis.call('HEXISTS', KEYS[i], 'v') == 0 then missing[#missing + 1] = i end
end
if #missing > 0 then
	table.insert(missing, 1, -1)
	return missing
end
for i = 1, #KEYS do
	local state = redis.call('HMGET', KEYS[i], 'f', 'c')
	if tonumber(state[1]) + tonumber(state[2]) + 1 > tonumber(ARGV[i]) then return { i } end
end
for i = 1, #KEYS do redis.call('HINCRBY', KEYS[i], 'c', 1) end
return { 0 }
`;

const RELEASE_SCRIPT = `
for i = 1, #KEYS do
	if redis.call('HEXISTS', KEYS[i], 'v') == 1 then redis.call('HINCRBY', KEYS[i], 'c', -1) end
end
return 0
`;

const SEED_SCRIPT = `
if redis.call('HEXISTS', KEYS[1], 'v') == 1 then return 0 end
redis.call('HSET', KEYS[1], 'f', ARGV[1], 'c', ARGV[2], 'v', ARGV[3])
redis.call('PEXPIRE', KEYS[1], ARGV[4])
return 1
`;

// ARGV holds (total, folded, version) per key. A missing key is skipped: its seed reads the DB.
const APPLY_FOLD_SCRIPT = `
for i = 1, #KEYS do
	local base = (i - 1) * 3
	local current = redis.call('HGET', KEYS[i], 'v')
	if current and tonumber(current) < tonumber(ARGV[base + 3]) then
		redis.call('HSET', KEYS[i], 'f', ARGV[base + 1], 'v', ARGV[base + 3])
		redis.call('HINCRBY', KEYS[i], 'c', -tonumber(ARGV[base + 2]))
	end
end
return 0
`;

@Service()
export class RedisQuotaCounterStore extends QuotaCounterStore {
	private readonly client: Redis | Cluster;

	private readonly prefix: string;

	constructor(globalConfig: GlobalConfig, redisClientService: RedisClientService) {
		super();
		// One hash-tagged prefix keeps every quota key in one cluster slot, as multi-key scripts need.
		this.prefix = redisClientService.toValidPrefix(globalConfig.redis.prefix) + ':quota';
		this.client = redisClientService.createClient({ type: 'quota(n8n)' });
	}

	keyPrefix() {
		return this.prefix;
	}

	async admit(keys: string[], limits: number[]): Promise<CounterAdmitResult> {
		const result = (await this.client.eval(
			ADMIT_SCRIPT,
			keys.length,
			...keys,
			...limits,
		)) as number[];
		if (result[0] === 0) return { status: 'admitted' };
		if (result[0] === -1) return { status: 'missing', indexes: result.slice(1).map((i) => i - 1) };
		return { status: 'refused', index: result[0] - 1 };
	}

	async release(keys: string[]): Promise<void> {
		await this.client.eval(RELEASE_SCRIPT, keys.length, ...keys);
	}

	async seed(key: string, seed: CounterSeed, ttlMs: number): Promise<void> {
		await this.client.eval(SEED_SCRIPT, 1, key, seed.folded, seed.incoming, seed.version, ttlMs);
	}

	async applyFold(updates: CounterFoldUpdate[]): Promise<void> {
		if (updates.length === 0) return;
		const args = updates.flatMap((u) => [u.total, u.folded, u.version]);
		await this.client.eval(
			APPLY_FOLD_SCRIPT,
			updates.length,
			...updates.map((u) => u.key),
			...args,
		);
	}
}

type MemoryCounter = { folded: number; incoming: number; version: number; expiresAt: number };

/** Single-main counterpart of the Redis store. One event loop makes each method atomic. */
@Service()
export class MemoryQuotaCounterStore extends QuotaCounterStore {
	private readonly counters = new Map<string, MemoryCounter>();

	keyPrefix() {
		return 'quota';
	}

	async admit(keys: string[], limits: number[]): Promise<CounterAdmitResult> {
		const counters = keys.map((key) => this.get(key));
		const missing = counters.flatMap((counter, i) => (counter ? [] : [i]));
		if (missing.length > 0) return { status: 'missing', indexes: missing };

		const present = counters.filter((c): c is MemoryCounter => c !== undefined);
		const refused = present.findIndex((c, i) => c.folded + c.incoming + 1 > limits[i]);
		if (refused >= 0) return { status: 'refused', index: refused };

		for (const counter of present) counter.incoming++;
		return { status: 'admitted' };
	}

	async release(keys: string[]): Promise<void> {
		for (const key of keys) {
			const counter = this.get(key);
			if (counter) counter.incoming--;
		}
	}

	async seed(key: string, seed: CounterSeed, ttlMs: number): Promise<void> {
		if (this.get(key)) return;
		this.counters.set(key, { ...seed, expiresAt: Date.now() + ttlMs });
	}

	async applyFold(updates: CounterFoldUpdate[]): Promise<void> {
		for (const update of updates) {
			const counter = this.get(update.key);
			if (!counter || counter.version >= update.version) continue;
			counter.folded = update.total;
			counter.incoming -= update.folded;
			counter.version = update.version;
		}
	}

	private get(key: string): MemoryCounter | undefined {
		const counter = this.counters.get(key);
		if (counter && counter.expiresAt <= Date.now()) {
			this.counters.delete(key);
			return undefined;
		}
		return counter;
	}
}
