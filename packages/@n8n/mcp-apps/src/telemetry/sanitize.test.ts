import { describe, expect, it } from 'vitest';

import { sanitizeTelemetryErrorMessage } from './sanitize';

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
