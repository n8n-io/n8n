import { Logger } from '@n8n/backend-common';
import type { InstanceAiEvent } from '@n8n/api-types';
import { Service } from '@n8n/di';
import type { StoredEvent } from '@n8n/instance-ai';

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

/** How a drained event reaches the bus. `id` set = durable; `live` = emit to SSE. */
export interface DrainedEvent {
	id?: number;
	event: InstanceAiEvent;
	live: boolean;
}

interface CoalesceBuffer {
	text: string[];
	reasoning: string[];
}

type EmitFn = (drained: DrainedEvent) => void;

@Service()
export class DurableEventLog {
	/** publish() stays synchronous: events queue here, a per-thread drain assigns seq. */
	private readonly pendingByThread = new Map<string, InstanceAiEvent[]>();

	private readonly drainingThreads = new Set<string>();

	/** Last assigned seq per thread; lazily seeded from MAX(seq) in the DB. */
	private readonly lastSeq = new Map<string, number>();

	/** Open text/reasoning blocks per `${runId}:${agentId}`. */
	private readonly buffers = new Map<string, CoalesceBuffer>();

	private readonly emitters = new Map<string, EmitFn>();

	constructor(
		private readonly logger: Logger,
		private readonly repo: InstanceAiEventLogRepository,
	) {
		this.logger = this.logger.scoped('instance-ai');
	}

	/** Synchronous enqueue — ordering is preserved by the single per-thread drain. */
	publish(threadId: string, event: InstanceAiEvent, emit: EmitFn): void {
		this.emitters.set(threadId, emit);
		const pending = this.pendingByThread.get(threadId);
		if (pending) pending.push(event);
		else this.pendingByThread.set(threadId, [event]);
		void this.drain(threadId);
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

	private async drain(threadId: string): Promise<void> {
		if (this.drainingThreads.has(threadId)) return;
		this.drainingThreads.add(threadId);
		try {
			let batch = this.takePending(threadId);
			while (batch.length > 0) {
				await this.drainBatch(threadId, batch);
				batch = this.takePending(threadId);
			}
		} finally {
			this.drainingThreads.delete(threadId);
		}
	}

	private async drainBatch(threadId: string, batch: InstanceAiEvent[]): Promise<void> {
		const emit = this.emitters.get(threadId);
		if (!emit) return;

		let seq = await this.currentSeq(threadId);
		const toPersist: InstanceAiEvent[] = [];
		const toEmit: DrainedEvent[] = [];

		for (const event of batch) {
			if (EPHEMERAL_TYPES.has(event.type)) {
				this.bufferDelta(event);
				toEmit.push({ event, live: true });
				continue;
			}
			// Structural fact: flush this agent's open blocks first so replay
			// order matches live order (block content precedes the fact).
			for (const block of this.flushBlocks(event)) {
				toPersist.push(block);
				toEmit.push({ id: ++seq, event: block, live: false });
			}
			toPersist.push(event);
			toEmit.push({ id: ++seq, event, live: true });
		}

		if (toPersist.length > 0) {
			const firstSeq = seq - toPersist.length + 1;
			try {
				await this.repo.appendBatch(threadId, firstSeq, toPersist);
			} catch (error) {
				// (threadId, seq) PK collision — another main won the range (multi-main
				// only). Re-seed from DB and retry once. SKETCH: bounded retry loop +
				// metrics; merges with #33558's drain when that lands.
				this.lastSeq.delete(threadId);
				this.logger.error('Event log append conflict, retrying', { threadId, error });
				await this.drainBatch(threadId, batch);
				return;
			}
			this.lastSeq.set(threadId, seq);
		}

		for (const drained of toEmit) emit(drained);
	}

	/** Append a delta to its agent's open block. */
	private bufferDelta(event: InstanceAiEvent): void {
		if (event.type !== 'text-delta' && event.type !== 'reasoning-delta') return;
		const key = `${event.runId}:${event.agentId}`;
		let buffer = this.buffers.get(key);
		if (!buffer) {
			buffer = { text: [], reasoning: [] };
			this.buffers.set(key, buffer);
		}
		const text = (event.payload as { text?: string })?.text ?? '';
		if (event.type === 'text-delta') buffer.text.push(text);
		else buffer.reasoning.push(text);
	}

	/**
	 * Close open blocks made stale by a structural fact: the fact's own agent
	 * always; every agent of the run on `run-finish`. A coalesced block is
	 * persisted under its ORIGINAL delta type with the full text as one payload —
	 * replay-compatible with the frontend reducer (it appends text), so no
	 * schema or FE change is needed. SKETCH: a purist `text-block` event type in
	 * @n8n/api-types is the additive alternative.
	 */
	private flushBlocks(fact: InstanceAiEvent): InstanceAiEvent[] {
		const keys =
			fact.type === 'run-finish'
				? [...this.buffers.keys()].filter((k) => k.startsWith(`${fact.runId}:`))
				: [`${fact.runId}:${fact.agentId}`];

		const flushed: InstanceAiEvent[] = [];
		for (const key of keys) {
			const buffer = this.buffers.get(key);
			if (!buffer) continue;
			this.buffers.delete(key);
			const agentId = key.slice(fact.runId.length + 1);
			if (buffer.reasoning.length > 0) {
				flushed.push({
					type: 'reasoning-delta',
					runId: fact.runId,
					agentId,
					payload: { text: buffer.reasoning.join('') },
				} as InstanceAiEvent);
			}
			if (buffer.text.length > 0) {
				flushed.push({
					type: 'text-delta',
					runId: fact.runId,
					agentId,
					payload: { text: buffer.text.join('') },
				} as InstanceAiEvent);
			}
		}
		return flushed;
	}

	private async currentSeq(threadId: string): Promise<number> {
		const cached = this.lastSeq.get(threadId);
		if (cached !== undefined) return cached;
		const max = await this.repo.maxSeq(threadId);
		// SKETCH (cutover, RFC Q&A #3): when landing after #33558, seed from
		// max(DB, Redis high-water mark) so pre-cutover cursors stay valid.
		this.lastSeq.set(threadId, max);
		return max;
	}

	private takePending(threadId: string): InstanceAiEvent[] {
		const pending = this.pendingByThread.get(threadId);
		if (!pending) return [];
		this.pendingByThread.delete(threadId);
		return pending;
	}
}
