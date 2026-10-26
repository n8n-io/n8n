import { mockInstance } from '@n8n/backend-test-utils';
import { PrometheusMetricsConfig } from '@n8n/config';
import type { Cipher } from 'n8n-core';
import promClient from 'prom-client';
import type { Mock } from 'vitest';

import { PrometheusEncryptionMetricsService } from '../encryption-metrics.service';

vi.mock('prom-client');

describe('PrometheusEncryptionMetricsService', () => {
	const config = mockInstance(PrometheusMetricsConfig, {
		prefix: 'n8n_',
		includeEncryptionMetrics: true,
	});

	const cipherEvents = { on: vi.fn() };
	const cipher = { events: cipherEvents } as unknown as Cipher;

	let service: PrometheusEncryptionMetricsService;
	let mockHistogramObserve: Mock;

	beforeEach(() => {
		Object.assign(config, { prefix: 'n8n_', includeEncryptionMetrics: true });
		service = new PrometheusEncryptionMetricsService(cipher, config);
		mockHistogramObserve = vi.fn();
		promClient.Histogram.prototype.observe = mockHistogramObserve;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	function getEventsHandler(eventName: string) {
		const calls = cipherEvents.on.mock.calls as Array<[string, (...args: unknown[]) => void]>;
		return calls.find((c) => c[0] === eventName)?.[1];
	}

	describe('enabled', () => {
		it('should reflect includeEncryptionMetrics', () => {
			config.includeEncryptionMetrics = true;
			expect(service.enabled).toBe(true);

			config.includeEncryptionMetrics = false;
			expect(service.enabled).toBe(false);
		});
	});

	describe('init', () => {
		it('should create the decrypt duration histogram with an algorithm label', () => {
			service.init();

			expect(promClient.Histogram).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'n8n_encryption_decrypt_duration_seconds',
					help: 'Duration of a full decryptV2 operation (key lookup and decryption) in seconds.',
					labelNames: ['algorithm'],
				}),
			);
		});

		it('should create the key-lookup duration histogram with a source label', () => {
			service.init();

			expect(promClient.Histogram).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'n8n_encryption_key_lookup_duration_seconds',
					help: 'Duration of encryption key lookups in seconds.',
					labelNames: ['source'],
				}),
			);
		});

		it('should apply a custom prefix to metric names', () => {
			config.prefix = 'myapp_';
			service.init();

			expect(promClient.Histogram).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'myapp_encryption_decrypt_duration_seconds' }),
			);
			expect(promClient.Histogram).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'myapp_encryption_key_lookup_duration_seconds' }),
			);
		});

		it('should register listeners for decrypt and key-lookup', () => {
			service.init();

			expect(cipherEvents.on).toHaveBeenCalledWith('decrypt', expect.any(Function));
			expect(cipherEvents.on).toHaveBeenCalledWith('key-lookup', expect.any(Function));
		});

		it('should observe the decrypt histogram with duration converted to seconds', () => {
			service.init();
			const handler = getEventsHandler('decrypt')!;

			handler({ algorithm: 'aes-256-gcm', durationMs: 250 });

			expect(mockHistogramObserve).toHaveBeenCalledWith({ algorithm: 'aes-256-gcm' }, 0.25);
		});

		it('should observe the key-lookup histogram with duration converted to seconds', () => {
			service.init();
			const handler = getEventsHandler('key-lookup')!;

			handler({ source: 'prefixed', durationMs: 100 });

			expect(mockHistogramObserve).toHaveBeenCalledWith({ source: 'prefixed' }, 0.1);
		});
	});
});
