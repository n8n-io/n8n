import { MemoryGuardConfig, PrometheusMetricsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import promClient from 'prom-client';

import type { PrometheusMetricsCollector } from './base';

@Service()
export class PrometheusMemoryGuardMetricsService implements PrometheusMetricsCollector {
	private holds: promClient.Counter | undefined;

	private kills: promClient.Counter<'trigger'> | undefined;

	private deactivations: promClient.Counter | undefined;

	private paused: promClient.Gauge | undefined;

	constructor(
		private readonly config: PrometheusMetricsConfig,
		private readonly memoryGuardConfig: MemoryGuardConfig,
	) {}

	get enabled(): boolean {
		return this.memoryGuardConfig.enabled;
	}

	init() {
		const { prefix } = this.config;
		this.holds = new promClient.Counter({
			name: `${prefix}memory_guard_holds_total`,
			help: 'Times the memory guard held back new production executions.',
		});
		this.kills = new promClient.Counter({
			name: `${prefix}memory_guard_kills_total`,
			help: 'Executions cancelled by the memory guard.',
			labelNames: ['trigger'],
		});
		this.deactivations = new promClient.Counter({
			name: `${prefix}memory_guard_deactivations_total`,
			help: 'Workflows deactivated by the memory guard as repeat offenders.',
		});
		this.paused = new promClient.Gauge({
			name: `${prefix}memory_guard_paused`,
			help: 'Whether the memory guard is currently holding back new production executions.',
		});
	}

	recordHold() {
		this.holds?.inc();
		this.paused?.set(1);
	}

	recordResume() {
		this.paused?.set(0);
	}

	recordKill(trigger: 'critical' | 'threshold') {
		this.kills?.inc({ trigger });
	}

	recordDeactivation() {
		this.deactivations?.inc();
	}
}
