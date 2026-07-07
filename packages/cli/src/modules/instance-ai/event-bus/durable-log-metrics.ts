import { Service } from '@n8n/di';

import { messageParserStats } from '../message-parser';

/**
 * In-process counters for the durable-log prototype (RFC: instance-ai durable
 * event log, "Instrumentation"). Deliberately not Prometheus: the evaluation
 * harness reads these synchronously via Container.get() and the E2E test
 * controller; production hardening would move them to
 * instance-ai-metrics.service.ts.
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

	/** History read path (phase 2 fold-on-read). */
	history = {
		foldReads: 0,
		foldLatencyMsTotal: 0,
		/** Snapshot trees superseded by a fold of the log. */
		snapshotTreesReplaced: 0,
		/** Trees synthesized for runs that had log rows but no snapshot row. */
		treesSynthesized: 0,
	};

	/** Interrupted-run sweep (phase 3). */
	sweep = {
		runsExamined: 0,
		runsMarkedInterrupted: 0,
		runsCrashResumed: 0,
		toolInterruptedFacts: 0,
		correctionsRequeued: 0,
	};

	recordDrainBatch(rows: number, bytes: number): void {
		this.drain.batches++;
		this.drain.rowsWritten += rows;
		this.drain.bytesWritten += bytes;
	}

	recordQueueLatency(ms: number): void {
		this.drain.queueLatencyMsTotal += ms;
		this.drain.queueLatencyMsMax = Math.max(this.drain.queueLatencyMsMax, ms);
		this.drain.queueLatencySamples++;
	}

	recordReplay(eventsServed: number, cursorAgeEvents: number): void {
		this.sse.replaysServed++;
		this.sse.replayEventsServed += eventsServed;
		this.sse.cursorAgeEventsTotal += cursorAgeEvents;
		this.sse.cursorAgeEventsMax = Math.max(this.sse.cursorAgeEventsMax, cursorAgeEvents);
	}

	recordFoldRead(latencyMs: number, replaced: number, synthesized: number): void {
		this.history.foldReads++;
		this.history.foldLatencyMsTotal += latencyMs;
		this.history.snapshotTreesReplaced += replaced;
		this.history.treesSynthesized += synthesized;
	}

	snapshot() {
		return {
			drain: { ...this.drain },
			sse: { ...this.sse },
			history: { ...this.history },
			sweep: { ...this.sweep },
			// The parser is pure module code — its counter lives beside it.
			parser: { ...messageParserStats },
		};
	}

	reset(): void {
		this.drain = {
			batches: 0,
			rowsWritten: 0,
			bytesWritten: 0,
			appendConflicts: 0,
			appendFailures: 0,
			queueLatencyMsTotal: 0,
			queueLatencyMsMax: 0,
			queueLatencySamples: 0,
		};
		this.sse = {
			replaysServed: 0,
			replayEventsServed: 0,
			cursorAgeEventsTotal: 0,
			cursorAgeEventsMax: 0,
		};
		this.history = {
			foldReads: 0,
			foldLatencyMsTotal: 0,
			snapshotTreesReplaced: 0,
			treesSynthesized: 0,
		};
		this.sweep = {
			runsExamined: 0,
			runsMarkedInterrupted: 0,
			runsCrashResumed: 0,
			toolInterruptedFacts: 0,
			correctionsRequeued: 0,
		};
		messageParserStats.fallbackActivations = 0;
	}
}
