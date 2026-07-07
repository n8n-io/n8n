import type { InstanceAiEvent } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { StoredEvent } from '@n8n/instance-ai';

import { DurableLogMetrics } from './durable-log-metrics';
import { InstanceAiEventLogRepository } from '../repositories/instance-ai-event-log.repository';

/**
 * Rule: streaming granularity ≠ persistence granularity. Deltas are transport;
 * steps are state (see RFC: instance-ai durable event log).
 *
 * Every published event is exactly one of:
 * - EPHEMERAL  — live-emitted with NO seq (SSE frame without `id:`, so the
 *   browser replay cursor never points at it); never persisted. Text/reasoning
 *   deltas are additionally buffered for coalescing.
 * - COALESCED  — the buffered deltas of a completed block, flushed as ONE
 *   persisted row immediately before the next structural fact. Never
 *   live-emitted (live clients already saw the deltas).
 * - STRUCTURAL — persisted with a seq AND live-emitted. These are the facts
 *   the fold reconstructs state from.
 *
 * Live stream = ephemeral + structural. Replay stream = coalesced + structural.
 * Both are complete; a block always flushes before the fact that follows it,
 * so any cursor taken from a structural fact replays exactly the missing tail.
 */
const EPHEMERAL_TYPES = new Set(['text-delta', 'reasoning-delta', 'status', 'filesystem-request']);

/** Retries per batch on (threadId, seq) PK collision before giving up. */
const MAX_APPEND_ATTEMPTS = 5;

/** How a drained event reaches the bus. `id` set = durable; `live` = emit to SSE. */
export interface DrainedEvent {
	id?: number;
	event: InstanceAiEvent;
	live: boolean;
}

interface PendingEvent {
	event: InstanceAiEvent;
	enqueuedAt: number;
}

interface CoalesceBuffer {
	text: string[];
	reasoning: string[];
	/** responseId of the segment being coalesced — carried on the flushed block
	 *  so the reducer can REPLACE the segment's streamed deltas on replay. */
	textResponseId?: string;
	reasoningResponseId?: string;
}

type EmitFn = (drained: DrainedEvent) => void;

@Service()
export class DurableEventLog {
	/** publish() stays synchronous: events queue here, a per-thread drain assigns seq. */
	private readonly pendingByThread = new Map<string, PendingEvent[]>();

	/** In-flight drain per thread, awaited by flush(). */
	private readonly draining = new Map<string, Promise<void>>();

	/** Last assigned seq per thread; lazily seeded from MAX(seq) in the DB. */
	private readonly lastSeq = new Map<string, number>();

	/** Open text/reasoning blocks per thread, keyed `${runId}:${agentId}`. */
	private readonly buffers = new Map<string, Map<string, CoalesceBuffer>>();

	private readonly emitters = new Map<string, EmitFn>();

	constructor(
		private readonly logger: Logger,
		private readonly repo: InstanceAiEventLogRepository,
		private readonly metrics: DurableLogMetrics,
	) {
		this.logger = this.logger.scoped('instance-ai');
	}

	/** Synchronous enqueue — ordering is preserved by the single per-thread drain. */
	publish(threadId: string, event: InstanceAiEvent, emit: EmitFn): void {
		this.emitters.set(threadId, emit);
		const pending = this.pendingByThread.get(threadId);
		const entry: PendingEvent = { event, enqueuedAt: Date.now() };
		if (pending) pending.push(entry);
		else this.pendingByThread.set(threadId, [entry]);
		this.ensureDraining(threadId);
	}

	async getEventsAfter(threadId: string, afterSeq: number): Promise<StoredEvent[]> {
		return await this.repo.getAfter(threadId, afterSeq);
	}

	async getEventsForRuns(threadId: string, runIds: string[]): Promise<InstanceAiEvent[]> {
		return await this.repo.getForRuns(threadId, runIds);
	}

	async getNextEventId(threadId: string): Promise<number> {
		const cached = this.lastSeq.get(threadId);
		if (cached !== undefined) return cached + 1;
		return (await this.repo.maxSeq(threadId)) + 1;
	}

	/**
	 * Await the thread's in-flight drain, then persist any still-open coalesce
	 * buffers as blocks so streamed text survives a shutdown mid-segment.
	 */
	async flush(threadId: string): Promise<void> {
		await this.draining.get(threadId);
		const threadBuffers = this.buffers.get(threadId);
		if (!threadBuffers || threadBuffers.size === 0) return;

		const blocks: InstanceAiEvent[] = [];
		for (const [key, buffer] of threadBuffers) {
			const separator = key.indexOf(':');
			const runId = key.slice(0, separator);
			const agentId = key.slice(separator + 1);
			const reasoning = this.takeBlock('reasoning', runId, agentId, buffer);
			if (reasoning) blocks.push(reasoning);
			const text = this.takeBlock('text', runId, agentId, buffer);
			if (text) blocks.push(text);
		}
		this.buffers.delete(threadId);
		if (blocks.length === 0) return;

		await this.persistWithRetry(threadId, blocks);
	}

	/** Drain shutdown flush: called from module shutdown so no thread loses its tail. */
	async flushAll(): Promise<void> {
		const threadIds = new Set([...this.draining.keys(), ...this.buffers.keys()]);
		for (const threadId of threadIds) {
			try {
				await this.flush(threadId);
			} catch (error) {
				this.logger.error('Failed to flush Instance AI event log on shutdown', {
					threadId,
					error,
				});
			}
		}
	}

	private ensureDraining(threadId: string): void {
		if (this.draining.has(threadId)) return;
		const drain = (async () => {
			try {
				let batch = this.takePending(threadId);
				while (batch.length > 0) {
					await this.drainBatch(threadId, batch);
					batch = this.takePending(threadId);
				}
			} finally {
				this.draining.delete(threadId);
			}
		})();
		this.draining.set(threadId, drain);
	}

	private async drainBatch(threadId: string, batch: PendingEvent[]): Promise<void> {
		const emit = this.emitters.get(threadId);
		if (!emit) return;

		// Build the batch plan first; seqs are assigned inside persistWithRetry so
		// an append conflict can re-assign them from a re-seeded counter.
		const toPersist: InstanceAiEvent[] = [];
		const toEmit: Array<{ event: InstanceAiEvent; persistIndex?: number; live: boolean }> = [];

		for (const { event } of batch) {
			if (EPHEMERAL_TYPES.has(event.type)) {
				// A delta with a new responseId starts a new segment: close the old
				// one as a block first, so blocks stay exactly 1:1 with segments and
				// the reducer's open-segment replacement stays exact.
				for (const rolled of this.rollSegmentOnResponseChange(threadId, event)) {
					toEmit.push({ event: rolled, persistIndex: toPersist.length, live: false });
					toPersist.push(rolled);
				}
				this.bufferDelta(threadId, event);
				toEmit.push({ event, live: true });
				continue;
			}
			// Structural fact: flush this agent's open blocks first so replay
			// order matches live order (block content precedes the fact).
			for (const block of this.flushBlocks(threadId, event)) {
				toEmit.push({ event: block, persistIndex: toPersist.length, live: false });
				toPersist.push(block);
			}
			toEmit.push({ event, persistIndex: toPersist.length, live: true });
			toPersist.push(event);
		}

		let firstSeq: number | undefined;
		if (toPersist.length > 0) {
			firstSeq = await this.persistWithRetry(threadId, toPersist);
			const persistedAt = Date.now();
			for (const { enqueuedAt } of batch) this.metrics.recordQueueLatency(persistedAt - enqueuedAt);
		}

		for (const drained of toEmit) {
			const id =
				drained.persistIndex !== undefined && firstSeq !== undefined
					? firstSeq + drained.persistIndex
					: undefined;
			emit({ ...(id !== undefined ? { id } : {}), event: drained.event, live: drained.live });
		}
	}

	/**
	 * Append `events` with contiguous seqs, retrying on (threadId, seq) PK
	 * collision — another main won the range (multi-main only), so re-seed from
	 * the DB and try again. Returns the first assigned seq, or undefined when
	 * the batch had to be dropped (logged; live delivery still happens).
	 * When #33558 lands, its drain merges here: Redis INCRBY becomes this
	 * batch-INSERT's id assignment, one round trip.
	 */
	private async persistWithRetry(
		threadId: string,
		events: InstanceAiEvent[],
	): Promise<number | undefined> {
		for (let attempt = 1; attempt <= MAX_APPEND_ATTEMPTS; attempt++) {
			const firstSeq = (await this.currentSeq(threadId)) + 1;
			try {
				const bytes = await this.repo.appendBatch(threadId, firstSeq, events);
				this.lastSeq.set(threadId, firstSeq + events.length - 1);
				this.metrics.recordDrainBatch(events.length, bytes);
				return firstSeq;
			} catch (error) {
				this.metrics.recordAppendConflict(attempt);
				this.lastSeq.delete(threadId);
				this.logger.warn('Instance AI event log append conflict, retrying', {
					threadId,
					attempt,
					error,
				});
			}
		}
		this.metrics.recordAppendFailure(events.length);
		this.logger.error('Instance AI event log append failed, dropping batch', {
			threadId,
			events: events.length,
		});
		return undefined;
	}

	/** Append a delta to its agent's open block. */
	private bufferDelta(threadId: string, event: InstanceAiEvent): void {
		if (event.type !== 'text-delta' && event.type !== 'reasoning-delta') return;
		const buffer = this.getOrCreateBuffer(threadId, `${event.runId}:${event.agentId}`);
		if (event.type === 'text-delta') {
			buffer.text.push(event.payload.text);
			buffer.textResponseId = event.responseId ?? buffer.textResponseId;
		} else {
			buffer.reasoning.push(event.payload.text);
			buffer.reasoningResponseId = event.responseId ?? buffer.reasoningResponseId;
		}
	}

	/**
	 * Close open blocks made stale by a structural fact: the fact's own agent
	 * always; every agent of the run on `run-finish`. Blocks are persisted as
	 * `text-block`/`reasoning-block` facts carrying the segment's responseId —
	 * on replay the reducer REPLACES the segment's streamed deltas, so a client
	 * that reconnects mid-block never sees partial text or reasoning twice.
	 */
	private flushBlocks(threadId: string, fact: InstanceAiEvent): InstanceAiEvent[] {
		const threadBuffers = this.buffers.get(threadId);
		if (!threadBuffers) return [];
		const keys =
			fact.type === 'run-finish'
				? [...threadBuffers.keys()].filter((k) => k.startsWith(`${fact.runId}:`))
				: [`${fact.runId}:${fact.agentId}`];

		const flushed: InstanceAiEvent[] = [];
		for (const key of keys) {
			const buffer = threadBuffers.get(key);
			if (!buffer) continue;
			threadBuffers.delete(key);
			const agentId = key.slice(fact.runId.length + 1);
			const reasoning = this.takeBlock('reasoning', fact.runId, agentId, buffer);
			if (reasoning) flushed.push(reasoning);
			const text = this.takeBlock('text', fact.runId, agentId, buffer);
			if (text) flushed.push(text);
		}
		return flushed;
	}

	/**
	 * A delta whose responseId differs from its kind's open buffer starts a new
	 * segment (e.g. consecutive reasoning-only steps with no tool call between).
	 * Close the previous segment as a block so blocks stay 1:1 with segments.
	 */
	private rollSegmentOnResponseChange(threadId: string, event: InstanceAiEvent): InstanceAiEvent[] {
		if (event.type !== 'text-delta' && event.type !== 'reasoning-delta') return [];
		const buffer = this.buffers.get(threadId)?.get(`${event.runId}:${event.agentId}`);
		if (!buffer) return [];
		const kind = event.type === 'text-delta' ? 'text' : 'reasoning';
		const openResponseId = kind === 'text' ? buffer.textResponseId : buffer.reasoningResponseId;
		const hasContent = (kind === 'text' ? buffer.text : buffer.reasoning).length > 0;
		if (!hasContent || openResponseId === event.responseId) return [];
		const block = this.takeBlock(kind, event.runId, event.agentId, buffer);
		return block ? [block] : [];
	}

	/** Drain one kind's open segment from a buffer into its block fact. */
	private takeBlock(
		kind: 'text' | 'reasoning',
		runId: string,
		agentId: string,
		buffer: CoalesceBuffer,
	): InstanceAiEvent | undefined {
		const parts = kind === 'text' ? buffer.text : buffer.reasoning;
		if (parts.length === 0) return undefined;
		const text = parts.join('');
		if (kind === 'text') {
			const responseId = buffer.textResponseId;
			buffer.text = [];
			buffer.textResponseId = undefined;
			return {
				type: 'text-block',
				runId,
				agentId,
				...(responseId ? { responseId } : {}),
				payload: { text },
			};
		}
		const responseId = buffer.reasoningResponseId;
		buffer.reasoning = [];
		buffer.reasoningResponseId = undefined;
		return {
			type: 'reasoning-block',
			runId,
			agentId,
			...(responseId ? { responseId } : {}),
			payload: { text },
		};
	}

	private async currentSeq(threadId: string): Promise<number> {
		const cached = this.lastSeq.get(threadId);
		if (cached !== undefined) return cached;
		const max = await this.repo.maxSeq(threadId);
		// Cutover note (RFC Q&A on cursors): when landing after #33558, seed from
		// max(DB, Redis high-water mark) so pre-cutover cursors stay valid.
		this.lastSeq.set(threadId, max);
		return max;
	}

	private getOrCreateBuffer(threadId: string, key: string): CoalesceBuffer {
		let threadBuffers = this.buffers.get(threadId);
		if (!threadBuffers) {
			threadBuffers = new Map();
			this.buffers.set(threadId, threadBuffers);
		}
		let buffer = threadBuffers.get(key);
		if (!buffer) {
			buffer = { text: [], reasoning: [] };
			threadBuffers.set(key, buffer);
		}
		return buffer;
	}

	private takePending(threadId: string): PendingEvent[] {
		const pending = this.pendingByThread.get(threadId);
		if (!pending) return [];
		this.pendingByThread.delete(threadId);
		return pending;
	}
}
