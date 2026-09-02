import { Logger } from '@n8n/backend-common';
import type { InstanceAiEvent } from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import type { InstanceAiEventBus, StoredEvent } from '@n8n/instance-ai';
import { EventEmitter } from 'node:events';
import { InstanceSettings } from 'n8n-core';

import { MAX_PUBSUB_PAYLOAD_BYTES } from '@/scaling/constants';
import { Publisher } from '@/scaling/pubsub/publisher.service';

import { DurableEventLog, type DrainedEvent } from './durable-event-log';

// The store below is FLAG-OFF ONLY, and these caps bound it per thread. It has
// no cap on thread COUNT and is released only when a thread is cleared, so with
// the flag off a long-lived process retains up to 2MB per thread it has served.
// Accepted for the rollback switch rather than fixed there: a global eviction
// policy on the only store is data loss (the empty-agentTree bug class), and
// the path sunsets with the flag at Gate B.
//
// With the durable log ON nothing is stored here at all: instance_ai_events is
// the source of truth, every read goes through DurableEventLog, and this bus is
// a pure fan-out (local SSE subscribers + the cross-main relay).
const MAX_EVENTS_PER_THREAD = 500;
const MAX_BYTES_PER_THREAD = 2 * 1024 * 1024; // 2 MB

/**
 * How long an idle thread's shared sequence key lives in Redis (refreshed on
 * every assignment). Generous on purpose: if it ever expires and the sequence
 * restarts at 1, clients holding stale high cursors get an empty replay
 * (recovered via run-sync / hydration), and fresh page loads re-seed their
 * cursor from `GET /messages` anyway.
 */
const SEQ_KEY_TTL_SECONDS = 14 * 24 * 60 * 60;

/** Only id-bearing events enter the store; the id is the replay cursor. */
type SequencedEvent = StoredEvent & { id: number };

@Service()
export class InProcessEventBus implements InstanceAiEventBus {
	private readonly emitter = new EventEmitter();

	private readonly store = new Map<string, SequencedEvent[]>();

	/** Approximate serialized size per thread for eviction. */
	private readonly sizeBytes = new Map<string, number>();

	/**
	 * Highest event id this main has assigned or observed per thread. The id
	 * source in single-main, and the fallback when Redis is unavailable in
	 * multi-main (kept bumped from relayed events so fallback ids stay above
	 * what siblings have already used).
	 */
	private readonly lastLocalId = new Map<string, number>();

	/**
	 * Events awaiting a sequence number (multi-main only). `publish()` stays
	 * synchronous by enqueueing here; a single per-thread drain assigns ids.
	 */
	private readonly pendingByThread = new Map<string, InstanceAiEvent[]>();

	/**
	 * The batch currently being sequenced (multi-main only): taken off the
	 * pending queue but not yet in the store. Kept visible so run-scoped reads
	 * see events across the Redis round trip.
	 */
	private readonly inFlightByThread = new Map<string, InstanceAiEvent[]>();

	private readonly drainingThreads = new Set<string>();

	private readonly seqKeyPrefix: string;

	private readonly durableLogEnabled: boolean;

	/** Store-read methods already reported under the durable log (log once). */
	private readonly warnedStoreReads = new Set<string>();

	constructor(
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
		private readonly publisher: Publisher,
		private readonly eventLog: DurableEventLog,
		globalConfig: GlobalConfig,
	) {
		this.logger = this.logger.scoped('instance-ai');
		this.seqKeyPrefix = `${globalConfig.redis.prefix}:instance-ai:event-seq:`;
		this.durableLogEnabled = globalConfig.instanceAi.durableLog;
		// Avoid warnings when many SSE clients connect (each adds a listener per thread)
		this.emitter.setMaxListeners(0);
	}

	/**
	 * Publish an event for a thread.
	 *
	 * Durable log ON: synchronous enqueue into the durable log's per-thread
	 * drain, which assigns `seq` from the DB, persists durable facts, and hands
	 * each event back here (`onDrained`) for fan-out only — live ones go to
	 * local SSE subscribers and — in multi-main — to sibling mains via the
	 * pubsub relay. Nothing is retained in this process. Ephemeral events
	 * (deltas, status) carry NO id, so their SSE frames have no `id:` line and
	 * the browser's replay cursor only ever points at durable facts. The Redis
	 * sequence machinery below is never touched: the flag picks exactly one drain
	 * (INS-844's composition was cancelled), and the flag-off paths below survive
	 * only as the rollback switch until they sunset at Gate B (INS-847).
	 *
	 * Flag OFF, single-main: assign the next local id and deliver in the same tick.
	 *
	 * Flag OFF, multi-main: enqueue and drain asynchronously — event ids come
	 * from a shared per-thread Redis sequence, so every main agrees on them and
	 * the frontend's replay cursor is valid against any main. The queue
	 * preserves publish order; each sequenced event is stored, delivered to
	 * local SSE subscribers, and relayed to sibling mains with its id.
	 */
	publish(threadId: string, event: InstanceAiEvent): void {
		// Stamp publish time once — replays (SSE reconnect, snapshot rebuilds)
		// rely on it to reconstruct real timing instead of processing time.
		// Before the durable-log branch on purpose: persisted events must carry
		// it too.
		if (event.ts === undefined) {
			event = { ...event, ts: Date.now() };
		}
		if (this.durableLogEnabled) {
			this.eventLog.publish(threadId, event, (drained) => this.onDrained(threadId, drained));
			return;
		}

		if (!this.instanceSettings.isMultiMain) {
			const id = (this.lastLocalId.get(threadId) ?? 0) + 1;
			this.lastLocalId.set(threadId, id);
			this.storeAndEmit(threadId, { id, event });
			return;
		}

		const pending = this.pendingByThread.get(threadId);
		if (pending) {
			pending.push(event);
		} else {
			this.pendingByThread.set(threadId, [event]);
		}
		void this.drainQueue(threadId);
	}

	/**
	 * An event handed back by the durable log's drain (flag on): fan it out to
	 * local SSE subscribers and sibling mains. Nothing is retained — the row is
	 * already in instance_ai_events, and every replay/run-scoped read goes to
	 * the log, so keeping a copy here would only pin memory per thread for the
	 * process lifetime. Coalesced blocks are durable but NOT live
	 * (subscribers already saw their deltas), so they fan out to nobody.
	 */
	private onDrained(threadId: string, drained: DrainedEvent): void {
		if (!drained.live) return;
		const stored: StoredEvent = {
			...(drained.id !== undefined ? { id: drained.id } : {}),
			event: drained.event,
		};
		this.emitter.emit(threadId, stored);
		this.relayToSiblings(
			threadId,
			stored,
			Buffer.byteLength(JSON.stringify(drained.event), 'utf8'),
		);
	}

	/**
	 * Assign sequence ids to queued events and dispatch them, preserving
	 * publish order. Only one drain runs per thread; events queued while a
	 * Redis round trip is in flight are picked up by the next loop iteration
	 * and sequenced as one batch (single sequence round trip).
	 */
	private async drainQueue(threadId: string): Promise<void> {
		if (this.drainingThreads.has(threadId)) return;
		this.drainingThreads.add(threadId);
		try {
			let batch = this.takePending(threadId);
			while (batch.length > 0) {
				this.inFlightByThread.set(threadId, batch);
				// Never throws — falls back to local ids on Redis failure.
				const firstId = await this.assignSequenceBlock(threadId, batch.length);
				for (let i = 0; i < batch.length; i++) {
					const stored: SequencedEvent = { id: firstId + i, event: batch[i] };
					// Serialize once: reused for the store's size accounting and the relay guard.
					const sizeBytes = Buffer.byteLength(JSON.stringify(batch[i]), 'utf8');
					this.storeAndEmit(threadId, stored, sizeBytes);
					this.relayToSiblings(threadId, stored, sizeBytes);
				}
				this.inFlightByThread.delete(threadId);
				batch = this.takePending(threadId);
			}
		} finally {
			this.inFlightByThread.delete(threadId);
			this.drainingThreads.delete(threadId);
		}
	}

	private takePending(threadId: string): InstanceAiEvent[] {
		const pending = this.pendingByThread.get(threadId);
		if (!pending) return [];
		this.pendingByThread.delete(threadId);
		return pending;
	}

	/**
	 * Reserve a contiguous block of `count` ids from the shared per-thread
	 * sequence (atomic INCRBY). On Redis failure, continue monotonically from the
	 * local high-water mark — ids stay usable for this main's connections, at the
	 * cost of possible overlap with siblings until Redis recovers.
	 *
	 * Accepted degradation: after a Redis outage the shared counter can briefly
	 * sit below this main's local high-water mark (the fallback advanced local ids
	 * that never reached Redis), so INCRBY on recovery may re-issue an id already
	 * in this main's store — `insertById` then drops it as a duplicate, i.e. a few
	 * events can be lost from the live stream during recovery. Not worth an atomic
	 * conditional-max (Lua/WATCH) here: it only bites during a Redis incident, and
	 * the persisted run snapshot reconciles the tree via `run-sync` on reconnect.
	 * (A single-main→multi-main flip mid-thread would collide the same way, but a
	 * thread only starts producing events once the license has settled isMultiMain
	 * at boot, so that path isn't reached in practice.)
	 */
	private async assignSequenceBlock(threadId: string, count: number): Promise<number> {
		try {
			const key = this.seqKey(threadId);
			const results = await this.getRedisClient()
				.multi()
				.incrby(key, count)
				.expire(key, SEQ_KEY_TTL_SECONDS)
				.exec();
			const [incrError, incrResult] = results?.[0] ?? [new Error('empty transaction result'), null];
			if (incrError) throw incrError;
			const endId = Number(incrResult);
			if (!Number.isFinite(endId)) {
				throw new Error(`non-numeric INCRBY result: ${String(incrResult)}`);
			}
			this.bumpLocalHighWaterMark(threadId, endId);
			return endId - count + 1;
		} catch (error) {
			this.logger.error(
				'Failed to assign Instance AI event sequence from Redis, falling back to local ids',
				{ threadId, error },
			);
			const firstId = (this.lastLocalId.get(threadId) ?? 0) + 1;
			this.lastLocalId.set(threadId, firstId + count - 1);
			return firstId;
		}
	}

	/**
	 * The shared sequence lives on the pubsub publisher's Redis client. Only ever
	 * reached in multi-main, which implies queue mode — where the publisher's
	 * client is initialized. Reusing it avoids a second persistent connection per
	 * main. Publishing never puts a client in subscriber mode, so running
	 * sequence commands on it is safe.
	 */
	private getRedisClient() {
		return this.publisher.getClient();
	}

	private seqKey(threadId: string): string {
		return `${this.seqKeyPrefix}${threadId}`;
	}

	private bumpLocalHighWaterMark(threadId: string, id: number): void {
		if (id > (this.lastLocalId.get(threadId) ?? 0)) {
			this.lastLocalId.set(threadId, id);
		}
	}

	private storeAndEmit(threadId: string, stored: SequencedEvent, eventSizeBytes?: number): void {
		const size = eventSizeBytes ?? Buffer.byteLength(JSON.stringify(stored.event), 'utf8');
		const events = this.getOrCreateStore(threadId);

		// Duplicate id (e.g. an event relayed twice): already stored and emitted.
		if (!this.insertById(events, stored)) return;

		this.sizeBytes.set(threadId, (this.sizeBytes.get(threadId) ?? 0) + size);

		// Evict oldest events if count or size exceeds caps
		this.evictIfNeeded(threadId, events);

		this.emitter.emit(threadId, stored);
	}

	/**
	 * Insert keeping the store sorted by id. Local events always append, but a
	 * relayed event from a concurrent producer on another main (e.g. a
	 * background task while the orchestrator runs elsewhere) can arrive with a
	 * lower id than the latest stored one. Returns false for a duplicate id.
	 */
	private insertById(events: SequencedEvent[], stored: SequencedEvent): boolean {
		if (events.length === 0 || events[events.length - 1].id < stored.id) {
			events.push(stored);
			return true;
		}
		let i = events.length - 1;
		while (i >= 0 && events[i].id > stored.id) i--;
		if (i >= 0 && events[i].id === stored.id) return false;
		events.splice(i + 1, 0, stored);
		return true;
	}

	private relayToSiblings(threadId: string, stored: StoredEvent, sizeBytes: number): void {
		if (!this.instanceSettings.isMultiMain) return;

		if (sizeBytes > MAX_PUBSUB_PAYLOAD_BYTES) {
			this.logger.warn(
				`Skipping cross-main relay of "${stored.event.type}" event (${sizeBytes} bytes exceeds ${MAX_PUBSUB_PAYLOAD_BYTES})`,
				{ threadId, runId: stored.event.runId },
			);
			return;
		}

		void this.publisher
			.publishCommand({
				command: 'relay-instance-ai-event',
				payload: { threadId, storedEvent: stored },
			})
			.catch((error: unknown) =>
				this.logger.error('Failed to relay Instance AI event to sibling mains', {
					threadId,
					error,
				}),
			);
	}

	/** A relayed event from another main, carrying its producer-assigned id
	 *  from the shared sequence (or the DB-assigned seq with the durable log
	 *  on; id-less = ephemeral, live-only). Stored/re-emitted only if this main
	 *  holds a subscription for the thread (avoids every main buffering every
	 *  thread). */
	@OnPubSubEvent('relay-instance-ai-event', { instanceType: 'main' })
	handleRelayInstanceAiEvent({
		threadId,
		storedEvent,
	}: { threadId: string; storedEvent: StoredEvent }): void {
		if (this.durableLogEnabled) {
			// Pure live delivery: seqs come from the DB (no local high-water mark to
			// track) and reconnect replay reads the log, so a relayed frame is only
			// ever needed by a subscriber attached right now. A frame delivered
			// twice is dropped client-side by its id.
			if (this.hasSubscribers(threadId)) this.emitter.emit(threadId, storedEvent);
			return;
		}
		// Track the shared-sequence high-water mark even without subscribers, so
		// a Redis-outage fallback keeps assigning ids above what siblings used.
		if (storedEvent.id !== undefined) {
			this.bumpLocalHighWaterMark(threadId, storedEvent.id);
		}
		if (!this.hasSubscribers(threadId)) return;
		if (storedEvent.id === undefined) {
			this.emitter.emit(threadId, storedEvent);
			return;
		}
		this.storeAndEmit(threadId, { id: storedEvent.id, event: storedEvent.event });
	}

	subscribe(threadId: string, handler: (storedEvent: StoredEvent) => void): () => void {
		this.emitter.on(threadId, handler);
		return () => this.emitter.off(threadId, handler);
	}

	/** Whether this main currently holds an SSE subscription for the thread. */
	hasSubscribers(threadId: string): boolean {
		return this.emitter.listenerCount(threadId) > 0;
	}

	/**
	 * Threads with events retained in this process. Always 0 under the durable
	 * log; with the flag off it grows with every thread this main has served
	 * until each is cleared.
	 */
	retainedThreadCount(): number {
		return this.store.size;
	}

	/**
	 * FLAG-OFF ONLY. Events still awaiting a sequence number are intentionally
	 * excluded: they have no id yet, and once sequenced they reach subscribers
	 * live — the SSE bootstrap subscribes before calling this, so nothing is
	 * missed. With the durable log on, use DurableEventLog.getEventsAfter.
	 */
	getEventsAfter(threadId: string, afterId: number): StoredEvent[] {
		if (this.assertNoStoreUnderDurableLog('getEventsAfter', threadId)) return [];
		const events = this.store.get(threadId);
		if (!events) return [];
		return events.filter((e) => e.id > afterId);
	}

	/** FLAG-OFF ONLY — see {@link getEventsForRuns}. */
	getEventsForRun(threadId: string, runId: string): InstanceAiEvent[] {
		// Guarded before delegating so the report names the entry point the
		// caller actually used, and so the two entry points dedupe separately.
		if (this.assertNoStoreUnderDurableLog('getEventsForRun', threadId)) return [];
		return this.getEventsForRuns(threadId, [runId]);
	}

	/**
	 * FLAG-OFF ONLY. With the durable log on nothing is stored here, so a caller
	 * must go through DurableEventLog.getEventsForRuns (via the service's
	 * `readRunEvents`, which flushes open coalesce buffers first).
	 */
	getEventsForRuns(threadId: string, runIds: string[]): InstanceAiEvent[] {
		if (this.assertNoStoreUnderDurableLog('getEventsForRuns', threadId)) return [];
		if (runIds.length === 0) return [];
		const runIdSet = new Set(runIds);
		const stored = (this.store.get(threadId) ?? [])
			.filter((e) => runIdSet.has(e.event.runId))
			.map((e) => e.event);
		// Include events still awaiting a sequence number (both the batch being
		// sequenced and the queue behind it) so same-main callers (terminal
		// outcomes, tracing, snapshots) read their own writes. A run's events are
		// produced on one main, so unsequenced ones are always newest.
		const unsequenced = [
			...(this.inFlightByThread.get(threadId) ?? []),
			...(this.pendingByThread.get(threadId) ?? []),
		].filter((e) => runIdSet.has(e.runId));
		return [...stored, ...unsequenced];
	}

	async getNextEventId(threadId: string): Promise<number> {
		// Delegated rather than guarded: unlike the store-scoped reads above this
		// one is cheap to answer correctly, and the SSE cursor it seeds must never
		// silently come back as 1.
		if (this.durableLogEnabled) return await this.eventLog.getNextEventId(threadId);
		if (this.instanceSettings.isMultiMain) {
			try {
				const value = await this.getRedisClient().get(this.seqKey(threadId));
				if (value !== null) return Number(value) + 1;
			} catch (error) {
				this.logger.warn(
					'Failed to read Instance AI event sequence from Redis, falling back to local high-water mark',
					{ threadId, error },
				);
			}
		}
		return (this.lastLocalId.get(threadId) ?? 0) + 1;
	}

	/** Clear stored events for a specific thread (e.g. on thread expiration). */
	clearThread(threadId: string): void {
		this.store.delete(threadId);
		this.sizeBytes.delete(threadId);
		this.lastLocalId.delete(threadId);
		this.pendingByThread.delete(threadId);
		this.inFlightByThread.delete(threadId);
		this.eventLog.clearThread(threadId);
		this.emitter.removeAllListeners(threadId);
		if (this.instanceSettings.isMultiMain) {
			// Every main clears on thread deletion (task-control broadcast), so the
			// shared key DEL is idempotent across mains.
			void this.getRedisClient()
				.del(this.seqKey(threadId))
				.catch((error: unknown) =>
					this.logger.warn('Failed to delete Instance AI event sequence key', {
						threadId,
						error,
					}),
				);
		}
	}

	/** Clear all stored events. Used during module shutdown. Leaves the shared
	 *  Redis sequence keys untouched — sibling mains still rely on them. */
	clear(): void {
		this.store.clear();
		this.sizeBytes.clear();
		this.lastLocalId.clear();
		this.pendingByThread.clear();
		this.inFlightByThread.clear();
		this.eventLog.clear();
		this.emitter.removeAllListeners();
	}

	/**
	 * The store is not populated under the durable log, so a read of it there is
	 * a wiring bug: the caller wants the log. Reported once per method rather
	 * than thrown — an empty result degrades a trace annotation or a replay that
	 * the log-backed path will serve anyway, where a throw would take down run
	 * finalization.
	 */
	private assertNoStoreUnderDurableLog(method: string, threadId: string): boolean {
		if (!this.durableLogEnabled) return false;
		// Once per entry point: any call is a bug, but a regression could sit in
		// a per-group loop (the flag-off replay has one), and this is a read path.
		if (!this.warnedStoreReads.has(method)) {
			this.warnedStoreReads.add(method);
			this.logger.error(
				`InProcessEventBus.${method} was read with the durable event log enabled, where nothing is stored in memory — the caller must use DurableEventLog instead`,
				{ threadId },
			);
		}
		return true;
	}

	private evictIfNeeded(threadId: string, events: SequencedEvent[]): void {
		let totalSize = this.sizeBytes.get(threadId) ?? 0;

		while (events.length > MAX_EVENTS_PER_THREAD || totalSize > MAX_BYTES_PER_THREAD) {
			const evicted = events.shift();
			if (!evicted) break;
			totalSize -= Buffer.byteLength(JSON.stringify(evicted.event), 'utf8');
		}

		this.sizeBytes.set(threadId, Math.max(0, totalSize));
	}

	private getOrCreateStore(threadId: string): SequencedEvent[] {
		let events = this.store.get(threadId);
		if (!events) {
			events = [];
			this.store.set(threadId, events);
		}
		return events;
	}
}
