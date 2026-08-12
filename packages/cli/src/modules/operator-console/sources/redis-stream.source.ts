import type {
	OperatorLogBatch,
	OperatorLogFilter,
	OperatorLogHost,
	OperatorLogReadResult,
	OperatorLogRecord,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig, GlobalConfig } from '@n8n/config';
import { OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { sleep } from '@n8n/utils/sleep';
import type { Cluster as MultiNodeClient, Redis as SingleNodeClient } from 'ioredis';

import { RedisClientService } from '@/services/redis-client.service';

import type { LogReadOptions, LogSource, Unsubscribe } from './log-source';
import type { LogFilterPredicate } from '../producer/log-filter';
import { compileFilter } from '../producer/log-filter';
import {
	buildLogStreamKey,
	compareStreamIds,
	decodeLogStreamEntry,
	LOG_STREAM_FIELDS,
} from '../producer/log-stream-entry';
import { EMPTY_CURSOR, OPERATOR_CONSOLE_SCOPE } from '../operator-console.constants';

type RedisClient = SingleNodeClient | MultiNodeClient;

/** ioredis returns each entry as `[id, [field, value, field, value, ...]]`. */
type RawEntry = [id: string, fields: string[]];

/** Entries examined per `read()` before giving up, however few matched. */
const MAX_ENTRIES_SCANNED_PER_READ = 2000;

/** Entries examined by `hosts()`. A host that quiet is not worth listing. */
const HOSTS_SCAN_ENTRIES = 500;

/**
 * How long each blocking read parks for. Short enough that an unsubscribe stops
 * the loop promptly, long enough that an idle tail is not a poll.
 */
const TAIL_BLOCK_MS = 5000;

/** Backoff after a failed blocking read, so a Redis outage is not a spin loop. */
const TAIL_ERROR_BACKOFF_MS = 1000;

type Subscription = {
	predicate: LogFilterPredicate;
	onBatch: (batch: OperatorLogBatch) => void;
};

/**
 * `LogSource` over the cross-host Redis Stream that producers `XADD` into.
 *
 * Only meaningful in queue mode. Outside it every method answers empty rather
 * than throwing, so the composite source can hold an instance of this
 * unconditionally and stay free of deployment-mode branching.
 */
@Service()
export class RedisStreamSource implements LogSource {
	private readonly streamKey: string;

	private readonly isQueueMode: boolean;

	/** Non-blocking client for `XRANGE`/`XREVRANGE`. Created on first use. */
	private queryClient?: RedisClient;

	/**
	 * Blocking client for the tail. Separate because `XREAD BLOCK` monopolizes its
	 * connection — sharing one would stall every scrollback read behind the tail.
	 */
	private tailClient?: RedisClient;

	private readonly subscriptions = new Set<Subscription>();

	private tailRunning = false;

	constructor(
		private readonly logger: Logger,
		private readonly redisClientService: RedisClientService,
		executionsConfig: ExecutionsConfig,
		globalConfig: GlobalConfig,
	) {
		this.logger = this.logger.scoped(OPERATOR_CONSOLE_SCOPE);
		this.isQueueMode = executionsConfig.mode === 'queue';
		this.streamKey = buildLogStreamKey(globalConfig.redis.prefix);
	}

	async read(options: LogReadOptions): Promise<OperatorLogReadResult> {
		if (!this.isQueueMode) return { records: [], nextCursor: EMPTY_CURSOR, gap: false };

		const { since, filter, limit } = options;
		const client = this.getQueryClient();
		const predicate = compileFilter(filter);

		const gap = since === undefined ? false : await this.hasGapBefore(since);

		const records: OperatorLogRecord[] = [];
		let cursor = since ?? EMPTY_CURSOR;
		let scanned = 0;

		/**
		 * Ranges are inclusive on both ends, so each page re-reads the entry it
		 * started from and we skip it explicitly. Redis 6.2's exclusive `(` ranges
		 * would be tidier but needlessly raise the supported-version floor.
		 */
		let alreadyRead = since;
		let exhausted = false;

		while (records.length < limit && scanned < MAX_ENTRIES_SCANNED_PER_READ && !exhausted) {
			const chunk = await this.xrange(client, alreadyRead ?? '-', Math.min(limit, 200) + 1);
			if (chunk.length === 0) break;

			for (const [id, fields] of chunk) {
				if (id === alreadyRead) continue;

				// Checked per entry rather than per record: a batch is kept whole, since
				// slicing mid-entry would leave the cursor on an entry we only partly
				// delivered and it would replay on the next read.
				if (records.length >= limit || scanned >= MAX_ENTRIES_SCANNED_PER_READ) {
					exhausted = true;
					break;
				}

				scanned++;
				cursor = id;

				const entry = decodeLogStreamEntry(fields);
				if (!entry) continue;

				for (const record of entry.records) if (predicate(record)) records.push(record);
			}

			const lastId = chunk.at(-1)?.[0];
			if (lastId === undefined || lastId === alreadyRead) break; // no forward progress
			alreadyRead = lastId;
		}

		return { records, nextCursor: cursor, gap };
	}

	subscribe(filter: OperatorLogFilter, onBatch: (batch: OperatorLogBatch) => void): Unsubscribe {
		if (!this.isQueueMode) return () => {};

		const subscription: Subscription = { predicate: compileFilter(filter), onBatch };
		this.subscriptions.add(subscription);

		void this.runTail();

		let unsubscribed = false;
		return () => {
			if (unsubscribed) return;
			unsubscribed = true;
			this.subscriptions.delete(subscription);
		};
	}

	async hosts(): Promise<OperatorLogHost[]> {
		if (!this.isQueueMode) return [];

		const client = this.getQueryClient();
		const entries = await this.xrevrange(client, HOSTS_SCAN_ENTRIES);

		// Walking newest-first means the first sighting of a host is its latest, so
		// the `host`/`role`/`ts` fields answer this without parsing any records.
		const seen = new Map<string, OperatorLogHost>();
		for (const [, fields] of entries) {
			const meta = readMetaFields(fields);
			if (!meta || seen.has(meta.hostId)) continue;
			seen.set(meta.hostId, meta);
		}

		return [...seen.values()];
	}

	@OnShutdown()
	shutdown() {
		this.subscriptions.clear();
		this.queryClient?.disconnect();
		this.queryClient = undefined;
		this.tailClient?.disconnect();
		this.tailClient = undefined;
	}

	// #region Internals

	/**
	 * True when the caller's cursor predates the oldest surviving entry, meaning
	 * `MAXLEN` evicted whatever came next. Reporting a silently-partial window is
	 * the failure mode this exists to prevent.
	 */
	private async hasGapBefore(since: string): Promise<boolean> {
		const [oldest] = await this.xrange(this.getQueryClient(), '-', 1);
		if (!oldest) return false;

		return compareStreamIds(since, oldest[0]) < 0;
	}

	private async runTail() {
		if (this.tailRunning) return;
		this.tailRunning = true;

		let cursor = '$'; // only what arrives from now on; scrollback is `read()`'s job

		try {
			const client = this.getTailClient();

			while (this.subscriptions.size > 0) {
				let entries: RawEntry[];

				try {
					entries = await this.xread(client, cursor);
				} catch (error) {
					this.logger.warn('Operator console log tail read failed', { error });
					await sleep(TAIL_ERROR_BACKOFF_MS);
					continue;
				}

				for (const [id, fields] of entries) {
					cursor = id;
					this.dispatch(fields);
				}
			}
		} catch (error) {
			this.logger.error('Operator console log tail stopped', { error });
		} finally {
			this.tailRunning = false;
			this.tailClient?.disconnect();
			this.tailClient = undefined;

			// A subscriber that arrived while this loop was winding down would have
			// found `tailRunning` still set and skipped starting one of its own.
			if (this.subscriptions.size > 0) void this.runTail();
		}
	}

	/**
	 * One stream entry is already one host's batch, so it forwards as one callback
	 * — never one per line.
	 */
	private dispatch(fields: string[]) {
		const entry = decodeLogStreamEntry(fields);
		if (!entry) return;

		for (const { predicate, onBatch } of this.subscriptions) {
			const records = entry.records.filter(predicate);

			// A drop-only batch still goes through: the console needs the marker.
			if (records.length === 0 && entry.dropped === 0) continue;

			try {
				onBatch({ hostId: entry.hostId, records, dropped: entry.dropped });
			} catch (error) {
				this.logger.warn('Operator console subscriber threw on a log batch', { error });
			}
		}
	}

	private async xrange(client: RedisClient, from: string, count: number): Promise<RawEntry[]> {
		return await client.xrange(this.streamKey, from, '+', 'COUNT', count);
	}

	private async xrevrange(client: RedisClient, count: number): Promise<RawEntry[]> {
		return await client.xrevrange(this.streamKey, '+', '-', 'COUNT', count);
	}

	private async xread(client: RedisClient, cursor: string): Promise<RawEntry[]> {
		const result = await client.xread('BLOCK', TAIL_BLOCK_MS, 'STREAMS', this.streamKey, cursor);

		if (!result) return []; // block elapsed with nothing new

		return result.flatMap(([, entries]) => entries);
	}

	private getQueryClient(): RedisClient {
		this.queryClient ??= this.redisClientService.createClient({ type: 'log-tail(n8n)' });
		return this.queryClient;
	}

	private getTailClient(): RedisClient {
		this.tailClient ??= this.redisClientService.createClient({ type: 'log-tail(n8n)' });
		return this.tailClient;
	}

	// #endregion
}

function readMetaFields(fields: string[]): OperatorLogHost | null {
	const raw = new Map<string, string>();
	for (let i = 0; i + 1 < fields.length; i += 2) raw.set(fields[i], fields[i + 1]);

	const hostId = raw.get(LOG_STREAM_FIELDS.host);
	const role = raw.get(LOG_STREAM_FIELDS.role);

	if (!hostId || (role !== 'main' && role !== 'worker' && role !== 'webhook')) return null;

	return { hostId, role, lastSeenAt: raw.get(LOG_STREAM_FIELDS.ts) ?? new Date().toISOString() };
}
