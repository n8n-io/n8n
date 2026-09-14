import { PrometheusMetricsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { readFileSync } from 'node:fs';
import promClient from 'prom-client';

import type { PrometheusMetricsCollector } from './base';

/**
 * Exposes `n8n_process_pss_bytes` — Proportional Set Size, a fairer memory metric than RSS
 * for containerized environments (shared pages split proportionally, not double-counted).
 * Only available on Linux kernel 4.14+ via `/proc/self/smaps_rollup`.
 */
@Service()
export class PrometheusPssMetricsService implements PrometheusMetricsCollector {
	constructor(private readonly config: PrometheusMetricsConfig) {}

	get enabled(): boolean {
		return this.config.includeDefaultMetrics && this.isAvailable();
	}

	init() {
		new promClient.Gauge({
			name: `${this.config.prefix}process_pss_bytes`,
			help: 'Proportional Set Size of the process in bytes.',
			collect() {
				try {
					// Sync read is intentional: /proc is a kernel virtual filesystem (microseconds, no disk I/O).
					// This matches prom-client's own built-in metrics which use process.memoryUsage() (also /proc).
					const content = readFileSync('/proc/self/smaps_rollup', 'utf8');
					const match = content.match(/^Pss:\s+(\d+)\s+kB$/m);
					if (match) {
						this.set(parseInt(match[1], 10) * 1024);
					}
				} catch {
					// Failed to read smaps_rollup, skip this scrape
				}
			},
		});
	}

	private isAvailable(): boolean {
		try {
			readFileSync('/proc/self/smaps_rollup', 'utf8');
			return true;
		} catch {
			return false;
		}
	}
}
