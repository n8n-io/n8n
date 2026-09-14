import { PrometheusMetricsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { Cipher } from 'n8n-core';
import promClient from 'prom-client';

import type { PrometheusMetricsCollector } from './base';
import { DURATION_BUCKETS_SECONDS } from './constant';

/**
 * Tracks decrypt and key-lookup latency on the read path as histograms.
 * Registers:
 * - `n8n_encryption_decrypt_duration_seconds`
 * - `n8n_encryption_key_lookup_duration_seconds`
 */
@Service()
export class PrometheusEncryptionMetricsService implements PrometheusMetricsCollector {
	constructor(
		private readonly cipher: Cipher,
		private readonly config: PrometheusMetricsConfig,
	) {}

	get enabled(): boolean {
		return this.config.includeEncryptionMetrics;
	}

	init() {
		const decryptHistogram = new promClient.Histogram({
			name: `${this.config.prefix}encryption_decrypt_duration_seconds`,
			help: 'Duration of a full decryptV2 operation (key lookup and decryption) in seconds.',
			labelNames: ['algorithm'],
			buckets: DURATION_BUCKETS_SECONDS,
		});

		const keyLookupHistogram = new promClient.Histogram({
			name: `${this.config.prefix}encryption_key_lookup_duration_seconds`,
			help: 'Duration of encryption key lookups in seconds.',
			labelNames: ['source'],
			buckets: DURATION_BUCKETS_SECONDS,
		});

		this.cipher.events.on('decrypt', ({ algorithm, durationMs }) => {
			decryptHistogram.observe({ algorithm }, durationMs / 1000);
		});

		this.cipher.events.on('key-lookup', ({ source, durationMs }) => {
			keyLookupHistogram.observe({ source }, durationMs / 1000);
		});
	}
}
