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

/**
 * Why a main opened no live stream for an accepted chat message:
 * - `main-memory-high`: the memory of this main is above `N8N_AGENTS_MAIN_MEMORY_HOLD_LEVEL`.
 * - `main-at-stream-limit`: this main already has `N8N_AGENTS_MAIN_MAX_STREAMS` live streams.
 */
export type AgentStreamSkipReason = 'main-memory-high' | 'main-at-stream-limit';

/**
 * Why a main rejected an agent turn with a busy error:
 * - `queue-full`: `N8N_AGENTS_QUEUE_MAX_WAITING` turns already wait for a worker.
 * - `wait-too-long`: no process started the turn within `N8N_AGENTS_QUEUE_MAX_WAIT`.
 * - `main-at-limit`: this process has no room for the turn.
 * - `main-memory-high`: the turn waited too long while the memory of this
 *   process was above `N8N_AGENTS_MAIN_MEMORY_HOLD_LEVEL`. Low memory on the
 *   server, not agent load alone, can cause this.
 * - `queue-unavailable`: the main could not store the turn or send its job,
 *   because the database or Redis failed.
 * - `agent-queue-full`: `N8N_AGENTS_QUEUE_MAX_WAITING_PER_AGENT` public turns
 *   of the same agent already wait for a worker.
 * - `no-worker`: a public turn must run on an agent worker, and no agent
 *   worker is registered.
 */
export type AgentTurnRejectReason =
	| 'queue-full'
	| 'agent-queue-full'
	| 'no-worker'
	| 'wait-too-long'
	| 'main-at-limit'
	| 'main-memory-high'
	| 'queue-unavailable';

/**
 * What the ingress did with a chat platform webhook:
 * - `accepted`: stored as a turn.
 * - `duplicate`: a retry of an event that waits or runs already.
 * - `busy`: rejected with 503, so that the platform retries.
 * - `rejected`: the signature or the request was not valid.
 * - `answered`: a handshake, such as a URL check.
 * - `not-found`: no published channel for the agent and platform.
 */
export type ChannelWebhookOutcome =
	| 'accepted'
	| 'duplicate'
	| 'busy'
	| 'rejected'
	| 'answered'
	| 'not-found';

export type AgentQueueMetricEvent =
	/**
	 * A chat platform webhook reached the ingress. `route` tells the legacy
	 * `/rest/.../webhooks/:platform` URL from the `/agent-hook/...` URL.
	 */
	| {
			type: 'channel-webhook';
			route: 'legacy' | 'agent-hook';
			platform: string;
			outcome: ChannelWebhookOutcome;
	  }
	| { type: 'turn-started'; location: AgentTurnLocation }
	| { type: 'fallback'; path: 'queued-message' | 'request' }
	/** A main left a turn in the queue. Counts each check, not each turn. */
	| { type: 'turn-held'; reason: AgentTurnHoldReason }
	/** A main accepted a chat message but opened no live stream. */
	| { type: 'stream-skipped'; reason: AgentStreamSkipReason }
	/** A main rejected a chat message, because it accepted too many messages at the same time. */
	| { type: 'intake-rejected' }
	/** A main rejected an agent turn with a busy error. */
	| { type: 'turn-rejected'; reason: AgentTurnRejectReason }
	| { type: 'relay-dropped'; channel: 'execution-update' | 'agent-update' | 'stream' }
	| { type: 'turn-timed-out' }
	/**
	 * The leader removed stored chat platform events that no agent worker
	 * claimed within `QueuedTurnRunner.DURABLE_REQUEST_MS`.
	 */
	| { type: 'turns-expired'; count: number };

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
