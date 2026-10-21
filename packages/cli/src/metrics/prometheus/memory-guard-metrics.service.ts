import { EventService } from '@n8n/backend-services';
import { ExecutionsConfig, MemoryGuardConfig, PrometheusMetricsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import promClient from 'prom-client';

import type { PrometheusMetricsCollector } from './base';

/**
 * Collects Prometheus metrics for the memory guard, from its events on `EventService`.
 * Active when the memory guard runs, which is in regular mode only.
 *
 * Labels are bounded (trigger, freed): no workflow or instance label.
 */
@Service()
export class PrometheusMemoryGuardMetricsService implements PrometheusMetricsCollector {
	constructor(
		private readonly config: PrometheusMetricsConfig,
		private readonly memoryGuardConfig: MemoryGuardConfig,
		private readonly executionsConfig: ExecutionsConfig,
		private readonly eventService: EventService,
	) {}

	get enabled(): boolean {
		return this.memoryGuardConfig.enabled && this.executionsConfig.mode === 'regular';
	}

	init() {
		const prefix = this.config.prefix;

		const holds = new promClient.Counter({
			name: `${prefix}memory_guard_holds_total`,
			help: 'Total number of times the memory guard started to hold new production executions.',
		});

		const holding = new promClient.Gauge({
			name: `${prefix}memory_guard_holding`,
			help: 'Whether the memory guard holds new production executions now (1) or not (0).',
		});
		holding.set(0);

		const heldSeconds = new promClient.Counter({
			name: `${prefix}memory_guard_hold_seconds_total`,
			help: 'Total time in seconds that the memory guard held new production executions, counted when each hold ends.',
		});

		const stops = new promClient.Counter({
			name: `${prefix}memory_guard_stops_total`,
			help: 'Total number of executions that the memory guard stopped, by trigger (threshold, critical, hold_limit) and whether the stop freed memory.',
			labelNames: ['trigger', 'freed'],
		});

		const deactivations = new promClient.Counter({
			name: `${prefix}memory_guard_deactivations_total`,
			help: 'Total number of workflows that the memory guard deactivated after repeated stops.',
		});

		this.eventService.on('memory-guard-hold-started', () => {
			holds.inc();
			holding.set(1);
		});

		this.eventService.on('memory-guard-hold-ended', ({ heldMs }) => {
			holding.set(0);
			heldSeconds.inc(heldMs / 1000);
		});

		this.eventService.on('memory-guard-execution-stopped', (event) => {
			stops.inc({ trigger: event.trigger.replace('-', '_'), freed: String(event.freedMemory) });
			if (event.workflowDeactivated) deactivations.inc();
		});
	}
}
