import type { GlobalConfig } from '@n8n/config';
import type { RateLimitInfo } from 'express-rate-limit';
import { mock } from 'vitest-mock-extended';

import { PublicApiRateLimitSummary } from '@/public-api/public-api-rate-limit-summary';

type RateLimitConfig = GlobalConfig['publicApi']['rateLimit'];

const emptyRanges = {
	range_0_49: 0,
	range_50_99: 0,
	range_100_199: 0,
	range_200_399: 0,
	range_400_799: 0,
	range_800_1599: 0,
	range_1600_plus: 0,
};

describe('PublicApiRateLimitSummary', () => {
	function createSummary(
		rateLimit: Partial<RateLimitConfig> = {},
		diagnosticsEnabled = true,
	): PublicApiRateLimitSummary {
		return new PublicApiRateLimitSummary(
			mock<GlobalConfig>({
				diagnostics: { enabled: diagnosticsEnabled },
				publicApi: {
					rateLimit: {
						enabled: true,
						mode: 'observe',
						globalReadLimit: 1_200,
						globalReadWindowSeconds: 60,
						globalWriteLimit: 300,
						globalWriteWindowSeconds: 60,
						endpointReadLimit: 600,
						endpointReadWindowSeconds: 60,
						endpointWriteLimit: 200,
						endpointWriteWindowSeconds: 30,
						...rateLimit,
					},
				},
			}),
		);
	}

	const counted = (key: string, used: number, limit: number): RateLimitInfo => ({
		key,
		used,
		limit,
		remaining: Math.max(limit - used, 0),
		resetTime: new Date(),
	});

	it('reports nothing when no API key made a counted request', () => {
		expect(createSummary().take()).toBeUndefined();
	});

	it('reports the busiest window of each key in ranges', () => {
		const summary = createSummary();

		for (let used = 1; used <= 60; used++) {
			summary.record('read_endpoint', counted('apiKey:a', used, 600));
		}
		summary.record('read_endpoint', counted('apiKey:b', 10, 600));
		summary.record('read_endpoint', counted('apiKey:b', 1_700, 600));
		summary.record('read_endpoint', counted('apiKey:b', 3, 600));

		expect(summary.take()?.read_endpoint?.keys_by_busiest_window).toEqual({
			...emptyRanges,
			range_50_99: 1,
			range_1600_plus: 1,
		});
	});

	it('reports keys and requests over the limit', () => {
		const summary = createSummary({ globalWriteLimit: 2 });

		for (let used = 1; used <= 4; used++) {
			summary.record('write_all_endpoints', counted('apiKey:a', used, 2));
		}
		summary.record('write_all_endpoints', counted('apiKey:b', 1, 2));

		expect(summary.take()?.write_all_endpoints).toEqual({
			limit: 2,
			window_seconds: 60,
			keys_by_busiest_window: { ...emptyRanges, range_0_49: 2 },
			keys_over_limit: 1,
			requests_over_limit: 2,
		});
	});

	it('reports the mode, the active keys and each limit that is on', () => {
		const summary = createSummary({ globalReadLimit: 0 });

		summary.record('read_endpoint', counted('apiKey:a', 1, 600));
		summary.record('write_endpoint', counted('apiKey:b', 1, 200));

		const report = summary.take();

		expect(report).toMatchObject({ mode: 'observe', active_keys: 2 });
		expect(report?.read_endpoint).toMatchObject({ limit: 600, window_seconds: 60 });
		expect(report?.write_endpoint).toMatchObject({ limit: 200, window_seconds: 30 });
		expect(report?.write_all_endpoints).toMatchObject({ limit: 300, keys_over_limit: 0 });
		expect(report).not.toHaveProperty('read_all_endpoints');
	});

	it('does not report API keys', () => {
		const summary = createSummary();

		summary.record('read_endpoint', counted('apiKey:secret-key-id', 1, 600));

		expect(JSON.stringify(summary.take())).not.toContain('secret-key-id');
	});

	it('starts empty after each report', () => {
		const summary = createSummary();
		summary.record('read_endpoint', counted('apiKey:a', 1, 600));

		summary.take();

		expect(summary.take()).toBeUndefined();
	});

	it('records nothing while telemetry is off', () => {
		const summary = createSummary({}, false);

		summary.record('read_endpoint', counted('apiKey:a', 1, 600));

		expect(summary.take()).toBeUndefined();
	});
});
