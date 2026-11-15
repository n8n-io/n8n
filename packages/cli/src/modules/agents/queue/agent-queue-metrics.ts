import { Service } from '@n8n/di';

/** The kind of process that ran an agent turn. */
export type AgentTurnLocation = 'main' | 'worker';

/**
 * Why a main left a queued turn in the queue:
 * - `workers-progressing`: agent workers still start or finish jobs, so they are busy, not stuck.
 * - `main-at-limit`: this main already runs `N8N_AGENTS_MAIN_FALLBACK_TURNS` or
 *   `N8N_AGENTS_MAIN_MAX_TURNS` agent turns.
 * - `main-memory-high`: the memory of this main is above `N8N_AGENTS_MAIN_MEMORY_HOLD_LEVEL`.
 */
export type AgentTurnHoldReason = 'workers-progressing' | 'main-at-limit' | 'main-memory-high';

export type AgentQueueMetricEvent =
	| { type: 'turn-started'; location: AgentTurnLocation }
	| { type: 'fallback'; path: 'queued-message' | 'request' }
	/** A main left a turn in the queue. Counts each check, not each turn. */
	| { type: 'turn-held'; reason: AgentTurnHoldReason }
	/** A main accepted a chat message but opened no live stream, because its memory was high. */
	| { type: 'stream-skipped' }
	| { type: 'relay-dropped'; channel: 'execution-update' | 'agent-update' | 'stream' }
	| { type: 'turn-timed-out' };

export interface AgentQueueGauges {
	/** Agent turns that run in this process now. */
	localTurns: () => number;
	/** Background sub-agents that run in this process now. */
	backgroundRuns: () => number;
	/** Jobs in the agent turn queue, or null when this process has no queue. */
	queueCounts: () => Promise<{ waiting: number; active: number } | null>;
}

/**
 * Lightweight bridge between the agents module and the Prometheus collector.
 * It has no dependencies, so the collector can load it without the module.
 * The module pushes events and registers gauge providers; the collector
 * listens and reads the gauges at scrape time.
 */
@Service()
export class AgentQueueMetrics {
	private readonly listeners: Array<(event: AgentQueueMetricEvent) => void> = [];

	private gauges: AgentQueueGauges = {
		localTurns: () => 0,
		backgroundRuns: () => 0,
		queueCounts: async () => null,
	};

	record(event: AgentQueueMetricEvent): void {
		for (const listener of this.listeners) {
			try {
				listener(event);
			} catch {
				// A metrics listener must never break an agent turn.
			}
		}
	}

	onEvent(listener: (event: AgentQueueMetricEvent) => void): void {
		this.listeners.push(listener);
	}

	registerGauges(gauges: Partial<AgentQueueGauges>): void {
		this.gauges = { ...this.gauges, ...gauges };
	}

	localTurns(): number {
		return this.gauges.localTurns();
	}

	backgroundRuns(): number {
		return this.gauges.backgroundRuns();
	}

	async queueCounts(): Promise<{ waiting: number; active: number } | null> {
		return await this.gauges.queueCounts();
	}
}
