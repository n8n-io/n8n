import { Service } from '@n8n/di';

import { EventService } from '@/events/event.service';

/**
 * Durable-log instrumentation (RFC: instance-ai durable event log,
 * "Instrumentation"). Two consumers, one recording point:
 *
 * - Typed `EventService` events feed the Prometheus collectors
 *   (`PrometheusInstanceAiMetricsService`), following the same convention as
 *   `instance-ai-run-finished`.
 * - The in-process counters below are kept in lockstep for synchronous reads
 *   in unit tests and log lines.
 */
@Service()
export class DurableLogMetrics {
	/** Writer-side counters, recorded inside DurableEventLog's per-thread drain. */
	drain = {
		batches: 0,
		/** Durable rows written (structural facts + coalesced blocks). */
		rowsWritten: 0,
		/** Serialized payload bytes written. */
		bytesWritten: 0,
		/** (threadId, seq) PK collisions — another main won the range. */
		appendConflicts: 0,
		/** Batches dropped after exhausting append retries. */
		appendFailures: 0,
		/** publish() enqueue → batch persisted, per event. */
		queueLatencyMsTotal: 0,
		queueLatencyMsMax: 0,
		queueLatencySamples: 0,
	};

	/** SSE endpoint counters (replay path). */
	sse = {
		/** Reconnects that served a replay from the durable log. */
		replaysServed: 0,
		/** Events delivered by those replays. */
		replayEventsServed: 0,
		/** Cursor age at replay time, in events behind the log head. */
		cursorAgeEventsTotal: 0,
		cursorAgeEventsMax: 0,
	};

	/** History read counters (fold-on-read path). */
	history = {
		/** getRichMessages reads that derived trees from the durable log. */
		foldReads: 0,
		foldLatencyMsTotal: 0,
		/** Agent trees derived from the log across those reads. */
		treesDerived: 0,
	};

	/** Interrupted-run sweep (phase 3). */
	sweep = {
		runsExamined: 0,
		runsMarkedInterrupted: 0,
		runsCrashResumed: 0,
		toolInterruptedFacts: 0,
	};

	constructor(private readonly eventService: EventService) {}

	recordDrainBatch(rows: number, bytes: number): void {
		this.drain.batches++;
		this.drain.rowsWritten += rows;
		this.drain.bytesWritten += bytes;
		this.eventService.emit('instance-ai-durable-log-drained', { rows, bytes });
	}

	recordQueueLatency(ms: number): void {
		this.drain.queueLatencyMsTotal += ms;
		this.drain.queueLatencyMsMax = Math.max(this.drain.queueLatencyMsMax, ms);
		this.drain.queueLatencySamples++;
		this.eventService.emit('instance-ai-durable-log-queue-latency', { ms });
	}

	recordAppendConflict(attempt: number): void {
		this.drain.appendConflicts++;
		this.eventService.emit('instance-ai-durable-log-append-conflict', { attempt });
	}

	recordAppendFailure(events: number): void {
		this.drain.appendFailures++;
		this.eventService.emit('instance-ai-durable-log-append-failure', { events });
	}

	recordReplay(eventsServed: number, cursorAgeEvents: number): void {
		this.sse.replaysServed++;
		this.sse.replayEventsServed += eventsServed;
		this.sse.cursorAgeEventsTotal += cursorAgeEvents;
		this.sse.cursorAgeEventsMax = Math.max(this.sse.cursorAgeEventsMax, cursorAgeEvents);
		this.eventService.emit('instance-ai-durable-log-replayed', {
			events: eventsServed,
			cursorAgeEvents,
		});
	}

	recordFoldRead(latencyMs: number, trees: number): void {
		this.history.foldReads++;
		this.history.foldLatencyMsTotal += latencyMs;
		this.history.treesDerived += trees;
		this.eventService.emit('instance-ai-history-folded', { latencyMs, trees });
	}

	/**
	 * The parser is pure module code and keeps its own counter
	 * (messageParserStats); this only forwards new activations to the
	 * metrics pipeline.
	 */
	notifyParserFallbacks(count: number): void {
		if (count > 0) this.eventService.emit('instance-ai-parser-fallback', { count });
	}

	recordSweepRunExamined(): void {
		this.sweep.runsExamined++;
	}

	recordSweepToolInterruptedFact(): void {
		this.sweep.toolInterruptedFacts++;
	}

	recordSweepOutcome(outcome: 'interrupted' | 'crash-resumed', toolInterruptedFacts: number): void {
		if (outcome === 'interrupted') this.sweep.runsMarkedInterrupted++;
		else this.sweep.runsCrashResumed++;
		this.eventService.emit('instance-ai-run-swept', { outcome, toolInterruptedFacts });
	}
}
