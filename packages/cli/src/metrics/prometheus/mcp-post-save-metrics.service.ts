import { PrometheusMetricsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import promClient from 'prom-client';

import { EventService } from '@/events/event.service';

import type { PrometheusMetricsCollector } from './base';

@Service()
export class PrometheusMcpPostSaveMetricsService implements PrometheusMetricsCollector {
	constructor(
		private readonly config: PrometheusMetricsConfig,
		private readonly eventService: EventService,
	) {}

	get enabled(): boolean {
		return this.config.includeMcpPostSaveMetrics;
	}

	init() {
		const postSaveFailuresTotal = new promClient.Counter({
			name: `${this.config.prefix}mcp_post_save_failures_total`,
			help: 'MCP workflow-builder tool failures that occurred after a successful database write (hooks, telemetry, auto-assign). The client still receives success — these are observability-only.',
			labelNames: ['tool', 'error_type'],
		});

		this.eventService.on('mcp-post-save-failure', ({ tool, errorType }) => {
			postSaveFailuresTotal.inc({ tool, error_type: errorType }, 1);
		});
	}
}
