import { PrometheusMetricsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import promClient from 'prom-client';

import { AgentQueueMetrics } from '@/modules/agents/queue/agent-queue-metrics';

import type { PrometheusMetricsCollector } from './base';

/**
 * Agent turn metrics for queue mode: where turns run, fallbacks to mains and
 * fallbacks held back,
 * dropped cross-process relays, timed-out turns, and the agent turn queue depth.
 */
@Service()
export class PrometheusAgentQueueMetricsService implements PrometheusMetricsCollector {
	constructor(
		private readonly config: PrometheusMetricsConfig,
		private readonly agentMetrics: AgentQueueMetrics,
	) {}

	get enabled(): boolean {
		// Always on when Prometheus metrics are enabled (N8N_METRICS); no separate flag.
		return true;
	}

	init() {
		const prefix = this.config.prefix;

		const turnsStarted = new promClient.Counter({
			name: `${prefix}agent_turns_started_total`,
			help: 'Agent turns that started in this process, by the kind of process.',
			labelNames: ['location'],
		});

		const fallbacks = new promClient.Counter({
			name: `${prefix}agent_turn_fallbacks_total`,
			help: 'Agent turns that a main ran because no agent worker took them in time.',
			labelNames: ['path'],
		});

		const turnsHeld = new promClient.Counter({
			name: `${prefix}agent_turns_held_total`,
			help: 'Checks in which a main left an agent turn in the queue, by reason: workers-progressing (busy, not stuck), main-at-limit (N8N_AGENTS_MAIN_FALLBACK_TURNS or N8N_AGENTS_MAIN_MAX_TURNS reached) or main-memory-high (above N8N_AGENTS_MAIN_MEMORY_HOLD_LEVEL).',
			labelNames: ['reason'],
		});

		const streamsSkipped = new promClient.Counter({
			name: `${prefix}agent_streams_skipped_total`,
			help: 'Chat messages that a main accepted without a live stream, by reason: main-memory-high (above N8N_AGENTS_MAIN_MEMORY_HOLD_LEVEL) or main-at-stream-limit (N8N_AGENTS_MAIN_MAX_STREAMS reached).',
			labelNames: ['reason'],
		});

		const intakeRejected = new promClient.Counter({
			name: `${prefix}agent_messages_rejected_total`,
			help: 'Chat messages that a main rejected, because it accepted N8N_AGENTS_MAIN_MAX_INTAKE messages at the same time for too long.',
		});
		intakeRejected.inc(0);

		const turnsRejected = new promClient.Counter({
			name: `${prefix}agent_turns_rejected_total`,
			help: 'Agent turns that a main rejected with a busy error, by reason: queue-full (N8N_AGENTS_QUEUE_MAX_WAITING reached), wait-too-long (not started within N8N_AGENTS_QUEUE_MAX_WAIT), main-at-limit (no agent worker, and the main had no room) or main-memory-high (not started within N8N_AGENTS_QUEUE_MAX_WAIT while above N8N_AGENTS_MAIN_MEMORY_HOLD_LEVEL) or queue-unavailable (the database or Redis failed).',
			labelNames: ['reason'],
		});

		const relaysDropped = new promClient.Counter({
			name: `${prefix}agent_relays_dropped_total`,
			help: 'Agent updates or stream events too large to relay between processes.',
			labelNames: ['channel'],
		});

		const turnsTimedOut = new promClient.Counter({
			name: `${prefix}agent_turns_timed_out_total`,
			help: 'Agent turns stopped because they ran longer than N8N_AGENTS_TURN_TIMEOUT.',
		});
		turnsTimedOut.inc(0);

		this.agentMetrics.onEvent((event) => {
			switch (event.type) {
				case 'turn-started':
					turnsStarted.inc({ location: event.location });
					break;
				case 'fallback':
					fallbacks.inc({ path: event.path });
					break;
				case 'turn-held':
					turnsHeld.inc({ reason: event.reason });
					break;
				case 'stream-skipped':
					streamsSkipped.inc({ reason: event.reason });
					break;
				case 'intake-rejected':
					intakeRejected.inc();
					break;
				case 'turn-rejected':
					turnsRejected.inc({ reason: event.reason });
					break;
				case 'relay-dropped':
					relaysDropped.inc({ channel: event.channel });
					break;
				case 'turn-timed-out':
					turnsTimedOut.inc();
					break;
			}
		});

		const agentMetrics = this.agentMetrics;
		new promClient.Gauge({
			name: `${prefix}agent_active_turns`,
			help: 'Agent turns that run in this process now.',
			collect() {
				this.set(agentMetrics.localTurns());
			},
		});

		new promClient.Gauge({
			name: `${prefix}agent_active_background_runs`,
			help: 'Background sub-agents and workflows that run in this process now.',
			collect() {
				this.set(agentMetrics.backgroundRuns());
			},
		});

		new promClient.Gauge({
			name: `${prefix}agent_turn_queue_jobs`,
			help: 'Jobs in the agent turn queue, by state. Reported only by processes in agent queue mode.',
			labelNames: ['state'],
			async collect() {
				try {
					const counts = await agentMetrics.queueCounts();
					if (!counts) return;
					this.set({ state: 'waiting' }, counts.waiting);
					this.set({ state: 'active' }, counts.active);
				} catch {
					// Redis is unreachable. Report nothing rather than fail the scrape.
				}
			},
		});
	}
}
