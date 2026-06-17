import { PrometheusMetricsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { StorageConfig } from 'n8n-core';
import promClient from 'prom-client';

import { EventService } from '@/events/event.service';

import type { PrometheusMetricsCollector } from './base';
import { DURATION_BUCKETS_SECONDS, SIZE_BUCKETS_BYTES } from './constant';

/**
 * Tracks execution data read/write counts, durations, and unreadable bundle counts.
 * Also exposes the active storage mode (db or fs) as a static gauge.
 */
@Service()
export class PrometheusExecutionDataMetricsService implements PrometheusMetricsCollector {
	constructor(
		private readonly config: PrometheusMetricsConfig,
		private readonly eventService: EventService,
		private readonly storageConfig: StorageConfig,
	) {}

	get enabled(): boolean {
		return this.config.includeExecutionDataMetrics;
	}

	init() {
		const readsTotal = new promClient.Counter({
			name: `${this.config.prefix}execution_data_reads_total`,
			help: 'Total number of execution data reads.',
			labelNames: ['mode', 'result'],
		});

		const writesTotal = new promClient.Counter({
			name: `${this.config.prefix}execution_data_writes_total`,
			help: 'Total number of execution data writes.',
			labelNames: ['mode', 'result'],
		});

		const unreadableBundlesTotal = new promClient.Counter({
			name: `${this.config.prefix}execution_data_unreadable_bundles_total`,
			help: 'Total number of execution data bundles that were missing or corrupt on read.',
			labelNames: ['mode'],
		});

		for (const mode of ['db', 'fs', 's3'] as const) {
			for (const result of ['success', 'failure'] as const) {
				readsTotal.inc({ mode, result }, 0);
				writesTotal.inc({ mode, result }, 0);
			}
			unreadableBundlesTotal.inc({ mode }, 0);
		}

		const readDurationHistogram = new promClient.Histogram({
			name: `${this.config.prefix}execution_data_read_duration_seconds`,
			help: 'Execution data read duration in seconds (fetch + deserialize).',
			labelNames: ['mode'],
			buckets: DURATION_BUCKETS_SECONDS,
		});

		const writeDurationHistogram = new promClient.Histogram({
			name: `${this.config.prefix}execution_data_write_duration_seconds`,
			help: 'Execution data write duration in seconds.',
			labelNames: ['mode'],
			buckets: DURATION_BUCKETS_SECONDS,
		});

		const writeSizeHistogram = new promClient.Histogram({
			name: `${this.config.prefix}execution_data_write_size_bytes`,
			help: 'Logical byte size of the JSON execution data bundle written (excludes binary data).',
			labelNames: ['mode'],
			buckets: SIZE_BUCKETS_BYTES,
		});

		const storageModeGauge = new promClient.Gauge({
			name: `${this.config.prefix}execution_data_storage_mode`,
			help: 'Configured execution data storage mode (1 for the active mode, 0 otherwise).',
			labelNames: ['mode'],
		});
		storageModeGauge.set({ mode: 'db' }, 0);
		storageModeGauge.set({ mode: 'fs' }, 0);
		storageModeGauge.set({ mode: 's3' }, 0);
		storageModeGauge.set({ mode: this.storageConfig.modeTag }, 1);

		this.eventService.on(
			'execution-data-read',
			({ mode, durationMs, success, unreadableBundles }) => {
				readsTotal.inc({ mode, result: success ? 'success' : 'failure' }, 1);
				if (success) {
					readDurationHistogram.observe({ mode }, durationMs / 1000);
				}
				if (unreadableBundles > 0) {
					unreadableBundlesTotal.inc({ mode }, unreadableBundles);
				}
			},
		);

		this.eventService.on('execution-data-write', ({ mode, durationMs, success, jsonSizeBytes }) => {
			writesTotal.inc({ mode, result: success ? 'success' : 'failure' }, 1);
			if (success) {
				writeDurationHistogram.observe({ mode }, durationMs / 1000);
				writeSizeHistogram.observe({ mode }, jsonSizeBytes);
			}
		});
	}
}
