import type { PrometheusMetricsConfig } from '@n8n/config';
import promClient from 'prom-client';

import { AgentQueueMetrics } from '@/modules/agents/queue/agent-queue-metrics';

import { PrometheusAgentQueueMetricsService } from '../agent-queue-metrics.service';

describe('PrometheusAgentQueueMetricsService', () => {
	const config = { prefix: 'n8n_' } as PrometheusMetricsConfig;

	beforeEach(() => {
		promClient.register.clear();
	});

	const valueOf = async (name: string, labels: Record<string, string> = {}) => {
		const metric = await promClient.register.getSingleMetric(name)?.get();
		return metric?.values.find((v) =>
			Object.entries(labels).every(([key, value]) => v.labels[key] === value),
		)?.value;
	};

	it('counts the events that the agents module records', async () => {
		const bridge = new AgentQueueMetrics();
		new PrometheusAgentQueueMetricsService(config, bridge).init();

		bridge.record({ type: 'turn-started', location: 'worker' });
		bridge.record({ type: 'turn-started', location: 'worker' });
		bridge.record({ type: 'fallback', path: 'request' });
		bridge.record({ type: 'relay-dropped', channel: 'stream' });
		bridge.record({ type: 'turn-timed-out' });
		bridge.record({ type: 'turn-held', reason: 'workers-progressing' });
		bridge.record({ type: 'turn-held', reason: 'main-at-limit' });
		bridge.record({ type: 'turn-held', reason: 'main-memory-high' });
		bridge.record({ type: 'stream-skipped', reason: 'main-memory-high' });
		bridge.record({ type: 'stream-skipped', reason: 'main-at-stream-limit' });
		bridge.record({ type: 'intake-rejected' });

		expect(await valueOf('n8n_agent_turns_started_total', { location: 'worker' })).toBe(2);
		expect(await valueOf('n8n_agent_turn_fallbacks_total', { path: 'request' })).toBe(1);
		expect(await valueOf('n8n_agent_relays_dropped_total', { channel: 'stream' })).toBe(1);
		expect(await valueOf('n8n_agent_turns_timed_out_total')).toBe(1);
		for (const reason of ['workers-progressing', 'main-at-limit', 'main-memory-high']) {
			expect(await valueOf('n8n_agent_turns_held_total', { reason })).toBe(1);
		}
		for (const reason of ['main-memory-high', 'main-at-stream-limit']) {
			expect(await valueOf('n8n_agent_streams_skipped_total', { reason })).toBe(1);
		}
		expect(await valueOf('n8n_agent_messages_rejected_total')).toBe(1);
	});

	it('reads the gauges at scrape time', async () => {
		const bridge = new AgentQueueMetrics();
		new PrometheusAgentQueueMetricsService(config, bridge).init();
		bridge.registerGauges({
			localTurns: () => 3,
			backgroundRuns: () => 2,
			queueCounts: async () => ({ waiting: 4, active: 1 }),
		});

		expect(await valueOf('n8n_agent_active_turns')).toBe(3);
		expect(await valueOf('n8n_agent_active_background_runs')).toBe(2);
		expect(await valueOf('n8n_agent_turn_queue_jobs', { state: 'waiting' })).toBe(4);
		expect(await valueOf('n8n_agent_turn_queue_jobs', { state: 'active' })).toBe(1);
	});

	it('does not fail the scrape when the queue cannot be read', async () => {
		const bridge = new AgentQueueMetrics();
		new PrometheusAgentQueueMetricsService(config, bridge).init();
		bridge.registerGauges({ queueCounts: async () => await Promise.reject(new Error('down')) });

		await expect(promClient.register.metrics()).resolves.toContain('n8n_agent_active_turns');
	});
});
