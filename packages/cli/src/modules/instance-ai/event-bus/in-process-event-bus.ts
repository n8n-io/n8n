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

// With the durable log ON, the in-memory store is a live-delivery CACHE over
// instance_ai_events, not the source of truth: eviction bounds the cache and
// can no longer lose data (replay reads the DB through DurableEventLog).
// With the flag OFF it is today's only store, and eviction is data loss.
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
	 * each event back here (`onDrained`): durable ones enter the cache; live
	 * ones go to local SSE subscribers and — in multi-main — to sibling mains
	 * via the pubsub relay. Ephemeral events (deltas, status) carry NO id, so
	 * their SSE frames have no `id:` line and the browser's replay cursor only
	 * ever points at durable facts. The Redis sequence machinery below is never
	 * touched: the flag picks exactly one drain (INS-844's composition was
	 * cancelled), and the flag-off paths below survive only as the rollback
	 * switch until they sunset at Gate B (INS-847).
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
	 * An event handed back by the durable log's drain (flag on). Durable events
	 * (id = DB-assigned seq) enter the live-delivery cache; live ones are
	 * emitted to local SSE subscribers and relayed to sibling mains. Coalesced
	 * blocks are durable but NOT live (subscribers already saw their deltas).
	 */
	private onDrained(threadId: string, drained: DrainedEvent): void {
		const sizeBytes = Buffer.byteLength(JSON.stringify(drained.event), 'utf8');
		if (drained.id !== undefined) {
			this.cacheSequencedEvent(threadId, { id: drained.id, event: drained.event }, sizeBytes);
		}
		if (drained.live) {
			const stored: StoredEvent = {
				...(drained.id !== undefined ? { id: drained.id } : {}),
				event: drained.event,
			};
			this.emitter.emit(threadId, stored);
			this.relayToSiblings(threadId, stored, sizeBytes);
		}
	}

	/** Insert into the bounded cache without emitting (durable-log path). */
	private cacheSequencedEvent(
		threadId: string,
		sequenced: SequencedEvent,
		sizeBytes: number,
	): void {
		const events = this.getOrCreateStore(threadId);
		if (!this.insertById(events, sequenced)) return;
		this.sizeBytes.set(threadId, (this.sizeBytes.get(threadId) ?? 0) + sizeBytes);
		this.evictIfNeeded(threadId, events);
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
		// Track the shared-sequence high-water mark even without subscribers, so
		// a Redis-outage fallback keeps assigning ids above what siblings used.
		if (storedEvent.id !== undefined) {
			this.bumpLocalHighWaterMark(threadId, storedEvent.id);
		}
		if (!this.hasSubscribers(threadId)) return;
		if (storedEvent.id === undefined) {
			// Ephemeral durable-log frame: deliver live, never store (the DB seq
			// is the shared replay authority, so the cache doesn't need it).
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
	 * Events still awaiting a sequence number are intentionally excluded: they
	 * have no id yet, and once sequenced they reach subscribers live — the SSE
	 * bootstrap subscribes before calling this, so nothing is missed.
	 *
	 * Durable log ON: cache-scoped read for same-process consumers;
	 * cross-restart/cross-main replay must use DurableEventLog.getEventsAfter.
	 */
	getEventsAfter(threadId: string, afterId: number): StoredEvent[] {
		const events = this.store.get(threadId);
		if (!events) return [];
		return events.filter((e) => e.id > afterId);
	}

	getEventsForRun(threadId: string, runId: string): InstanceAiEvent[] {
		return this.getEventsForRuns(threadId, [runId]);
	}

	getEventsForRuns(threadId: string, runIds: string[]): InstanceAiEvent[] {
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
		if (this.durableLogEnabled) {
			// Cache-scoped; the durable authority is DurableEventLog.getNextEventId.
			const events = this.store.get(threadId);
			const last = events?.length ? events[events.length - 1].id : undefined;
			return (last ?? 0) + 1;
		}
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
