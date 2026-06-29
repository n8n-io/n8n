import { Container } from '@n8n/di';

import { DiagnosticsConfig } from '../diagnostics.config';

describe('DiagnosticsConfig', () => {
	beforeEach(() => {
		Container.reset();
	});

	afterEach(() => {
		delete process.env.N8N_TELEMETRY_RATE_LIMIT;
		delete process.env.N8N_TELEMETRY_SOURCE_RATE_LIMIT;
	});

	describe('telemetry rate limits', () => {
		it('applies the documented defaults', () => {
			const config = Container.get(DiagnosticsConfig);
			expect(config.telemetryRateLimit).toBe(100);
			expect(config.telemetrySourceRateLimit).toBe(50);
		});

		it('reads the limits from their environment variables', () => {
			process.env.N8N_TELEMETRY_RATE_LIMIT = '500';
			process.env.N8N_TELEMETRY_SOURCE_RATE_LIMIT = '200';
			const config = Container.get(DiagnosticsConfig);
			expect(config.telemetryRateLimit).toBe(500);
			expect(config.telemetrySourceRateLimit).toBe(200);
		});

		it('accepts 0 to disable rate limiting', () => {
			process.env.N8N_TELEMETRY_RATE_LIMIT = '0';
			expect(Container.get(DiagnosticsConfig).telemetryRateLimit).toBe(0);
		});

		it.each(['-5', 'abc', '1.5'])(
			'falls back to the default when given an invalid value (%s)',
			(value) => {
				process.env.N8N_TELEMETRY_RATE_LIMIT = value;
				expect(Container.get(DiagnosticsConfig).telemetryRateLimit).toBe(100);
			},
		);
	});
});
