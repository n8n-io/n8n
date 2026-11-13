import { EventService } from '@n8n/backend-services';
import { mockInstance } from '@n8n/backend-test-utils';
import { PrometheusMetricsConfig } from '@n8n/config';
import promClient from 'prom-client';
import { mock } from 'vitest-mock-extended';

import { AgentExecutionMetrics } from '@/modules/agents/agent-execution-metrics';
import { AgentExecutionProbe } from '@/modules/agents/agent-execution-probe';
import type { MessageRecord, TimelineEvent } from '@/modules/agents/execution-recorder';
import { SystemAgentRegistry } from '@/modules/agents/system-agents/system-agent-registry';
import type { SystemAgentProvider } from '@/modules/agents/system-agents/system-agent.types';

import { PrometheusAgentMetricsService } from '../agent-metrics.service';

function makeRecord(overrides: Partial<MessageRecord> = {}): MessageRecord {
	return {
		assistantResponse: '',
		model: null,
		finishReason: 'stop',
		usage: null,
		totalCost: null,
		cacheReadTokens: null,
		cacheWriteTokens: null,
		timeline: [],
		startTime: 0,
		duration: 2_000,
		error: null,
		guardrailCode: null,
		...overrides,
	};
}

function toolCall(
	toolCallId: string,
	overrides: Partial<TimelineEvent & { type: 'tool-call' }> = {},
): TimelineEvent {
	return {
		type: 'tool-call',
		kind: 'tool',
		name: 'search',
		toolCallId,
		input: {},
		output: {},
		startTime: 1,
		endTime: 2,
		success: true,
		...overrides,
	};
}

describe('PrometheusAgentMetricsService', () => {
	const config = mockInstance(PrometheusMetricsConfig, {
		prefix: 'n8n_',
		includeAgentMetrics: true,
	});

	let eventService: EventService;
	let executionMetrics: AgentExecutionMetrics;

	const value = async (name: string, labels: Record<string, string> = {}) => {
		const metric = await promClient.register.getSingleMetric(name)?.get();
		return metric?.values.find((v) =>
			Object.entries(labels).every(([key, label]) => v.labels[key] === label),
		)?.value;
	};

	beforeEach(() => {
		promClient.register.clear();
		eventService = new EventService();
		const registry = new SystemAgentRegistry();
		registry.register(mock<SystemAgentProvider>({ agentId: 'assistant' }));
		const probe = new AgentExecutionProbe();
		executionMetrics = new AgentExecutionMetrics(eventService, registry, probe);
		new PrometheusAgentMetricsService(config, eventService, probe).init();
	});

	it('is enabled only when agent metrics are included', () => {
		const service = new PrometheusAgentMetricsService(
			config,
			eventService,
			new AgentExecutionProbe(),
		);
		expect(service.enabled).toBe(true);

		config.includeAgentMetrics = false;
		expect(service.enabled).toBe(false);
		config.includeAgentMetrics = true;
	});

	it('counts a finished turn of a system agent with its duration, tokens and cost', async () => {
		executionMetrics.finished(
			{ agentId: 'assistant' },
			{ status: 'success' },
			makeRecord({
				usage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 },
				cacheReadTokens: 80,
				cacheWriteTokens: 10,
				totalCost: 0.25,
			}),
		);

		const scope = { agent: 'assistant', kind: 'turn' };
		expect(await value('n8n_agent_executions_total', { ...scope, status: 'success' })).toBe(1);
		const duration = await promClient.register.getSingleMetricAsString(
			'n8n_agent_execution_duration_seconds',
		);
		expect(duration).toContain(
			'n8n_agent_execution_duration_seconds_sum{agent="assistant",kind="turn"} 2',
		);
		expect(await value('n8n_agent_tokens_total', { ...scope, type: 'input' })).toBe(100);
		expect(await value('n8n_agent_tokens_total', { ...scope, type: 'output' })).toBe(20);
		expect(await value('n8n_agent_tokens_total', { ...scope, type: 'cache_read' })).toBe(80);
		expect(await value('n8n_agent_tokens_total', { ...scope, type: 'cache_write' })).toBe(10);
		expect(await value('n8n_agent_cost_usd_total', scope)).toBe(0.25);
	});

	it('labels project agents as project, so their ids do not become labels', async () => {
		executionMetrics.finished({ agentId: 'some-user-agent' }, { status: 'error' }, makeRecord());

		expect(
			await value('n8n_agent_executions_total', {
				agent: 'project',
				kind: 'turn',
				status: 'error',
			}),
		).toBe(1);
	});

	it('counts a delegated run for the system agent at the root of the tree', async () => {
		executionMetrics.finished(
			{ agentId: 'builder-sub-agent', parentAgentId: 'assistant' },
			{ status: 'success' },
			makeRecord(),
		);

		expect(
			await value('n8n_agent_executions_total', {
				agent: 'assistant',
				kind: 'delegated',
				status: 'success',
			}),
		).toBe(1);
	});

	it('observes the duration of successful executions only', async () => {
		executionMetrics.finished({ agentId: 'assistant' }, { status: 'error' }, makeRecord());
		executionMetrics.finished({ agentId: 'assistant' }, { status: 'cancelled' }, makeRecord());
		executionMetrics.finished(
			{ agentId: 'assistant' },
			{ status: 'success', hitlStatus: 'suspended' },
			makeRecord(),
		);

		const duration = await promClient.register.getSingleMetricAsString(
			'n8n_agent_execution_duration_seconds',
		);
		expect(duration).not.toContain('n8n_agent_execution_duration_seconds_count{');
	});

	it('counts a turn that waits for the user as suspended', async () => {
		executionMetrics.finished(
			{ agentId: 'assistant' },
			{ status: 'success', hitlStatus: 'suspended' },
			makeRecord(),
		);

		expect(
			await value('n8n_agent_executions_total', {
				agent: 'assistant',
				kind: 'turn',
				status: 'suspended',
			}),
		).toBe(1);
	});

	it('counts ended tool calls by result, and skips open and suspended calls', async () => {
		executionMetrics.finished(
			{ agentId: 'assistant' },
			{ status: 'success', hitlStatus: 'suspended' },
			makeRecord({
				timeline: [
					toolCall('ok'),
					toolCall('failed', { success: false }),
					toolCall('stopped', { success: false, canceled: true }),
					toolCall('open', { endTime: 0 }),
					toolCall('asked'),
					{ type: 'suspension', toolName: 'search', toolCallId: 'asked', timestamp: 3 },
				],
			}),
		);

		const scope = { agent: 'assistant', kind: 'turn' };
		expect(await value('n8n_agent_tool_calls_total', { ...scope, result: 'success' })).toBe(1);
		expect(await value('n8n_agent_tool_calls_total', { ...scope, result: 'error' })).toBe(1);
		expect(await value('n8n_agent_tool_calls_total', { ...scope, result: 'cancelled' })).toBe(1);
	});

	it('counts an execution that the sweep interrupted', async () => {
		executionMetrics.interrupted({ agentId: 'assistant' });

		expect(
			await value('n8n_agent_executions_total', {
				agent: 'assistant',
				kind: 'turn',
				status: 'interrupted',
			}),
		).toBe(1);
	});

	it('reports the executions that run on this instance', async () => {
		executionMetrics.started('execution-1', { agentId: 'assistant' });
		executionMetrics.started('execution-2', { agentId: 'assistant' });
		executionMetrics.started('execution-3', { agentId: 'child', parentAgentId: 'assistant' });

		expect(
			await value('n8n_agent_executions_in_flight', { agent: 'assistant', kind: 'turn' }),
		).toBe(2);
		expect(
			await value('n8n_agent_executions_in_flight', { agent: 'assistant', kind: 'delegated' }),
		).toBe(1);

		executionMetrics.stopped('execution-1');
		executionMetrics.stopped('execution-3');
		// Stopping twice must not drive the count below the real value.
		executionMetrics.stopped('execution-3');

		expect(
			await value('n8n_agent_executions_in_flight', { agent: 'assistant', kind: 'turn' }),
		).toBe(1);
		expect(
			await value('n8n_agent_executions_in_flight', { agent: 'assistant', kind: 'delegated' }),
		).toBeUndefined();
	});
});
