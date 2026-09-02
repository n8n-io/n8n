import { PrometheusMetricsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import promClient from 'prom-client';

import type { PrometheusMetricsCollector } from './base';

/** Registers prom-client default process metrics (CPU, memory, GC, etc.) under the configured prefix. */
@Service()
export class PrometheusDefaultMetricsService implements PrometheusMetricsCollector {
	constructor(private readonly config: PrometheusMetricsConfig) {}

	init() {
		promClient.collectDefaultMetrics({ prefix: this.config.prefix });
	}

	get enabled(): boolean {
		return this.config.includeDefaultMetrics;
	}
}
