import { EventService } from '@n8n/backend-services';
import { ExecutionsConfig, MemoryGuardConfig, PrometheusMetricsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import promClient from 'prom-client';

import type { PrometheusMetricsCollector } from './base';

/**
 * Collects Prometheus metrics for the memory guard, from its events on `EventService`.
 * Active when the memory guard runs, which is in regular mode only.
 *
 * Labels are bounded (reason, freed, last_action): no workflow or instance label.
 */
@Service()
export class PrometheusMemoryGuardMetricsService implements PrometheusMetricsCollector {
	private isInitialized = false;

	constructor(
		private readonly config: PrometheusMetricsConfig,
		private readonly memoryGuardConfig: MemoryGuardConfig,
		private readonly executionsConfig: ExecutionsConfig,
		private readonly eventService: EventService,
	) {}

	get enabled(): boolean {
		return this.memoryGuardConfig.enabled && this.executionsConfig.mode === 'regular';
	}

	/** Start calls this before the guard starts, so that no guard event comes before the listeners. */
	init() {
		if (this.isInitialized) return;
		this.isInitialized = true;
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
			help: 'Total number of executions that the memory guard stopped, by reason (threshold, critical, hold_limit) and whether the stop freed memory.',
			labelNames: ['reason', 'freed'],
		});
		// A series that first appears at 1 has no earlier sample, so `increase()` would miss that stop.
		for (const reason of ['threshold', 'critical', 'hold_limit']) {
			for (const freed of ['true', 'false']) stops.inc({ reason, freed }, 0);
		}

		const deactivations = new promClient.Counter({
			name: `${prefix}memory_guard_deactivations_total`,
			help: 'Total number of workflows that the memory guard deactivated after repeated stops.',
		});

		// An OOM kill resets the counters above, so the guard reports the crash totals of its journal.
		const crashes = new promClient.Counter({
			name: `${prefix}memory_guard_crashes_total`,
			help: 'Total number of crashed sessions, by the strongest memory guard action since memory was last low (none, hold, stop). Kept across restarts.',
			labelNames: ['last_action'],
		});
		this.eventService.on('memory-guard-crashes-counted', ({ crashes: totals }) => {
			for (const [action, count] of Object.entries(totals)) {
				crashes.inc({ last_action: action }, count);
			}
		});

		this.eventService.on('memory-guard-hold-started', () => {
			holds.inc();
			holding.set(1);
		});

		this.eventService.on('memory-guard-hold-ended', ({ heldMs }) => {
			holding.set(0);
			heldSeconds.inc(heldMs / 1000);
		});

		this.eventService.on('memory-guard-workflow-deactivated', () => deactivations.inc());

		this.eventService.on('memory-guard-execution-stopped', (event) => {
			stops.inc({ reason: event.reason.replace('-', '_'), freed: String(event.freedMemory) });
		});
	}
}
