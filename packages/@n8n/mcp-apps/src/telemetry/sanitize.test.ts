import { describe, expect, it } from 'vitest';

import { sanitizeTelemetryErrorMessage, sanitizeTelemetryProperties } from './sanitize';

describe('sanitizeTelemetryErrorMessage', () => {
	it('redacts secrets using the shared scrubber', () => {
		expect(
			sanitizeTelemetryErrorMessage(
				'Preview crashed with Authorization: Bearer abc.def-ghi_jkl/mno= and api_key=secret',
			),
		).toBe('Preview crashed with [REDACTED] and [REDACTED]');
	});

	it('limits message length', () => {
		expect(sanitizeTelemetryErrorMessage('x'.repeat(600))).toHaveLength(500);
	});
});

describe('sanitizeTelemetryProperties', () => {
	it('redacts secret-shaped strings and values under secret keys', () => {
		expect(
			sanitizeTelemetryProperties({
				apiKey: 'secret-api-key',
				error_message: 'Authorization: Bearer abc.def-ghi_jkl/mno=',
				nested: {
					password: 'hunter2',
					publicValue: 'safe',
				},
			}),
		).toEqual({
			apiKey: '[REDACTED]',
			error_message: '[REDACTED]',
			nested: {
				password: '[REDACTED]',
				publicValue: 'safe',
			},
		});
	});

	it('handles circular values', () => {
		const payload: Record<string, unknown> = {};
		payload.self = payload;

		expect(sanitizeTelemetryProperties(payload)).toEqual({ self: '[Circular]' });
	});
});
