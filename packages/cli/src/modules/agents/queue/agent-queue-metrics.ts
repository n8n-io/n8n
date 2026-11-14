import { Service } from '@n8n/di';

/** The kind of process that ran an agent turn. */
export type AgentTurnLocation = 'main' | 'worker';

export type AgentQueueMetricEvent =
	| { type: 'turn-started'; location: AgentTurnLocation }
	| { type: 'fallback'; path: 'queued-message' | 'request' }
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
