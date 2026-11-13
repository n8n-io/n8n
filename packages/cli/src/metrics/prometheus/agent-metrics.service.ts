import { EventService } from '@n8n/backend-services';
import { PrometheusMetricsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import promClient from 'prom-client';

import { AgentExecutionProbe } from '@/modules/agents/agent-execution-probe';

import type { PrometheusMetricsCollector } from './base';
import { DURATION_BUCKETS_SECONDS } from './constant';

/**
 * Collects metrics for the executions of the Agents runtime: chat and
 * integration turns, scheduled tasks and delegated runs. The `agent` label is
 * the system agent that owns the execution (for example `assistant`), or
 * `project` for agents that users built. The `kind` label tells a top-level
 * turn from a delegated run, which counts for the agent at the root of its tree.
 */
@Service()
export class PrometheusAgentMetricsService implements PrometheusMetricsCollector {
	constructor(
		private readonly config: PrometheusMetricsConfig,
		private readonly eventService: EventService,
		private readonly executionProbe: AgentExecutionProbe,
	) {}

	get enabled(): boolean {
		return this.config.includeAgentMetrics;
	}

	init() {
		const prefix = this.config.prefix;

		const executionsTotal = new promClient.Counter({
			name: `${prefix}agent_executions_total`,
			help: 'Total number of finished agent executions, by agent, kind (turn, delegated) and status (success, error, cancelled, suspended, awaiting, interrupted).',
			labelNames: ['agent', 'kind', 'status'],
		});

		const executionDuration = new promClient.Histogram({
			name: `${prefix}agent_execution_duration_seconds`,
			help: 'Duration in seconds of a successful agent execution, by agent and kind. Other outcomes are not observed: their durations (a fast failure, a stop, a turn that waits for the user) would skew the latency. agent_executions_total counts them by status.',
			labelNames: ['agent', 'kind'],
			buckets: DURATION_BUCKETS_SECONDS,
		});

		const toolCallsTotal = new promClient.Counter({
			name: `${prefix}agent_tool_calls_total`,
			help: 'Total number of tool calls that ended in agent executions, by agent, kind and result (success, error, cancelled).',
			labelNames: ['agent', 'kind', 'result'],
		});

		const tokensTotal = new promClient.Counter({
			name: `${prefix}agent_tokens_total`,
			help: 'Total number of model tokens of agent executions, by agent, kind and type (input, output, cache_read, cache_write). Cache tokens are a part of the input tokens. Side calls, such as title generation, are not included.',
			labelNames: ['agent', 'kind', 'type'],
		});

		const costTotal = new promClient.Counter({
			name: `${prefix}agent_cost_usd_total`,
			help: 'Total estimated cost in USD of agent executions, by agent and kind. Models without pricing and side calls are not included.',
			labelNames: ['agent', 'kind'],
		});

		const executionProbe = this.executionProbe;
		new promClient.Gauge({
			name: `${prefix}agent_executions_in_flight`,
			help: 'Number of agent executions that run on this instance, by agent and kind.',
			labelNames: ['agent', 'kind'],
			collect() {
				// Reset first, so a label set without running executions drops to 0.
				this.reset();
				for (const { agent, kind, count } of executionProbe.activeCounts()) {
					this.set({ agent, kind }, count);
				}
			},
		});

		this.eventService.on('agent-execution-finished', (event) => {
			const { agent, kind, status } = event;
			executionsTotal.inc({ agent, kind, status });
			if (status === 'success') {
				executionDuration.observe({ agent, kind }, event.durationMs / Time.seconds.toMilliseconds);
			}

			for (const result of ['success', 'error', 'cancelled'] as const) {
				const count = event.toolCalls[result];
				if (count > 0) toolCallsTotal.inc({ agent, kind, result }, count);
			}

			const tokens = {
				input: event.tokens.input,
				output: event.tokens.output,
				cache_read: event.tokens.cacheRead,
				cache_write: event.tokens.cacheWrite,
			};
			for (const [type, count] of Object.entries(tokens)) {
				if (count > 0) tokensTotal.inc({ agent, kind, type }, count);
			}

			if (event.costUsd !== undefined && event.costUsd > 0) {
				costTotal.inc({ agent, kind }, event.costUsd);
			}
		});

		this.eventService.on('agent-execution-interrupted', ({ agent, kind }) => {
			executionsTotal.inc({ agent, kind, status: 'interrupted' });
		});
	}
}
